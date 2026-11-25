#!/usr/bin/env node
/**
 * Auftrag 173 (P16a §2.2 Nr. 6): Lasttest Dashboard-Editor V2.
 *
 * Teil „server“: je Organisation (Konto A und B) N gleichzeitige Leser auf
 *   dashboard_crm_pipeline_overview und dashboard_time_series (lokales Supabase).
 * Teil „client“: 24 gemischte Kacheln im echten App-Pfad, wiederholtes Öffnen/Schließen über
 *   die eingestellte Dauer; gemessen werden Abfragen je Öffnen (geteilte Abfragen),
 *   Realtime-Abos (Beitritt/Austritt), Speichertrend nach erzwungener Speicherbereinigung
 *   und Bildwechselzeiten beim Ziehen einer Kachel.
 *
 * Aufruf (Umgebung wie CI-Job e2e: lokales Supabase, gebauter Vorschau-Server auf :4321):
 *   npx tsx scripts/loadTestDashboardV2.mjs [--server] [--client] [--minutes=10]
 *        [--readers=50] [--iterations=20] [--base=http://127.0.0.1:4321]
 *        [--out=artifacts/auftrag-173/loadtest.json]
 * Ohne --server/--client laufen beide Teile. Exit 1, wenn ein Zielwert verfehlt wird.
 *
 * Zielwerte (vor dem Lauf festgelegt, siehe docs/dashboard/GESAMTABNAHME_P16.md §3):
 *   Server: 0 Fehler, p95 je RPC < 1000 ms bei 50 Lesern je Organisation.
 *   Client: Abfragen je Öffnen < Kachelanzahl (geteilte Abfragen), nach jedem Schließen keine
 *   offenen Realtime-Abos (Beitritte = Austritte), Speicher letzte 20 % ≤ erste 20 % × 1,25,
 *   Bildwechsel beim Ziehen p95 < 50 ms.
 */
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import { getActiveEntries, minSizeFor } from '../src/features/dashboard/model/dashboardCatalog.ts';
import { validateDashboardConfig } from '../src/features/dashboard/model/dashboardValidation.ts';
import { migrateV1ToV2 } from '../src/features/dashboard/model/dashboardMigrationV1V2.ts';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);
const RUN_SERVER = args.server === 'true' || (!args.server && !args.client);
const RUN_CLIENT = args.client === 'true' || (!args.server && !args.client);
const MINUTES = Number(args.minutes ?? 10);
const READERS = Number(args.readers ?? 50);
const ITERATIONS = Number(args.iterations ?? 20);
const BASE = args.base ?? 'http://127.0.0.1:4321';
const OUT = args.out ?? 'artifacts/auftrag-173/loadtest.json';
const TILE_COUNT = 24;

const URL = process.env.VITE_SUPABASE_URL || process.env.E2E_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.E2E_SUPABASE_ANON_KEY;
const PASSWORD = process.env.E2E_AUTH_PASSWORD || 'TestPassword123!';
const ACCOUNTS = [
  process.env.E2E_AUTH_EMAIL || 'admin-a@e2e.local',
  process.env.E2E_AUTH_EMAIL_B || 'admin-b@e2e.local',
];
if (!URL || !ANON) {
  console.error(
    'VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY müssen gesetzt sein (lokales Supabase).',
  );
  process.exit(2);
}

function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  const q = (p) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null);
  const round = (v) => (v === null ? null : Math.round(v * 10) / 10);
  return {
    n: s.length,
    p50: round(q(0.5)),
    p95: round(q(0.95)),
    p99: round(q(0.99)),
    max: round(s.at(-1) ?? null),
  };
}

async function signIn(email) {
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Anmeldung ${email} fehlgeschlagen: ${error.message}`);
  const { data: member } = await client
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', data.user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  return {
    client,
    userId: data.user.id,
    orgId: member?.organization_id,
    token: data.session.access_token,
  };
}

// ------------------------------------------------------------------ Server
async function runServer() {
  const to = new Date();
  const from = new Date(to.getTime() - 90 * 86_400_000);
  const calls = {
    dashboard_crm_pipeline_overview: () => ({ p_pipeline: null }),
    dashboard_time_series: () => ({
      p_source: 'deal_stage_events',
      p_metric: '*',
      p_resolution: 'tag',
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_pipeline: null,
    }),
  };
  const result = {};
  const sessions = await Promise.all(ACCOUNTS.map(signIn));
  const started = performance.now();
  await Promise.all(
    sessions.map(async (s, orgIndex) => {
      const lat = Object.fromEntries(Object.keys(calls).map((k) => [k, []]));
      const errors = Object.fromEntries(Object.keys(calls).map((k) => [k, 0]));
      const readers = Array.from({ length: READERS }, () =>
        createClient(URL, ANON, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${s.token}` } },
        }),
      );
      await Promise.all(
        readers.map(async (reader) => {
          for (let i = 0; i < ITERATIONS; i += 1) {
            for (const [name, params] of Object.entries(calls)) {
              const t0 = performance.now();
              const { error } = await reader.rpc(name, params());
              lat[name].push(performance.now() - t0);
              if (error) errors[name] += 1;
            }
          }
        }),
      );
      result[`org_${orgIndex === 0 ? 'A' : 'B'}`] = Object.fromEntries(
        Object.keys(calls).map((k) => [k, { ...stats(lat[k]), fehler: errors[k] }]),
      );
    }),
  );
  const seconds = (performance.now() - started) / 1000;
  const total = ACCOUNTS.length * READERS * ITERATIONS * Object.keys(calls).length;
  const pass = Object.values(result).every((org) =>
    Object.values(org).every((r) => r.fehler === 0 && r.p95 < 1000),
  );
  return {
    leserJeOrganisation: READERS,
    iterationen: ITERATIONS,
    aufrufe: total,
    sekunden: Math.round(seconds),
    aufrufeJeSekunde: Math.round(total / seconds),
    ergebnis: result,
    zielErreicht: pass,
  };
}

