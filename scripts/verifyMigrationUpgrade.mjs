#!/usr/bin/env node
// G65 (Auftrag 067S): Migrationsnachweis gegen leere Datenbank und Stand v2.2.0.
//
// Baut im laufenden lokalen Supabase-Container zwei Wegwerf-Datenbanken:
//   lp_fresh   — leer, danach alle Migrationen aus supabase/migrations
//   lp_upgrade — Stand v2.2.0 (scripts/fixtures/v2.2.0), danach dieselben Migrationen
// Prüft fail-closed:
//   1. Beide Ketten laufen ohne Fehler durch (ON_ERROR_STOP).
//   2. Bestandszeilen aus v2.2.0 gehören danach dem Demo-Mandanten (NOT NULL).
//   3. Der Demo-Bootstrap läuft zweimal ohne Änderung der Bestände (Idempotenz).
//   4. Keine offene USING(true)-/WITH CHECK(true)-Policy außer der bewusst
//      öffentlichen Live-KPI-Anzeige.
//   5. Das Schema nach dem Upgrade entspricht dem Schema aus der leeren DB
//      (Spalten, Constraints, Indizes, Policies, RLS, Funktionen, Trigger).
//   6. Die pgTAP-Suiten laufen gegen die hochgezogene Datenbank grün.
// Die Datenbank `postgres` (E2E-Stand) bleibt unberührt.
//
// Aufruf: node scripts/verifyMigrationUpgrade.mjs  (lokales Supabase muss laufen)
// Exit 0 nur, wenn alle Prüfungen bestehen.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const projectId = /^project_id\s*=\s*"([^"]+)"/m.exec(
  readFileSync(join(root, 'supabase/config.toml'), 'utf-8'),
)?.[1];
const container = process.env.SUPABASE_DB_CONTAINER ?? `supabase_db_${projectId}`;
const supabaseCli = process.env.SUPABASE_BIN || 'supabase';
const DEMO_ORG = '00000000-0000-0000-0000-000000000001';
const PUBLIC_POLICY_ALLOWLIST = new Set(['live_kpi_public_feed:allow_anon_authenticated_read']);

const failures = [];
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
};

