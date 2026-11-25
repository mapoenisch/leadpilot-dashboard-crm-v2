#!/usr/bin/env node
/**
 * Auftrag 174b: Kacheln ohne Scrollen, Mindestgröße, ruhiger Kachelkopf (K1–K7).
 * Messung und Screenshots auf der Editor-Vorschau mit Testdaten (`dashboard-vorschau.html
 * ?bereich=editor_v2`), ohne Datenbank. Vorher/Nachher laufen gegen je einen Vorschau-Build.
 *
 * Aufruf:  VITE_DASHBOARD_PREVIEW=true npx vite build --outDir <dir>
 *          node scripts/captureAuftrag174bGateScreenshots.mjs vorher  <dir-vorher>
 *          node scripts/captureAuftrag174bGateScreenshots.mjs nachher <dir-nachher>   (schreibt README)
 *
 * Je Breite (1440/768/375 px) und Modus (Bearbeiten/Vorschau):
 *   - Kacheln mit Scrollbereich (Kachelkörper, Einpassfläche, Diagramm-Scrollbereich),
 *   - Kacheln, deren Inhalt über die Kachel ragt,
 *   - kleinster Einpassfaktor, Dokument-Überlauf, Vorkommen von „Stand Stand“,
 *   - Ziehgriff überdeckt den Kachelkopf (gewählte Kachel ARR),
 *   - sichtbarer Erläuterungstext „closeDate“ ohne Aufklappen (K3).
 * Bei 1440 px zusätzlich: Ziehen am unteren Griff der tiefsten Kachel (Abstand Vorschau ↔ Kachel)
 * und Verkleinern der Kachel „Umsatzerlöse“ (Größe und Faktor danach).
 * Bilddateien und manifest.json bleiben lokal (.gitignore); committet wird nur README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-174b');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const PORT = 3176;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PHASE = process.argv[2];
const DIST = process.argv[3];
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
];

if (!['vorher', 'nachher'].includes(PHASE) || !DIST) {
  throw new Error(
    'Aufruf: node scripts/captureAuftrag174bGateScreenshots.mjs vorher|nachher <dist>',
  );
}

function startServer() {
  const server = spawn(
    'npx',
    [
      'vite',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(PORT),
      '--strictPort',
      '--outDir',
      DIST,
    ],
    { cwd: ROOT, stdio: 'ignore' },
  );
  return server;
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE_URL}/dashboard-vorschau.html`);
      if (res.ok) return;
    } catch {
      /* noch nicht bereit */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Vorschau-Server startet nicht');
}

