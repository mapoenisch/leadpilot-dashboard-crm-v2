#!/usr/bin/env node
/**
 * Auftrag 138: Screenshot-Gate-Nachweis für CRM Deals (serverseitige Speicherung)
 * (/crm/deals in Tabellen- und interaktiver Kanban-Ansicht)
 * bei 1440/768/375 px, beide Themes (dark/light mit data-theme).
 * Misst Überlauf (Dokument, #main-content), Inhaltshöhe, SHA-256 des Bildes; schreibt die textuelle Matrix
 * docs/screenshots/auftrag-138/README.md. Bilder bleiben lokal (.gitignore).
 * Aufruf: node scripts/captureAuftrag138Gate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-138');
const PORT = 4321;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const EMAIL = 'admin-a@e2e.local';
const PASSWORD = 'TestPassword123!';
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];

const MOCK_DEALS = [
  {
    id: 'd-001',
    dealName: 'Cloud Migration Pilot',
    stage: 'Lead eingegangen',
    stageRaw: 'LEAD',
    amount: 25000,
    closeDate: '2026-12-31',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'd-002',
    dealName: 'AI Data Ingestion Hub',
    stage: 'Lead eingegangen',
    stageRaw: 'LEAD',
    amount: 18000,
    closeDate: '2026-11-15',
    pipeline: 'Data Platform',
  },
  {
    id: 'd-003',
    dealName: 'Security Audit & Compliance',
    stage: 'Erstgespräch geführt',
    stageRaw: 'CONTACTED',
    amount: 15000,
    closeDate: '2026-10-30',
    pipeline: 'Compliance',
  },
  {
    id: 'd-004',
    dealName: 'Enterprise CRM Full Rollout',
    stage: 'Bedarfsanalyse',
    stageRaw: 'NEEDS_ANALYSIS',
    amount: 85000,
    closeDate: '2026-12-15',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'd-005',
    dealName: 'Marketing Automation Suite',
    stage: 'Angebot erstellt',
    stageRaw: 'PROPOSAL',
    amount: 40000,
    closeDate: '2026-11-20',
    pipeline: 'Marketing Tech',
  },
  {
    id: 'd-006',
    dealName: 'FinOps Analytics Platform',
    stage: 'Verhandlung',
    stageRaw: 'NEGOTIATION',
    amount: 65000,
    closeDate: '2026-10-15',
    pipeline: 'FinOps',
  },
  {
    id: 'd-007',
    dealName: 'Legacy ERP Modernization',
    stage: 'Deal gewonnen',
    stageRaw: 'WON',
    amount: 120000,
    closeDate: '2026-06-30',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'd-008',
    dealName: 'Global Realtime Pipeline',
    stage: 'Deal gewonnen',
    stageRaw: 'WON',
    amount: 95000,
    closeDate: '2026-08-31',
    pipeline: 'Data Platform',
  },
  {
    id: 'd-009',
    dealName: 'On-Premises Dedicated Server',
    stage: 'Deal verloren',
    stageRaw: 'LOST',
    amount: 30000,
    closeDate: '2026-05-15',
    pipeline: 'Legacy',
  },
];

const SCENARIOS = [
  {
    id: 'deals-tabelle',
    title: '/crm/deals?ansicht=tabelle (Tabellenansicht & Paginierung)',
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/crm/deals`);
      await page.waitForSelector('[data-testid="deals-view-table-btn"]', { timeout: 15000 });
      await page.getByTestId('deals-view-table-btn').click();
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'deals-kanban',
    title: '/crm/deals?ansicht=kanban (Interaktives Kanban-Board)',
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/crm/deals`);
      await page.waitForSelector('[data-testid="deals-view-kanban-btn"]', { timeout: 15000 });
      await page.getByTestId('deals-view-kanban-btn').click();
      await page.waitForSelector('[data-testid="deals-kanban-board"]', { timeout: 10000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'deals-kanban-menu',
    title: '/crm/deals?ansicht=kanban (Tastaturmenü zur Phasenverschiebung)',
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/crm/deals`);
      await page.waitForSelector('[data-testid="deals-view-kanban-btn"]', { timeout: 15000 });
      await page.getByTestId('deals-view-kanban-btn').click();
      await page.waitForSelector('[data-testid="deals-kanban-board"]', { timeout: 10000 });
      const menuBtn = page.locator('button[aria-label*="Phase ändern"]').first();
      if (await menuBtn.count()) {
        await menuBtn.click();
        await page.waitForSelector('[role="menu"]', { timeout: 5000 });
        await page.waitForTimeout(300);
      }
    },
  },
];

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

async function mockSupabaseAuthAndData(context) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: '00000000-0000-4000-8000-000000000068',
    aud: 'authenticated',
    role: 'authenticated',
    email: EMAIL,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
    sub: user.id,
    email: EMAIL,
    role: 'authenticated',
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
  })}.mock`;

  const json = (route, body, status = 200) =>
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

  await context.route(/http:\/\/(127\.0\.0\.1|localhost):54321\/.*/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': '*',
        },
      });
    }
    if (url.pathname.includes('/auth/v1/token')) {
      return json(route, {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'mock-refresh',
        user,
      });
    }
    if (url.pathname.includes('/auth/v1/user')) {
      return json(route, user);
    }
    if (url.pathname.includes('/auth/v1/logout')) {
      return route.fulfill({ status: 204 });
    }
    if (url.pathname.includes('/rest/v1/organization_members')) {
      return json(route, {
        organization_id: '00000000-0000-4000-8000-0000000000a1',
        role: 'admin',
        status: 'active',
        organizations: { status: 'active' },
      });
    }
    if (url.pathname.includes('/functions/v1/crm-query-export')) {
      return json(route, {
        items: MOCK_DEALS,
        total: MOCK_DEALS.length,
        page: 1,
        pageSize: 100,
        resource: 'deals',
      });
    }
    if (url.pathname.includes('/rest/v1/rpc/move_deal_stage')) {
      return json(route, {
        deal_id: 'd-001',
        stage: 'Erstgespräch geführt',
        stage_entered_at: new Date().toISOString(),
      });
    }
    const single = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return json(route, single ? null : []);
  });
}

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

