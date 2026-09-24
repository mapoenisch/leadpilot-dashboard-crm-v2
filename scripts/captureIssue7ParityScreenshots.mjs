#!/usr/bin/env node
/**
 * Issue #7 (Inline-Style-Abbau): Paritäts-Harness nach Vorbild von
 * scripts/captureGateScreenshots.mjs. Ein reiner Refactor muss pixelgleich
 * bleiben — deshalb vergleicht dieses Skript SHA-256-Hashes vorher/nachher
 * (Gleichheit = Nachweis) und protokolliert den horizontalen Overflow.
 *
 * Aufnahme (dist/ muss gebaut sein; Login aus der Umgebung, keine Fallbacks):
 *   E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureIssue7ParityScreenshots.mjs \
 *     --capture --label=after --out=/tmp/issue7-after [--port=4321] [--dist=dist]
 * Matrix (Markdown auf stdout):
 *   node scripts/captureIssue7ParityScreenshots.mjs \
 *     --compare=/tmp/issue7-before/manifest.json,/tmp/issue7-after/manifest.json \
 *     [--noise=/tmp/issue7-before-2/manifest.json]
 *
 * Routen: alle Pfade aus e2e/routes.spec.ts. Determinismus: reducedMotion,
 * feste Uhr (2026-09-20T10:00:00Z), networkidle + fonts.ready + 800 ms,
 * Animationen deaktiviert. Bilddateien werden nicht committet (CLAUDE.md §7).
 */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VIEWPORTS = { 1440: [1440, 900], 768: [768, 1024], 375: [375, 812] };

function arg(name, fallback) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : true;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt.`);
  return value;
}

function routes() {
  const src = fs.readFileSync(path.join(ROOT, 'e2e/routes.spec.ts'), 'utf8');
  return [...src.slice(0, src.indexOf('];')).matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);
}

async function waitForServer(url) {
  for (let i = 0; i < 50; i++) {
    const ok = await new Promise((resolve) => {
      http.get(url, (res) => resolve(res.statusCode === 200)).on('error', () => resolve(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Preview-Server nicht erreichbar: ${url}`);
}

async function capture() {
  const out = path.resolve(arg('out', '/tmp/issue7-capture'));
  const port = String(arg('port', '4321'));
  const dist = path.resolve(ROOT, arg('dist', 'dist'));
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error(`${dist} fehlt — erst bauen.`);
  fs.mkdirSync(out, { recursive: true });

  const preview = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      port,
      '--strictPort',
      '--outDir',
      dist,
    ],
    { cwd: ROOT, stdio: 'ignore' },
  );
  const base = `http://127.0.0.1:${port}`;
  const shots = [];
  try {
    await waitForServer(`${base}/login`);
    const browser = await chromium.launch();
    try {
      for (const [vp, [width, height]] of Object.entries(VIEWPORTS)) {
        const context = await browser.newContext({
          viewport: { width, height },
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        await page.clock.install({ time: new Date('2026-09-20T10:00:00Z') });
        await page.goto(`${base}/login`);
        await page.fill('#login-email', requireEnv('E2E_AUTH_EMAIL'));
        await page.fill('#login-password', requireEnv('E2E_AUTH_PASSWORD'));
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
        for (const route of routes()) {
          await page.goto(base + route, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(800);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          const buffer = await page.screenshot({ fullPage: true, animations: 'disabled' });
          const file = `${route.slice(1).replace(/\//g, '-')}-${vp}.png`;
          fs.writeFileSync(path.join(out, file), buffer);
          shots.push({
            route,
            viewport: Number(vp),
            file,
            sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
            overflowPx: overflow,
          });
        }
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    preview.kill('SIGTERM');
  }
  const manifest = { label: arg('label', 'capture'), capturedAt: new Date().toISOString(), shots };
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`✔ ${shots.length} Aufnahmen → ${out}/manifest.json`);
}

function compare() {
  const [beforePath, afterPath] = String(arg('compare')).split(',');
  const load = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
  const before = load(beforePath);
  const after = load(afterPath);
  const noisePath = arg('noise', null);
  const noise = noisePath ? load(noisePath) : null;
  const key = (s) => `${s.route}@${s.viewport}`;
  const index = (m) => new Map(m.shots.map((s) => [key(s), s]));
  const b = index(before);
  const n = noise ? index(noise) : null;
  const rows = [];
  let identical = 0;
  let noisy = 0;
  let regressions = 0;
  for (const a of after.shots) {
    const pre = b.get(key(a));
    const same = pre?.sha256 === a.sha256;
    const unstable = !!n && n.get(key(a))?.sha256 !== pre?.sha256;
    if (same) identical += 1;
    else if (unstable) noisy += 1;
    else regressions += 1;
    const verdict = same
      ? '✅ identisch'
      : unstable
        ? '⚠️ Rauschen (vorher ≠ vorher)'
        : '❌ Abweichung';
    rows.push(
      `| \`${a.route}\` | ${a.viewport} | \`${pre?.sha256.slice(0, 12) ?? '—'}\` | \`${a.sha256.slice(0, 12)}\` | ${pre?.overflowPx ?? '—'} / ${a.overflowPx} px | ${verdict} |`,
    );
  }
  console.log(
    '| Route | Viewport | SHA-256 vorher | SHA-256 nachher | Overflow vorher / nachher | Ergebnis |',
  );
  console.log('|---|---|---|---|---|---|');
  console.log(rows.join('\n'));
  console.log(
    `\n**Summe:** ${after.shots.length} Aufnahmen · ${identical} identisch · ${noisy} Rauschen · ${regressions} Abweichungen`,
  );
  if (regressions > 0) process.exitCode = 1;
}

(arg('compare') ? Promise.resolve(compare()) : capture()).catch((err) => {
  console.error('❌ captureIssue7ParityScreenshots:', err.message);
  process.exit(1);
});
