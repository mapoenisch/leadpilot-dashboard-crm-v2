/**
 * Verification Script: Live KPI Contract, Idempotency, Schema & Secret Audit (Gate G18)
 *
 * Führt vollständige funktionale und statische Prüfungen ohne externe Datenbankverbindung aus:
 * 1. Contract-Validierung aller synthetischen Fixtures
 * 2. In-Memory TypeScript-Tests für numerische Sonderwerte (NaN, +/-Infinity)
 * 3. Idempotenz- und Duplikaterkennung
 * 4. Statischer SQL-Sicherheits- und Paritäts-Audit (RLS, search_path, Least-Privilege, Fehlercodes)
 * 5. Differenzierter Secret-Audit
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildIdempotencyKey,
  validateLiveKpiEvent,
  IDENTIFIER_REGEX,
  ISO_8601_REGEX,
} from '../src/services/liveKpi/liveKpiContract';
import { LIVE_KPI_CONTRACT_VERSION, LIVE_KPI_PROVENANCE } from '../src/types/liveKpi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('=======================================================');
console.log('🔍 VERIFYING LIVE KPI CONTRACT & INGEST PIPELINE (G18)');
console.log('=======================================================\n');

// -------------------------------------------------------------
// 1. Synthetische Replay Fixtures validieren
// -------------------------------------------------------------
console.log('--- 1. Testing Replay Fixtures ---');
const fixturePath = path.join(ROOT_DIR, 'tools', 'n8n', 'live-kpi-replay.fixture.json');
assert(fs.existsSync(fixturePath), 'tools/n8n/live-kpi-replay.fixture.json exists');

const fixtureContent = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const { fixtures } = fixtureContent;
assert(typeof fixtures === 'object' && fixtures !== null, 'Fixtures object is properly formatted');

// A. Valid Event 1
const res1 = validateLiveKpiEvent(fixtures.valid_event_1);
assert(res1.valid === true, 'valid_event_1 passes validation');
if (res1.valid) {
  assert(res1.event.contractVersion === LIVE_KPI_CONTRACT_VERSION, 'valid_event_1 has contractVersion 1.0');
  assert(res1.event.provenance === LIVE_KPI_PROVENANCE, 'valid_event_1 has provenance live');
  assert(res1.idempotencyKey === 'fixture-test-system:evt-fixture-001', 'valid_event_1 generates canonical idempotencyKey');
}

// B. Valid Event 2 (Degraded status)
const res2 = validateLiveKpiEvent(fixtures.valid_event_2);
assert(res2.valid === true, 'valid_event_2 passes validation');
if (res2.valid) {
  assert(res2.event.qualityStatus === 'degraded', 'valid_event_2 retains degraded qualityStatus');
  assert(res2.idempotencyKey === 'fixture-test-system:evt-fixture-002', 'valid_event_2 generates canonical idempotencyKey');
}

// C. Duplicate Event (matches valid_event_1 key)
const resDup = validateLiveKpiEvent(fixtures.duplicate_event);
assert(resDup.valid === true, 'duplicate_event passes individual validation');
if (resDup.valid && res1.valid) {
  assert(resDup.idempotencyKey === res1.idempotencyKey, 'duplicate_event produces byte-identical idempotencyKey to valid_event_1');
}

// D. Invalid Contract Version
const resInvVer = validateLiveKpiEvent(fixtures.invalid_contract_version);
assert(resInvVer.valid === false && resInvVer.errorCode === 'INVALID_CONTRACT_VERSION', 'invalid_contract_version rejected with INVALID_CONTRACT_VERSION');

// E. Invalid Missing Fields
const resInvMiss = validateLiveKpiEvent(fixtures.invalid_missing_fields);
assert(resInvMiss.valid === false && (resInvMiss.errorCode === 'INVALID_KPI_ID' || resInvMiss.errorCode === 'INVALID_VALUE'), 'invalid_missing_fields rejected with appropriate field error');

// F. Invalid Timestamp (text "tomorrow")
const resInvTime1 = validateLiveKpiEvent(fixtures.invalid_timestamp_text);
assert(resInvTime1.valid === false && resInvTime1.errorCode === 'INVALID_TIMESTAMP', 'invalid_timestamp_text ("tomorrow") rejected with INVALID_TIMESTAMP');

// G. Invalid Timestamp (malformed "invalid-date")
const resInvTime2 = validateLiveKpiEvent(fixtures.invalid_timestamp_malformed);
assert(resInvTime2.valid === false && resInvTime2.errorCode === 'INVALID_TIMESTAMP', 'invalid_timestamp_malformed rejected with INVALID_TIMESTAMP');

// G2. Invalid Timestamp (without mandatory timezone)
const resInvTime3 = validateLiveKpiEvent(fixtures.invalid_timestamp_without_timezone);
assert(resInvTime3.valid === false && resInvTime3.errorCode === 'INVALID_TIMESTAMP', 'invalid_timestamp_without_timezone rejected with INVALID_TIMESTAMP');

// H. Invalid Value (String)
const resInvValStr = validateLiveKpiEvent(fixtures.invalid_value_string);
assert(resInvValStr.valid === false && resInvValStr.errorCode === 'INVALID_VALUE', 'invalid_value_string rejected with INVALID_VALUE');

// I. Invalid Value (Null)
const resInvValNull = validateLiveKpiEvent(fixtures.invalid_value_null);
assert(resInvValNull.valid === false && resInvValNull.errorCode === 'INVALID_VALUE', 'invalid_value_null rejected with INVALID_VALUE');

// J. Invalid Provenance
const resInvProv = validateLiveKpiEvent(fixtures.invalid_provenance);
assert(resInvProv.valid === false && resInvProv.errorCode === 'INVALID_PROVENANCE', 'invalid_provenance rejected with INVALID_PROVENANCE');

// K. Invalid Quality Status
const resInvQual = validateLiveKpiEvent(fixtures.invalid_quality_status);
assert(resInvQual.valid === false && resInvQual.errorCode === 'INVALID_QUALITY_STATUS', 'invalid_quality_status rejected with INVALID_QUALITY_STATUS');

// L. Invalid Source System Chars
const resInvSrc = validateLiveKpiEvent(fixtures.invalid_source_system_chars);
assert(resInvSrc.valid === false && resInvSrc.errorCode === 'INVALID_SOURCE_SYSTEM', 'invalid_source_system_chars rejected with INVALID_SOURCE_SYSTEM');

// M. Invalid Contract Version (missing contractVersion)
const resInvVerMiss = validateLiveKpiEvent(fixtures.invalid_contract_version_missing);
assert(resInvVerMiss.valid === false && resInvVerMiss.errorCode === 'INVALID_CONTRACT_VERSION', 'invalid_contract_version_missing rejected with INVALID_CONTRACT_VERSION');

// N. Invalid Value (string number "123")
const resInvValStrNum = validateLiveKpiEvent(fixtures.invalid_value_string_number);
assert(resInvValStrNum.valid === false && resInvValStrNum.errorCode === 'INVALID_VALUE', 'invalid_value_string_number ("123") rejected with INVALID_VALUE');

// O. Invalid Context (string instead of object)
const resInvCtxStr = validateLiveKpiEvent(fixtures.invalid_context_string);
assert(resInvCtxStr.valid === false && resInvCtxStr.errorCode === 'INVALID_CONTEXT', 'invalid_context_string rejected with INVALID_CONTEXT');


// -------------------------------------------------------------
// 2. In-Memory TypeScript Tests für numerische Sonderwerte (NaN, +/-Infinity)
// -------------------------------------------------------------
console.log('\n--- 2. In-Memory Numeric Edge Cases (NaN, Infinity, -Infinity) ---');
const baseValid = { ...fixtures.valid_event_1 };

const resNaN = validateLiveKpiEvent({ ...baseValid, value: NaN });
assert(resNaN.valid === false && resNaN.errorCode === 'INVALID_VALUE', 'In-memory value NaN rejected with INVALID_VALUE');

const resInf = validateLiveKpiEvent({ ...baseValid, value: Infinity });
assert(resInf.valid === false && resInf.errorCode === 'INVALID_VALUE', 'In-memory value Infinity rejected with INVALID_VALUE');

const resNegInf = validateLiveKpiEvent({ ...baseValid, value: -Infinity });
assert(resNegInf.valid === false && resNegInf.errorCode === 'INVALID_VALUE', 'In-memory value -Infinity rejected with INVALID_VALUE');


// -------------------------------------------------------------
// 3. Kanonische Idempotenzschlüssel-Funktion
// -------------------------------------------------------------
console.log('\n--- 3. Canonical Idempotency Key Generation ---');
assert(buildIdempotencyKey('hubspot', '12345') === 'hubspot:12345', 'buildIdempotencyKey formats "${sourceSystem}:${eventId}"');
assert(buildIdempotencyKey('sys.alpha', 'evt_beta-01') === 'sys.alpha:evt_beta-01', 'buildIdempotencyKey supports dots, dashes, underscores');

let threwOnBadSys = false;
try {
  buildIdempotencyKey('bad system with spaces', '12345');
} catch {
  threwOnBadSys = true;
}
assert(threwOnBadSys, 'buildIdempotencyKey throws on invalid characters in sourceSystem');

// Mandatory Timezone assertions
assert(!ISO_8601_REGEX.test('2026-09-06T12:30:00'), 'ISO_8601_REGEX strictly rejects timestamp without timezone');
assert(ISO_8601_REGEX.test('2026-09-06T12:30:00Z'), 'ISO_8601_REGEX accepts timestamp with Z timezone');
assert(ISO_8601_REGEX.test('2026-09-06T12:30:00+02:00'), 'ISO_8601_REGEX accepts timestamp with offset timezone');
assert(ISO_8601_REGEX.test('2026-09-06T12:30:00.123-05:00'), 'ISO_8601_REGEX accepts timestamp with milliseconds and offset');


// -------------------------------------------------------------
// 4. Statischer SQL-Sicherheits- & Paritäts-Audit
// -------------------------------------------------------------
console.log('\n--- 4. Static SQL Security & Server-Contract Parity Audit ---');
const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20260906_live_kpi_pipeline.sql');
const schemaPath = path.join(ROOT_DIR, 'supabase', 'schema.sql');

assert(fs.existsSync(migrationPath), 'Migration 20260906_live_kpi_pipeline.sql exists');
assert(fs.existsSync(schemaPath), 'supabase/schema.sql exists');

const migrationSql = fs.readFileSync(migrationPath, 'utf8');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

for (const [name, sql] of [['Migration', migrationSql], ['Schema', schemaSql]]) {
  // A. RLS aktiv auf beiden Tabellen
  assert(sql.includes('ALTER TABLE public.live_kpi_events ENABLE ROW LEVEL SECURITY;'), `${name} enables RLS on live_kpi_events`);
  assert(sql.includes('ALTER TABLE public.live_kpi_rejections ENABLE ROW LEVEL SECURITY;'), `${name} enables RLS on live_kpi_rejections`);

  // B. Keine Policies für anon oder authenticated in G18
  assert(!/CREATE\s+POLICY\s+.*\s+ON\s+(public\.)?live_kpi_events/i.test(sql), `${name} defines 0 public/anon policies on live_kpi_events in G18`);
  assert(!/CREATE\s+POLICY\s+.*\s+ON\s+(public\.)?live_kpi_rejections/i.test(sql), `${name} defines 0 public/anon policies on live_kpi_rejections in G18`);

  // C. Revoke All auf Tabellen
  assert(sql.includes('REVOKE ALL ON TABLE public.live_kpi_events FROM anon, authenticated, PUBLIC, n8n_ingest;'), `${name} revokes all table permissions from browser roles and n8n`);
  assert(sql.includes('REVOKE ALL ON TABLE public.live_kpi_rejections FROM anon, authenticated, PUBLIC, n8n_ingest;'), `${name} revokes all rejection table permissions`);

  // D. Minimal privilegierte Rolle n8n_ingest
  assert(sql.includes("CREATE ROLE n8n_ingest WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;"), `${name} creates role n8n_ingest with strict minimal privileges`);
  assert(sql.includes('GRANT USAGE ON SCHEMA public TO n8n_ingest;'), `${name} grants USAGE ON SCHEMA public to n8n_ingest`);

  // E. Security Definer & search_path = pg_catalog
  assert(sql.includes('SECURITY DEFINER'), `${name} marks ingest_live_kpi_event as SECURITY DEFINER`);
  assert(sql.includes('SET search_path = pg_catalog'), `${name} strictly pins SET search_path = pg_catalog`);
  assert(/FUNCTION\s+public\.ingest_live_kpi_event\(\s*p_event\s+JSONB\s*\)/i.test(sql), `${name} declares ingest_live_kpi_event with raw p_event JSONB parameter`);

  // F. Vollqualifizierte Tabellennamen
  assert(sql.includes('public.live_kpi_events') && sql.includes('public.live_kpi_rejections'), `${name} fully qualifies all public table references`);

  // G. RPC Rechte
  assert(sql.includes('REVOKE EXECUTE ON FUNCTION public.ingest_live_kpi_event(JSONB) FROM PUBLIC, anon, authenticated;'), `${name} revokes RPC execute from PUBLIC and browser roles`);
  assert(sql.includes('GRANT EXECUTE ON FUNCTION public.ingest_live_kpi_event(JSONB) TO n8n_ingest;'), `${name} grants RPC execute solely to n8n_ingest`);

  // H. Wortgleiche Server-Contract-Parität in der RPC
  assert(sql.includes("NOT (p_event ? 'contractVersion')"), `${name} validates presence of contractVersion`);
  assert(sql.includes("'INVALID_CONTRACT_VERSION'"), `${name} handles INVALID_CONTRACT_VERSION`);
  assert(sql.includes("'INVALID_PROVENANCE'"), `${name} handles INVALID_PROVENANCE`);
  assert(sql.includes("'INVALID_QUALITY_STATUS'"), `${name} handles INVALID_QUALITY_STATUS`);
  assert(sql.includes("'INVALID_SOURCE_SYSTEM'"), `${name} handles INVALID_SOURCE_SYSTEM`);
  assert(sql.includes("'INVALID_EVENT_ID'"), `${name} handles INVALID_EVENT_ID`);
  assert(sql.includes("'INVALID_KPI_ID'"), `${name} handles INVALID_KPI_ID`);
  assert(sql.includes("'INVALID_UNIT'"), `${name} handles INVALID_UNIT`);
  assert(sql.includes("'INVALID_CORRELATION_ID'"), `${name} handles INVALID_CORRELATION_ID`);
  assert(sql.includes("jsonb_typeof(p_event->'value') <> 'number'"), `${name} validates value as strict JSON number (rejects string values)`);
  assert(sql.includes("v_num_value = 'NaN'::numeric OR v_num_value = 'Infinity'::numeric OR v_num_value = '-Infinity'::numeric"), `${name} handles NaN and +/-Infinity rejection`);
  assert(sql.includes("'INVALID_VALUE'"), `${name} handles INVALID_VALUE`);
  assert(sql.includes("'INVALID_TIMESTAMP'"), `${name} handles INVALID_TIMESTAMP`);
  assert(sql.includes("(p_event->>'occurredAt') !~ '^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\\.[0-9]+)?(Z|([+-][0-9]{2}:[0-9]{2}))$\'"), `${name} enforces mandatory timezone in timestamp regex without trailing question mark`);
  assert(sql.includes("jsonb_typeof(p_event->'context') <> 'object'"), `${name} validates context is JSON object if provided`);
  assert(sql.includes("'INVALID_CONTEXT'"), `${name} handles INVALID_CONTEXT`);

  // I. Kanonische Idempotenz
  assert(sql.includes("concat(v_source_system, ':', v_event_id)"), `${name} generates canonical idempotency key via concat(source_system, ':', event_id)`);

  // J. Deterministischer Ausschluss von Rohkontext bei Rejections (Keine Blacklist)
  assert(sql.includes("'{}'::jsonb"), `${name} uses '{}'::jsonb for deterministic sanitized_context`);
  assert(/INSERT\s+INTO\s+public\.live_kpi_rejections\s*\([^)]*sanitized_context[^)]*\)\s*VALUES\s*\([^)]*'{}'::jsonb\s*\);/is.test(sql), `${name} inserts literal '{}'::jsonb into live_kpi_rejections (never raw context)`);
  assert(!sql.includes("ARRAY['secret'"), `${name} contains no blacklist-based context persistence (no ARRAY['secret', ...])`);
  assert(!sql.includes("v_raw_ctx - ARRAY"), `${name} contains no v_raw_ctx - ARRAY blacklist stripping`);
  assert(!/INSERT\s+INTO\s+public\.live_kpi_rejections\s*\([^)]*\)\s*VALUES\s*\([^)]*v_raw_ctx/is.test(sql), `${name} never passes v_raw_ctx into live_kpi_rejections`);
  assert(!/INSERT\s+INTO\s+public\.live_kpi_rejections\s*\([^)]*\)\s*VALUES\s*\([^)]*p_event->'context'/is.test(sql), `${name} never passes p_event->'context' into live_kpi_rejections`);
}


// -------------------------------------------------------------
// 5. Statische n8n Workflow-Integritätsprüfung
// -------------------------------------------------------------
console.log('\n--- 5. Static n8n Workflow Integrity ---');
const workflowPath = path.join(ROOT_DIR, 'tools', 'n8n', 'live-kpi-ingest.workflow.json');
assert(fs.existsSync(workflowPath), 'tools/n8n/live-kpi-ingest.workflow.json exists');

const workflowJson = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
assert(Array.isArray(workflowJson.nodes), 'Workflow contains nodes array');

const codeNode = workflowJson.nodes.find((n: any) => n.id === 'validate-prepare-node' || n.type === 'n8n-nodes-base.code');
assert(!!codeNode, 'Workflow contains payload preparation node');
assert(!codeNode.parameters?.jsCode?.includes('Number('), 'Workflow does not coerce value via Number()');
assert(!codeNode.parameters?.jsCode?.includes("contractVersion || '1.0'"), 'Workflow does not default contractVersion');
assert(!codeNode.parameters?.jsCode?.includes("qualityStatus || 'valid'"), 'Workflow does not default qualityStatus');
assert(codeNode.parameters?.jsCode?.includes('rawPayload'), 'Workflow preserves and passes rawPayload');

const postgresNode = workflowJson.nodes.find((n: any) => n.type === 'n8n-nodes-base.postgres');
assert(!!postgresNode, 'Workflow uses native PostgreSQL node');
assert(postgresNode.credentials?.postgres?.id === 'n8n_ingest_postgres', 'Postgres node uses n8n_ingest_postgres credentials');
assert(postgresNode.parameters?.query?.includes('public.ingest_live_kpi_event($1::jsonb)'), 'Postgres node executes parameterized public.ingest_live_kpi_event($1::jsonb)');

const switchNode = workflowJson.nodes.find((n: any) => n.type === 'n8n-nodes-base.switch');
assert(!!switchNode, 'Workflow branches via Switch node');
assert(JSON.stringify(switchNode.parameters).includes('accepted'), 'Switch handles accepted path');
assert(JSON.stringify(switchNode.parameters).includes('duplicate'), 'Switch handles duplicate path');
assert(JSON.stringify(switchNode.parameters).includes('rejected'), 'Switch handles rejected path');

const nodeNames = new Set(workflowJson.nodes.map((n: any) => n.name));
for (const [sourceNodeName, connObj] of Object.entries(workflowJson.connections || {})) {
  assert(nodeNames.has(sourceNodeName), `Workflow connection source "${sourceNodeName}" exists in nodes list`);
  const connList = (connObj as any).main || [];
  for (const group of connList) {
    for (const target of group) {
      assert(nodeNames.has(target.node), `Workflow connection target "${target.node}" exists in nodes list`);
    }
  }
}


// -------------------------------------------------------------
// 6. Differenzierter Secret-Audit
// -------------------------------------------------------------
console.log('\n--- 6. Differentiated Secret Audit ---');
const codeAndConfigAuditFiles = [
  path.join(ROOT_DIR, 'tools', 'n8n', 'live-kpi-ingest.workflow.json'),
  path.join(ROOT_DIR, 'tools', 'n8n', 'live-kpi-replay.fixture.json'),
  path.join(ROOT_DIR, 'supabase', 'migrations', '20260906_live_kpi_pipeline.sql'),
  path.join(ROOT_DIR, 'supabase', 'schema.sql'),
  path.join(ROOT_DIR, 'src', 'types', 'liveKpi.ts'),
  path.join(ROOT_DIR, 'src', 'services', 'liveKpi', 'liveKpiContract.ts'),
];

const docAuditFiles = [
  path.join(ROOT_DIR, 'tools', 'n8n', 'README.md'),
  path.join(ROOT_DIR, 'docs', 'auftraege', 'ANTIGRAVITY_AUFTRAG_034_DATENVERTRAG_SCHEMA_SCHREIBPIPELINE.md'),
];

// Muster für echte Secrets (JWTs, echte Passwörter, Connection Strings mit Passwörtern, SQL-Passwortbefehle)
const UNIVERSAL_LEAK_PATTERNS = [
  /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}/, // JWT Token Pattern
  /postgres(?:ql)?:\/\/[^:]+:[^@\s]+@/,            // Connection string with real user:password@
  /ALTER\s+ROLE\s+.*PASSWORD\s+['"][^'"]+['"]/i,   // SQL password command with literal
  /CREATE\s+ROLE\s+.*PASSWORD\s+['"][^'"]+['"]/i,  // SQL password command with literal
  /(?:password|secret)\s*[:=]\s*['"][a-zA-Z0-9_-]{4,}['"]/i, // Hardcoded password/secret literal
];

for (const filePath of [...codeAndConfigAuditFiles, ...docAuditFiles]) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT_DIR, filePath);

  for (const pattern of UNIVERSAL_LEAK_PATTERNS) {
    const match = content.match(pattern);
    assert(!match, `No secret leak matching ${pattern} in ${relPath}`);
  }
}

// In Workflows, Konfigurationen, Schemas und Source-Code darf auch der Begriff service_role keinesfalls vorkommen
for (const filePath of codeAndConfigAuditFiles) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT_DIR, filePath);
  assert(!/service_role/i.test(content), `Strictly no service_role token/role in ${relPath}`);
}

console.log('\n=======================================================');
console.log('🎉 ALL LIVE KPI CONTRACT & PIPELINE CHECKS PASSED!');
console.log('=======================================================');
