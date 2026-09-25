#!/usr/bin/env node
// G65 (Auftrag 067S, Codex-Review PR #30): Backup und Wiederherstellung inklusive
// Supabase-Auth, am lokalen Supabase ausgeführt wie im Runbook (Abschnitt 3/7).
//
//   1. Stand erfassen: Zeilen je Tabelle (public, auth, storage), Prüfsumme über
//      auth.users/auth.identities, Trigger auf auth.users.
//   2. Backup:   supabase db dump --data-only --use-copy (enthält auth-Daten)
//   3. Verlust:  supabase db reset --no-seed (nur Migrationen, keine Benutzer)
//   4. Restore:  Schema kommt aus den Migrationen (inkl. Trigger auf auth.users),
//                alle im Dump enthaltenen Tabellen leeren, Datendump einspielen
//   5. Nachweis: Zeilen, Prüfsummen und Trigger identisch; Login eines
//                wiederhergestellten Benutzers über GoTrue; RLS liefert ihm nur
//                seine Organisation.
//
// ACHTUNG: setzt die lokale Datenbank `postgres` zurück und stellt sie aus dem
// Backup wieder her. Nur gegen das lokale Supabase ausführen.
// Aufruf: node scripts/verifyBackupRestore.mjs   (npm run verify:backup)
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const projectId = /^project_id\s*=\s*"([^"]+)"/m.exec(
  readFileSync(join(root, 'supabase/config.toml'), 'utf-8'),
)?.[1];
const container = process.env.SUPABASE_DB_CONTAINER ?? `supabase_db_${projectId}`;
const supabaseCli = process.env.SUPABASE_BIN || 'supabase';
const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const BASE_SCHEMA = join(root, 'supabase/migrations/20260101000000_base_schema.sql');
// Plattforminterne Storage-Vektortabellen: für den Rolle-postgres-Zugang gesperrt,
// von LeadPilot nicht genutzt (Runbook, Abschnitt 3).
const DUMP_EXCLUDES = ['storage.buckets_vectors', 'storage.vector_indexes'];
const LOGIN_EMAIL = process.env.E2E_AUTH_EMAIL ?? 'admin-a@e2e.local';
const LOGIN_PASSWORD = process.env.E2E_AUTH_PASSWORD;

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

