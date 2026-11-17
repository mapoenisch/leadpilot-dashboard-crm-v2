#!/usr/bin/env node
/**
 * Auftrag 163: Dashboard-Editor: Team-Freigaben in der Oberfläche (P11b).
 * Screenshot-Harness für die Abnahmematrix (§2.6 Nr. 35):
 * 1. Switcher mit Gruppen (Persönlich, Team: Vertrieb, Vorlagen)
 * 2. Leseansicht mit Hinweisbalken ('Leseansicht – Team Vertrieb') und ausgegrauten/versteckten Aktionen
 * 3. Dialog 'Mit Team teilen' mit Team-Auswahl
 * 4. Dialog 'Rechte entzogen' mit Optionen 'Verwerfen' und 'Als persönliche Kopie sichern'
 * 5. Admin-Teams-Verwaltung (/admin/teams) mit Team-Tabelle und geöffnetem Mitgliederbereich
 * Viewports: 1440 × 900, 768 × 1024, 375 × 812 px, je hell und dunkel.
 * Misst horizontalen Überlauf (0 px Pflicht) und SHA-256-Hashes.
 * Schreibt docs/screenshots/auftrag-163/README.md (Bilder bleiben lokal, .gitignore).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/screenshots/auftrag-163');
const PORT = 3163;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 768, height: 1024, name: '768' },
  { width: 375, height: 812, name: '375' },
];

const THEMES = ['dunkel', 'hell'];

const b64url = (val) => Buffer.from(JSON.stringify(val)).toString('base64url');

async function mockAdminAndTeams(context) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: '11111111-1111-1111-1111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin-a@e2e.local',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
    sub: user.id,
    email: user.email,
    role: 'authenticated',
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
  })}.mock`;

  await context.addInitScript(
    ({ t, u }) => {
      window.sessionStorage.setItem('lp_dashboard_editor_v2', 'true');
      const authData = {
        access_token: t,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock-refresh',
        user: u,
      };
      for (const k of [
        'sb-127.0.0.1-auth-token',
        'sb-localhost-auth-token',
        'sb-leadpilot-crm-auth-token',
      ]) {
        window.localStorage.setItem(k, JSON.stringify(authData));
      }
    },
    { t: token, u: user },
  );

  await context.route(/http:\/\/(127\.0\.0\.1|localhost):54321\/.*/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    }
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
        body: JSON.stringify(body),
      });

    if (url.pathname.includes('/auth/v1/token')) {
      return json({
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'mock-refresh',
        user,
      });
    }
    if (url.pathname.includes('/auth/v1/user')) {
      return json(user);
    }
    if (url.pathname.includes('/rest/v1/organization_members')) {
      return json({
        organization_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: user.id,
        role: 'admin',
        status: 'active',
        organizations: { status: 'active', name: 'LeadPilot Enterprise' },
      });
    }
    if (
      url.pathname.includes('/rpc/list_dashboard_teams_v2') ||
      url.pathname.includes('/rest/v1/dashboard_teams_v2')
    ) {
      return json([
        {
          id: 'team-1',
          name: 'Vertrieb DACH',
          description: 'Vertriebsteam für Deutschland, Österreich und die Schweiz',
          member_count: 3,
          dashboard_count: 2,
          can_write: true,
          is_member: true,
        },
        {
          id: 'team-2',
          name: 'Marketing & Brand',
          description: 'Zentrales Marketingteam',
          member_count: 2,
          dashboard_count: 1,
          can_write: true,
          is_member: true,
        },
      ]);
    }
    if (
      url.pathname.includes('/rpc/list_dashboard_team_members_v2') ||
      url.pathname.includes('/rest/v1/dashboard_team_members_v2')
    ) {
      return json([
        {
          user_id: '22222222-2222-2222-2222-222222222222',
          email: 'manager-a@e2e.local',
          org_role: 'manager',
          org_status: 'active',
          team_role: 'member',
          created_at: new Date().toISOString(),
        },
        {
          user_id: '33333333-3333-3333-3333-333333333333',
          email: 'viewer-a@e2e.local',
          org_role: 'viewer',
          org_status: 'active',
          team_role: 'member',
          created_at: new Date().toISOString(),
        },
      ]);
    }
    if (url.pathname.includes('/functions/v1/manage-members')) {
      return json({
        members: [
          { id: '11111111-1111-1111-1111-111111111111', email: 'admin-a@e2e.local', role: 'admin' },
          { id: '22222222-2222-2222-2222-222222222222', email: 'manager-a@e2e.local', role: 'manager' },
          { id: '33333333-3333-3333-3333-333333333333', email: 'viewer-a@e2e.local', role: 'viewer' },
        ],
        invitations: [],
      });
    }
    return json([]);
  });
}

