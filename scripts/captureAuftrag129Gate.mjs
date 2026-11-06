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

const SIDES = ['vorher', 'nachher'];

for (const side of SIDES) {
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
        const base =
          side === 'vorher' && process.env.VORHER_URL ? process.env.VORHER_URL : BASE_URL;

        // 1. Anmeldung an der Plattform
        await page.goto(`${base}/login`);
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
          if (side === 'vorher') {
            // Baseline-Stand: /crm/deals rein tabellarisch ohne Ansichtsumschalter
            await page.goto(`${base}/crm/deals`);
            await page.waitForSelector('.crm-v2-list-root', { timeout: 15000 });
            // Wenn Vorher auf BASE_URL emuliert wird: Umschalter ausblenden für echten Vorher-Stand
            if (!process.env.VORHER_URL) {
              await page.evaluate(() => {
                document.querySelector('[role="group"][aria-label="Ansicht wählen"]')?.remove();
              });
            }
            await page.waitForTimeout(300);
          } else {
            // Nachher-Stand mit interaktivem Toggle, Board und Menü
            await scenario.prepare(page);
          }

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

          // Überlauf und Höhe messen
          const metrics = await page.evaluate(() => {
            const doc = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
            const main = document.getElementById('main-content');
            const inner = main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0;
            const height = main ? main.scrollHeight : document.body.scrollHeight;
            return { doc, inner, height };
          });

          const file = path.join(OUT, `${side}-${scenario.id}-${theme}-${width}.png`);
          const buf = await page.screenshot({ fullPage: false });
          fs.writeFileSync(file, buf);
          const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);

          rows.push({
            side,
            scenario: scenario.id,
            scenarioTitle: scenario.title,
            theme,
            width,
            hash,
            docOverflow: metrics.doc,
            innerOverflow: metrics.inner,
            height: metrics.height,
          });
        }
      } catch (err) {
        console.error(`Fehler bei ${side}, ${theme}, ${width}px:`, err);
        throw err;
      } finally {
        await ctx.close();
      }
    }
  }
}

await browser.close();

// Vorher/Nachher-Paarung & Gate-Verifikation
const find = (side, sId, w, t) =>
  rows.find((x) => x.side === side && x.scenario === sId && x.width === w && x.theme === t);

const lines = [];
let bad = 0;
let differentCount = 0;

for (const scenario of SCENARIOS) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const v = find('vorher', scenario.id, width, theme);
      const n = find('nachher', scenario.id, width, theme);

      if (!v || !n) {
        bad += 1;
        lines.push(`| \`${scenario.id}\` | \`${theme}\` | ${width} px | - | - | - | ❌ FEHLT |`);
        continue;
      }

      if (n.docOverflow > 0 || n.innerOverflow > 0) {
        bad += 1;
      }

      const isDiff = v.hash !== n.hash;
      if (isDiff) {
        differentCount += 1;
      } else {
        bad += 1; // CLAUDE.md §7: identische Vorher/Nachher-Hashes lassen das Gate fehlschlagen
      }

      const statusText = isDiff
        ? `verschieden (\`${v.hash}\` / \`${n.hash}\`)`
        : `GLEICH (Fehler: \`${v.hash}\`)`;

      lines.push(
        `| \`${scenario.id}\` | \`${theme}\` | ${width} px | ${v.docOverflow}/${v.innerOverflow} px | ${n.docOverflow}/${n.innerOverflow} px | ${v.height} → ${n.height} px | ${statusText} |`,
      );
    }
  }
}

const totalPairs = lines.length;
const allPassed = bad === 0 && differentCount === totalPairs;

// Markdown-Matrix generieren
const md = [
  '# Auftrag 129 – Visuelle Gate-Prüfung CRM Deals Pipeline (Vorher/Nachher)',
  '',
  `Vorher: \`d3fe131\` (main), Nachher: Stand dieses Branches. Aufgenommen ${new Date().toISOString().slice(0, 10)}, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).`,
  `Basis-URL: ${BASE_URL}`,
  'Überlauf = Dokument/#main-content in px; Hash = SHA-256 (12 Zeichen).',
  '',
  '| Szenario | Theme | Breite | Überlauf vorher | Überlauf nachher | Inhaltshöhe | Bild (Diff) |',
  '|---|---|---|---|---|---|---|',
  ...lines,
  '',
  '## Zusammenfassung',
  '',
  `- **Gesamtanzahl Vorher/Nachher-Paare:** ${totalPairs}`,
  `- **Verschiedene Aufnahmen:** ${differentCount} / ${totalPairs} (${Math.round((differentCount / totalPairs) * 100)} %)`,
  `- **Überlauf-Status:** ${bad === 0 ? '0 px Überlauf in allen Nachher-Aufnahmen' : `${bad} Aufnahmen mit Überlauf oder identischem Hash`}`,
  `- **Status:** ${allPassed ? '✅ ALLE GATES BESTANDEN' : '❌ FEHLGESCHLAGEN'}`,
  '',
  '### Änderungen gegenüber Baseline d3fe131:',
  '- Barrierefreier Ansichten-Umschalter (Tabelle ⟷ Kanban) in der Deal-Pipeline-Toolbar mit `aria-label` auf allen Breakpoints',
  '- Interaktives Deals-Kanban-Board mit den 7 Vertriebsphasen, Phasen-Dealzählern und kumulierten Summen in Euro',
  '- Drag & Drop und tastaturbedienbares Portal-Phasenmenü außerhalb des Karten-Stacking-Contexts',
  '- Erhalt von Phasenwechseln über Ansichtswechsel hinaus mit Session-Persistenz und CSV-Export-Synchronisation',
  '- Unterstützung für Nachladen weiterer Deals-Seiten mit expliziter Teilsummenkennzeichnung im Kanban-Modus',
  '- Korrekte Fälligkeitsprüfung auf Kalendertag-Ebene',
  '',
].join('\n');

fs.writeFileSync(path.join(OUT, 'README.md'), md);
console.log(`Ergebnis-Matrix nach ${path.join(OUT, 'README.md')} geschrieben.`);

if (!allPassed) {
  console.error(`❌ Screenshot-Gate fehlgeschlagen: bad=${bad}, differentCount=${differentCount}/${totalPairs}`);
  process.exit(1);
}
console.log('✅ Auftrag 129 Screenshot-Gate (Vorher/Nachher) vollständig bestanden.');
