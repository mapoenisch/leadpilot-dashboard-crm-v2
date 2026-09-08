/**
 * Verification Script: Live KPI Catalog & Multi-KPI Event Parity (Gate G24 / Auftrag 040)
 *
 * Führt vollständige lokale Verifikation für den neuen V2.1 Live-KPI-Katalog aus:
 * 1. Exakt 12 eindeutige Katalogdefinitionen mit geforderten ID/Einheits-Paaren
 * 2. Strikte Schemaprüfung der Katalogobjekte (nur id, label, unit, format, group)
 * 3. Lookup-API (isSupportedLiveKpiId, getLiveKpiDefinition)
 * 4. Fixture-Parität in tools/n8n/live-kpi-replay.fixture.json (v21_catalog_events)
 * 5. Contract-Validierung jedes synthetischen Events via validateLiveKpiEvent()
 * 6. Eindeutigkeit von eventId und correlationId
 * 7. Statischer Secret-Audit (keine JWTs, Passwörter, Connection-Strings, service_role)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LIVE_KPI_DEFINITIONS,
  LIVE_KPI_IDS,
  isSupportedLiveKpiId,
  getLiveKpiDefinition,
  type LiveKpiDefinition,
  type LiveKpiFormat,
  type LiveKpiGroup,
} from '../src/services/liveKpi/liveKpiDefinitions';
import {
  validateLiveKpiEvent,
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

console.log('===============================================================');
console.log('🔍 VERIFYING LIVE KPI CATALOG & MULTI-KPI FIXTURES (GATE G24)');
console.log('===============================================================\n');

// -------------------------------------------------------------
// 1. Katalog-Struktur und Definitionen
// -------------------------------------------------------------
console.log('--- 1. Testing Live KPI Catalog Definitions ---');

const EXPECTED_CATALOG: readonly {
  id: string;
  label: string;
  unit: 'EUR' | 'x' | 'count';
  format: LiveKpiFormat;
  group: LiveKpiGroup;
}[] = [
  { id: 'arr', label: 'Live ARR', unit: 'EUR', format: 'currency', group: 'core' },
  { id: 'mrr', label: 'Live MRR', unit: 'EUR', format: 'currency', group: 'core' },
  { id: 'pipeline_coverage', label: 'Pipeline Coverage', unit: 'x', format: 'ratio', group: 'core' },
  { id: 'arr_direct', label: 'ARR Direct', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'arr_partner', label: 'ARR Partner', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'arr_outbound', label: 'ARR Outbound', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'arr_other', label: 'ARR Sonstige', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'pipeline_leads', label: 'Pipeline Leads', unit: 'count', format: 'count', group: 'funnel' },
  { id: 'pipeline_mql', label: 'Pipeline MQL', unit: 'count', format: 'count', group: 'funnel' },
  { id: 'pipeline_sql', label: 'Pipeline SQL', unit: 'count', format: 'count', group: 'funnel' },
  { id: 'pipeline_offers', label: 'Pipeline Angebote', unit: 'count', format: 'count', group: 'funnel' },
  { id: 'pipeline_won', label: 'Pipeline Won', unit: 'count', format: 'count', group: 'funnel' },
] as const;

assert(Array.isArray(LIVE_KPI_DEFINITIONS), 'LIVE_KPI_DEFINITIONS is an array');
assert(LIVE_KPI_DEFINITIONS.length === 12, `LIVE_KPI_DEFINITIONS contains exactly 12 definitions (found: ${LIVE_KPI_DEFINITIONS.length})`);

const allowedGroups: Set<LiveKpiGroup> = new Set(['core', 'arr_mix', 'funnel']);
const allowedFormats: Set<LiveKpiFormat> = new Set(['currency', 'ratio', 'count']);
const allowedFields: Set<string> = new Set(['id', 'label', 'unit', 'format', 'group']);

const idsSeen = new Set<string>();
for (const def of LIVE_KPI_DEFINITIONS) {
  assert(typeof def.id === 'string' && def.id.length > 0, `Definition has valid non-empty id: ${def.id}`);
  assert(!idsSeen.has(def.id), `ID "${def.id}" is unique across catalog`);
  idsSeen.add(def.id);

  // Strikte Feldprüfung: Keine Event-Metadaten, keine Secrets, keine Werte
  const actualKeys = Object.keys(def);
  for (const k of actualKeys) {
    assert(allowedFields.has(k), `Field "${k}" is permitted on definition "${def.id}" (no event/runtime fields)`);
  }

  assert(allowedGroups.has(def.group), `Definition "${def.id}" has valid group "${def.group}"`);
  assert(allowedFormats.has(def.format), `Definition "${def.id}" has valid format "${def.format}"`);

  const expectedDef = EXPECTED_CATALOG.find((e) => e.id === def.id);
  assert(!!expectedDef, `ID "${def.id}" matches an expected catalog KPI`);
  if (expectedDef) {
    assert(def.label === expectedDef.label, `Label for "${def.id}" matches expected: "${def.label}" === "${expectedDef.label}"`);
    assert(def.unit === expectedDef.unit, `Unit for "${def.id}" matches expected: "${def.unit}" === "${expectedDef.unit}"`);
    assert(def.format === expectedDef.format, `Format for "${def.id}" matches expected: "${def.format}" === "${expectedDef.format}"`);
    assert(def.group === expectedDef.group, `Group for "${def.id}" matches expected: "${def.group}" === "${expectedDef.group}"`);
  }
}

// -------------------------------------------------------------
// 2. Lookup API Tests
// -------------------------------------------------------------
console.log('\n--- 2. Testing Lookup API ---');

assert(LIVE_KPI_IDS instanceof Set, 'LIVE_KPI_IDS is an instance of Set');
assert(LIVE_KPI_IDS.size === 12, `LIVE_KPI_IDS size is 12 (found: ${LIVE_KPI_IDS.size})`);

// isSupportedLiveKpiId
assert(isSupportedLiveKpiId('arr') === true, 'isSupportedLiveKpiId("arr") === true');
assert(isSupportedLiveKpiId('mrr') === true, 'isSupportedLiveKpiId("mrr") === true');
assert(isSupportedLiveKpiId('pipeline_coverage') === true, 'isSupportedLiveKpiId("pipeline_coverage") === true');
assert(isSupportedLiveKpiId('unknown_kpi') === false, 'isSupportedLiveKpiId("unknown_kpi") === false');
assert(isSupportedLiveKpiId('') === false, 'isSupportedLiveKpiId("") === false');

// getLiveKpiDefinition
const mrrDef = getLiveKpiDefinition('mrr');
assert(mrrDef !== undefined, 'getLiveKpiDefinition("mrr") returns definition');
assert(mrrDef?.id === 'mrr' && mrrDef?.unit === 'EUR' && mrrDef?.group === 'core', 'mrr definition details match');

const unknownDef = getLiveKpiDefinition('unknown_kpi');
assert(unknownDef === undefined, 'getLiveKpiDefinition("unknown_kpi") === undefined');

// -------------------------------------------------------------
// 3. Fixture Parität in tools/n8n/live-kpi-replay.fixture.json
// -------------------------------------------------------------
console.log('\n--- 3. Testing tools/n8n/live-kpi-replay.fixture.json ---');

const fixturePath = path.join(ROOT_DIR, 'tools', 'n8n', 'live-kpi-replay.fixture.json');
assert(fs.existsSync(fixturePath), 'tools/n8n/live-kpi-replay.fixture.json exists');

const fixtureContent = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const { fixtures } = fixtureContent;
assert(typeof fixtures === 'object' && fixtures !== null, 'fixtures object exists in replay fixture');

// Sicherstellen, dass alte G18 Fixtures unberührt bleiben
assert(!!fixtures.valid_event_1, 'Existing G18 valid_event_1 is preserved');
assert(!!fixtures.valid_event_2, 'Existing G18 valid_event_2 is preserved');
assert(!!fixtures.duplicate_event, 'Existing G18 duplicate_event is preserved');

// v21_catalog_events prüfen
assert(typeof fixtures.v21_catalog_events === 'object' && fixtures.v21_catalog_events !== null, 'fixtures.v21_catalog_events object exists');
const v21Events = fixtures.v21_catalog_events;
const v21Keys = Object.keys(v21Events);

assert(v21Keys.length === 12, `v21_catalog_events contains exactly 12 events (found: ${v21Keys.length})`);

const eventIdsSeen = new Set<string>();
const correlationIdsSeen = new Set<string>();

for (const expectedDef of EXPECTED_CATALOG) {
  const kpiId = expectedDef.id;
  assert(v21Keys.includes(kpiId), `v21_catalog_events contains entry for key "${kpiId}"`);

  const eventPayload = v21Events[kpiId];
  assert(typeof eventPayload === 'object' && eventPayload !== null, `Payload for "${kpiId}" is an object`);

  // Contract Validierung
  const valResult = validateLiveKpiEvent(eventPayload);
  assert(valResult.valid === true, `Event for "${kpiId}" passes validateLiveKpiEvent()`);

  if (valResult.valid) {
    const ev = valResult.event;
    assert(ev.contractVersion === LIVE_KPI_CONTRACT_VERSION, `contractVersion for "${kpiId}" is "${LIVE_KPI_CONTRACT_VERSION}"`);
    assert(ev.provenance === LIVE_KPI_PROVENANCE, `provenance for "${kpiId}" is "${LIVE_KPI_PROVENANCE}"`);
    assert(ev.kpiId === kpiId, `kpiId matches "${kpiId}"`);
    assert(ev.unit === expectedDef.unit, `unit for "${kpiId}" matches canonical unit "${expectedDef.unit}"`);
    assert(typeof ev.value === 'number' && Number.isFinite(ev.value), `value for "${kpiId}" is finite number (${ev.value})`);
    assert(ISO_8601_REGEX.test(ev.occurredAt), `occurredAt for "${kpiId}" is valid ISO-8601 with timezone (${ev.occurredAt})`);
    assert(typeof ev.correlationId === 'string' && ev.correlationId.length > 0, `correlationId for "${kpiId}" is non-empty`);

    // Eindeutigkeit eventId und correlationId
    assert(!eventIdsSeen.has(ev.eventId), `eventId "${ev.eventId}" is unique`);
    eventIdsSeen.add(ev.eventId);

    assert(!correlationIdsSeen.has(ev.correlationId), `correlationId "${ev.correlationId}" is unique`);
    correlationIdsSeen.add(ev.correlationId);

    // Context Nachweis
    assert(typeof ev.context === 'object' && ev.context !== null, `context for "${kpiId}" is an object`);
    assert((ev.context as Record<string, any>).isSyntheticTest === true, `context.isSyntheticTest is true for "${kpiId}"`);
  }
}

// -------------------------------------------------------------
// 4. Secret & Credentials Audit
// -------------------------------------------------------------
console.log('\n--- 4. Secret & Safety Audit ---');

const filesToAudit = [
  path.join(ROOT_DIR, 'src', 'services', 'liveKpi', 'liveKpiDefinitions.ts'),
  fixturePath,
  path.join(ROOT_DIR, 'tools', 'n8n', 'README.md'),
];

const LEAK_PATTERNS = [
  /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}/, // JWT Pattern
  /postgres(?:ql)?:\/\/[^:]+:[^@\s]+@/,            // Connection string with real user:pass@
  /(?:password|secret)\s*[:=]\s*['"][a-zA-Z0-9_-]{4,}['"]/i, // Hardcoded password/secret literal
];

for (const filePath of filesToAudit) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT_DIR, filePath);

  for (const pattern of LEAK_PATTERNS) {
    const match = content.match(pattern);
    assert(!match, `No secret leak matching ${pattern} in ${relPath}`);
  }

  assert(!/service_role/i.test(content), `Strictly no "service_role" in ${relPath}`);
}

console.log('\n===============================================================');
console.log('🎉 ALL LIVE KPI CATALOG & PARITY CHECKS PASSED (GATE G24)');
console.log('===============================================================');