function run(cmd, args, input) {
  const res = spawnSync(cmd, args, {
    cwd: root,
    input,
    encoding: 'utf-8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return { code: res.status ?? 1, out: res.stdout ?? '', err: res.stderr ?? '' };
}

function psql(sql) {
  return run(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-q',
      '-tA',
    ],
    sql,
  );
}

function query(sql) {
  const res = psql(sql);
  if (res.code !== 0) throw new Error(`Abfrage fehlgeschlagen: ${res.err.trim()}`);
  return res.out.trim();
}

/** Zeilenzahl je Tabelle der gesicherten Schemas als sortierte Liste. */
function tableCounts(tables) {
  return tables.map((t) => `${t}=${query(`SELECT count(*) FROM ${t};`)}`);
}

const FINGERPRINT = `
SELECT md5(string_agg(id::text || email || COALESCE(encrypted_password, ''), ',' ORDER BY id))
  FROM auth.users;
SELECT md5(string_agg(id::text || user_id::text || provider, ',' ORDER BY id)) FROM auth.identities;
SELECT string_agg(tgname, ',' ORDER BY tgname) FROM pg_trigger
  WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;`;

async function login() {
  const status = JSON.parse(run(supabaseCli, ['status', '-o', 'json']).out || '{}');
  const api = status.API_URL;
  const anon = status.ANON_KEY;
  if (!api || !anon || !LOGIN_PASSWORD)
    return { ok: false, detail: 'API_URL/ANON_KEY/E2E_AUTH_PASSWORD fehlt' };
  // Nach `db reset` starten Auth und API neu: bis zu 60 s auf Erreichbarkeit warten.
  let res = null;
  for (let attempt = 0; attempt < 30 && !res; attempt++) {
    res = await fetch(`${api}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    }).catch(() => null);
    if (!res || res.status >= 500) {
      res = null;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (!res) return { ok: false, detail: 'Auth-API nicht erreichbar' };
  if (!res.ok) return { ok: false, detail: `Login HTTP ${res.status}` };
  const { access_token: token } = await res.json();
  const rows = await fetch(`${api}/rest/v1/companies?select=organization_id`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const orgs = new Set(rows.map((r) => r.organization_id));
  return {
    ok: rows.length > 0 && orgs.size === 1,
    detail: `${rows.length} Companies aus ${orgs.size} Organisation`,
  };
}

const tmp = mkdtempSync(join(tmpdir(), 'lp-backup-'));
const dataFile = join(tmp, 'backup-data.sql');
let copiedBaseSchema = false;
try {
  // 1. Stand vor dem Backup
  const before0 = await login();
  check(before0.ok, 'Ausgangsstand: Login und RLS', before0.detail);
  const seededUsers = Number(query('SELECT count(*) FROM auth.users;'));
  if (!before0.ok || seededUsers === 0) {
    throw new Error(
      'Kein belastbarer Ausgangsstand (erst `supabase db reset` mit Seed ausführen).',
    );
  }

  // 2. Backup wie im Runbook
  const dump = run(supabaseCli, [
    'db',
    'dump',
    '--db-url',
    DB_URL,
    '--data-only',
    '--use-copy',
    ...DUMP_EXCLUDES.flatMap((t) => ['-x', t]),
    '-f',
    dataFile,
  ]);
  if (dump.code !== 0) throw new Error(`db dump fehlgeschlagen: ${dump.err.trim()}`);
  const dumpSql = readFileSync(dataFile, 'utf-8');
  const tables = [...dumpSql.matchAll(/^COPY ("[^"]+"\."[^"]+")/gm)].map((m) => m[1]);
  check(
    tables.includes('"auth"."users"') && tables.includes('"auth"."identities"'),
    'Backup enthält auth.users und auth.identities',
    `${tables.length} Tabellen`,
  );
  const before = tableCounts(tables);
  const beforeFp = query(FINGERPRINT);

  // 3. Datenverlust simulieren: nur Migrationen, keine Benutzer, kein Seed
  if (!existsSync(BASE_SCHEMA)) {
    copyFileSync(join(root, 'supabase/schema.sql'), BASE_SCHEMA);
    copiedBaseSchema = true;
  }
  const reset = run(supabaseCli, ['db', 'reset', '--no-seed']);
  if (reset.code !== 0) throw new Error(`db reset fehlgeschlagen: ${reset.err.trim()}`);
  const users = query('SELECT count(*) FROM auth.users;');
  check(users === '0', 'Nach Reset ohne Seed: keine Benutzer', `auth.users=${users}`);

  // 4. Restore: gesicherte Tabellen, die im Ziel schon Zeilen haben (z. B. aus dem
  // Demo-Bootstrap der Migrationen), leeren; dann Daten einspielen (Trigger aus).
  const filled = tables.filter((t) => query(`SELECT count(*) FROM ${t};`) !== '0');
  const truncate = filled.length ? `TRUNCATE ${filled.join(', ')} CASCADE;` : '';
  const restore = psql(
    `BEGIN;\nSET session_replication_role = replica;\n${truncate}\n${dumpSql}\nCOMMIT;`,
  );
  if (restore.code !== 0) {
    throw new Error(
      `Restore fehlgeschlagen: ${restore.err.split('\n').find((l) => l.startsWith('ERROR')) ?? restore.err}`,
    );
  }

  // 5. Nachweis
  const after = tableCounts(tables);
  const diff = before.filter((line, i) => line !== after[i]);
  check(
    diff.length === 0,
    'Zeilen je Tabelle identisch',
    diff.length ? diff.join(', ') : `${tables.length} Tabellen`,
  );
  const afterFp = query(FINGERPRINT);
  check(
    afterFp === beforeFp,
    'auth.users/identities (Prüfsumme) und Trigger identisch',
    afterFp.split('\n').at(-1),
  );
  const after0 = await login();
  check(
    after0.ok,
    'Login des wiederhergestellten Benutzers, RLS nur eigene Organisation',
    after0.detail,
  );
} catch (error) {
  check(false, 'Ablauf', error instanceof Error ? error.message : String(error));
} finally {
  if (copiedBaseSchema) rmSync(BASE_SCHEMA, { force: true });
  rmSync(tmp, { recursive: true, force: true });
}

console.log(
  failures.length === 0 ? '\nBACKUP/RESTORE: GRÜN' : `\nBACKUP/RESTORE: ROT (${failures.length})`,
);
process.exit(failures.length === 0 ? 0 : 1);
