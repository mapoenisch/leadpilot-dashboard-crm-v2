import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('\n=== RUNNING AUFTRAG 035 / GATE G19 AUDIT (LIVE-KPI READ ADAPTER & REALTIME PROJECTION) ===\n');

// -------------------------------------------------------------
// 1. Migration & Schema Parität
// -------------------------------------------------------------
console.log('--- 1. Supabase Migration & Schema Audit ---');
const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20260907_live_kpi_read_layer.sql');
const schemaPath = path.join(ROOT_DIR, 'supabase', 'schema.sql');

assert(fs.existsSync(migrationPath), 'Migration 20260907_live_kpi_read_layer.sql exists');
assert(fs.existsSync(schemaPath), 'supabase/schema.sql exists');

const migrationSql = fs.readFileSync(migrationPath, 'utf8');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

for (const [name, sql] of [['Migration', migrationSql], ['Schema', schemaSql]]) {
  // A. Tabelle public.live_kpi_public_feed
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.live_kpi_public_feed'), `${name} defines public.live_kpi_public_feed`);
  assert(sql.includes('kpi_id TEXT NOT NULL'), `${name} contains kpi_id`);
  assert(sql.includes('value NUMERIC NOT NULL'), `${name} contains numeric value`);
  assert(sql.includes('unit TEXT NOT NULL'), `${name} contains unit`);
  assert(sql.includes('occurred_at TIMESTAMPTZ NOT NULL'), `${name} contains occurred_at`);
  assert(sql.includes('quality_status TEXT NOT NULL'), `${name} contains quality_status`);
  assert(sql.includes('source_system TEXT NOT NULL'), `${name} contains source_system`);
  assert(sql.includes('ingested_at TIMESTAMPTZ NOT NULL'), `${name} contains ingested_at`);

  // B. Strikt kein context, kein event_id, keine Rejection-Felder in der Projektion
  assert(!/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.live_kpi_public_feed\s*\([^)]*\bcontext\b/i.test(sql), `${name} excludes context from live_kpi_public_feed`);
  assert(!/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.live_kpi_public_feed\s*\([^)]*\bevent_id\b/i.test(sql), `${name} excludes event_id from live_kpi_public_feed`);
  assert(!/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.live_kpi_public_feed\s*\([^)]*\bcorrelation_id\b/i.test(sql), `${name} excludes correlation_id from live_kpi_public_feed`);

  // C. Index für kpi_id und occurred_at DESC, ingested_at DESC
  assert(sql.includes('idx_live_kpi_public_feed_kpi_occurred'), `${name} creates index on kpi_id`);
  assert(sql.includes('occurred_at DESC, ingested_at DESC'), `${name} index orders by occurred_at DESC, ingested_at DESC for deterministic tie-breaking`);
  assert(!sql.includes('DEFAULT clock_timestamp()'), `${name} forbids DEFAULT clock_timestamp() on ingested_at`);
  assert(sql.includes('NEW.ingested_at'), `${name} maps NEW.ingested_at explicitly in trigger function`);

  // D. Triggerfunktion als SECURITY DEFINER mit pg_catalog
  assert(sql.includes('FUNCTION public.project_live_kpi_to_public_feed()'), `${name} defines project_live_kpi_to_public_feed()`);
  assert(sql.includes('SECURITY DEFINER'), `${name} marks trigger function as SECURITY DEFINER`);
  assert(sql.includes('SET search_path = pg_catalog'), `${name} strictly pins search_path to pg_catalog`);
  assert(sql.includes('public.live_kpi_public_feed'), `${name} uses fully qualified table reference in trigger function`);

  // E. Zwingender Rechteentzug auf Triggerfunktion
  assert(
    sql.includes('REVOKE EXECUTE ON FUNCTION public.project_live_kpi_to_public_feed() FROM PUBLIC, anon, authenticated, n8n_ingest;'),
    `${name} strictly revokes EXECUTE on trigger function from PUBLIC, anon, authenticated, n8n_ingest`
  );

  // F. Trigger auf live_kpi_events
  assert(sql.includes('TRIGGER trg_project_live_kpi_event'), `${name} creates trigger on live_kpi_events`);
  assert(sql.includes('AFTER INSERT ON public.live_kpi_events'), `${name} fires AFTER INSERT on live_kpi_events`);

  // G. RLS und Least Privilege
  assert(sql.includes('ALTER TABLE public.live_kpi_public_feed ENABLE ROW LEVEL SECURITY;'), `${name} enables RLS on live_kpi_public_feed`);
  assert(sql.includes('REVOKE ALL ON TABLE public.live_kpi_public_feed FROM anon, authenticated, PUBLIC, n8n_ingest;'), `${name} revokes all privileges initially`);
  assert(sql.includes('GRANT SELECT ON TABLE public.live_kpi_public_feed TO anon, authenticated;'), `${name} grants SELECT solely to anon, authenticated`);
  assert(sql.includes('POLICY allow_anon_authenticated_read'), `${name} creates SELECT policy for anon, authenticated`);
  assert(!/GRANT\s+(INSERT|UPDATE|DELETE|ALL)\s+ON\s+TABLE\s+public\.live_kpi_public_feed\s+TO\s+(anon|authenticated|PUBLIC|n8n_ingest)/i.test(sql), `${name} forbids write grants on live_kpi_public_feed`);

  // H. Realtime Publication
  assert(sql.includes('ALTER PUBLICATION supabase_realtime ADD TABLE public.live_kpi_public_feed;'), `${name} adds live_kpi_public_feed to supabase_realtime`);
}

