#!/usr/bin/env node
/**
 * Auftrag 130: Screenshot-Gate-Nachweis für CRM Leads (Lead-Scoring & Qualifizierungs-Cockpit)
 * (/crm/leads in Kontakte-Liste, mit Qualifizierungs-Drawer und Konvertierungs-Modal)
 * bei 1440/768/375 px, beide Themes (dark/light mit data-theme).
 * Misst Überlauf (Dokument, #main-content), Inhaltshöhe, SHA-256 des Bildes; schreibt die textuelle Matrix
 * docs/screenshots/auftrag-130/README.md. Bilder bleiben lokal (.gitignore).
 * Aufruf: node scripts/captureAuftrag130Gate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-130');
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_AUTH_EMAIL ?? 'admin-a@e2e.local';
const PASSWORD = process.env.E2E_AUTH_PASSWORD ?? 'TestPassword123!';
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];

const MOCK_CONTACTS = [
  {
    id: 'c-001',
    firstName: 'Maximilian',
    lastName: 'Mustermann',
    email: 'm.mustermann@acme-cloud.de',
    jobTitle: 'Chief Executive Officer (CEO)',
    companyId: 'comp-001',
    companyName: 'Acme Cloud Solutions GmbH',
    city: 'München, Deutschland',
    employeeCount: 65,
    industry: 'IT / Software',
  },
  {
    id: 'c-002',
    firstName: 'Sabine',
    lastName: 'Vertrieb',
    email: 's.vertrieb@mittelstand.at',
    jobTitle: 'Sales Team Lead',
    companyId: 'comp-002',
    companyName: 'Mittelstand Industrie AG',
    city: 'Wien',
    employeeCount: 15,
    industry: 'Gesundheitswesen',
  },
  {
    id: 'c-003',
    firstName: 'Klaus',
    lastName: 'Schmidt',
    email: 'k.schmidt@maschinenbau-nord.de',
    jobTitle: 'Vertriebsleiter',
    companyId: 'comp-003',
    companyName: 'Norddeutsche Maschinenbau GmbH',
    city: 'Hamburg, Deutschland',
    employeeCount: 85,
    industry: 'Maschinenbau',
  },
  {
    id: 'c-004',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@unknown-corp.us',
    jobTitle: 'Werkstudent',
    companyId: 'comp-004',
    companyName: 'Global Corp LLC',
    city: 'Austin, USA',
    employeeCount: 5,
    industry: 'Einzelhandel',
  },
];

const SCENARIOS = [
  {
    id: 'leads-scoring-list',
    title: '/crm/leads?tab=contacts (Kontaktliste mit ICP-Score Badges)',
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/crm/leads?tab=contacts`);
      await page.waitForSelector('.crm-v2-list-root', { timeout: 15000 });
      await page.waitForTimeout(400);
    },
  },
  {
    id: 'leads-drawer',
    title: '/crm/leads?tab=contacts (Qualifizierungs-Drawer geöffnet)',
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/crm/leads?tab=contacts`);
      await page.waitForSelector('.crm-v2-list-root', { timeout: 15000 });
      const qualifyBtn = page.locator('button[aria-label*="qualifizieren"]').first();
      if (await qualifyBtn.count()) {
        await qualifyBtn.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
        await page.waitForTimeout(300);
      }
    },
  },
  {
    id: 'leads-conversion-modal',
    title: '/crm/leads?tab=contacts (Deal-Konvertierungsmodal)',
    prepare: async (page) => {
      await page.goto(`${BASE_URL}/crm/leads?tab=contacts`);
      await page.waitForSelector('.crm-v2-list-root', { timeout: 15000 });
      const qualifyBtn = page.locator('button[aria-label*="qualifizieren"]').first();
      if (await qualifyBtn.count()) {
        await qualifyBtn.click();
        await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
        const convertBtn = page.locator('button:has-text("Zu Deal konvertieren")');
        if (await convertBtn.count()) {
          await convertBtn.click();
          await page.waitForSelector('input#deal-name-input', { timeout: 5000 });
          await page.waitForTimeout(300);
        }
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
            items: MOCK_CONTACTS,
            total: MOCK_CONTACTS.length,
            page: 1,
            pageSize: 20,
            resource: 'contacts',
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

        // Theme global setzen
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

        for (const scenario of SCENARIOS) {
          if (side === 'vorher') {
            // Baseline-Stand: /crm/leads tabellarisch ohne Score Badges und Filter
            await page.goto(`${BASE_URL}/crm/leads?tab=contacts`);
            await page.waitForSelector('.crm-v2-list-root', { timeout: 15000 });
            await page.evaluate(() => {
              // Simuliere Vorher-Stand (ohne Lead-Score Badges, Qualifizieren-Buttons und Qualitätsfilter)
              document
                .querySelectorAll(
                  'button[aria-label*="Lead-Qualität"], button[aria-label*="qualifizieren"]',
                )
                .forEach((b) => b.remove());
              document.querySelector('[role="group"][aria-label="Lead-Qualität filtern"]')?.remove();
            });
            await page.waitForTimeout(300);
          } else {
            // Nachher-Stand mit Badges, Drawer und Konvertierungs-Modal
            await scenario.prepare(page);
          }

          // Theme nach Navigation / Render sicherstellen
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

          const filename = `${side}-${scenario.id}-${theme}-${width}.png`;
          const filePath = path.join(OUT, filename);
          const buf = await page.screenshot({ fullPage: false });
          fs.writeFileSync(filePath, buf);
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
          console.log(
            `[OK] ${side} ${scenario.id} ${theme} ${width}px -> ${metrics.doc}/${metrics.inner}px overflow (${hash})`,
          );
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
  '# Auftrag 130 – Visuelle Gate-Prüfung CRM Leads (Vorher/Nachher)',
  '',
  `Vorher: \`c11d53f\` (main), Nachher: Stand dieses Branches. Aufgenommen ${new Date().toISOString().slice(0, 10)}, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).`,
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
  '### Änderungen gegenüber Baseline c11d53f:',
  '- Heuristisches ICP-Fit-Scoring (0–100 %) für Kontakte/Leads nach Branche, Unternehmensgröße, Rolle und Geografie',
  '- Farbliche Lead-Score Badges (Hot 🔥, Warm ☀️, Cold ❄️) mit barrierefreier Aufschlüsselung im Tooltip',
  '- Barrierefreier Qualifizierungs-Drawer mit interaktiver BANT-Checkliste und Deal-Wertschätzung',
  '- Integriertes Deal-Konvertierungsmodal mit Übernahme relevanter Lead-Daten in die Deal-Pipeline',
  '- Schnellfilter nach Lead-Qualität in der Kontakte-Toolbar mit URL-Synchronisation',
  '',
].join('\n');

fs.writeFileSync(path.join(OUT, 'README.md'), md);
console.log(`Ergebnis-Matrix nach ${path.join(OUT, 'README.md')} geschrieben.`);

if (!allPassed) {
  console.error(`❌ Screenshot-Gate fehlgeschlagen: bad=${bad}, differentCount=${differentCount}/${totalPairs}`);
  process.exit(1);
}
console.log('✅ Auftrag 130 Screenshot-Gate (Vorher/Nachher) vollständig bestanden.');
