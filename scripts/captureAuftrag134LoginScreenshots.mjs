#!/usr/bin/env node
/**
 * Auftrag 134 (Release v3.0.0): Vorher/Nachher der Login-Seite, deren Versionszeile sich ändert.
 *
 * BEFORE_URL  Build von main vor dem Release (Anzeige V2.5.0)
 * AFTER_URL   Build des Release-Stands (Anzeige V3.0.0)
 * Je Breite 1440/768/375: Bild, SHA-256 (Paare müssen verschieden sein), horizontaler Überlauf
 * (0 px), sichtbare Versionszeile. Bilder bleiben lokal (.gitignore); das Skript schreibt
 * docs/screenshots/auftrag-134/README.md.
 *
 * Aufruf: [BEFORE_URL=… AFTER_URL=…] node scripts/captureAuftrag134LoginScreenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-134');
const BEFORE_URL = process.env.BEFORE_URL ?? 'http://127.0.0.1:3001';
const AFTER_URL = process.env.AFTER_URL ?? 'http://127.0.0.1:3000';
const BEFORE_DIR = process.env.BEFORE_DIR ?? '/tmp/leadpilot-vorher-134';
const AFTER_DIR = process.env.AFTER_DIR ?? '/tmp/leadpilot-nachher-134';

const BUILDS = [
  { label: 'vorher', url: BEFORE_URL, dir: BEFORE_DIR, port: '3001' },
  { label: 'nachher', url: AFTER_URL, dir: AFTER_DIR, port: '3000' },
];

const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

function checkUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

const processes = [];

async function ensureServersRunning() {
  for (const build of BUILDS) {
    const isUp = await checkUrl(build.url);
    if (!isUp) {
      if (!fs.existsSync(build.dir)) {
        throw new Error(`Build-Verzeichnis für ${build.label} nicht gefunden: ${build.dir}`);
      }
      console.log(`[Server] Starte Vite Preview für ${build.label} auf ${build.url} aus ${build.dir} …`);
      const proc = spawn(
        'npx',
        ['vite', 'preview', '--host', '127.0.0.1', '--port', build.port, '--strictPort', '--outDir', build.dir],
        {
          cwd: ROOT,
          stdio: 'inherit',
        },
      );
      processes.push(proc);
    }
  }

  const start = Date.now();
  while (Date.now() - start < 20000) {
    const bUp = await checkUrl(BEFORE_URL);
    const aUp = await checkUrl(AFTER_URL);
    if (bUp && aUp) {
      console.log(`[Server] Beide Server bereit: Vorher (${BEFORE_URL}), Nachher (${AFTER_URL})`);
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Timeout beim Warten auf Preview-Server');
}

async function shoot(browser, build, viewport) {
  const context = await browser.newContext({
    baseURL: build.url,
    viewport,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/login', { waitUntil: 'networkidle' });
  const version = (await page.getByText(/LeadPilot Dashboard-CRM · V/).textContent()).trim();
  const overflow = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
  const image = await page.screenshot({ fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, `login-${viewport.width}-${build.label}.png`), image);
  await context.close();
  return { version, overflow, hash: sha256(image) };
}

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch {
    const candidates = [
      '/Users/marcpoenisch/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell',
      '/Users/marcpoenisch/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    ];
    for (const executablePath of candidates) {
      if (fs.existsSync(executablePath)) {
        return await chromium.launch({ executablePath });
      }
    }
    throw new Error('Kein Chromium Executable gefunden.');
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await ensureServersRunning();

  const browser = await launchBrowser();
  const rows = [];
  let failed = false;

  for (const viewport of WIDTHS) {
    const results = [];
    for (const build of BUILDS) {
      results.push(await shoot(browser, build, viewport));
    }
    const [b, a] = results;
    const ok =
      b.hash !== a.hash &&
      b.overflow === 0 &&
      a.overflow === 0 &&
      b.version.endsWith('V2.5.0') &&
      a.version.endsWith('V3.0.0');
    failed ||= !ok;
    rows.push(
      `| ${viewport.width} | ${b.version} | ${a.version} | \`${b.hash.slice(0, 16)}\` | \`${a.hash.slice(0, 16)}\` | ${b.overflow} / ${a.overflow} px | ${ok ? 'bestanden' : 'NICHT bestanden'} |`,
    );
  }

  await browser.close();

  // Beende gestartete Server
  for (const proc of processes) {
    proc.kill('SIGTERM');
  }

  const readme = [
    '# Auftrag 134 – Screenshot-Matrix Login-Seite',
    '',
    'Einzige Produktcode-Änderung des Release-Auftrags: Versionszeile der Login-Seite. Vorher = Build von',
    '`main` vor dem Release (V2.5.0), nachher = Release-Stand (V3.0.0). Erzeugt mit',
    '`scripts/captureAuftrag134LoginScreenshots.mjs`; Bilder liegen nur lokal.',
    '',
    '| Breite | Vorher | Nachher | SHA-256 vorher | SHA-256 nachher | Überlauf | Ergebnis |',
    '| ------ | ------ | ------- | -------------- | --------------- | -------- | -------- |',
    ...rows,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), readme);
  console.log(readme);

  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  for (const proc of processes) {
    proc.kill('SIGTERM');
  }
  process.exit(1);
});
