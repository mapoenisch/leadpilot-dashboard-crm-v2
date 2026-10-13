#!/usr/bin/env node
/**
 * Auftrag 092 (Paket F, Teil 2): Vorher-/Nachher-Nachweis für den gegliederten Konfigurator.
 *
 * Je Breite (1440/768/375/320) × dunkel/hell: /dashboard im Bearbeitungsmodus, „Kachel hinzufügen“,
 * erste Kennzahl gewählt. Gemessen: SHA-256, Überschriften „Kennzahl/Darstellung/Vorschau“,
 * „Erweiterte Einstellungen“ eingeklappt, gesperrte Partner nicht sichtbar gelistet, Fußknopf im
 * Fenster, Überlauf Dialog, axe serious/critical. Bilder und result.json bleiben unter artifacts/auftrag-092/.
 *
 * Aufnahme: LABEL=vorher|nachher BASE_URL=… E2E_AUTH_EMAIL=… E2E_AUTH_PASSWORD=… node scripts/captureAuftrag092Konfigurator.mjs
 * Matrix:   COMPARE=1 node scripts/captureAuftrag092Konfigurator.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './lib/detailShotHelpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-092');
const RAW = path.join(ROOT, 'artifacts/auftrag-092');
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 },
  { width: 320, height: 720 },
];
const THEMES = ['dark', 'light'];

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
  const state = await login(browser, env('BASE_URL'), {
    email: env('E2E_AUTH_EMAIL'),
    password: env('E2E_AUTH_PASSWORD'),
  });
  const shots = [];
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const name = `konfigurator-${viewport.width}-${theme}`;
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
        await page.goto('/dashboard', { waitUntil: 'networkidle' });
        await page
          .getByTestId('dashboard-workspace')
          .and(page.locator('[aria-busy="false"]'))
          .waitFor({ timeout: 15000 });
        await page.getByRole('button', { name: 'Dashboard bearbeiten' }).click();
        await page.getByRole('button', { name: 'Kachel hinzufügen' }).click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        await dialog.getByRole('radio').first().check();
        await page.addStyleTag({
          content:
            '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }',
        });
        await page.waitForTimeout(500);
        const file = path.join(dir, `${name}.png`);
        await page.screenshot({ path: file, animations: 'disabled' });
        const metrics = await page.evaluate(() => {
          const box = document.querySelector('[role="dialog"]');
          const headings = Array.from(box?.querySelectorAll('h3') ?? []).map((h) =>
            (h.textContent ?? '').trim(),
          );
          const advanced = Array.from(box?.querySelectorAll('button[aria-expanded]') ?? []).find(
            (b) => /Erweiterte Einstellungen/.test(b.textContent ?? ''),
          );
          const blockedVisible = Array.from(
            box?.querySelectorAll('input[type=radio]:disabled') ?? [],
          ).some((r) => r.getBoundingClientRect().height > 0 && /kombin/i.test(r.name ?? ''));
          const footerButton = Array.from(box?.querySelectorAll('button') ?? []).find((b) =>
            /Arbeitskopie hinzufügen/.test(b.textContent ?? ''),
          );
          const rect = footerButton?.getBoundingClientRect();
          return {
            headings,
            advancedCollapsed: advanced?.getAttribute('aria-expanded') === 'false',
            blockedVisible,
            footerInView: !!rect && rect.top >= 0 && rect.bottom <= window.innerHeight,
            overflow: box ? box.scrollWidth - box.clientWidth : 0,
          };
        });
        const severe = (await new AxeBuilder({ page }).analyze()).violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => `${v.id}(${v.nodes.length})`);
        const sha256 = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
        shots.push({ name, sha256, ...metrics, severe });
        console.log(
          `${name}: ${metrics.headings.join(' | ')} · erweitert zu ${metrics.advancedCollapsed} · Fuß sichtbar ${metrics.footerInView} · Überlauf ${metrics.overflow} · axe ${severe.join(',') || 0}`,
        );
      } finally {
        await context.close();
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
  const WANT = ['1 · Kennzahl', '2 · Darstellung', '3 · Vorschau'];
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const name = `konfigurator-${viewport.width}-${theme}`;
      const b = before.get(name);
      const a = after.get(name);
      if (!b || !a) {
        problems.push(`${name}: Aufnahme fehlt`);
        continue;
      }
      const checks = {
        hash: a.sha256 !== b.sha256,
        abschnitte: WANT.every((w) => a.headings.includes(w)),
        eingeklappt: a.advancedCollapsed,
        keineSperrliste: !a.blockedVisible,
        fuss: a.footerInView,
        overflow: a.overflow <= 0,
        axe: a.severe.length === 0,
      };
      for (const [key, ok] of Object.entries(checks)) if (!ok) problems.push(`${name}: ${key}`);
      rows.push(
        `| ${viewport.width} | ${theme} | \`${b.sha256.slice(0, 12)}\` | \`${a.sha256.slice(0, 12)}\` | ${a.headings.length} | ${a.advancedCollapsed ? 'ja' : 'nein'} | ${a.footerInView ? 'ja' : 'nein'} | ${a.overflow} px | ${a.severe.join(', ') || 0} |`,
      );
    }
  }
  const total = VIEWPORTS.length * THEMES.length;
  const failed = new Set(problems.map((p) => p.split(':')[0])).size;
  const readme = `# Auftrag 092 – Screenshot-Matrix gegliederter Konfigurator

Produktionsbuild gegen lokales Supabase (Testnutzer aus \`supabase/seed.sql\`), \`/dashboard\` im
Bearbeitungsmodus, „Kachel hinzufügen“ mit gewählter erster Kennzahl. Vorher = \`main\` nach Auftrag 091,
Nachher = Branch \`claude/auftrag-092-konfigurator\`. Bilder bleiben lokal unter \`artifacts/auftrag-092/\`.

| Breite | Theme | SHA-256 vorher | SHA-256 nachher | Abschnitte | Erweitert eingeklappt | Fußknopf im Fenster | Überlauf Dialog | axe |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

**Ergebnis:** ${total - failed}/${total} Aufnahmen bestanden${problems.length ? ` – offen: ${problems.join('; ')}` : ''}.
`;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'README.md'), readme);
  console.log(readme);
  if (problems.length) process.exitCode = 1;
}

if (process.env.COMPARE) compare();
else await capture();
