#!/usr/bin/env node
/**
 * Auftrag 095 (Paket G2, Welle 2): Vorher-/Nachher-Nachweis Steckbrief, Jahres-Highlights, Produkt-Funktionsweise und
 * Roadmap als echte HTML-Seiten (Vorlage: captureAuftrag094Unternehmen.mjs).
 *
 * Je Seite × Breite (1440/768/375/320, dazu 250 px als Ersatz für 150 % Schrift bei 375 px) × dunkel/hell
 * als ganze Seite. Gemessen: SHA-256, Ganzseitenbild (WebP) vorhanden, Zoom-Hinweis,
 * Zahl der h1, sichtbare Überschriften, globaler horizontaler Überlauf, axe serious/critical.
 * Bilder und result.json bleiben unter artifacts/auftrag-095/.
 * Anmeldung: E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD oder STORAGE_STATE (gespeicherter Playwright-Login).
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag095Unternehmen.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag095Unternehmen.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-095');
const RAW = path.join(ROOT, 'artifacts/auftrag-095');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
  { width: 320, height: 720 },
  { width: 250, height: 720 },
];
const THEMES = ['dark', 'light'];
const PAGES = [
  {
    key: 'profil',
    route: '/company/profile',
    h1: 'Unternehmenssteckbrief',
    want: [
      'Unternehmenssteckbrief',
      'Rechtliche Stammdaten',
      'Kapital & Organe',
      'Vollständige Register- und Stammdaten',
      'Unternehmensstruktur & Fokus',
    ],
  },
  {
    key: 'highlights',
    route: '/company/highlights',
    h1: 'Jahres-Highlights 2025',
    want: [
      'Jahres-Highlights 2025',
      'Top Erfolge 2025',
      'Operative Herausforderungen',
      'Jahres-Fazit 2025',
    ],
  },
  {
    key: 'funktion',
    route: '/product/features',
    h1: 'Produkt & Funktionsweise',
    want: [
      'Produkt & Funktionsweise',
      'Smart Lead Capture',
      'KI Lead Scoring v1.5',
      'Nurturing Sequenzen',
      'Pipeline Cockpit',
    ],
  },
  {
    key: 'roadmap',
    route: '/product/roadmap',
    h1: 'Release-Historie & Roadmap 2026',
    want: [
      'Release-Historie & Roadmap 2026',
      'Import-Assistent',
      'KI-Scoring v1.5',
      'M365 & Workspace Integration',
      'Überfälligkeits-Dashboard',
      'Geführter Trial-Flow',
      'Zapier / Make Anbindung',
    ],
  },
];

const env = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Umgebungsvariable ${name} fehlt.`);
  return value;
};

async function capture() {
  const label = env('LABEL');
  if (!['vorher', 'nachher'].includes(label)) throw new Error(`LABEL '${label}' ungültig.`);
  const dir = path.join(RAW, label);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const state = process.env.STORAGE_STATE
    ? process.env.STORAGE_STATE
    : await login(browser, env('BASE_URL'), {
        email: env('E2E_AUTH_EMAIL'),
        password: env('E2E_AUTH_PASSWORD'),
      });
  const shots = [];
  for (const seite of PAGES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const name = `${seite.key}-${viewport.width}-${theme}`;
        const context = await browser.newContext({
          baseURL: env('BASE_URL'),
          storageState: state,
          viewport,
        });
        try {
          await context.addInitScript(
            (mode) => window.localStorage.setItem('leadpilot-theme', mode),
            theme,
          );
          const page = await context.newPage();
          await page.goto(seite.route, { waitUntil: 'networkidle' });
          await page.locator('main h1').filter({ hasText: seite.h1 }).waitFor({
            state: 'attached',
            timeout: 15000,
          });
          await page.addStyleTag({
            content:
              '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }',
          });
          // Der Hauptbereich scrollt intern: Fenster auf die volle Inhaltshöhe ziehen, damit die
          // Aufnahme die ganze Seite zeigt (Breite bleibt die Prüfbreite).
          const fullHeight = await page.evaluate(() =>
            Math.max(
              ...Array.from(document.querySelectorAll('main, main *, body'))
                .filter((el) => el.scrollHeight > el.clientHeight + 1)
                .map((el) => el.scrollHeight - el.clientHeight + window.innerHeight),
              window.innerHeight,
            ),
          );
          await page.setViewportSize({ width: viewport.width, height: Math.min(fullHeight, 6000) });
          await page.waitForTimeout(500);
          const file = path.join(dir, `${name}.png`);
          await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
          const metrics = await page.evaluate(() => {
            const main = document.querySelector('main') ?? document.body;
            const visible = (el) => {
              const r = el.getBoundingClientRect();
              return r.width > 1 && r.height > 1 && !el.closest('.sr-only');
            };
            return {
              webp: main.querySelectorAll('img[src$=".webp"]').length,
              zoomHint: !!main.querySelector('[data-testid="image-page-hint"]'),
              // Header-h1 (Layout) zählt nicht; Seiten-h1 nur im Hauptinhalt.
              h1: main.querySelectorAll('h1').length,
              headings: Array.from(main.querySelectorAll('h1, h2'))
                .filter(visible)
                .map((h) => (h.textContent ?? '').trim()),
              illustration: Array.from(main.querySelectorAll('.pd-bild, .pd-berg')).filter(visible)
                .length,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            };
          });
          const severe = (await new AxeBuilder({ page }).analyze()).violations
            .filter((v) => v.impact === 'serious' || v.impact === 'critical')
            .map((v) => `${v.id}(${v.nodes.length})`);
          const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
          shots.push({ name, sha256, ...metrics, severe });
          console.log(
            `${name}: Bild ${metrics.webp} · Hinweis ${metrics.zoomHint} · h1 ${metrics.h1} · sichtbar ${metrics.headings.length} · Überlauf ${metrics.overflow} · axe ${severe.join(',') || 0}`,
          );
        } finally {
          await context.close();
        }
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(shots, null, 2));
}

function compare() {
  const read = (label) =>
    new Map(
      JSON.parse(fs.readFileSync(path.join(RAW, label, 'result.json'), 'utf8')).map((s) => [
        s.name,
        s,
      ]),
    );
  const before = read('vorher');
  const after = read('nachher');
  const rows = [];
  const problems = [];
  const has = (a, w) => a.headings.some((h) => h.startsWith(w));
  for (const seite of PAGES) {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        const name = `${seite.key}-${viewport.width}-${theme}`;
        const b = before.get(name);
        const a = after.get(name);
        if (!b || !a) {
          problems.push(`${name}: Aufnahme fehlt`);
          continue;
        }
        const checks = {
          hash: a.sha256 !== b.sha256,
          vorherBild: b.webp === 1,
          keinBild: a.webp === 0 && !a.zoomHint,
          h1: a.h1 === 1,
          sichtbar: seite.want.every((w) => has(a, w)),
          // Funktionsweise: vier 3D-Illustrationen; Roadmap: Berg ab 900 px Breite sichtbar.
          illustration:
            seite.key === 'funktion'
              ? a.illustration === 4
              : seite.key === 'roadmap'
                ? a.illustration === (viewport.width > 900 ? 1 : 0)
                : true,
          overflow: a.overflow <= 0,
          axe: a.severe.length === 0,
        };
        for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
        rows.push(
          `| ${seite.key} | ${viewport.width} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${b.webp} → ${a.webp} | ${a.h1} | ${seite.want.filter((w) => has(a, w)).length}/${seite.want.length} | ${['funktion', 'roadmap'].includes(seite.key) ? a.illustration : '–'} | ${a.overflow} px | ${a.severe.join(', ') || 0} |`,
        );
      }
    }
  }
  const total = PAGES.length * VIEWPORTS.length * THEMES.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 095 – Screenshot-Matrix Unternehmensseiten als HTML-Seiten

Produktionsbuild (\`vite preview\`), Anmeldung über gespeicherten Playwright-Login. Seiten
\`/company/profile\`, \`/company/highlights\`, \`/product/features\`, \`/product/roadmap\` als ganze Seite.
Vorher = \`main\` nach PR #81 (Ganzseitenbild), Nachher = Branch \`claude/auftrag-095-g2-welle-2\`
(Seitenfreigabe \`HTML_PAGES\`). 250 px steht für 150 % Schrift bei 375 px. Bilder bleiben lokal
unter \`artifacts/auftrag-095/\` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, bei der
Funktionsweise vier 3D-Illustrationen, bei der Roadmap der Berg ab 900 px Breite, 0 px horizontaler Überlauf, axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | --- |
${rows.join('\n')}

**Ergebnis:** ${total - failed}/${total} Aufnahmen bestanden.${problems.length ? `\n\nAuffällig: ${problems.join('; ')}` : ''}
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'README.md'), readme);
  console.log(readme);
  if (problems.length) process.exitCode = 1;
}

if (process.env.COMPARE) compare();
else await capture();