/** Messung im Browser: Scrollbereiche, Überstand, Faktor, Texte. */
function measure() {
  const tiles = [...document.querySelectorAll('[data-testid^="canvas-tile-"]')];
  const scrolling = new Set();
  const protruding = new Set();
  let minScale = 1;
  for (const t of tiles) {
    const id = t.dataset.tileId;
    const rect = t.getBoundingClientRect();
    const candidates = [
      t.querySelector('[data-testid^="tile-body-"]'),
      t.querySelector('[data-testid="tile-fit-box"]'),
      t.querySelector('[data-testid="dashboard-tile"]'),
      ...t.querySelectorAll('[role="region"]'),
    ].filter(Boolean);
    for (const el of candidates) {
      const style = getComputedStyle(el);
      const scrollY =
        /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
      const scrollX = /(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1;
      if (scrollY || scrollX) scrolling.add(id);
    }
    for (const el of t.querySelectorAll('[data-testid="dashboard-tile"] *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Inhalt eines zugeklappten <details> ist nicht sichtbar.
      if (el.closest('details:not([open])') && !el.closest('summary')) continue;
      if (!el.checkVisibility()) continue;
      if (r.right > rect.right + 2 || r.bottom > rect.bottom + 2) {
        // nur sichtbare Überstände zählen (nicht von overflow:hidden abgeschnitten)
        const clip = el.closest('[data-testid="tile-fit-box"], [data-testid^="tile-body-"]');
        const clipStyle = clip ? getComputedStyle(clip) : null;
        if (!clipStyle || clipStyle.overflow === 'visible') protruding.add(id);
        else if (
          clip &&
          (r.bottom > clip.getBoundingClientRect().bottom + 2 ||
            r.right > clip.getBoundingClientRect().right + 2)
        ) {
          protruding.add(id);
        }
      }
    }
    const scale = Number(t.querySelector('[data-testid="tile-fit-box"]')?.dataset.fitScale ?? 1);
    minScale = Math.min(minScale, scale);
  }
  const docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const text = document.body.innerText;
  return {
    tiles: tiles.length,
    scrolling: [...scrolling],
    protruding: [...protruding],
    minScale: Number(minScale.toFixed(2)),
    docOverflow,
    standStand: (text.match(/Stand Stand/g) ?? []).length,
    closeDateVisible: /closeDate/.test(text),
  };
}

async function gripOverlap(page) {
  const card = page.getByTestId('canvas-tile-std_baseline_arr');
  if (!(await card.count())) return null;
  await card.scrollIntoViewIfNeeded();
  await card.click({ position: { x: 30, y: 140 } });
  const grip = await page.getByTestId('drag-handle-std_baseline_arr').boundingBox();
  const header = await card.locator('header').boundingBox();
  const category = await card.locator('header p').first().boundingBox();
  if (!grip || !header || !category) return null;
  const overlapsY = grip.y < category.y + category.height && grip.y + grip.height > category.y;
  const overlapsX = grip.x < category.x + category.width && grip.x + grip.width > category.x;
  await page.keyboard.press('Escape');
  return overlapsX && overlapsY ? 'überdeckt Kategorie' : 'frei';
}

async function resizeBottom(page) {
  const ids = await page.$$eval('[data-testid^="canvas-tile-"]', (els) =>
    els
      .map((e) => ({
        id: e.dataset.tileId,
        row: Number((e.className.match(/row-start-(\d+)/) ?? [])[1] ?? 0),
      }))
      .sort((a, b) => b.row - a.row),
  );
  const target = ids[0];
  const card = page.getByTestId(`canvas-tile-${target.id}`);
  await card.scrollIntoViewIfNeeded();
  await card.click({ position: { x: 40, y: 100 } });
  const handle = page.getByTestId(`resize-handle-s-${target.id}`);
  await handle.scrollIntoViewIfNeeded();
  const hb = await handle.boundingBox();
  const before = await card.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x + hb.width / 2, hb.y - 60, { steps: 8 });
  const ghost = await page.getByTestId('canvas-drag-ghost').boundingBox();
  const during = await card.boundingBox();
  await page.mouse.up();
  return {
    tile: target.id,
    rowStart: target.row,
    tileMoved: Math.round(Math.abs(during.y - before.y)),
    ghostOffset: Math.round(Math.abs(ghost.y - during.y)),
  };
}

async function shrink(page) {
  const id = 'std_baseline_umsatz';
  const card = page.getByTestId(`canvas-tile-${id}`);
  await card.scrollIntoViewIfNeeded();
  await card.click({ position: { x: 30, y: 140 } });
  const handle = page.getByTestId(`resize-handle-se-${id}`);
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x - 400, hb.y - 400, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const box = await card.boundingBox();
  const scale = await card
    .locator('[data-testid="tile-fit-box"]')
    .getAttribute('data-fit-scale')
    .catch(() => null);
  return { size: `${Math.round(box.width)}×${Math.round(box.height)}`, scale: scale ?? '–' };
}

async function capture() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = startServer();
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const results = [];
  try {
    await waitForServer();
    const browser = await chromium.launch();
    for (const vp of VIEWPORTS) {
      for (const mode of ['bearbeiten', 'vorschau']) {
        const page = await browser.newPage({ viewport: vp });
        page.on('dialog', (d) => void d.accept());
        await page.goto(`${BASE_URL}/dashboard-vorschau.html?bereich=editor_v2`, {
          waitUntil: 'networkidle',
        });
        await page.getByTestId('dashboard-editor-shell-v2').waitFor({ timeout: 15000 });
        if (mode === 'vorschau') await page.getByTestId('preview-mode-button').click();
        await page.waitForTimeout(1200);
        const m = await page.evaluate(measure);
        const file = path.join(OUT_DIR, `${PHASE}-${vp.width}-${mode}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        const entry = { width: vp.width, mode, ...m, hash };
        if (mode === 'bearbeiten' && vp.width !== 375) entry.grip = await gripOverlap(page);
        if (mode === 'bearbeiten' && vp.width === 1440) {
          entry.resizeBottom = await resizeBottom(page);
          await page.goto(`${BASE_URL}/dashboard-vorschau.html?bereich=editor_v2`, {
            waitUntil: 'networkidle',
          });
          await page.getByTestId('dashboard-editor-shell-v2').waitFor();
          await page.waitForTimeout(800);
          entry.shrink = await shrink(page);
        }
        results.push(entry);
        console.log(`[174b ${PHASE}] ${vp.width} ${mode}`, JSON.stringify(entry));
        await page.close();
      }
    }
    await browser.close();
  } finally {
    server.kill();
  }
  manifest[PHASE] = { at: new Date().toISOString(), results };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  if (PHASE === 'nachher') writeReadme(manifest);
}

function row(r) {
  const list = (arr) =>
    arr.length
      ? `${arr.length} (${arr.slice(0, 3).join(', ')}${arr.length > 3 ? ', …' : ''})`
      : '0';
  return `| ${r.width} | ${r.mode} | ${r.tiles} | ${list(r.scrolling)} | ${list(r.protruding)} | ${r.minScale} | ${r.grip ?? '–'} | ${r.closeDateVisible ? 'sichtbar' : 'eingeklappt'} | ${r.standStand} | ${r.docOverflow} px | \`${r.hash.slice(0, 12)}\` |`;
}

function writeReadme(manifest) {
  const head =
    '| Breite | Modus | Kacheln | mit Scrollbereich | Inhalt ragt über Kachel | kleinster Faktor | Ziehgriff | „closeDate“-Text | „Stand Stand“ | Dok.-Überlauf | SHA-256 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |';
  const lines = [
    '# Auftrag 174b – Screenshot- und Messnachweis (Kacheln ohne Scrollen)',
    '',
    `Erzeugt mit \`node scripts/captureAuftrag174bGateScreenshots.mjs vorher|nachher <dist>\` (vorher: ${manifest.vorher?.at ?? '–'}, nachher: ${manifest.nachher.at}) auf der Editor-Vorschau mit Testdaten (\`dashboard-vorschau.html?bereich=editor_v2\`, Vorlage „Executive Dashboard“, 17 Kacheln). Vorher = Build von \`main\` (\`5e5d17ac\`), nachher = Branch \`auftrag-174b-kachel-lesbarkeit\`.`,
    'Bilddateien und `manifest.json` liegen lokal (`.gitignore`); committet wird nur diese Matrix.',
    '',
    'Spalten: *mit Scrollbereich* = Kachelkörper, Einpassfläche oder Region in der Kachel scrollt (overflow auto/scroll und Inhalt größer als die Fläche). *Inhalt ragt über Kachel* = sichtbares Element außerhalb der Kachelgrenze. *kleinster Faktor* = kleinster Einpassfaktor aller Kacheln (vorher ohne Einpassung = 1). *Ziehgriff* = Griff der gewählten Kachel „ARR“ gegenüber der Kategoriezeile.',
    '',
  ];
  for (const phase of ['vorher', 'nachher']) {
    if (!manifest[phase]) continue;
    lines.push(`## ${phase === 'vorher' ? 'Vorher' : 'Nachher'}`, '', head);
    for (const r of manifest[phase].results) lines.push(row(r));
    lines.push('');
  }
  lines.push('## Ziehen am unteren Griff (K6) und Verkleinern (K2), 1440 px', '');
  lines.push(
    '| Stand | Kachel (Startzeile) | Kachel verschoben | Abstand Vorschau ↔ Kachel | „Umsatzerlöse“ nach Verkleinern | Faktor |',
  );
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const phase of ['vorher', 'nachher']) {
    const r = manifest[phase]?.results.find((x) => x.width === 1440 && x.mode === 'bearbeiten');
    if (!r?.resizeBottom) continue;
    lines.push(
      `| ${phase} | ${r.resizeBottom.tile} (${r.resizeBottom.rowStart}) | ${r.resizeBottom.tileMoved} px | ${r.resizeBottom.ghostOffset} px | ${r.shrink.size} | ${r.shrink.scale} |`,
    );
  }
  const differ = (manifest.vorher?.results ?? []).every(
    (v, i) => v.hash !== manifest.nachher.results[i]?.hash,
  );
  lines.push('', `SHA-256 vorher/nachher je Paar verschieden: ${differ ? 'ja' : 'nein'}.`, '');
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), lines.join('\n'));
  console.log('[174b] README geschrieben.');
}

capture().catch((error) => {
  console.error(error);
  process.exit(1);
});
