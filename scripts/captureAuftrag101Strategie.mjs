#!/usr/bin/env node
/**
 * Auftrag 101 (Paket G2, Welle 8): Vorher-/Nachher-Nachweis OKRs, Balanced Scorecard und Wachstumstreiber
 * als echte HTML-Seiten (Vorlage: captureAuftrag100Organisation.mjs).
 *
 * Je Seite × Breite (1440/768/375/320/250 sowie 375 px mit echter Textvergrößerung 150 %/200 %) × dunkel/hell
 * als ganze Seite. Gemessen: SHA-256, Ganzseitenbild (WebP) vorhanden, Zoom-Hinweis,
 * Zahl der h1, sichtbare Überschriften, globaler horizontaler Überlauf, axe serious/critical.
 * Bilder und result.json bleiben unter artifacts/auftrag-101/.
 * Anmeldung: E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD oder STORAGE_STATE (gespeicherter Playwright-Login).
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag101Strategie.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag101Strategie.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-101');
const RAW = path.join(ROOT, 'artifacts/auftrag-101');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
  { width: 320, height: 720 },
  { width: 250, height: 720 },
  // Aus Auftrag 100 (Codex-Befund PR #87): echte Textvergrößerung (Browser-Schriftgröße 150 % / 200 %) bei 375 px –
  // die Seitenbibliothek setzt Schriftgrößen in rem, daher wächst der Text mit der Wurzelschrift.
  { width: 375, height: 812, text: 150 },
  { width: 375, height: 812, text: 200 },
];
const vpName = (viewport) =>
  viewport.text ? `${viewport.width}t${viewport.text}` : `${viewport.width}`;
const THEMES = ['dark', 'light'];
const PAGES = [
  {
    key: 'okrs',
    route: '/strategy/okrs',
    h1: 'Ziele & Strategische OKRs 2026',
    saeulen: 16,
    want: [
      'Ziele & Strategische OKRs 2026',
      'Zielerreichung & Zielkorridore (Basis 2025 vs. Ziel 2026)',
      'Objective 1: O1: Umsatzwachstum & Skalierung der Kundenbasis',
      'Objective 2: O2: Effizienzsteigerung & Churn-Reduktion im Kundensegment',
    ],
  },
  {
    key: 'bsc',
    route: '/strategy/balanced-scorecard',
    h1: 'Balanced Scorecard (BSC) GJ 2025',
    saeulen: 0,
    want: [
      'Balanced Scorecard (BSC) GJ 2025',
      'Finanzen Perspektive',
      'Kunden Perspektive',
      'Interne Prozesse Perspektive',
      'Lernen & Entwicklung Perspektive',
    ],
  },
  {
    key: 'growth',
    route: '/strategy/growth-drivers',
    h1: 'Wachstumstreiber 2026+',
    saeulen: 0,
    want: [
      'Wachstumstreiber 2026+',
      'ARR-Wachstumseffekte der Kernhebel (€)',
      'Strategische Kernhebel im Überblick',
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
        const name = `${seite.key}-${vpName(viewport)}-${theme}`;
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
          // Vorher trägt die Bildseite noch die alte Textschicht-h1; geprüft wird die neue nur nachher.
          const h1 = page.locator('main h1');
          await (label === 'nachher' ? h1.filter({ hasText: seite.h1 }) : h1.first()).waitFor({
            state: 'attached',
            timeout: 15000,
          });
          if (viewport.text) {
            await page.addStyleTag({
              content: `html { font-size: ${viewport.text}% !important; }`,
            });
          }
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
            // Kleinste berechnete Schriftgröße sichtbarer Texte im Hauptinhalt (inkl. SVG-Text).
            const groessen = Array.from(main.querySelectorAll('*'))
              .filter(
                (el) =>
                  visible(el) &&
                  Array.from(el.childNodes).some(
                    (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
                  ),
              )
              .map((el) => parseFloat(getComputedStyle(el).fontSize));
            return {
              minSchrift: groessen.length ? Math.min(...groessen) : 0,
              webp: main.querySelectorAll('img[src$=".webp"]').length,
              zoomHint: !!main.querySelector('[data-testid="image-page-hint"]'),
              // Header-h1 (Layout) zählt nicht; Seiten-h1 nur im Hauptinhalt.
              h1: main.querySelectorAll('h1').length,
              headings: Array.from(main.querySelectorAll('h1, h2, h3'))
                .filter(visible)
                .map((h) => (h.textContent ?? '').trim()),
              // 3D-Säulen (GroupedDepthColumns); in scrollbaren Diagrammen auch außerhalb des Bildausschnitts.
              saeulen: main.querySelectorAll('[data-saeule], [data-testid="depth-flaechen"]')
                .length,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              // Codex-Befund: Der Hauptbereich scrollt intern. Nach dem Aufziehen darf kein
              // senkrecht scrollender Container Inhalt verdecken, und der letzte Inhalt der Seite
              // muss innerhalb des Fensters (= der Aufnahme) enden.
              abgeschnitten: Math.max(
                0,
                ...Array.from(document.querySelectorAll('main, main *'))
                  .filter((el) => {
                    const oy = getComputedStyle(el).overflowY;
                    return oy === 'auto' || oy === 'scroll';
                  })
                  .map((el) => el.scrollHeight - el.clientHeight),
                Math.ceil(
                  (document.querySelector('main .pk-page')?.getBoundingClientRect().bottom ?? 0) -
                    window.innerHeight,
                ),
              ),
            };
          });
          const severe = (await new AxeBuilder({ page }).analyze()).violations
            .filter((v) => v.impact === 'serious' || v.impact === 'critical')
            .map((v) => `${v.id}(${v.nodes.length})`);
          const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
          shots.push({ name, sha256, ...metrics, severe });
          console.log(
            `${name}: Bild ${metrics.webp} · Hinweis ${metrics.zoomHint} · h1 ${metrics.h1} · sichtbar ${metrics.headings.length} · Überlauf ${metrics.overflow} · abgeschnitten ${metrics.abgeschnitten} · axe ${severe.join(',') || 0}`,
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
        const name = `${seite.key}-${vpName(viewport)}-${theme}`;
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
          saeulen: a.saeulen === seite.saeulen,
          overflow: a.overflow <= 0,
          vollstaendig: a.abgeschnitten === 0,
          axe: a.severe.length === 0,
          // Textvergrößerung wirkt überall: kleinste Schrift wächst mit dem Faktor gegenüber 375 px.
          schrift: viewport.text
            ? a.minSchrift >=
              (after.get(`${seite.key}-375-${theme}`)?.minSchrift ?? Infinity) *
                (viewport.text / 100) *
                0.98
            : true,
        };
        for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
        rows.push(
          `| ${seite.key} | ${vpName(viewport)} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${b.webp} → ${a.webp} | ${a.h1} | ${seite.want.filter((w) => has(a, w)).length}/${seite.want.length} | ${a.saeulen} | ${a.overflow} px | ${a.abgeschnitten} px | ${a.minSchrift} px | ${a.severe.join(', ') || 0} |`,
        );
      }
    }
  }
  const total = PAGES.length * VIEWPORTS.length * THEMES.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 101 – Screenshot-Matrix Strategieseiten als HTML-Seiten

Produktionsbuild (\`vite preview\`), Anmeldung über gespeicherten Playwright-Login. Seiten
\`/strategy/okrs\`, \`/strategy/balanced-scorecard\`, \`/strategy/growth-drivers\` als ganze Seite.
Vorher = \`main\` nach PR #87 (Ganzseitenbild), Nachher = Branch \`claude/auftrag-101-g2-welle-8\`
(Seitenfreigabe \`HTML_PAGES\`). 375t150/375t200 = echte Textvergrößerung (Wurzelschrift 150 %/200 %, wie die Browser-Schriftgröße) bei 375 px; 250 px zusätzlich als Reflow-Probe. Bilder bleiben lokal
unter \`artifacts/auftrag-101/\` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Diagramme (Headcount 1, HR 0, Team 0), 0 px horizontaler Überlauf, 0 px abgeschnitten (kein intern scrollender Container
verdeckt Inhalt, Seitenende liegt in der Aufnahme), axe serious/critical 0; bei 150 %/200 % Textgröße wächst die kleinste berechnete Schrift im Hauptinhalt (inkl. Diagrammbeschriftung) mindestens um den Faktor gegenüber 375 px.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | abgeschnitten | kleinste Schrift | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | ------------: | ---------------: | --- |
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
