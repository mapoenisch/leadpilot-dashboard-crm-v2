import fs from 'node:fs';

// Auftrag 077: feste Dashboard-Konfiguration des E2E-Benutzers für die Detail-Abläufe setzen und
// danach den Ausgangszustand wiederherstellen. Gespeichert wird wie in der App über die RPC
// `save_dashboard_preferences` mit dem Token des Benutzers (Servervalidierung, Revision); eine
// anfangs fehlende Zeile entfernt nur der Aufräumschlüssel wieder (RLS erlaubt Benutzern kein DELETE).

const AUTH_FILE = 'playwright/.auth/user.json';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} fehlt (Auftrag 077, personal-dashboard.spec.ts).`);
  return value;
}

interface Session {
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

/** Setzt `config` und liefert die Wiederherstellung des Ausgangszustands. */
export async function applyDashboardConfig(config: unknown): Promise<() => Promise<void>> {
  const s = session();
  const original = await readRow(s);
  const cleanupKey = process.env.E2E_CLEANUP_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!original && !cleanupKey) throw new Error('E2E_CLEANUP_KEY zum Wiederherstellen fehlt.');
  await save(s, config, original?.revision ?? 0);
  return async () => {
    const current = await readRow(s);
    if (original) {
      await save(s, original.config, current?.revision ?? 0);
      return;
    }
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