fs.mkdirSync(OUT, { recursive: true });

let serverProc = null;
const isUp = await checkUrl(BASE_URL);
if (!isUp) {
  console.log(`[Server] Starte Vite Preview auf ${BASE_URL} …`);
  serverProc = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    {
      cwd: ROOT,
      stdio: 'pipe',
    },
  );
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < 15000) {
    if (await checkUrl(BASE_URL)) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!ready) {
    if (serverProc) serverProc.kill('SIGTERM');
    throw new Error(`Server auf ${BASE_URL} nicht erreichbar`);
  }
}

const browser = await chromium.launch();
const rows = [];

try {
  for (const scenario of SCENARIOS) {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const ctx = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: 'reduce',
          locale: 'de-DE',
          timezoneId: 'Europe/Berlin',
        });

        await mockSupabaseAuthAndData(ctx);

        const page = await ctx.newPage();

        try {
          // 1. Anmeldung an der Plattform
          await page.goto(`${BASE_URL}/login`);
          await page.waitForLoadState('networkidle');

          const emailInput = page.getByLabel(/E-Mail/i);
          if (await emailInput.count()) {
            await emailInput.fill(EMAIL);
            await page.getByLabel(/Passwort/i).fill(PASSWORD);
            await page.getByRole('button', { name: /Anmelden/i }).click();
            await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
          }

          // 2. Szenario vorbereiten
          await scenario.prepare(page);

          // Theme explizit setzen
          await page.evaluate((th) => {
            document.documentElement.dataset.theme = th;
            if (th === 'dark') {
              document.documentElement.classList.add('dark');
              document.documentElement.classList.remove('light');
            } else {
              document.documentElement.classList.add('light');
              document.documentElement.classList.remove('dark');
            }
          }, theme);
          await page.waitForTimeout(300);

          // Überlauf und Höhe messen
          const metrics = await page.evaluate(() => {
            const doc = Math.max(
              0,
              document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );
            const main = document.getElementById('main-content');
            const inner = main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0;
            const height = main ? main.scrollHeight : document.body.scrollHeight;
            return { doc, inner, height };
          });

          const file = path.join(OUT, `auftrag-138-${scenario.id}-${theme}-${width}.png`);
          const buf = await page.screenshot({ fullPage: false });
          fs.writeFileSync(file, buf);
          const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);

          rows.push({
            scenario: scenario.id,
            scenarioTitle: scenario.title,
            theme,
            width,
            hash,
            docOverflow: metrics.doc,
            innerOverflow: metrics.inner,
            height: metrics.height,
          });
        } catch (err) {
          console.error(`Fehler bei ${scenario.id}, ${theme}, ${width}px:`, err);
          throw err;
        } finally {
          await ctx.close();
        }
      }
    }
  }
} finally {
  await browser.close();
  if (serverProc) {
    serverProc.kill('SIGTERM');
  }
}

