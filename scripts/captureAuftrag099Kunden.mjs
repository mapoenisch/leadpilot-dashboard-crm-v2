#!/usr/bin/env node
/**
 * Auftrag 099 (Paket G2, Welle 6): Vorher-/Nachher-Nachweis ICP, Buyer Persona, Kundensegmente und Top-10-Kunden
 * als echte HTML-Seiten (Vorlage: captureAuftrag098Markt.mjs).
 *
 * Je Seite × Breite (1440/768/375/320, dazu 250 px als Ersatz für 150 % Schrift bei 375 px) × dunkel/hell
 * als ganze Seite. Gemessen: SHA-256, Ganzseitenbild (WebP) vorhanden, Zoom-Hinweis,
 * Zahl der h1, sichtbare Überschriften, globaler horizontaler Überlauf, axe serious/critical.
 * Bilder und result.json bleiben unter artifacts/auftrag-099/.
 * Anmeldung: E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD oder STORAGE_STATE (gespeicherter Playwright-Login).
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag099Kunden.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag099Kunden.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-099');
const RAW = path.join(ROOT, 'artifacts/auftrag-099');
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
    key: 'icp',
    route: '/customers/icp',
    h1: 'Ideal Customer Profile (ICP) - LeadPilot GmbH',
    saeulen: 0,
    want: [
      'Ideal Customer Profile (ICP) - LeadPilot GmbH',
      'Firmografische Kriterien',
      'Auslösende Trigger',
      'Ausschlusskriterien (Negative Fit)',
    ],
  },
  {
    key: 'persona',
    route: '/customers/persona',
    h1: 'Buyer Persona „Vertriebsleiter Volker“',
    saeulen: 0,
    want: [
      'Buyer Persona „Vertriebsleiter Volker“',
      'Vertriebsleiter Volker',
      'Ziele:',
      'Schmerzpunkte (Pain Points):',
    ],
  },
  {
    key: 'segmente',
    route: '/customers/segments',
    h1: 'Kundensegmente (66 Kunden zum 31.12.2025)',
    saeulen: 4,
    want: [
      'Kundensegmente (66 Kunden zum 31.12.2025)',
      'ARR nach Kundensegment',
      'Branchenverteilung',
      'Regionale Kundenverteilung (Stand 31.12.2025)',
    ],
  },
  {
    key: 'top10',
    route: '/customers/top-customers',
    h1: 'Top B2B Referenzkunden (ICP-konform, < 200 MA)',
    saeulen: 0,
    want: ['Top B2B Referenzkunden (ICP-konform, < 200 MA)'],
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
          // Vorher trägt die Bildseite noch die alte Textschicht-h1; geprüft wird die neue nur nachher.
          const h1 = page.locator('main h1');
          await (label === 'nachher' ? h1.filter({ hasText: seite.h1 }) : h1.first()).waitFor({
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
              headings: Array.from(main.querySelectorAll('h1, h2, h3'))
                .filter(visible)
                .map((h) => (h.textContent ?? '').trim()),
              // 3D-Säulen (GroupedDepthColumns); in scrollbaren Diagrammen auch außerhalb des Bildausschnitts.
              saeulen: main.querySelectorAll('[data-saeule]').length,
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
          saeulen: a.saeulen === seite.saeulen,
          overflow: a.overflow <= 0,
          vollstaendig: a.abgeschnitten === 0,
          axe: a.severe.length === 0,
        };
        for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
        rows.push(
          `| ${seite.key} | ${viewport.width} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${b.webp} → ${a.webp} | ${a.h1} | ${seite.want.filter((w) => has(a, w)).length}/${seite.want.length} | ${a.saeulen} | ${a.overflow} px | ${a.abgeschnitten} px | ${a.severe.join(', ') || 0} |`,
        );
      }
    }
  }
  const total = PAGES.length * VIEWPORTS.length * THEMES.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 099 – Screenshot-Matrix Kundenseiten als HTML-Seiten

Produktionsbuild (\`vite preview\`), Anmeldung über gespeicherten Playwright-Login. Seiten
\`/customers/icp\`, \`/customers/persona\`, \`/customers/segments\`, \`/customers/top-customers\` als ganze Seite.
Vorher = \`main\` nach PR #85 (Ganzseitenbild), Nachher = Branch \`claude/auftrag-099-g2-welle-6\`
(Seitenfreigabe \`HTML_PAGES\`). 250 px steht für 150 % Schrift bei 375 px. Bilder bleiben lokal
unter \`artifacts/auftrag-099/\` (nicht committet).

Prüfungen je Aufnahme: Hash verschieden, vorher genau ein WebP, nachher kein WebP und kein
Zoom-Hinweis, genau eine h1 im Hauptinhalt, alle Überschriften des Originals sichtbar, Zahl der
3D-Säulen (ICP 0, Persona 0, Segmente 4, Top 10 0), 0 px horizontaler Überlauf, 0 px abgeschnitten (kein intern scrollender Container
verdeckt Inhalt, Seitenende liegt in der Aufnahme), axe serious/critical 0.

| Seite | Breite | Modus | Hash vorher | Hash nachher | WebP | h1 | Überschriften | 3D | Überlauf | abgeschnitten | axe |
| ----- | -----: | ----- | ----------- | ------------ | ---- | -: | ------------- | -: | -------: | ------------: | --- |
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
