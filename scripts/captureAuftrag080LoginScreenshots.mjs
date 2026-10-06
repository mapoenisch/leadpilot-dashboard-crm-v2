#!/usr/bin/env node
/**
 * Auftrag 080 (Release v2.4.0): Vorher/Nachher der Login-Seite, deren Versionszeile sich ändert.
 *
 * BEFORE_URL  Build von main vor dem Release (Anzeige V2.3.2)
 * AFTER_URL   Build des Release-Stands (Anzeige V2.4.0)
 * Je Breite 1440/768/375: Bild, SHA-256 (Paare müssen verschieden sein), horizontaler Überlauf
 * (0 px), sichtbare Versionszeile. Bilder bleiben lokal (.gitignore); das Skript schreibt
 * docs/screenshots/auftrag-080/README.md.
 *
 * Aufruf: BEFORE_URL=… AFTER_URL=… node scripts/captureAuftrag080LoginScreenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt.`);
  return value;
};
const BUILDS = [
  { label: 'vorher', url: env('BEFORE_URL') },
  { label: 'nachher', url: env('AFTER_URL') },
];
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-080');
const WIDTHS = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const rows = [];
  let failed = false;
  for (const viewport of WIDTHS) {
    const results = [];
    for (const build of BUILDS) results.push(await shoot(browser, build, viewport));
    const [b, a] = results;
    const ok =
      b.hash !== a.hash &&
      b.overflow === 0 &&
      a.overflow === 0 &&
      b.version.endsWith('V2.3.2') &&
      a.version.endsWith('V2.4.0');
    failed ||= !ok;
    rows.push(
      `| ${viewport.width} | ${b.version} | ${a.version} | \`${b.hash.slice(0, 16)}\` | \`${a.hash.slice(0, 16)}\` | ${b.overflow} / ${a.overflow} px | ${ok ? 'bestanden' : 'NICHT bestanden'} |`,
    );
  }
  await browser.close();
  const readme = [
    '# Auftrag 080 – Screenshot-Matrix Login-Seite',
    '',
    'Einzige sichtbare Änderung des Releases: Versionszeile der Login-Seite. Vorher = Build von',
    '`main` vor dem Release, nachher = Release-Stand. Erzeugt mit',
    '`scripts/captureAuftrag080LoginScreenshots.mjs`; Bilder liegen nur lokal.',
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
  process.exit(1);
});