// ------------------------------------------------------------------ Client
function buildMixedConfig() {
  // Nach Datenquelle (Präfix der Katalog-ID) reihum mischen und die Darstellung je Runde wechseln,
  // damit Basiswerte, CRM-Aggregate, Live-Werte und Verläufe gemeinsam auf dem Raster liegen.
  const groups = new Map();
  for (const e of getActiveEntries().filter((x) => x.views.length > 0)) {
    const key = e.id.split('.')[0];
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const ordered = [];
  const lists = [...groups.values()];
  for (let i = 0; ordered.length < lists.reduce((a, l) => a + l.length, 0); i += 1) {
    for (const l of lists) if (l[i]) ordered.push(l[i]);
  }
  const tiles = [];
  for (let i = 0; tiles.length < TILE_COUNT && i < ordered.length * 3; i += 1) {
    const entry = ordered[i % ordered.length];
    const view = entry.views[(i + Math.floor(i / ordered.length)) % entry.views.length];
    const candidate = {
      tileId: `last-${tiles.length + 1}`,
      catalogId: entry.id,
      view,
      size: minSizeFor(entry, view),
      filterMode: entry.id.startsWith('baseline.') ? 'fester_stand' : 'dashboard',
    };
    const check = validateDashboardConfig({ version: 1, tiles: [...tiles, candidate] });
    if (check.ok && check.unavailable.length === 0) tiles.push(candidate);
  }
  if (tiles.length < TILE_COUNT) throw new Error(`Nur ${tiles.length} gültige Kacheln gefunden.`);
  return { version: 1, tiles };
}

async function runClient() {
  const s = await signIn(ACCOUNTS[0]);
  const v1 = buildMixedConfig();
  const v2 = migrateV1ToV2(v1, {
    id: 'lasttest',
    title: 'Lasttest 24 Kacheln',
    ownerUserId: s.userId,
    organizationId: s.orgId,
  });
  const { data: created, error } = await s.client.rpc('create_dashboard_v2', {
    p_title: 'Lasttest 24 Kacheln',
    p_config: v2,
    p_scope: 'personal',
  });
  if (error) throw new Error(`Dashboard anlegen fehlgeschlagen: ${error.message}`);
  const dashboardId = (Array.isArray(created) ? created[0] : created).dashboard_id;
  const views = [...new Set(v1.tiles.map((t) => t.view))];
  const quellen = [...new Set(v1.tiles.map((t) => t.catalogId.split('.')[0]))];

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const key = `leadpilot:active_dashboard_v2_id:${s.orgId}:${s.userId}`;
  await context.addInitScript(
    ([k, id]) => {
      window.sessionStorage.setItem('lp_dashboard_editor_v2', 'true');
      window.sessionStorage.setItem(k, id);
    },
    [key, dashboardId],
  );
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('HeapProfiler.enable');
  let joins = 0;
  let leaves = 0;
  cdp.on('Network.webSocketFrameSent', (e) => {
    const text = e.response?.payloadData ?? '';
    if (text.includes('"phx_join"') && !text.includes('"phoenix"')) joins += 1;
    if (text.includes('"phx_leave"')) leaves += 1;
  });
  let rpc = {};
  page.on('request', (r) => {
    const m = /\/rest\/v1\/rpc\/([a-z0-9_]+)/.exec(r.url());
    if (m) rpc[m[1]] = (rpc[m[1]] ?? 0) + 1;
  });

  await page.goto(`${BASE}/login`);
  await page.fill('#login-email', ACCOUNTS[0]);
  await page.fill('#login-password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'));

  // Erstes Öffnen per Adresse, danach nur noch In-App-Navigation: Das Dashboard hängt aus und
  // wieder ein, der JavaScript-Kontext bleibt bestehen. Nur so zeigen sich verwaiste Abos und
  // Speicherzuwachs (ein harter Seitenwechsel würde beides verdecken).
  await page.goto(`${BASE}/dashboard`);
  await page.getByTestId('dashboard-editor-shell-v2').waitFor({ timeout: 30_000 });
  const toDashboard = () => page.locator('a[href="/dashboard"]').first().click();
  const toOther = () => page.locator('a[href="/company/profile"]').first().click();
  await toOther();
  await page.waitForURL('**/company/profile');
  await page.waitForLoadState('networkidle');
  const cycles = [];
  const end = Date.now() + MINUTES * 60_000;
  let dragFrames = null;
  while (Date.now() < end || cycles.length < 2) {
    rpc = {};
    const joinsBefore = joins;
    const leavesBefore = leaves;
    const t0 = performance.now();
    await toDashboard();
    await page.getByTestId('dashboard-editor-shell-v2').waitFor({ timeout: 30_000 });
    await page
      .locator('[data-testid^="canvas-tile-"]')
      .nth(TILE_COUNT - 1)
      .waitFor({ timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    const openMs = performance.now() - t0;
    if (!dragFrames) dragFrames = await measureDrag(page);
    const dataCalls = Object.entries(rpc)
      .filter(
        ([n]) =>
          n.startsWith('dashboard_crm') || n.startsWith('dashboard_time') || n.startsWith('live_'),
      )
      .reduce((a, [, c]) => a + c, 0);
    await toOther();
    await page.waitForURL('**/company/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    await cdp.send('HeapProfiler.collectGarbage');
    const heap = await cdp.send('Runtime.getHeapUsage');
    cycles.push({
      oeffnenMs: Math.round(openMs),
      datenAbfragen: dataCalls,
      rpc: { ...rpc },
      aboBeitritte: joins - joinsBefore,
      aboAustritte: leaves - leavesBefore,
      heapMb: Math.round((heap.usedSize / 1048576) * 10) / 10,
    });
  }
  await browser.close();
  await s.client.rpc('delete_personal_dashboard_v2', {
    p_dashboard_id: dashboardId,
    p_expected_revision: 1,
  });

  const fifth = Math.max(1, Math.floor(cycles.length / 5));
  const avg = (a) => a.reduce((x, c) => x + c.heapMb, 0) / a.length;
  const heapStart = avg(cycles.slice(0, fifth));
  const heapEnd = avg(cycles.slice(-fifth));
  const maxQueries = Math.max(...cycles.map((c) => c.datenAbfragen));
  const openAbos = cycles.filter((c) => c.aboBeitritte !== c.aboAustritte).length;
  const frames = stats(dragFrames ?? []);
  const pass =
    maxQueries < TILE_COUNT &&
    openAbos === 0 &&
    heapEnd <= heapStart * 1.25 &&
    (frames.p95 ?? 0) < 50;
  return {
    kacheln: TILE_COUNT,
    darstellungen: views,
    quellen,
    minuten: MINUTES,
    zyklen: cycles.length,
    oeffnenMs: stats(cycles.map((c) => c.oeffnenMs)),
    datenAbfragenJeOeffnen: { max: maxQueries, beispiel: cycles[1]?.rpc ?? cycles[0].rpc },
    zyklenMitOffenenAbos: openAbos,
    aboBeitritteJeOeffnen: stats(cycles.map((c) => c.aboBeitritte)),
    speicherMb: {
      anfang: Math.round(heapStart * 10) / 10,
      ende: Math.round(heapEnd * 10) / 10,
      verlauf: cycles.map((c) => c.heapMb),
    },
    ziehenBildwechselMs: frames,
    zielErreicht: pass,
  };
}

async function measureDrag(page) {
  const handle = page.locator('[data-testid^="drag-handle-"]').first();
  if (!(await handle.count())) return [];
  const box = await handle.boundingBox();
  if (!box) return [];
  await page.evaluate(() => {
    window.__lpFrames = [];
    let last = performance.now();
    const tick = (t) => {
      window.__lpFrames.push(t - last);
      last = t;
      if (window.__lpFrames.length < 400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 60; i += 1) {
    await page.mouse.move(box.x + box.width / 2 + i * 6, box.y + box.height / 2 + i * 3);
  }
  await page.mouse.up();
  // Ziehen nur zur Messung: Änderung zurücknehmen, damit kein Entwurf die Navigation blockiert.
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
  await page.keyboard.press('Escape');
  const frames = await page.evaluate(() => window.__lpFrames.slice(1));
  return frames;
}

const report = { auftrag: 173, erstellt: new Date().toISOString() };
if (RUN_SERVER) report.server = await runServer();
if (RUN_CLIENT) report.client = await runClient();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, (k, v) => (k === 'verlauf' ? `[${v.length} Werte]` : v), 2));
const ok =
  (!report.server || report.server.zielErreicht) && (!report.client || report.client.zielErreicht);
process.exit(ok ? 0 : 1);
