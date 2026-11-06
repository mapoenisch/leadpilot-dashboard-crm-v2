#!/usr/bin/env node
/**
 * Auftrag 129: Screenshot-Gate-Nachweis für die CRM Deals Pipeline
 * (/crm/deals in Tabellen- und interaktiver Kanban-Ansicht)
 * bei 1440/768/375 px, beide Themes (dark/light mit data-theme).
 * Misst Überlauf (Dokument, #main-content), Inhaltshöhe, SHA-256 des Bildes; schreibt die textuelle Matrix
 * docs/screenshots/auftrag-129/README.md. Bilder bleiben lokal (.gitignore).
 * Aufruf: node scripts/captureAuftrag129Gate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-129');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_AUTH_EMAIL ?? 'admin-a@e2e.local';
const PASSWORD = process.env.E2E_AUTH_PASSWORD ?? 'TestPassword123!';
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];

const MOCK_DEALS = [
  {
    id: 'd-001',
    dealName: 'Cloud Migration Pilot',
    stage: 'Lead eingegangen',
    amount: 25000,
    closeDate: '2026-12-31',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'd-002',
    dealName: 'AI Data Ingestion Hub',
    stage: 'Lead eingegangen',
    amount: 18000,
    closeDate: '2026-11-15',
    pipeline: 'Data Platform',
  },
  {
    id: 'd-003',
    dealName: 'Security Audit & Compliance',
    stage: 'Erstgespräch geführt',
    amount: 15000,
    closeDate: '2026-10-30',
    pipeline: 'Compliance',
  },
  {
    id: 'd-004',
    dealName: 'Enterprise CRM Full Rollout',
    stage: 'Bedarfsanalyse',
    amount: 85000,
    closeDate: '2026-12-15',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'd-005',
    dealName: 'Marketing Automation Suite',
    stage: 'Angebot erstellt',
    amount: 40000,
    closeDate: '2026-11-20',
    pipeline: 'Marketing Tech',
  },
  {
    id: 'd-006',
    dealName: 'FinOps Analytics Platform',
    stage: 'Verhandlung',
    amount: 65000,
    closeDate: '2026-10-15',
    pipeline: 'FinOps',
  },
  {
    id: 'd-007',
    dealName: 'Legacy ERP Modernization',
    stage: 'Deal gewonnen',
    amount: 120000,
    closeDate: '2026-06-30',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'd-008',
    dealName: 'Global Realtime Pipeline',
    stage: 'Deal gewonnen',
    amount: 95000,
    closeDate: '2026-08-31',
    pipeline: 'Data Platform',
  },
  {
    id: 'd-009',
    dealName: 'On-Premises Dedicated Server',
    stage: 'Deal verloren',
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

fs.mkdirSync(OUT, { recursive: true });

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch {
    const fallback =
      '/Users/marcpoenisch/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
    if (fs.existsSync(fallback)) {
      return await chromium.launch({ executablePath: fallback });
    }
    throw new Error('Chromium executable not found');
  }
}

const browser = await launchBrowser();
const rows = [];

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
    });

    // Interception für crm-query-export, um deterministische Daten zu garantieren
    await ctx.route(/\/functions\/v1\/crm-query-export/, async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          },
        });
        return;
      }
      await route.fulfill({
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: MOCK_DEALS,
          total: MOCK_DEALS.length,
          page: 1,
          pageSize: 100,
          resource: 'deals',
        }),
      });
    });

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

      // Theme global für diesen Kontext setzen
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

      // 2. Szenarien durchlaufen
      for (const scenario of SCENARIOS) {
        await scenario.prepare(page);

        // Theme nach DOM-Aufbau sicherstellen
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

        // Überlauf messen
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          const main = document.getElementById('main-content');
          const inner = main ? main.scrollWidth - main.clientWidth : 0;
          return { doc, inner };
        });

        const file = path.join(OUT, `${scenario.id}-${theme}-${width}.png`);
        const buf = await page.screenshot({ fullPage: false });
        fs.writeFileSync(file, buf);
        const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);

        rows.push({
          scenario: scenario.id,
          theme,
          width,
          hash,
          docOverflow: overflow.doc,
          innerOverflow: overflow.inner,
          status: overflow.doc === 0 ? '✅ PASS' : '❌ FAIL',
        });
      }
    } catch (err) {
      console.error(`Fehler bei ${theme}, ${width}px:`, err);
      throw err;
    } finally {
      await ctx.close();
    }
  }
}

await browser.close();

// Markdown-Matrix generieren
const md = [
  '# Auftrag 129 – Visuelle Gate-Prüfung CRM Deals (Tabelle & Kanban)',
  '',
  `Generiert am: ${new Date().toISOString()}`,
  `Basis-URL: ${BASE_URL}`,
  '',
  '| Szenario | Theme | Breite | SHA-256 (12) | Doc Overflow | Inner Overflow | Status |',
  '|---|---|---|---|---|---|---|',
  ...rows.map(
    (r) =>
      `| \`${r.scenario}\` | \`${r.theme}\` | ${r.width} px | \`${r.hash}\` | ${r.docOverflow} px | ${r.innerOverflow} px | ${r.status} |`,
  ),
  '',
  '## Zusammenfassung',
  '',
  `- **Gesamtanzahl Aufnahmen:** ${rows.length}`,
  `- **Erfolgreich (0 px Doc Overflow):** ${rows.filter((r) => r.docOverflow === 0).length} / ${rows.length}`,
  `- **Status:** ${rows.every((r) => r.docOverflow === 0) ? '✅ ALLE GATES BESTANDEN' : '❌ FEHLGESCHLAGEN'}`,
  '',
].join('\n');

fs.writeFileSync(path.join(OUT, 'README.md'), md);
console.log(`Ergebnis-Matrix nach ${path.join(OUT, 'README.md')} geschrieben.`);

const allPassed = rows.every((r) => r.docOverflow === 0);
if (!allPassed) {
  process.exit(1);
}
console.log('✅ Auftrag 129 Screenshot-Gate vollständig bestanden.');
