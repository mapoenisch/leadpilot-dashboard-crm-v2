#!/usr/bin/env node
/**
 * Gate G31 (Auftrag 046): EIN parametrisiertes Capture-Skript als Ersatz für die
 * ~50 captureAuftrag0XX…mjs-Harnesses (handgebautes CDP, je ~700 Zeilen).
 *
 * Gebrauch:
 *   node scripts/captureGateScreenshots.mjs --routes=/dashboard,/crm/leads \
 *     --viewports=1440,768,375 --out=docs/screenshots/gate-g31 [--port=4321]
 *
 * --routes:    Komma-getrennte Routen (Default: /dashboard)
 * --viewports: Komma-getrennt aus 1440,768,375 (Default: alle drei)
 * --out:       Zielverzeichnis (wird angelegt)
 * --port:      vite-preview-Port (Default: 4321; Server wird selbst gestartet)
 *
 * Determinismus: reducedMotion, networkidle + fonts.ready + 1000 ms Settle —
 * siehe docs/TEST_MIGRATION_V2_2_0.md („Capture-Skripte — Determinismus-Analyse").
 * Voraussetzung: `dist/` gebaut (`npx vite build`).
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VIEWPORT_MAP = {
  1440: { width: 1440, height: 900 },
  768: { width: 768, height: 1024 },
  375: { width: 375, height: 812 },
};

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, (res) => (res.statusCode === 200 ? resolve() : reject(new Error(String(res.statusCode))))).on('error', reject);
      });
      return;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Preview server not ready: ${url}`);
}

function stopProc(proc) {
  return new Promise((resolve) => {
    if (!proc || proc.exitCode !== null) return resolve();
    proc.once('exit', () => resolve());
    try {
      proc.kill('SIGTERM');
    } catch {
      resolve();
    }
    setTimeout(() => {
      try {
        proc.kill('SIGKILL');
      } catch {}
      resolve();
    }, 5000).unref?.();
  });
}

async function main() {
  const routes = arg('routes', '/dashboard').split(',').map((s) => s.trim()).filter(Boolean);
  const viewports = arg('viewports', '1440,768,375').split(',').map((s) => s.trim()).filter(Boolean);
  const out = path.resolve(ROOT, arg('out', 'docs/screenshots/gate-g31'));
  const port = arg('port', '4321');

  for (const v of viewports) {
    if (!VIEWPORT_MAP[v]) throw new Error(`Unbekannter Viewport: ${v} (erlaubt: 1440,768,375)`);
  }
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    throw new Error('dist/ fehlt — zuerst `npx vite build` ausführen.');
  }
  fs.mkdirSync(out, { recursive: true });

  const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(`${base}/dashboard`);

    const browser = await chromium.launch();
    try {
      for (const vp of viewports) {
        const { width, height } = VIEWPORT_MAP[vp];
        for (const route of routes) {
          const slug = route.replace(/^\//, '').replace(/\//g, '-') || 'root';
          const context = await browser.newContext({
            viewport: { width, height },
            reducedMotion: 'reduce',
          });
          const page = await context.newPage();
          await page.goto(base + route, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(1000);
          const file = path.join(out, `${slug}-${vp}.png`);
          await page.screenshot({ path: file, fullPage: true });
          console.log(`📸 ${path.relative(ROOT, file)}`);
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    await stopProc(preview);
  }
  console.log(`✔ Captures in ${path.relative(ROOT, out)}`);
}

main().catch((err) => {
  console.error('❌ captureGateScreenshots failed:', err.message);
  process.exit(1);
});