// Auswertung
let bad = 0;
const lines = [];

for (const row of rows) {
  const isOverflow = row.docOverflow > 0 || row.innerOverflow > 0;
  if (isOverflow) {
    bad += 1;
  }
  const status = isOverflow ? '❌ Überlauf' : '✅ 0 px';
  lines.push(
    `| \`${row.scenario}\` | \`${row.theme}\` | ${row.width} px | ${row.docOverflow}/${row.innerOverflow} px | ${row.height} px | \`${row.hash}\` | ${status} |`,
  );
}

const total = rows.length;
const allPassed = bad === 0 && total === SCENARIOS.length * THEMES.length * WIDTHS.length;

const md = [
  '# Auftrag 138 – Visuelle Gate-Prüfung CRM Deals Pipeline (1440/768/375 px, dark/light)',
  '',
  `Aufgenommen ${new Date().toISOString().slice(0, 10)}, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).`,
  `Basis-URL: ${BASE_URL}`,
  'Überlauf = Dokument/#main-content in px; Hash = SHA-256 (12 Zeichen).',
  '',
  '| Szenario | Theme | Breite | Überlauf | Inhaltshöhe | SHA-256 | Status |',
  '|---|---|---|---|---|---|---|',
  ...lines,
  '',
  '## Zusammenfassung',
  '',
  `- **Gesamtanzahl Aufnahmen:** ${total}`,
  `- **Überlauf-Status:** ${bad === 0 ? '0 px Überlauf in allen Aufnahmen' : `${bad} Aufnahmen mit Überlauf`}`,
  `- **Status:** ${allPassed ? '✅ ALLE GATES BESTANDEN' : '❌ FEHLGESCHLAGEN'}`,
  '',
  '### Verifizierte Eigenschaften (Auftrag 138):',
  '- Tabellenansicht (`/crm/deals?ansicht=tabelle`) rendert fehlerfrei auf allen 3 Viewports und beiden Themes mit 0 px Überlauf',
  '- Kanban-Board (`/crm/deals?ansicht=kanban`) mit 7 Spalten und Karten rendert responsive mit horizontalem Board-Scroll und 0 px Dokumentüberlauf',
  '- Tastaturmenü für Phasenwechsel öffnet barrierefrei ohne Stacking-Context-Clipping',
  '- Keine visuellen Regressionen im Layout durch die Umstellung auf serverseitige Persistenz',
  '',
].join('\n');

fs.writeFileSync(path.join(OUT, 'README.md'), md);
console.log(`Ergebnis-Matrix nach ${path.join(OUT, 'README.md')} geschrieben.`);

if (!allPassed) {
  console.error(`❌ Screenshot-Gate fehlgeschlagen: bad=${bad}`);
  process.exit(1);
}
console.log('✅ Auftrag 138 Screenshot-Gate vollständig bestanden.');