// -------------------------------------------------------------
// 2. Isolierung des Supabase-Clients im Frontend
// -------------------------------------------------------------
console.log('\n--- 2. Supabase Client Isolation Audit ---');
const adapterPath = path.join(ROOT_DIR, 'src', 'services', 'liveKpi', 'liveKpiReadAdapter.ts');
assert(fs.existsSync(adapterPath), 'src/services/liveKpi/liveKpiReadAdapter.ts exists');

const adapterContent = fs.readFileSync(adapterPath, 'utf8');
assert(adapterContent.includes("from '@/services/db/supabaseClient'"), 'liveKpiReadAdapter imports supabaseClient');
assert(adapterContent.includes('live_kpi_public_feed'), 'liveKpiReadAdapter queries live_kpi_public_feed');
assert(!adapterContent.includes('live_kpi_events'), 'liveKpiReadAdapter never references live_kpi_events');
assert(!adapterContent.includes('live_kpi_rejections'), 'liveKpiReadAdapter never references live_kpi_rejections');
assert(adapterContent.includes('export async function fetchLatestLiveKpi'), 'liveKpiReadAdapter exports fetchLatestLiveKpi');
assert(adapterContent.includes('export function subscribeToLiveKpi'), 'liveKpiReadAdapter exports subscribeToLiveKpi');
assert(adapterContent.includes('export function isLiveKpiReadConfigured'), 'liveKpiReadAdapter exports isLiveKpiReadConfigured');
assert(adapterContent.includes(".order('occurred_at', { ascending: false })"), 'liveKpiReadAdapter orders by occurred_at DESC');
assert(adapterContent.includes(".order('ingested_at', { ascending: false })"), 'liveKpiReadAdapter orders by ingested_at DESC');
assert(adapterContent.includes('throw new Error('), 'liveKpiReadAdapter rethrows errors on query failure');

// Prüfe alle in G19 geänderten/neuen UI-Dateien: keine darf direkt den Supabase-Client importieren
const forbiddenUiFiles = [
  path.join(ROOT_DIR, 'src', 'hooks', 'useLiveKpi.ts'),
  path.join(ROOT_DIR, 'src', 'components', 'liveKpi', 'LiveKpiCard.tsx'),
  path.join(ROOT_DIR, 'src', 'features', 'overview', 'pages', 'ExecutiveDashboardPage.tsx'),
];

for (const f of forbiddenUiFiles) {
  assert(fs.existsSync(f), `${path.basename(f)} exists`);
  const content = fs.readFileSync(f, 'utf8');
  assert(!content.includes("from '@/services/db/supabaseClient'"), `${path.basename(f)} does not import supabaseClient directly`);
  assert(!content.includes('from "../services/db/supabaseClient"'), `${path.basename(f)} does not import supabaseClient relatively`);
  assert(!content.includes('from "../../services/db/supabaseClient"'), `${path.basename(f)} does not import supabaseClient relatively`);
}

// -------------------------------------------------------------
// 3. Hook Channel-Status & Lifecycle Audit
// -------------------------------------------------------------
console.log('\n--- 3. Hook Channel-Status & Lifecycle Audit ---');
const hookPath = path.join(ROOT_DIR, 'src', 'hooks', 'useLiveKpi.ts');
assert(fs.existsSync(hookPath), 'src/hooks/useLiveKpi.ts exists');

