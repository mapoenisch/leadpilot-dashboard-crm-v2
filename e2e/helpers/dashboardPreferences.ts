import fs from 'node:fs';

// Auftrag 077: feste Dashboard-Konfiguration des E2E-Benutzers für die Detail-Abläufe setzen und
// danach den Ausgangszustand wiederherstellen. Gespeichert wird wie in der App über die RPC
// `save_dashboard_preferences` mit dem Token des Benutzers (Servervalidierung, Revision); eine
// anfangs fehlende Zeile entfernt nur der Aufräumschlüssel wieder (RLS erlaubt Benutzern kein DELETE).

const AUTH_FILE = 'playwright/.auth/user.json';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * Der Aufräumschlüssel umgeht RLS: nur gegen ein lokales Supabase (wie in der CI) und nur für
 * genau den angemeldeten Testbenutzer, nie gegen ein entferntes Projekt oder mit leerem Filter.
 */
function assertScopedCleanup(url: string, userId: string): void {
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) throw new Error(`Aufräumschlüssel nur lokal, nicht für ${host}.`);
  if (!UUID.test(userId)) throw new Error('Ungültige Benutzer-ID für das Aufräumen.');
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt (Dashboard-E2E, Aufträge 077 und 079).`);
  return value;
}

export interface Session {
  url: string;
  anonKey: string;
  token: string;
  userId: string;
}

function session(): Session {
  const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) as {
    origins: { localStorage: { name: string; value: string }[] }[];
  };
  const entry = state.origins
    .flatMap((origin) => origin.localStorage)
    .find((item) => item.name.startsWith('sb-') && item.name.endsWith('-auth-token'));
  if (!entry) throw new Error('Keine Supabase-Sitzung im Anmeldezustand.');
  const parsed = JSON.parse(entry.value) as { access_token: string; user: { id: string } };
  return {
    url: requireEnv('E2E_SUPABASE_URL'),
    anonKey: requireEnv('E2E_SUPABASE_ANON_KEY'),
    token: parsed.access_token,
    userId: parsed.user.id,
  };
}

/** Sitzung eines weiteren Testbenutzers per Passwort-Anmeldung (Auftrag 079, Benutzerwechsel). */
export async function passwordSession(email: string, password: string): Promise<Session> {
  const url = requireEnv('E2E_SUPABASE_URL');
  const anonKey = requireEnv('E2E_SUPABASE_ANON_KEY');
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Anmeldung fehlgeschlagen: ${response.status}`);
  const body = (await response.json()) as { access_token: string; user: { id: string } };
  return { url, anonKey, token: body.access_token, userId: body.user.id };
}

/** Gespeicherte Zeile des Benutzers (Revision und Konfiguration); null ohne Zeile. */
export async function readPreferencesRow(
  s: Session = session(),
): Promise<{ revision: number; config: unknown } | null> {
  return readRow(s);
}

/** Gespeicherte Revision des Benutzers; 0 ohne Zeile. */
export async function readRevision(s: Session = session()): Promise<number> {
  return (await readRow(s))?.revision ?? 0;
}

/**
 * Auftrag 079 (Realtime): ein Live-Wert im öffentlichen Feed, nur gegen ein lokales Supabase und
 * nur mit dem Aufräumschlüssel. Liefert das Entfernen genau dieser Zeile.
 */
export async function insertLiveFeedRow(
  kpiId: string,
  value: number,
  unit: string,
): Promise<() => Promise<void>> {
  const url = requireEnv('E2E_SUPABASE_URL');
  const key = requireEnv('E2E_CLEANUP_KEY');
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) throw new Error('Live-Feed nur lokal beschreiben.');
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  const now = new Date().toISOString();
  const response = await fetch(`${url}/rest/v1/live_kpi_public_feed`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      kpi_id: kpiId,
      value,
      unit,
      occurred_at: now,
      quality_status: 'valid',
      source_system: 'e2e-auftrag-079',
      ingested_at: now,
    }),
  });
  if (!response.ok) throw new Error(`Live-Feed-Eintrag fehlgeschlagen: ${response.status}`);
  const [row] = (await response.json()) as { id: string }[];
  if (!row || !UUID.test(row.id)) throw new Error('Live-Feed-Eintrag ohne ID.');
  return async () => {
    const removed = await fetch(`${url}/rest/v1/live_kpi_public_feed?id=eq.${row.id}`, {
      method: 'DELETE',
      headers,
    });
    if (!removed.ok) throw new Error(`Live-Feed-Aufräumen fehlgeschlagen: ${removed.status}`);
  };
}

async function readRow(s: Session): Promise<{ revision: number; config: unknown } | null> {
  const response = await fetch(
    `${s.url}/rest/v1/executive_dashboard_preferences?select=revision,config`,
    { headers: { apikey: s.anonKey, Authorization: `Bearer ${s.token}` } },
  );
  const rows = (await response.json()) as { revision: number; config: unknown }[];
  return rows[0] ?? null;
}

async function save(s: Session, config: unknown, expectedRevision: number): Promise<void> {
  const response = await fetch(`${s.url}/rest/v1/rpc/save_dashboard_preferences`, {
    method: 'POST',
    headers: {
      apikey: s.anonKey,
      Authorization: `Bearer ${s.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_config: config, p_expected_revision: expectedRevision }),
  });
  if (!response.ok) throw new Error(`Speichern fehlgeschlagen: ${response.status}`);
}

/**
 * Setzt `config` und liefert die Wiederherstellung des Ausgangszustands. Hat sich der Benutzer
 * zwischendurch abgemeldet (Abmelden widerruft alle seine Tokens), bekommt sie eine frische Sitzung.
 */
export async function applyDashboardConfig(
  config: unknown,
  initial: Session = session(),
): Promise<(fresh?: Session) => Promise<void>> {
  let s = initial;
  const original = await readRow(s);
  // Nur der eigens für E2E gesetzte Schlüssel, kein allgemeiner Service-Role-Schlüssel aus der Umgebung.
  const cleanupKey = process.env.E2E_CLEANUP_KEY;
  if (!original && !cleanupKey) throw new Error('E2E_CLEANUP_KEY zum Wiederherstellen fehlt.');
  // Vor dem Schreiben prüfen: eine fehlende Zeile muss danach sicher entfernbar sein.
  if (!original) assertScopedCleanup(s.url, s.userId);
  await save(s, config, original?.revision ?? 0);
  return async (fresh?: Session) => {
    if (fresh) s = fresh;
    const current = await readRow(s);
    if (original) {
      await save(s, original.config, current?.revision ?? 0);
      return;
    }
    assertScopedCleanup(s.url, s.userId);
    const response = await fetch(
      `${s.url}/rest/v1/executive_dashboard_preferences?user_id=eq.${encodeURIComponent(s.userId)}`,
      {
        method: 'DELETE',
        headers: { apikey: cleanupKey!, Authorization: `Bearer ${cleanupKey}` },
      },
    );
    if (!response.ok) throw new Error(`Löschen fehlgeschlagen: ${response.status}`);
  };
}
