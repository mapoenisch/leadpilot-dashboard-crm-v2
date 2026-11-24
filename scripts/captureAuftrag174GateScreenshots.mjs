#!/usr/bin/env node
/**
 * Auftrag 174: gestufte Umstellung (P16b §3 Nr. 8). Screenshot-Harness gegen die echte App mit
 * lokalem Supabase (Build mit VITE_SUPABASE_URL/ANON_KEY des lokalen Stacks, E2E-Nutzer aus
 * dem Seed). Zustandspaare auf 1440/768/375 px, je hell und dunkel:
 *   - Org A Stufe 0 (Vorher: alter Editor ohne Hinweis) -> Stufe 1 (Nachher: neuer Editor),
 *   - Rückweg (alter Editor mit Datenstand-Hinweis),
 *   - Wechsel bei offener Ansicht (Hinweis „ab dem nächsten Öffnen“),
 *   - Admin „Umstellung vorbereiten“ mit „Stand der Umstellung“.
 * Misst horizontalen Überlauf (0 px Pflicht), prüft paarweise verschiedene Hashes und schreibt
 * docs/screenshots/auftrag-174/README.md (Bilddateien bleiben lokal, .gitignore).
 * Setzt die Stufe nur gegen ein lokales Supabase und räumt danach auf.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-174');
const PORT = 3174;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SB_URL = process.env.E2E_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON = process.env.E2E_SUPABASE_ANON_KEY;
const SERVICE = process.env.E2E_CLEANUP_KEY;
const PASSWORD = process.env.E2E_AUTH_PASSWORD || 'TestPassword123!';
const MANAGER_A = process.env.E2E_AUTH_EMAIL_MANAGER || 'manager-a@e2e.local';
const ADMIN_A = process.env.E2E_AUTH_EMAIL || 'admin-a@e2e.local';

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 768, height: 1024, name: '768' },
  { width: 375, height: 812, name: '375' },
];
const THEMES = ['dunkel', 'hell'];

if (!['127.0.0.1', 'localhost'].includes(new URL(SB_URL).hostname)) {
  throw new Error('Harness 174 setzt Stufen nur gegen ein lokales Supabase.');
}
if (!ANON || !SERVICE) throw new Error('E2E_SUPABASE_ANON_KEY und E2E_CLEANUP_KEY fehlen.');

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

async function setStufe(stufe) {
  await api('/rest/v1/dashboard_editor_rollout?on_conflict=organization_id', {
    method: 'POST',
    body: JSON.stringify({ organization_id: orgA, stufe, notiz: 'Screenshots Auftrag 174' }),
  });
}

async function cleanup() {
  if (!orgA) return;
  await api(`/rest/v1/dashboard_editor_rollout?organization_id=eq.${orgA}`, { method: 'DELETE' });
  await api(
    `/rest/v1/dashboard_editor_switches?organization_id=eq.${orgA}&user_id=eq.${managerId}`,
    { method: 'DELETE' },
  );
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

const SCENARIOS = [
  {
    id: 'vorher-stufe0',
    title: 'Vorher: Org A Stufe 0 (alter Editor)',
    user: MANAGER_A,
    path: '/dashboard',
    before: async () => setStufe(0),
    ready: 'dashboard-workspace',
  },
  {
    id: 'nachher-stufe1',
    title: 'Nachher: Org A Stufe 1 (neuer Editor)',
    user: MANAGER_A,
    path: '/dashboard',
    before: async () => setStufe(1),
    ready: 'dashboard-editor-shell-v2',
  },
  {
    id: 'rueckweg',
    title: 'Rückweg: Stufe 0 mit Datenstand-Hinweis',
    user: MANAGER_A,
    path: '/dashboard',
    before: async () => setStufe(0),
    ready: 'dashboard-rueckweg-notice',
  },
  {
    id: 'wechsel-offen',
    title: 'Wechsel bei offener Ansicht (Hinweis)',
    user: MANAGER_A,
    path: '/dashboard',
    before: async () => setStufe(0),
    ready: 'dashboard-workspace',
    prepare: async (page) => {
      await setStufe(1);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.getByTestId('dashboard-editor-switch-notice').waitFor();
    },
  },
  {
    id: 'admin-uebersicht',
    title: 'Admin: Stand der Umstellung',
    user: ADMIN_A,
    path: '/admin/umstellung',
    before: async () => setStufe(1),
    ready: 'editor-rollout-overview',
  },
];

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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manager = await signIn(MANAGER_A);
  const admin = await signIn(ADMIN_A);
  managerId = manager.user.id;
  const [membership] = await api(
    `/rest/v1/organization_members?select=organization_id&user_id=eq.${managerId}&status=eq.active&limit=1`,
  );
  orgA = membership.organization_id;
  await ensureEligible(admin.access_token);

  await startServer();
  const records = [];
  try {
    const browser = await chromium.launch();
    for (const sc of SCENARIOS) {
      console.log(`\n[Szenario] ${sc.title} (${sc.id})`);
      for (const vp of VIEWPORTS) {
        for (const theme of THEMES) {
          await sc.before();
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            reducedMotion: 'reduce',
            hasTouch: vp.width < 1024,
            colorScheme: theme === 'hell' ? 'light' : 'dark',
          });
          const page = await context.newPage();
          await page.goto(`${BASE_URL}/login`);
          await page.fill('#login-email', sc.user);
          await page.fill('#login-password', PASSWORD);
          await page.click('button[type="submit"]');
          await page.waitForURL((url) => !url.pathname.includes('/login'));
          await page.evaluate(() => window.sessionStorage.removeItem('lp_dashboard_editor_v2'));
          await page.goto(`${BASE_URL}${sc.path}`, { waitUntil: 'networkidle' });
          await page.evaluate((th) => {
            document.documentElement.setAttribute('data-theme', th === 'hell' ? 'light' : 'dark');
          }, theme);
          await page.getByTestId(sc.ready).first().waitFor({ timeout: 30_000 });
          await page.evaluate(() => document.fonts.ready);
          if (sc.prepare) await sc.prepare(page);
          await page.waitForTimeout(500);

          const overflowPx = await page.evaluate(() => {
            const scrollWidth = Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            );
            return Math.max(0, scrollWidth - document.documentElement.clientWidth);
          });
          if (overflowPx > 0) {
            throw new Error(
              `[Screenshot-Gate 174] Überlauf ${overflowPx} px in "${sc.id}" (${vp.name}/${theme}).`,
            );
          }
          const filename = `${sc.id}-${vp.name}-${theme}.png`;
          const filepath = path.join(OUT_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: false });
          const hash = crypto.createHash('sha256').update(fs.readFileSync(filepath)).digest('hex');
          records.push({ ...sc, viewport: vp.name, theme, overflowPx, hash, filename });
          console.log(`  ✓ ${filename}: overflow=${overflowPx}px, hash=${hash.slice(0, 12)}…`);
          await context.close();
        }
      }
    }
    await browser.close();

    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const rows = records.filter((r) => r.viewport === vp.name && r.theme === theme);
        if (new Set(rows.map((r) => r.hash)).size !== rows.length) {
          throw new Error(`[Screenshot-Gate 174] Doppelte Hashes bei ${vp.name}/${theme}.`);
        }
      }
    }

    const lines = [
      '# Auftrag 174 – Screenshot-Nachweis (gestufte Umstellung)',
      '',
      `Erzeugt mit \`node scripts/captureAuftrag174GateScreenshots.mjs\` am ${new Date().toISOString()} gegen die App mit lokalem Supabase (E2E-Nutzer aus dem Seed).`,
      'Bilddateien liegen lokal (`.gitignore`); committet wird nur diese Matrix. Vorher/Nachher = Org A auf Stufe 0 bzw. 1; weitere Paare sind Zustandswechsel. Touch-Emulation auf 375/768.',
      '',
      '| Szenario | Viewport | Theme | Überlauf | SHA-256 (gekürzt) |',
      '| --- | --- | --- | --- | --- |',
      ...records.map(
        (r) =>
          `| ${r.title} | ${r.viewport} | ${r.theme} | ${r.overflowPx} px | \`${r.hash.slice(0, 16)}\` |`,
      ),
      '',
      `Ergebnis: ${records.length} Aufnahmen, 0 px horizontaler Überlauf, Hashes je Viewport/Theme paarweise verschieden.`,
      '',
    ];
    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), lines.join('\n'));
    console.log(`\n[Harness 174] ${records.length} Aufnahmen, README geschrieben.`);
  } finally {
    serverProcess?.kill('SIGTERM');
    await cleanup();
  }
}

main().catch(async (err) => {
  console.error(err);
  serverProcess?.kill('SIGTERM');
  await cleanup().catch(() => {});
  process.exit(1);
});