function run(cmd, args, input) {
  const res = spawnSync(cmd, args, { input, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  return { code: res.status ?? 1, out: res.stdout ?? '', err: res.stderr ?? '' };
}

function psql(db, sql, user = 'postgres') {
  return run(
    'docker',
    ['exec', '-i', container, 'psql', '-U', user, '-d', db, '-v', 'ON_ERROR_STOP=1', '-q', '-tA'],
    sql,
  );
}

function query(db, sql) {
  const res = psql(db, sql);
  if (res.code !== 0) throw new Error(`Abfrage in ${db} fehlgeschlagen: ${res.err.trim()}`);
  return res.out.trim();
}

/** Legt eine leere Datenbank mit Supabase-Rahmen an (auth-Schema, Rollenrechte, Publication). */
function createDatabase(db) {
  const admin = psql(
    'postgres',
    `DROP DATABASE IF EXISTS ${db};\nCREATE DATABASE ${db};`,
    'supabase_admin',
  );
  if (admin.code !== 0) throw new Error(`Datenbank ${db} nicht angelegt: ${admin.err.trim()}`);
  // auth-/extensions-Schema aus der laufenden Instanz übernehmen. Objekte, die
  // erst unsere Migrationen anlegen (z. B. Trigger auf auth.users), scheitern
  // hier bewusst und entstehen später durch die Migrationen selbst.
  run('docker', [
    'exec',
    container,
    'bash',
    '-c',
    `pg_dump -U supabase_admin --schema-only -n auth -n extensions postgres | psql -q -U supabase_admin ${db} >/dev/null 2>&1`,
  ]);
  const prep = psql(
    db,
    `ALTER SCHEMA public OWNER TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role, postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;`,
    'supabase_admin',
  );
  if (prep.code !== 0) throw new Error(`Rahmen für ${db} fehlgeschlagen: ${prep.err.trim()}`);
}

/** Spielt SQL-Dateien der Reihe nach ein; bricht beim ersten Fehler ab. */
function applyFiles(db, files, label) {
  for (const file of files) {
    const res = psql(db, readFileSync(file, 'utf-8'));
    if (res.code !== 0) {
      const error = res.err.split('\n').find((l) => l.startsWith('ERROR')) ?? res.err.trim();
      check(false, `${label}: ${file.replace(`${root}/`, '')}`, error);
      return false;
    }
  }
  check(true, label, `${files.length} Dateien`);
  return true;
}

const CATALOG = `
SELECT 'column ' || table_name || '.' || column_name || ' ' || data_type || ' null=' || is_nullable
       || ' default=' || COALESCE(column_default, '-')
FROM information_schema.columns WHERE table_schema = 'public'
UNION ALL
SELECT 'constraint ' || c.conrelid::regclass || ' ' || c.conname || ' ' || pg_get_constraintdef(c.oid)
FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public'
UNION ALL
SELECT 'index ' || indexdef FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT 'policy ' || tablename || '.' || policyname || ' ' || cmd || ' ' || roles::text || ' '
       || COALESCE(qual, '-') || ' ' || COALESCE(with_check, '-')
FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 'rls ' || relname || ' ' || relrowsecurity FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'
UNION ALL
SELECT 'function ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') definer='
       || p.prosecdef || ' ' || md5(p.prosrc)
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
UNION ALL
SELECT 'trigger ' || tgrelid::regclass || ' ' || pg_get_triggerdef(t.oid)
FROM pg_trigger t WHERE NOT t.tgisinternal
  AND tgrelid IN (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE n.nspname IN ('public', 'auth'))
ORDER BY 1;`;

const migrations = readdirSync(join(root, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => join(root, 'supabase/migrations', f));
const fixtures = readdirSync(join(root, 'scripts/fixtures/v2.2.0'))
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => join(root, 'scripts/fixtures/v2.2.0', f));
const bootstrap = migrations.find((f) => f.endsWith('_demo_bootstrap.sql'));

try {
  // 1. Leere Datenbank
  createDatabase('lp_fresh');
  const freshOk = applyFiles('lp_fresh', migrations, 'Leere DB: alle Migrationen');

  // 2. Stand v2.2.0 → Upgrade
  createDatabase('lp_upgrade');
  const legacyOk = applyFiles('lp_upgrade', fixtures, 'Stand v2.2.0 aufgebaut');
  const upgradeOk =
    legacyOk && applyFiles('lp_upgrade', migrations, 'Upgrade v2.2.0: alle Migrationen');

  if (upgradeOk) {
    const legacy = query(
      'lp_upgrade',
      `SELECT count(*) FILTER (WHERE organization_id = '${DEMO_ORG}') || '/' || count(*)
       FROM (SELECT organization_id FROM companies WHERE id LIKE 'c-v220-%'
             UNION ALL SELECT organization_id FROM contacts WHERE id LIKE 'k-v220-%'
             UNION ALL SELECT organization_id FROM imported_funnel_deals WHERE id LIKE 'f-v220-%') AS t;`,
    );
    check(legacy === '4/4', 'Bestandszeilen v2.2.0 dem Demo-Mandanten zugeordnet', legacy);

    // 3. Demo-Bootstrap zweimal
    const counts = `SELECT (SELECT count(*) FROM organizations) || '/' || (SELECT count(*) FROM companies)
      || '/' || (SELECT count(*) FROM contacts) || '/' || (SELECT count(*) FROM imported_funnel_deals);`;
    const before = query('lp_upgrade', counts);
    const twice = [bootstrap, bootstrap].every(
      (f) => psql('lp_upgrade', readFileSync(f, 'utf-8')).code === 0,
    );
    const after = query('lp_upgrade', counts);
    check(twice && before === after, 'Demo-Bootstrap zweimal idempotent', `${before} → ${after}`);
  }

  // 4. Offene Policies
  for (const db of ['lp_fresh', 'lp_upgrade']) {
    const open = query(
      db,
      `SELECT tablename || ':' || policyname FROM pg_policies
       WHERE schemaname = 'public' AND (qual = 'true' OR with_check = 'true') ORDER BY 1;`,
    )
      .split('\n')
      .filter((p) => p && !PUBLIC_POLICY_ALLOWLIST.has(p));
    check(open.length === 0, `${db}: keine offene USING(true)-Policy`, open.join(', '));
  }

  // 5. Schemagleichheit
  if (freshOk && upgradeOk) {
    const fresh = new Set(query('lp_fresh', CATALOG).split('\n'));
    const upgraded = new Set(query('lp_upgrade', CATALOG).split('\n'));
    const onlyFresh = [...fresh].filter((l) => !upgraded.has(l));
    const onlyUpgrade = [...upgraded].filter((l) => !fresh.has(l));
    for (const l of onlyFresh) console.log(`     nur leer:    ${l}`);
    for (const l of onlyUpgrade) console.log(`     nur upgrade: ${l}`);
    check(
      onlyFresh.length === 0 && onlyUpgrade.length === 0,
      'Schema nach Upgrade = Schema aus leerer DB',
      `${fresh.size} Katalogeinträge`,
    );
  }

  // 6. pgTAP gegen die hochgezogene Datenbank
  if (upgradeOk) {
    psql(
      'lp_upgrade',
      'CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;',
      'supabase_admin',
    );
    const tap = run(supabaseCli, [
      'test',
      'db',
      '--db-url',
      'postgresql://postgres:postgres@127.0.0.1:54322/lp_upgrade',
    ]);
    const summary =
      `${tap.out}\n${tap.err}`.split('\n').find((l) => l.startsWith('Result:')) ?? 'kein Ergebnis';
    check(tap.code === 0, 'pgTAP-Suiten gegen hochgezogene DB', summary);
    if (tap.code !== 0)
      console.log(
        `${tap.out}\n${tap.err}`
          .split('\n')
          .filter((l) => /Failed|not ok|Error/.test(l))
          .slice(0, 20)
          .join('\n'),
      );
  }
} catch (error) {
  check(false, 'Ablauf', error instanceof Error ? error.message : String(error));
}

console.log(
  failures.length === 0
    ? '\nMIGRATION UPGRADE: GRÜN'
    : `\nMIGRATION UPGRADE: ROT (${failures.length})`,
);
process.exit(failures.length === 0 ? 0 : 1);
