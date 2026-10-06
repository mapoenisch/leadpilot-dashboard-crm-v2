/**
 * Auftrag 077: Helfer für den Screenshot- und Ablaufnachweis der Kachel-Details im echten App-Ablauf
 * (lokales Supabase, Testbenutzer aus dem E2E-Seed). Anmeldung, Testkonfiguration setzen und
 * zurücksetzen, Messung von Überlauf, axe und Layoutverschiebung.
 */
import { execFileSync } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';

/** Konfiguration mit 24 Kacheln aus derselben Katalog- und Prüflogik wie die App. */
export function shotConfig(root) {
  const out = execFileSync('npx', ['tsx', 'scripts/lib/detailShotConfig.ts'], { cwd: root });
  return JSON.parse(out.toString());
}

/** Standard-Dashboard-Konfiguration (17 Kacheln) aus der App-Logik. */
export function defaultDashboardConfig(root) {
  const out = execFileSync(
    'npx',
    [
      'tsx',
      '-e',
      "import { DEFAULT_DASHBOARD_CONFIG } from './src/features/dashboard/model/defaultDashboard.ts'; console.log(JSON.stringify(DEFAULT_DASHBOARD_CONFIG));",
    ],
    { cwd: root },
  );
  return JSON.parse(out.toString());
}

/** Anmelden und den Sitzungszustand für weitere Kontexte desselben Servers zurückgeben. */
export async function login(browser, baseUrl, credentials, options = {}) {
  const context = await browser.newContext({
    baseURL: baseUrl,
    locale: options.locale ?? 'de-DE',
  });
  const page = await context.newPage();
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('#login-email', credentials.email);
  await page.fill('#login-password', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  const state = await context.storageState();
  await context.close();
  return state;
}

/** Aufruf der Supabase-REST-Schnittstelle mit dem Token der angemeldeten Sitzung. */
async function rest(page, supabase, pathAndQuery, init = {}) {
  return page.evaluate(
    async ({ url, anonKey, pathAndQuery, init }) => {
      let token = null;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
          token = JSON.parse(localStorage.getItem(key) ?? '{}').access_token ?? null;
        }
      }
      const response = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
        ...init,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
      return { status: response.status, body: await response.json().catch(() => null) };
    },
    { url: supabase.url, anonKey: supabase.anonKey, pathAndQuery, init },
  );
}

export async function readPreferences(page, supabase) {
  const result = await rest(
    page,
    supabase,
    'executive_dashboard_preferences?select=revision,config',
  );
  const row = Array.isArray(result.body) ? result.body[0] : null;
  return row ? { revision: row.revision, config: row.config } : { revision: 0, config: null };
}

export async function savePreferences(page, supabase, config, expectedRevision) {
  const result = await rest(page, supabase, 'rpc/save_dashboard_preferences', {
    method: 'POST',
    body: JSON.stringify({ p_config: config, p_expected_revision: expectedRevision }),
  });
  if (result.status >= 300) throw new Error(`Speichern fehlgeschlagen: ${JSON.stringify(result)}`);
  return readPreferences(page, supabase);
}

/** Benutzer-ID der angemeldeten Sitzung (aus dem Supabase-Token im localStorage). */
export const sessionUserId = (page) =>
  page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        return JSON.parse(localStorage.getItem(key) ?? '{}').user?.id ?? null;
      }
    }
    return null;
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * Der Aufräumschlüssel umgeht RLS: nur gegen ein lokales Supabase und nur für genau eine gültige
 * Benutzer-ID verwenden, nie gegen ein entferntes Projekt oder mit leerem Filter.
 */
function assertScopedCleanup(url, userId) {
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error(`Aufräumschlüssel nur für lokales Supabase, nicht für ${new URL(url).host}.`);
  }
  if (typeof userId !== 'string' || !UUID.test(userId)) {
    throw new Error('Ungültige Benutzer-ID für das Aufräumen.');
  }
}

/**
 * Entfernt die Präferenzzeile eines Benutzers. Benutzer dürfen das nicht selbst (RLS); nur der
 * lokale Aufräumschlüssel (`E2E_CLEANUP_KEY`, wie in den E2E-Specs) darf es.
 */
export async function deletePreferences(supabase, cleanupKey, userId) {
  assertScopedCleanup(supabase.url, userId);
  const response = await fetch(
    `${supabase.url}/rest/v1/executive_dashboard_preferences?user_id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: { apikey: cleanupKey, Authorization: `Bearer ${cleanupKey}` } },
  );
  if (!response.ok) throw new Error(`Löschen fehlgeschlagen: ${response.status}`);
}

/** Summe der Layoutverschiebungen ohne Nutzereingabe (Cumulative Layout Shift). */
export async function startShiftObserver(context) {
  await context.addInitScript(() => {
    window.__shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__shift += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

export const shiftOf = (page) =>
  page.evaluate(() => Math.round((window.__shift ?? 0) * 1000) / 1000);

export const overflowOf = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

export async function axeSevere(page) {
  const axe = await new AxeBuilder({ page }).include('main').analyze();
  return axe.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id);
}

/**
 * Alle Kacheln einmal in den Sichtbereich holen (Lazy Loading) und zurück an den Anfang. Das Layout
 * hält `body` auf Viewport-Höhe; gescrollt wird `<main>`, nicht das Fenster (Codex PR #61).
 */
export async function scrollThrough(page, viewport) {
  const height = await page.evaluate(() => document.querySelector('main')?.scrollHeight ?? 0);
  for (let y = 0; y <= height; y += Math.floor(viewport.height * 0.8)) {
    await page.evaluate((top) => document.querySelector('main')?.scrollTo(0, top), y);
    await page.waitForTimeout(80);
  }
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.querySelector('main')?.scrollTo(0, 0));
}

/** Anzahl der Kacheln, die aktiviert sind (Daten angefordert, kein Lazy-Platzhalter mehr). */
export const activeTileCount = (page) =>
  page.locator('[data-testid="lazy-tile"][data-active="true"]').count();

/** Überschriften des Hauptbereichs: Vergleich „Schalter aus“ gegen Vorher ohne Live-Zeitstempel. */
export const mainHeadings = (page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('main h1, main h2, main h3')).map((h) =>
      h.textContent?.trim(),
    ),
  );