const hookContent = fs.readFileSync(hookPath, 'utf8');
assert(hookContent.includes('export function useLiveKpi'), 'useLiveKpi hook exported');
assert(hookContent.includes('isLiveKpiReadConfigured'), 'useLiveKpi uses isLiveKpiReadConfigured');
assert(hookContent.includes('generationRef'), 'useLiveKpi guards against stale response race conditions using generation counter');
assert(hookContent.includes('isCancelled'), 'useLiveKpi tracks local effect cancellation');
assert(/isCancelled\s*=\s*true;\s*subscription\.unsubscribe\(\);/.test(hookContent), 'useLiveKpi invalidates running effect BEFORE unsubscribe()');
assert(hookContent.includes("'unconfigured'"), 'useLiveKpi handles unconfigured status');
assert(hookContent.includes("'loading'"), 'useLiveKpi handles loading status');
assert(hookContent.includes("'live'"), 'useLiveKpi handles live status');
assert(hookContent.includes("'offline'"), 'useLiveKpi handles offline status');
assert(hookContent.includes("'error'"), 'useLiveKpi handles error status');
assert(hookContent.includes("channelStatus === 'subscribed'"), 'useLiveKpi handles SUBSCRIBED channel event');
assert(hookContent.includes("fetchLatestLiveKpi(kpiId)"), 'useLiveKpi re-fetches snapshot upon SUBSCRIBED status');
assert(hookContent.includes("channelStatus === 'error'"), 'useLiveKpi handles CHANNEL_ERROR / TIMED_OUT status');
assert(hookContent.includes("channelStatus === 'offline'"), 'useLiveKpi handles CLOSED channel status');
assert(hookContent.includes('subscription.unsubscribe()'), 'useLiveKpi executes unsubscribe() on unmount/KPI change');
assert(hookContent.includes('setError('), 'useLiveKpi populates error object on failure');

// -------------------------------------------------------------
// 4. UI-Komponentenbindung & Dashboard-Audit
// -------------------------------------------------------------
console.log('\n--- 4. UI Component & Dashboard Integration Audit ---');
const cardPath = path.join(ROOT_DIR, 'src', 'components', 'liveKpi', 'LiveKpiCard.tsx');
assert(fs.existsSync(cardPath), 'src/components/liveKpi/LiveKpiCard.tsx exists');

const cardContent = fs.readFileSync(cardPath, 'utf8');
assert(cardContent.includes('data-testid="live-kpi-card"'), 'LiveKpiCard defines data-testid="live-kpi-card"');
assert(cardContent.includes('React.memo'), 'LiveKpiCard is wrapped in React.memo for isolated renders');
assert(cardContent.includes('useLiveKpi'), 'LiveKpiCard uses useLiveKpi hook');
assert(cardContent.includes('Ebene C'), 'LiveKpiCard renders Ebene C badge');
assert(cardContent.includes('Supabase nicht konfiguriert'), 'LiveKpiCard displays honest unconfigured status');

const execPagePath = path.join(ROOT_DIR, 'src', 'features', 'overview', 'pages', 'ExecutiveDashboardPage.tsx');
const execContent = fs.readFileSync(execPagePath, 'utf8');
assert(execContent.includes('LiveKpiCard'), 'ExecutiveDashboardPage includes LiveKpiCard');
assert(execContent.includes('pipeline_coverage'), 'ExecutiveDashboardPage binds pipeline_coverage live KPI');
assert(execContent.includes('EXEC_KPIS_1'), 'ExecutiveDashboardPage preserves historical EXEC_KPIS_1');
assert(execContent.includes('EXEC_KPIS_2'), 'ExecutiveDashboardPage preserves historical EXEC_KPIS_2');
assert(execContent.includes('CHART_ARR'), 'ExecutiveDashboardPage preserves historical CHART_ARR');

// -------------------------------------------------------------
// 5. Differenzierter Secret-Audit
// -------------------------------------------------------------
console.log('\n--- 5. Differentiated Secret Audit ---');
const g19Files = [
  migrationPath,
  schemaPath,
  adapterPath,
  hookPath,
  cardPath,
  execPagePath,
  path.join(ROOT_DIR, 'docs', 'auftraege', 'ANTIGRAVITY_AUFTRAG_035_LIVE_KPI_READ_ADAPTER_KOMPONENTENBINDUNG.md'),
];

const secretPatterns = [
  /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^:]+:[^@\s]+@/,
  /ALTER\s+ROLE\s+.*PASSWORD\s+['"][^'"]+['"]/i,
  /CREATE\s+ROLE\s+.*PASSWORD\s+['"][^'"]+['"]/i,
  /(?:password|secret)\s*[:=]\s*['"][a-zA-Z0-9_-]{4,}['"]/i,
];

for (const filePath of g19Files) {
  const relPath = path.relative(ROOT_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  for (const pattern of secretPatterns) {
    assert(!pattern.test(content), `No secret leak matching ${pattern} in ${relPath}`);
  }
}

console.log('\n=======================================================');
console.log('🎉 ALL LIVE KPI READ LAYER (G19) AUDITS PASSED!');
console.log('=======================================================\n');
