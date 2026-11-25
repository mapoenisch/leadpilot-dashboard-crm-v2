#!/usr/bin/env node
/**
 * Auftrag 174a: Dashboard-Editor V2 nach dem Smoke-Test (L1–L7, F1, F2).
 * Messung und Screenshots gegen die vollständige App-Hülle mit lokalem Supabase
 * (Build mit VITE_SUPABASE_URL/ANON_KEY des lokalen Stacks, E2E-Nutzer manager-a aus dem Seed,
 * Org A auf Stufe 1, kein Client-Override).
 *
 * Aufruf:  node scripts/captureAuftrag174aGateScreenshots.mjs vorher   (Stand vor dem Fix)
 *          node scripts/captureAuftrag174aGateScreenshots.mjs nachher  (Stand mit Fix, schreibt README)
 *
 * Szenarien je Phase:
 *   - direkt-<w>:  Direktaufruf bei 1440/1059/768/375 px,
 *   - resize-<w>:  Start bei 1440 px mit beiden Seitenbereichen und Entwurf, dann
 *                  1280 → 1059 → 1024 → 900 → 768 → 375 → 1440 px,
 *   - abbrechen:   „Abbrechen“ ohne Entwurf, danach Neuladen (F2),
 *   - inspector:   ARR-Verlauf auswählen, Panel-Editor-Button zählen (F1).
 * Gemessen werden neben dem Dokument-Überlauf die tatsächliche Sichtbarkeit und Klickbarkeit von
 * „Speichern“/„Abbrechen“, die Arbeitsflächenbreite, Kachelinhalte außerhalb ihrer Rasterfläche,
 * die Erreichbarkeit des letzten ARR-Datenpunkts und ob die Dashboard-Info ungefragt als Blatt
 * erscheint. Schreibt nur Entwürfe (nie speichern); setzt die Stufe nur lokal und räumt auf.
 * Bilddateien und manifest.json bleiben lokal (.gitignore); committet wird nur README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-174a');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const PORT = 3175;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SB_URL = process.env.E2E_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON = process.env.E2E_SUPABASE_ANON_KEY;
const SERVICE = process.env.E2E_CLEANUP_KEY;
const PASSWORD = process.env.E2E_AUTH_PASSWORD || 'TestPassword123!';
const MANAGER_A = process.env.E2E_AUTH_EMAIL_MANAGER || 'manager-a@e2e.local';
const ADMIN_A = process.env.E2E_AUTH_EMAIL || 'admin-a@e2e.local';
const PHASE = process.argv[2];

const DIRECT_WIDTHS = [1440, 1059, 768, 375];
const RESIZE_STEPS = [1440, 1280, 1059, 1024, 900, 768, 375, 1440];
const HEIGHT = { 1440: 900, 1280: 800, 1059: 800, 1024: 768, 900: 800, 768: 1024, 375: 812 };

if (!['vorher', 'nachher', 'readme'].includes(PHASE)) {
  throw new Error('Phase fehlt: node scripts/captureAuftrag174aGateScreenshots.mjs vorher|nachher');
}
if (!['127.0.0.1', 'localhost'].includes(new URL(SB_URL).hostname)) {
  throw new Error('Harness 174a setzt Stufen nur gegen ein lokales Supabase.');
}
if (PHASE !== 'readme' && (!ANON || !SERVICE))
  throw new Error('E2E_SUPABASE_ANON_KEY und E2E_CLEANUP_KEY fehlen.');

async function api(pathAndQuery, init = {}, token = SERVICE, key = SERVICE) {
  const res = await fetch(`${SB_URL}${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${pathAndQuery}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function signIn(email) {
  const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Anmeldung ${email}: ${res.status}`);
  return res.json();
}

let orgA = null;
let managerId = null;
let hadRolloutRow = false;
let hadSwitchRow = false;

/** Ausgangszustand herstellen: nur Zeilen entfernen, die dieser Lauf angelegt hat. */
async function cleanup() {
  if (!orgA) return;
  if (!hadRolloutRow) {
    await api(`/rest/v1/dashboard_editor_rollout?organization_id=eq.${orgA}`, { method: 'DELETE' });
  }
  if (!hadSwitchRow) {
    await api(
      `/rest/v1/dashboard_editor_switches?organization_id=eq.${orgA}&user_id=eq.${managerId}`,
      { method: 'DELETE' },
    );
  }
}

