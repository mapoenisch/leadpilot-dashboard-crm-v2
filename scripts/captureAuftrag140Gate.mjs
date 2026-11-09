#!/usr/bin/env node
/**
 * Auftrag 140: Screenshot-Gate-Nachweis für echte Funnel-Verweildauer
 * (/sales/funnel im Live-Modus: Bottleneck-Alert aus stageEnteredAt,
 * Zeile für Deals ohne Phasendatum) bei 1440/768/375 px, beide Themes.
 * Misst Überlauf (Dokument, #main-content), Inhaltshöhe, SHA-256 des Bildes; schreibt die textuelle Matrix
 * docs/screenshots/auftrag-140/README.md. Bilder bleiben lokal (.gitignore).
 * Aufruf: BEFORE_URL=http://127.0.0.1:4322 node scripts/captureAuftrag140Gate.mjs
 * BEFORE_URL: separat gebauter Ausgangsstand (origin/main); Nachher: aktueller dist-Build.
 * Beide Builds benötigen VITE_SUPABASE_URL=http://127.0.0.1:54321 und einen Mock-Anon-Key.
 * Supabase wird per Route-Mock bedient (kein echter Backend-Zugriff).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/screenshots/auftrag-140');
const CAPTURE_MANIFEST =
  process.env.CAPTURE_MANIFEST ?? path.join(os.tmpdir(), 'leadpilot-140-captures.json');
const COMPARE_ONLY = process.env.COMPARE_ONLY === '1';
const PORT = Number(process.env.PORT ?? 4321);
const BEFORE_URL = process.env.BEFORE_URL;
if (!BEFORE_URL) throw new Error('BEFORE_URL muss auf den Build vor Auftrag 140 zeigen.');
// Entspricht playwright.config.ts: maximal 0,1 % Rasterungsdrift.
const MAX_DIFF_PIXEL_RATIO = 0.001;
const APPROVALS = process.env.VISUAL_APPROVALS
  ? JSON.parse(fs.readFileSync(process.env.VISUAL_APPROVALS, 'utf8'))
  : [];
let captureUrl;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const EMAIL = 'admin-a@e2e.local';
const PASSWORD = 'TestPassword123!';
const WIDTHS = [1440, 768, 375];
const THEMES = ['dark', 'light'];
const ORG_ID = '00000000-0000-4000-8000-0000000000a1';

const MOCK_CONTACTS = [
  {
    id: 'c-001',
    firstName: 'Anna',
    lastName: 'Schmidt',
    email: 'anna.schmidt@nordwind.de',
    jobTitle: 'Leiterin Vertrieb',
    companyId: 'co-001',
    companyName: 'Nordwind GmbH',
    city: 'München',
    country: 'DE',
    industry: 'Maschinenbau',
    employeeCount: 120,
    createdAt: '2026-10-01T09:00:00Z',
  },
  {
    id: 'c-002',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@beispiel.de',
    jobTitle: 'Geschäftsführer',
    companyId: 'co-002',
    companyName: 'Beispiel AG',
    city: 'Hamburg',
    country: 'DE',
    industry: 'Software',
    employeeCount: 45,
    createdAt: '2026-10-05T09:00:00Z',
  },
  {
    id: 'c-003',
    firstName: 'Lisa',
    lastName: 'Beispiel',
    email: 'lisa.beispiel@muster.de',
    jobTitle: 'Head of Sales',
    companyId: 'co-001',
    companyName: 'Nordwind GmbH',
    city: 'Berlin',
    country: 'DE',
    industry: 'Maschinenbau',
    employeeCount: 120,
    createdAt: '2026-10-08T09:00:00Z',
  },
  {
    id: 'c-004',
    firstName: 'Thomas',
    lastName: 'Weber',
    email: 'thomas.weber@sample.de',
    jobTitle: 'CFO',
    companyId: 'co-003',
    companyName: 'Sample Industries',
    city: 'Köln',
    country: 'DE',
    industry: 'Chemie',
    employeeCount: 300,
    createdAt: '2026-10-12T09:00:00Z',
  },
];

const MOCK_COMPANIES = [
  {
    id: 'co-001',
    name: 'Nordwind GmbH',
    domain: 'nordwind.de',
    industry: 'Maschinenbau',
    city: 'München',
    employeeCount: 120,
  },
  {
    id: 'co-002',
    name: 'Beispiel AG',
    domain: 'beispiel.de',
    industry: 'Software',
    city: 'Hamburg',
    employeeCount: 45,
  },
  {
    id: 'co-003',
    name: 'Sample Industries',
    domain: 'sample.de',
    industry: 'Chemie',
    city: 'Köln',
    employeeCount: 300,
  },
];

// FIXED_NOW = 2026-11-11T10:00:00Z (siehe unten). stageEnteredAt-Werte sind
// relativ dazu: 45 Tage = 2026-09-27, 27 Tage = 2026-10-15, 29 Tage = 2026-10-13.
const DEALS_GEMISCHT = [
  {
    id: 'd-001',
    dealName: 'Cloud Migration Pilot',
    stage: 'Angebot erstellt',
    stageRaw: 'PROPOSAL',
    amount: 25000,
    closeDate: '2026-12-31',
    pipeline: 'Enterprise SaaS',
    stageEnteredAt: '2026-09-27T10:00:00Z', // 45 Tage -> Engpass (alt + neu)
  },
  {
    id: 'd-002',
    dealName: 'AI Data Ingestion Hub',
    stage: 'Verhandlung',
    stageRaw: 'NEGOTIATION',
    amount: 18000,
    closeDate: '2026-11-15',
    pipeline: 'Data Platform',
    stageEnteredAt: '2026-10-15T10:00:00Z', // 27 Tage
  },
  {
    id: 'd-003',
    dealName: 'Security Audit Follow-up',
    stage: 'Verhandlung',
    stageRaw: 'NEGOTIATION',
    amount: 12000,
    closeDate: '2026-11-20',
    pipeline: 'Data Platform',
    stageEnteredAt: '2026-10-13T10:00:00Z', // 29 Tage -> Schnitt 28: vor 25-Schwelle Engpass, nach 30-Schwelle keiner
  },
  {
    id: 'd-004',
    dealName: 'Altbestand ohne Phasendatum 1',
    stage: 'Bedarfsanalyse',
    stageRaw: 'NEEDS_ANALYSIS',
    amount: 9000,
    closeDate: '2026-12-01',
    pipeline: 'Enterprise SaaS',
    // kein stageEnteredAt -> vor v3.1 angelegt
  },
  {
    id: 'd-005',
    dealName: 'Altbestand ohne Phasendatum 2',
    stage: 'Erstgespräch geführt',
    stageRaw: 'CONTACTED',
    amount: 7000,
    closeDate: '2026-12-15',
    pipeline: 'Data Platform',
    // kein stageEnteredAt -> vor v3.1 angelegt
  },
];

const DEALS_UNBEKANNT = [
  {
    id: 'd-011',
    dealName: 'Altbestand ohne Phasendatum A',
    stage: 'Angebot erstellt',
    stageRaw: 'PROPOSAL',
    amount: 21000,
    closeDate: '2026-12-31',
    pipeline: 'Enterprise SaaS',
  },
  {
    id: 'd-012',
    dealName: 'Altbestand ohne Phasendatum B',
    stage: 'Verhandlung',
    stageRaw: 'NEGOTIATION',
    amount: 15000,
    closeDate: '2026-11-30',
    pipeline: 'Data Platform',
  },
];

// c-002 ist qualifiziert (qualified_at gesetzt) -> Badge in der Liste.
const QUALIFIED_ROW = {
  contact_id: 'c-002',
  budget: true,
  authority: true,
  need: true,
  timeline: false,
  notes: 'Pilot entschieden',
  qualified_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
};

const SCENARIOS = [
  {
    id: 'funnel-live-gemischt',
    role: 'admin',
    deals: DEALS_GEMISCHT,
    title: '/sales/funnel (Live-Pipeline: Engpass + 2 Deals ohne Phasendatum)',
    prepare: async (page) => {
      await page.goto(`${captureUrl}/sales/funnel`);
      await page.getByRole('tab', { name: /Live-Pipeline/i }).click();
      await page
        .getByRole('heading', { level: 1, name: 'Live Sales Pipeline' })
        .waitFor({ timeout: 20000 });
      await page.waitForTimeout(800);
    },
  },
  {
    id: 'funnel-live-unbekannt',
    role: 'admin',
    deals: DEALS_UNBEKANNT,
    title: '/sales/funnel (Live-Pipeline: alle Deals ohne Phasendatum)',
    prepare: async (page) => {
      await page.goto(`${captureUrl}/sales/funnel`);
      await page.getByRole('tab', { name: /Live-Pipeline/i }).click();
      await page
        .getByRole('heading', { level: 1, name: 'Live Sales Pipeline' })
        .waitFor({ timeout: 20000 });
      await page.waitForTimeout(800);
    },
  },
];

const FIXED_NOW = new Date('2026-11-11T10:00:00Z');

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

async function mockSupabaseAuthAndData(context, role, deals) {
  // Token-Zeiten müssen zur fixen Seitenzeit passen, sonst rotiert supabase-js
  // den Mock-Token endlos (expires_at < Date.now der Seite -> Refresh-Loop).
  const now = Math.floor(FIXED_NOW.getTime() / 1000);
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

  const RESOURCES = {
    contacts: MOCK_CONTACTS,
    companies: MOCK_COMPANIES,
    deals,
    funnel_deals: deals,
  };

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
        organization_id: ORG_ID,
        role,
        status: 'active',
        organizations: { status: 'active' },
      });
    }
    if (url.pathname.includes('/rest/v1/lead_qualifications')) {
      const accept = request.headers()['accept'] ?? '';
      if (accept.includes('vnd.pgrst.object')) {
        const contactId = url.searchParams.get('contact_id')?.replace('eq.', '');
        if (contactId === QUALIFIED_ROW.contact_id) return json(route, QUALIFIED_ROW);
        // maybeSingle ohne Treffer: PostgREST-0-Zeilen-Antwort
        return route.fulfill({
          status: 406,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'PGRST116',
            details: 'The result contains 0 rows',
            hint: null,
            message: 'JSON object requested, multiple (or no) rows returned',
          }),
        });
      }
      return json(route, [QUALIFIED_ROW]);
    }
    if (url.pathname.includes('/functions/v1/crm-query-export')) {
      let resource = 'contacts';
      try {
        resource = JSON.parse(request.postData() ?? '{}').resource ?? resource;
      } catch {
        /* leer */
      }
      const items = RESOURCES[resource] ?? [];
      return json(route, {
        items,
        total: items.length,
        page: 1,
        pageSize: 100,
        resource,
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
if (!COMPARE_ONLY && !isUp) {
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
const rows = COMPARE_ONLY ? JSON.parse(fs.readFileSync(CAPTURE_MANIFEST, 'utf8')) : [];

try {
  if (!COMPARE_ONLY) {
    for (const phase of ['before', 'after']) {
      captureUrl = phase === 'before' ? BEFORE_URL : BASE_URL;
      for (const scenario of SCENARIOS) {
        for (const theme of THEMES) {
          for (const width of WIDTHS) {
            const ctx = await browser.newContext({
              viewport: { width, height: 1000 },
              reducedMotion: 'reduce',
              locale: 'de-DE',
              timezoneId: 'Europe/Berlin',
            });

            await mockSupabaseAuthAndData(ctx, scenario.role, scenario.deals);

            const page = await ctx.newPage();
            await page.clock.setSystemTime(FIXED_NOW);

            try {
              // 1. Anmeldung an der Plattform
              await page.goto(`${captureUrl}/login`);
              await page.waitForLoadState('networkidle');

              const emailInput = page.getByLabel(/E-Mail/i);
              if (await emailInput.count()) {
                await emailInput.fill(EMAIL);
                await page.getByLabel(/Passwort/i).fill(PASSWORD);
                await page.getByRole('button', { name: /Anmelden/i }).click();
                await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
                  timeout: 20000,
                });
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
              await page.addStyleTag({
                content:
                  '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }',
              });
              await page.evaluate(() => document.fonts.ready);
              await page.waitForTimeout(1000);

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

              const file = path.join(
                OUT,
                `auftrag-140-${phase}-${scenario.id}-${theme}-${width}.png`,
              );
              await page.evaluate(() => document.fonts.ready);
              let buf;
              let previousCapture;
              let stableFrames = 0;
              for (let attempt = 0; attempt < 30; attempt += 1) {
                buf = await page.screenshot({ fullPage: true, animations: 'disabled' });
                stableFrames = previousCapture?.equals(buf) ? stableFrames + 1 : 0;
                if (stableFrames >= 3) break;
                previousCapture = buf;
                await page.waitForTimeout(200);
              }
              if (stableFrames < 3)
                throw new Error(
                  'Darstellung nicht stabil: keine vier identischen Aufnahmen in Folge.',
                );
              fs.writeFileSync(file, buf);
              const hash = crypto.createHash('sha256').update(buf).digest('hex');

              rows.push({
                phase,
                file,
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
              await page.screenshot({ path: path.join(OUT, 'capture-error.png') });
              console.error('URL:', page.url(), 'Text:', await page.locator('body').innerText());
              console.error(`Fehler bei ${scenario.id}, ${theme}, ${width}px:`, err);
              throw err;
            } finally {
              await ctx.close();
            }
          }
        }
      }
    }
    fs.writeFileSync(CAPTURE_MANIFEST, JSON.stringify(rows, null, 2));
  }
  for (const row of rows) {
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(row.file)).digest('hex');
    if (actualHash !== row.hash) throw new Error(`Bild seit Aufnahme verändert: ${row.file}`);
  }
  const comparePage = await browser.newPage();
  for (const row of rows.filter((r) => r.phase === 'after')) {
    const before = rows.find(
      (r) =>
        r.phase === 'before' &&
        r.scenario === row.scenario &&
        r.theme === row.theme &&
        r.width === row.width,
    );
    row.beforeHash = before.hash;
    const comparison = await comparePage.evaluate(
      async ([a, b]) => {
        const load = async (src) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          return img;
        };
        const [left, right] = await Promise.all([load(a), load(b)]);
        if (left.width !== right.width || left.height !== right.height) return { changed: -1 };
        const canvas = document.createElement('canvas');
        canvas.width = left.width;
        canvas.height = left.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(left, 0, 0);
        const old = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.drawImage(right, 0, 0);
        const next = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let changed = 0;
        for (let i = 0; i < old.data.length; i += 4) {
          const differs =
            old.data[i] !== next.data[i] ||
            old.data[i + 1] !== next.data[i + 1] ||
            old.data[i + 2] !== next.data[i + 2] ||
            old.data[i + 3] !== next.data[i + 3];
          if (differs) changed++;
          next.data[i] = 255;
          next.data[i + 1] = differs ? 0 : 255;
          next.data[i + 2] = differs ? 0 : 255;
          next.data[i + 3] = 255;
        }
        ctx.putImageData(next, 0, 0);
        return {
          changed,
          ratio: changed / (canvas.width * canvas.height),
          diff: canvas.toDataURL('image/png').split(',')[1],
        };
      },
      [before, row].map(
        (r) => `data:image/png;base64,${fs.readFileSync(r.file).toString('base64')}`,
      ),
    );
    row.changedPixels = comparison.changed;
    row.diffRatio = comparison.ratio;
    if (comparison.diff)
      fs.writeFileSync(
        row.file.replace('.png', '-diff.png'),
        Buffer.from(comparison.diff, 'base64'),
      );
    row.reviewReason = APPROVALS.find(
      (a) =>
        a.beforeHash === before.hash &&
        a.afterHash === row.hash &&
        typeof a.reason === 'string' &&
        a.reason.trim(),
    )?.reason;
    row.reviewed = Boolean(row.reviewReason);
  }
} finally {
  await browser.close();
  if (serverProc) {
    serverProc.kill('SIGTERM');
  }
}

// Auswertung
let bad = 0;
let overflowCount = 0;
const lines = [];

for (const row of rows.filter((r) => r.phase === 'after')) {
  const isOverflow = row.docOverflow > 0 || row.innerOverflow > 0;
  if (isOverflow) overflowCount += 1;
  const diffPassed =
    row.changedPixels >= 0 && (row.diffRatio <= MAX_DIFF_PIXEL_RATIO || row.reviewed);
  if (isOverflow || !diffPassed) {
    bad += 1;
  }
  const status = isOverflow
    ? '❌ Überlauf'
    : !diffPassed
      ? '❌ Bildabweichung ungeprüft'
      : row.reviewed
        ? `✅ Geprüft: ${row.reviewReason}`
        : '✅ Vergleich bestanden';
  lines.push(
    `| \`${row.scenario}\` | \`${row.theme}\` | ${row.width} px | ${row.docOverflow}/${row.innerOverflow} px | ${row.height} px | \`${row.beforeHash}\` / \`${row.hash}\` | ${row.changedPixels} | ${status} |`,
  );
}

const total = rows.length;
const allPassed = bad === 0 && total === 2 * SCENARIOS.length * THEMES.length * WIDTHS.length;

const md = [
  '# Auftrag 140 – Visuelle Gate-Prüfung Funnel-Verweildauer (1440/768/375 px, dark/light)',
  '',
  `Aufgenommen ${new Date().toISOString().slice(0, 10)}, Chromium, Zoom 100 %, reduzierte Bewegung. Bilder lokal (nicht committet).`,
  `Vorher: ${BEFORE_URL} (Basis 9c70f8b, origin/main nach Auftrag 139); Nachher: ${BASE_URL}.`,
  'Überlauf = Dokument/#main-content in px; Hash = vollständiger SHA-256. Bildtoleranz: 0,1 % wie playwright.config.ts; darüber sperrt eine ungeprüfte Abweichung das Gate.',
  '',
  '| Szenario | Theme | Breite | Überlauf | Inhaltshöhe | SHA-256 vorher / nachher | Geänderte Pixel | Status |',
  '|---|---|---|---|---|---|---|---|',
  ...lines,
  '',
  '## Zusammenfassung',
  '',
  `- **Gesamtanzahl Aufnahmen:** ${total}`,
  `- **Überlauf-Status:** ${overflowCount === 0 ? '0 px Überlauf in allen Nachher-Aufnahmen' : `${overflowCount} Aufnahmen mit Überlauf`}`,
  `- **Status:** ${allPassed ? '✅ ALLE GATES BESTANDEN' : '❌ FEHLGESCHLAGEN'}`,
  '',
  '### Verifizierte Eigenschaften (Auftrag 140):',
  '- Funnel (`/sales/funnel`, Live-Pipeline) berechnet Verweildauern ausschließlich aus `stageEnteredAt` (Grenzwert 30 Tage, Überschreitung = Engpass)',
  '- Der Alert nennt offen: „{n} Deals ohne bekannte Verweildauer (vor v3.1 angelegt).“ — bei 0 keine Zeile',
  '- Sind alle Verweildauern unbekannt, erscheint weder Engpass- noch All-Clear-Meldung, sondern ein neutraler Hinweis',
  '- Bildvergleich: höchstens 0,1 % Pixelabweichung oder ausdrücklich geprüfte Abweichung mit exakt gebundenen Vorher-/Nachher-Hashes; ungeprüfte Abweichungen sperren das Gate.',
  '',
].join('\n');

fs.writeFileSync(path.join(OUT, 'README.md'), md);
console.log(`Ergebnis-Matrix nach ${path.join(OUT, 'README.md')} geschrieben.`);

if (!allPassed) {
  console.error(`❌ Screenshot-Gate fehlgeschlagen: bad=${bad}`);
  process.exit(1);
}
console.log('✅ Auftrag 140 Screenshot-Gate vollständig bestanden.');