const SCENARIOS = [
  {
    id: 'switcher-gruppen',
    title: 'Switcher mit Gruppen (Persönlich, Team: Vertrieb, Vorlagen)',
    path: '/dashboard-vorschau.html?bereich=editor_v2&teams=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const btn = page.getByTestId('dashboard-switcher-button');
      await btn.waitFor({ state: 'visible', timeout: 10000 });
      await btn.click();
      await page.waitForSelector('[data-testid="dashboard-switcher-menu"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'leseansicht-hinweisbalken',
    title: 'Leseansicht mit Hinweisbalken ("Leseansicht – Team") und gesperrten Aktionen',
    path: '/dashboard-vorschau.html?bereich=editor_v2&teams=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const btn = page.getByTestId('dashboard-switcher-button');
      await btn.waitFor({ state: 'visible', timeout: 10000 });
      await btn.click();
      const readItem = page.locator('[data-testid^="dashboard-item-"]', { hasText: 'Management Übersicht' });
      await readItem.waitFor({ state: 'visible', timeout: 5000 });
      await readItem.click();
      await page.waitForSelector('[data-testid="readonly-notice-banner"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'teilen-dialog',
    title: 'Dialog "Mit Team teilen" mit Team-Auswahl',
    path: '/dashboard-vorschau.html?bereich=editor_v2&teams=1',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const switcherBtn = page.getByTestId('dashboard-switcher-button');
      await switcherBtn.waitFor({ state: 'visible', timeout: 10000 });
      await switcherBtn.click();
      const shareMenuItem = page.getByTestId('share-with-team-menu-item');
      await shareMenuItem.waitFor({ state: 'visible', timeout: 5000 });
      await shareMenuItem.click();
      await page.waitForSelector('[data-testid="share-team-select"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'rechteentzug-dialog',
    title: 'Dialog "Rechte entzogen" mit Optionen "Verwerfen" und "Als Kopie sichern"',
    path: '/dashboard-vorschau.html?bereich=editor_v2&teams=entzogen',
    prepare: async (page) => {
      await page.waitForSelector('[data-testid="dashboard-editor-shell-v2"]', { timeout: 15000 });
      const tf = page.getByTestId('global-timeframe-select');
      await tf.selectOption('letzte_7_tage');
      const saveBtn = page.getByTestId('save-button');
      await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
      await saveBtn.click();
      await page.waitForSelector('[data-testid="team-access-revoked-dialog"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
  {
    id: 'admin-teams-verwaltung',
    title: 'Admin-Teams-Verwaltung (/admin/teams) mit Tabelle und Mitgliederbereich',
    path: '/admin/teams',
    prepare: async (page) => {
      if (page.url().includes('/login')) {
        await page.fill('#login-email', 'admin-a@e2e.local');
        await page.fill('#login-password', 'TestPassword123!');
        await page.click('button[type="submit"]');
        await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
        await page.goto(`${BASE_URL}/admin/teams`, { waitUntil: 'networkidle' });
      }
      await page.waitForSelector('[data-testid="create-team-button"]', { timeout: 15000 });
      const manageBtn = page.locator('tr', { hasText: 'Vertrieb DACH' }).getByRole('button', { name: 'Mitglieder' });
      await manageBtn.waitFor({ state: 'visible', timeout: 5000 });
      await manageBtn.click();
      await page.waitForSelector('[data-testid="team-members-panel"]', { timeout: 5000 });
      await page.waitForTimeout(300);
    },
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${url}/dashboard-vorschau.html`);
      if (res.status === 200) return;
    } catch {}
    await sleep(300);
  }
  throw new Error(`Server nicht erreichbar unter: ${url}`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log(`[Harness 163] Starte vite dev server auf Port ${PORT}...`);
  const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    env: {
      ...process.env,
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    },
  });

  const stopServer = () => {
    try {
      server.kill('SIGTERM');
    } catch {}
  };
  process.on('exit', stopServer);
  process.on('SIGINT', () => {
    stopServer();
    process.exit(1);
  });

  try {
    await waitForServer(BASE_URL);
    console.log(`[Harness 163] Server läuft auf ${BASE_URL}`);

    const browser = await chromium.launch({ headless: true });
    const records = [];

    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        console.log(`\n[Viewport ${vp.name} (${vp.width}×${vp.height}), Theme: ${theme}]`);
        for (const sc of SCENARIOS) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: theme === 'hell' ? 'light' : 'dark',
            reducedMotion: 'reduce',
            deviceScaleFactor: 1,
          });

          await mockAdminAndTeams(context);
          const page = await context.newPage();

          await page.goto(`${BASE_URL}${sc.path}`, { waitUntil: 'networkidle' });
          await page.evaluate((th) => {
            const target = th === 'hell' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', target);
            if (target === 'light') {
              document.documentElement.classList.remove('dark');
              document.documentElement.classList.add('light');
            } else {
              document.documentElement.classList.remove('light');
              document.documentElement.classList.add('dark');
            }
          }, theme);
          await page.evaluate(() => document.fonts.ready);
          await sc.prepare(page, vp);

          const overflowPx = await page.evaluate(() => {
            const docEl = document.documentElement;
            const bodyEl = document.body;
            const scrollWidth = Math.max(docEl.scrollWidth, bodyEl.scrollWidth);
            const clientWidth = Math.min(docEl.clientWidth, bodyEl.clientWidth);
            return Math.max(0, scrollWidth - clientWidth);
          });

          if (overflowPx > 0) {
            throw new Error(
              `[Screenshot-Gate 163] Horizontaler Überlauf (${overflowPx} px) in Szenario "${sc.id}" (${vp.name}/${theme}) verletzt das 0-px-Kriterium.`,
            );
          }

          const filename = `${sc.id}-${vp.name}-${theme}.png`;
          const filepath = path.join(OUT_DIR, filename);
          await page.screenshot({ path: filepath, fullPage: false });

          const bytes = fs.readFileSync(filepath);
          const hash = crypto.createHash('sha256').update(bytes).digest('hex');

          records.push({
            scenarioId: sc.id,
            scenarioTitle: sc.title,
            viewport: vp.name,
            theme,
            dimensions: `${vp.width} × ${vp.height} px`,
            overflowPx,
            hash,
            filename,
          });

          console.log(`  ✓ ${filename}: overflow=${overflowPx}px, hash=${hash.slice(0, 12)}...`);
          await context.close();
        }
      }
    }

    await browser.close();

    // Verifikation: Hashes je Viewport/Theme müssen für alle 5 Szenarien unterschiedlich sein
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const rows = records.filter((r) => r.viewport === vp.name && r.theme === theme);
        const unique = new Set(rows.map((r) => r.hash));
        if (unique.size !== rows.length) {
          throw new Error(
            `Kollidierende Screenshots für ${vp.name}/${theme}: ${unique.size} ungleiche Hashes bei ${rows.length} Szenarien`,
          );
        }
      }
    }

    // README generieren
    const markdown = `# Abnahme-Screenshots Auftrag 163 (P11b Team-Freigaben in der Oberfläche)

**Erzeugt am:** ${new Date().toISOString()}  
**Auftrag:** 163 – Dashboard-Editor: Team-Freigaben in der Oberfläche (P11b)  
**Viewports:** 1440 × 900 (Desktop), 768 × 1024 (Tablet), 375 × 812 (Mobil)  
**Farbschemata:** Dunkel (Standard) und Hell  
**Horizontales Überlauf-Kriterium:** 0 px Pflicht auf allen Viewports  
**Sichtbarkeits-Kriterium:** Jeder Zustand erzeugt je Viewport/Farbschema einen eigenen SHA-256-Hash (keine identischen Bilder).

## Szenarien (§2.6 Nr. 35)

1. **Switcher mit Gruppen:** Persönlich, Team: Vertrieb, Vorlagen (\`switcher-gruppen\`)
2. **Leseansicht mit Hinweisbalken:** Hinweisbalken mit Teamname, ausgegraute/versteckte Aktionen (\`leseansicht-hinweisbalken\`)
3. **Dialog "Mit Team teilen":** Teamauswahl und Teilen-Aktion (\`teilen-dialog\`)
4. **Dialog "Rechte entzogen":** Optionen "Verwerfen" und "Als persönliche Kopie sichern" (\`rechteentzug-dialog\`)
5. **Admin-Teams-Verwaltung:** Team-Tabelle und geöffneter Mitgliederbereich (\`admin-teams-verwaltung\`)

## Nachweismatrix

| Szenario | Viewport | Thema | Abmessungen | Horizontaler Überlauf | SHA-256-Prüfsumme | Datei |
|---|---|---|---|---|---|---|
${records
  .map(
    (r) =>
      `| ${r.scenarioTitle} | ${r.viewport} | ${r.theme} | ${r.dimensions} | ${r.overflowPx} px | \`${r.hash}\` | \`${r.filename}\` |`,
  )
  .join('\n')}

## Zusammenfassung
- Gesamt-Screenshots: ${records.length} (5 Szenarien × 3 Viewports × 2 Farbschemata)
- Horizontaler Überlauf: **${Math.max(0, ...records.map((r) => r.overflowPx))} px** über alle Durchläufe (Kriterium 0 px: ${records.every((r) => r.overflowPx === 0) ? 'eingehalten' : 'verletzt'}).
- Prüfsummen-Eindeutigkeit: **vollständig eindeutig** je Viewport und Thema nachgewiesen (${records.length / 5} Durchläufe mit je 5 distinkten Hashes).
`;

    fs.writeFileSync(path.join(OUT_DIR, 'README.md'), markdown, 'utf8');
    console.log(
      `\n[Harness 163] Erfolgreich! README geschrieben nach docs/screenshots/auftrag-163/README.md`,
    );
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[Harness 163] FEHLER:', err);
  process.exit(1);
});