/** Wie e2e/dashboard-rollout.spec.ts: Testnutzer muss umstellbar sein. */
async function ensureEligible(adminToken) {
  const rows = await api(
    '/rest/v1/rpc/dashboard_v1_v2_reconciliation',
    { method: 'POST', body: '{}' },
    adminToken,
    ANON,
  );
  const row = rows.find((r) => r.user_id === managerId);
  if (!row || ['gleich', 'nur_v2', 'keine_kopie'].includes(row.ergebnis_klasse)) return;
  if (row.entscheidung && row.entscheidung !== 'spaeter' && row.entscheidung_gueltig) return;
  await api(
    '/rest/v1/rpc/dashboard_rollout_decide',
    {
      method: 'POST',
      body: JSON.stringify({
        p_user_id: managerId,
        p_entscheidung: 'v2_behalten',
        p_expected_v1_revision: row.v1_revision,
        p_expected_v2_revision: row.v2_revision,
        p_expected_dashboard_id: row.v2_dashboard_id,
      }),
    },
    adminToken,
    ANON,
  );
}

async function savedState() {
  const rows = await api(
    `/rest/v1/dashboards?select=id,revision,config&user_id=eq.${managerId}&scope=eq.personal`,
  );
  return rows.map((r) => ({
    id: r.id,
    revision: r.revision,
    layoutHash: crypto
      .createHash('sha256')
      .update(JSON.stringify(r.config.tiles.map((t) => [t.id, t.layouts])))
      .digest('hex')
      .slice(0, 16),
  }));
}

/** Messung im Browser: Sichtbarkeit statt nur Dokument-Überlauf. */
function measureInPage() {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const byId = (id) => document.querySelector(`[data-testid="${id}"]`);
  const rect = (el) => (el ? el.getBoundingClientRect() : null);

  function reachable(id) {
    const el = byId(id);
    if (!el) return { vorhanden: false, sichtbar: false, klickbar: false };
    const r = el.getBoundingClientRect();
    const sichtbar =
      r.width > 0 &&
      r.height > 0 &&
      r.left >= 0 &&
      r.right <= vw + 0.5 &&
      r.top >= 0 &&
      r.bottom <= vh + 0.5;
    const cx = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1);
    const hit = document.elementFromPoint(cx, cy);
    return {
      vorhanden: true,
      deaktiviert: Boolean(el.disabled),
      sichtbar,
      klickbar: sichtbar && Boolean(hit && (hit === el || el.contains(hit))),
      x: Math.round(r.left),
    };
  }

  function clippedBy(el, stop) {
    for (let p = el.parentElement; p && p !== stop.parentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') return p;
    }
    return null;
  }

  // Kachelinhalt außerhalb der Rasterfläche, der sichtbar über Nachbarn liegt
  const cells = [...document.querySelectorAll('[data-testid="editor-canvas"] [role="gridcell"]')];
  let ueberstehend = 0;
  let maxUeberstandPx = 0;
  for (const cell of cells) {
    const card = cell.querySelector('[data-testid="lazy-tile"]')?.firstElementChild;
    if (!card) continue;
    const c = cell.getBoundingClientRect();
    const k = card.getBoundingClientRect();
    const over = Math.max(k.bottom - c.bottom, k.right - c.right, 0);
    if (over <= 1) continue;
    const clip = clippedBy(card, cell);
    if (clip && cell.contains(clip)) continue; // im eigenen Kachelbereich eingefasst
    ueberstehend += 1;
    maxUeberstandPx = Math.max(maxUeberstandPx, Math.round(over));
  }

  // ARR-Verlauf: letzter Datenpunkt und Zeitangabe erreichbar?
  let arr = null;
  const region = [...document.querySelectorAll('[role="region"]')].find((r) =>
    (r.getAttribute('aria-label') || '').startsWith('ARR-Verlauf'),
  );
  if (region) {
    const before = region.scrollLeft;
    region.scrollLeft = region.scrollWidth;
    const texts = [...region.querySelectorAll('svg text')].filter(
      (t) => t.getAttribute('text-anchor') === 'middle' && Number(t.getAttribute('y')) > 200,
    );
    const last = texts[texts.length - 1];
    const rr = region.getBoundingClientRect();
    const lr = last?.getBoundingClientRect();
    const cell = region.closest('[role="gridcell"]');
    const cr = cell?.getBoundingClientRect();
    const scrollParent = cell ? clippedBy(region, cell) : null;
    // Ende im sichtbaren Bereich der Karte (nach Scrollen des Kachelbereichs bis zum Label)
    last?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const lr2 = last?.getBoundingClientRect();
    const sichtbar =
      Boolean(lr2 && cr) &&
      lr2.left >= Math.max(rr.left, cr.left) - 0.5 &&
      lr2.right <= Math.min(rr.right, cr.right) + 0.5 &&
      lr2.bottom <= vh + 0.5;
    arr = {
      scrollbar: region.scrollWidth > region.clientWidth,
      letztesLabel: last?.textContent ?? null,
      letztesLabelSichtbar: sichtbar,
      regionInKarte: Boolean(cr) && rr.right <= cr.right + 0.5 && rr.left >= cr.left - 0.5,
      kachelEingefasst: Boolean(scrollParent && cell.contains(scrollParent)),
      labelUnterhalbKarte: Boolean(lr && cr && lr.top > cr.bottom),
    };
    region.scrollLeft = before;
  }

  const inspector = byId('editor-inspector');
  const library = byId('widget-library');
  const shell = byId('dashboard-editor-shell-v2');
  const canvas = byId('editor-canvas');
  const actions = [byId('save-button'), byId('cancel-button')].filter(Boolean).map(rect);
  return {
    viewport: vw,
    shell: Math.round(rect(shell)?.width ?? 0),
    arbeitsflaeche: Math.round(rect(canvas)?.width ?? 0),
    arbeitsflaecheRechts: Math.round(rect(canvas)?.right ?? 0),
    bibliothek: library ? (library.dataset.sheet === 'true' ? 'blatt' : 'offen') : 'zu',
    info: inspector ? (inspector.dataset.sheet === 'true' ? 'blatt' : 'offen') : 'zu',
    inspectorRechts: Math.round(rect(inspector)?.right ?? 0),
    speichern: reachable('save-button'),
    abbrechen: reachable('cancel-button'),
    aktionenRechts: Math.round(Math.max(0, ...actions.map((r) => r.right))),
    entwurf: Boolean(byId('dirty-indicator')),
    kacheln: cells.length,
    ueberstehendeKacheln: ueberstehend,
    maxUeberstandPx,
    arr,
    panelEditorButtons: document.querySelectorAll('[data-testid="open-panel-editor-btn"]').length,
    dokumentUeberlaufPx: Math.max(
      0,
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw,
    ),
  };
}

let serverProcess = null;

async function startServer() {
  serverProcess = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'],
    { cwd: ROOT, stdio: 'inherit' },
  );
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.ok) return;
    } catch {
      /* wartet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server auf ${BASE_URL} nicht erreichbar.`);
}

async function openEditor(browser, width) {
  const context = await browser.newContext({
    viewport: { width, height: HEIGHT[width] ?? 900 },
    reducedMotion: 'reduce',
    hasTouch: width < 1024,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#login-email', MANAGER_A);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'));
  await page.evaluate(() => window.sessionStorage.removeItem('lp_dashboard_editor_v2'));
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.getByTestId('dashboard-editor-shell-v2').waitFor({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  return { context, page };
}

async function shoot(page, id) {
  await page.waitForTimeout(400);
  const filename = `${PHASE}-${id}.png`;
  const filepath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  const hash = crypto.createHash('sha256').update(fs.readFileSync(filepath)).digest('hex');
  const m = await page.evaluate(measureInPage);
  console.log(`  ✓ ${filename}: ${JSON.stringify(m)}`);
  return { id, filename, hash, ...m };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (PHASE === 'readme') {
    writeReadme(JSON.parse(fs.readFileSync(MANIFEST, 'utf8')));
    return;
  }
  const manager = await signIn(MANAGER_A);
  const admin = await signIn(ADMIN_A);
  managerId = manager.user.id;
  const [membership] = await api(
    `/rest/v1/organization_members?select=organization_id&user_id=eq.${managerId}&status=eq.active&limit=1`,
  );
  orgA = membership.organization_id;
  const existing = await api(
    `/rest/v1/dashboard_editor_rollout?select=stufe&organization_id=eq.${orgA}`,
  );
  hadRolloutRow = existing.length > 0 && existing[0].stufe >= 1;
  const switches = await api(
    `/rest/v1/dashboard_editor_switches?select=user_id&organization_id=eq.${orgA}&user_id=eq.${managerId}`,
  );
  hadSwitchRow = switches.length > 0;
  if (!hadRolloutRow) {
    await api('/rest/v1/dashboard_editor_rollout?on_conflict=organization_id', {
      method: 'POST',
      body: JSON.stringify({ organization_id: orgA, stufe: 1, notiz: 'Screenshots Auftrag 174a' }),
    });
  }
  await ensureEligible(admin.access_token);
  const gespeichertVorher = await savedState();

  await startServer();
  const records = [];
  try {
    const browser = await chromium.launch();

    console.log(`\n[174a/${PHASE}] Direktaufruf`);
    for (const w of DIRECT_WIDTHS) {
      const { context, page } = await openEditor(browser, w);
      records.push({ gruppe: 'direkt', ...(await shoot(page, `direkt-${w}`)) });
      await context.close();
    }

    console.log(`\n[174a/${PHASE}] Resize aus offener Desktop-Ansicht mit Entwurf`);
    {
      const { context, page } = await openEditor(browser, 1440);
      const select = page.getByTestId('global-timeframe-select');
      const current = await select.inputValue();
      await select.selectOption(current === 'jahr' ? 'quartal' : 'jahr');
      await page.getByTestId('dirty-indicator').waitFor();
      for (const [i, w] of RESIZE_STEPS.entries()) {
        await page.setViewportSize({ width: w, height: HEIGHT[w] ?? 900 });
        await page.waitForTimeout(500);
        records.push({ gruppe: 'resize', ...(await shoot(page, `resize-${i + 1}-${w}`)) });
      }
      await context.close();
    }

    console.log(`\n[174a/${PHASE}] Inspector mit ARR-Verlauf (F1)`);
    {
      const { context, page } = await openEditor(browser, 1440);
      const arrCell = page.locator('[role="gridcell"]', { hasText: 'ARR-Verlauf' }).first();
      await arrCell.click({ position: { x: 40, y: 12 } });
      await page.waitForTimeout(300);
      records.push({ gruppe: 'inspector', ...(await shoot(page, 'inspector-arr-1440')) });
      await context.close();
    }

    console.log(`\n[174a/${PHASE}] Abbrechen ohne Entwurf + Neuladen (F2)`);
    {
      const { context, page } = await openEditor(browser, 1440);
      await page.getByTestId('cancel-button').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const v2 = await page.getByTestId('dashboard-editor-shell-v2').count();
      const override = await page.evaluate(() =>
        window.sessionStorage.getItem('lp_dashboard_editor_v2'),
      );
      const rec = await shoot(page, 'abbrechen-neuladen-1440');
      records.push({ gruppe: 'abbrechen', ...rec, v2NachNeuladen: v2 > 0, override });
      console.log(`    V2 nach Neuladen: ${v2 > 0}, Override: ${override}`);
      await context.close();
    }

    await browser.close();
  } finally {
    serverProcess?.kill('SIGTERM');
  }

  const gespeichertNachher = await savedState();
  const unveraendert = JSON.stringify(gespeichertVorher) === JSON.stringify(gespeichertNachher);
  if (!unveraendert) throw new Error('[174a] Gespeicherte Layouts/Revisionen haben sich geändert.');

  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  manifest[PHASE] = {
    at: new Date().toISOString(),
    records,
    gespeichertUnveraendert: unveraendert,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  if (PHASE === 'nachher') writeReadme(manifest);
}

function yn(v) {
  return v ? 'ja' : 'nein';
}

function aktion(a, ohneEntwurf = false) {
  if (!a?.vorhanden) return '–';
  // „Speichern“ ist ohne Entwurf absichtlich deaktiviert (ältere Messungen ohne Feld `deaktiviert`)
  if (a.sichtbar && (a.deaktiviert || (ohneEntwurf && !a.klickbar))) return 'sichtbar, deaktiviert';
  return a.klickbar ? 'erreichbar' : a.sichtbar ? 'verdeckt' : `abgeschnitten (x=${a.x})`;
}

function row(r) {
  const arr = r.arr
    ? `${r.arr.letztesLabel ?? '–'}: ${r.arr.letztesLabelSichtbar ? 'erreichbar' : 'nicht erreichbar'}${r.arr.kachelEingefasst ? ', in Karte' : ''}`
    : '–';
  return `| ${r.viewport} | ${r.arbeitsflaeche} px | ${r.bibliothek} / ${r.info} | ${aktion(r.speichern, !r.entwurf)} / ${aktion(r.abbrechen)} | ${r.ueberstehendeKacheln} (max ${r.maxUeberstandPx} px) | ${arr} | ${yn(r.entwurf)} | ${r.dokumentUeberlaufPx} px | \`${r.hash.slice(0, 12)}\` |`;
}

function writeReadme(manifest) {
  const head =
    '| Breite | Arbeitsfläche | Bibliothek / Info | Speichern / Abbrechen | Überstehende Kacheln | ARR letzter Punkt | Entwurf | Dok.-Überlauf | SHA-256 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |';
  const section = (phase, gruppe) =>
    (manifest[phase]?.records ?? [])
      .filter((r) => r.gruppe === gruppe)
      .map(row)
      .join('\n');
  const vorher = manifest.vorher?.records ?? [];
  const nachher = manifest.nachher?.records ?? [];
  const paare = nachher.map((n) => {
    const v = vorher.find((x) => x.id === n.id);
    return { id: n.id, verschieden: v ? v.hash !== n.hash : null };
  });
  const gleich = paare.filter((p) => p.verschieden === false).map((p) => p.id);
  const f2v = vorher.find((r) => r.gruppe === 'abbrechen');
  const f2n = nachher.find((r) => r.gruppe === 'abbrechen');
  const f1v = vorher.find((r) => r.gruppe === 'inspector');
  const f1n = nachher.find((r) => r.gruppe === 'inspector');
  const lines = [
    '# Auftrag 174a – Screenshot- und Messnachweis (Editor V2 nach dem Smoke-Test)',
    '',
    `Erzeugt mit \`node scripts/captureAuftrag174aGateScreenshots.mjs vorher|nachher\` (vorher: ${manifest.vorher?.at ?? '–'}, nachher: ${manifest.nachher?.at ?? '–'}) gegen die vollständige App-Hülle mit lokalem Supabase, E2E-Nutzer \`manager-a\`, Org A auf Stufe 1, ohne Client-Override. Touch-Emulation unter 1024 px.`,
    'Bilddateien und `manifest.json` liegen lokal (`.gitignore`); committet wird nur diese Matrix. Der Harness schreibt nur Entwürfe und prüft, dass gespeicherte Layouts und Revisionen unverändert bleiben.',
    '',
    'Spalten: *Arbeitsfläche* = Breite von `editor-canvas`. *Speichern / Abbrechen* = Element liegt vollständig im Viewport und `elementFromPoint` trifft es. *Überstehende Kacheln* = Kachelinhalt ragt sichtbar über die eigene Rasterfläche (nicht in der Kachel eingefasst). *ARR letzter Punkt* = letztes Zeitachsen-Label von „ARR-Verlauf“ nach Scrollen sichtbar.',
    '',
    '## Direktaufruf',
    '',
    '### Vorher',
    '',
    head,
    section('vorher', 'direkt'),
    '',
    '### Nachher',
    '',
    head,
    section('nachher', 'direkt'),
    '',
    '## Resize aus offener Desktop-Ansicht mit Entwurf (1440 → 1280 → 1059 → 1024 → 900 → 768 → 375 → 1440)',
    '',
    '### Vorher',
    '',
    head,
    section('vorher', 'resize'),
    '',
    '### Nachher',
    '',
    head,
    section('nachher', 'resize'),
    '',
    '## F1 und F2',
    '',
    '| Prüfung | Vorher | Nachher |',
    '| --- | --- | --- |',
    `| F1: sichtbare Panel-Editor-Buttons ohne Handler (ARR-Verlauf gewählt, 1440 px) | ${f1v?.panelEditorButtons ?? '–'} | ${f1n?.panelEditorButtons ?? '–'} |`,
    `| F2: V2 nach „Abbrechen“ und Neuladen | ${yn(f2v?.v2NachNeuladen)} (Override \`${f2v?.override ?? 'keiner'}\`) | ${yn(f2n?.v2NachNeuladen)} (Override \`${f2n?.override ?? 'keiner'}\`) |`,
    '',
    '## Hash-Vergleich',
    '',
    `${paare.length} Paare, davon ${paare.filter((p) => p.verschieden).length} mit verschiedenem Hash.${gleich.length ? ` Gleich: ${gleich.join(', ')}.` : ''}`,
    `Gespeicherte Layouts und Revisionen nach beiden Läufen unverändert: ${yn(manifest.vorher?.gespeichertUnveraendert && manifest.nachher?.gespeichertUnveraendert)}.`,
    '',
  ];
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), lines.join('\n'));
  console.log('\n[Harness 174a] README geschrieben.');
}

main()
  .then(cleanup)
  .catch(async (err) => {
    console.error(err);
    serverProcess?.kill('SIGTERM');
    await cleanup().catch(() => {});
    process.exit(1);
  });
