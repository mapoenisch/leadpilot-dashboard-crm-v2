/**
 * Generator & Checker for dashboard_alarm_parity.sql (Auftrag 167 / P13b)
 *
 * Erzeugt aus:
 * - src/features/dashboard/model/thresholdReferenceCases.json
 * - supabase/tests/fixtures/alarm_parity/alarm_parity_cases.json
 * - supabase/tests/fixtures/alarm_parity/alarm_kpis.json
 *
 * die pgTAP-Datei supabase/tests/dashboard_alarm_parity.sql.
 *
 * Aufruf:
 * - npx tsx scripts/generateAlarmParitySql.ts          (erzeugt / aktualisiert)
 * - npx tsx scripts/generateAlarmParitySql.ts --check  (prüft Aktualität, Exit 1 bei Abweichung)
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const refCasesPath = resolve(rootDir, 'src/features/dashboard/model/thresholdReferenceCases.json');
const parityCasesPath = resolve(
  rootDir,
  'supabase/tests/fixtures/alarm_parity/alarm_parity_cases.json',
);
const kpisPath = resolve(rootDir, 'supabase/tests/fixtures/alarm_parity/alarm_kpis.json');
const targetSqlPath = resolve(rootDir, 'supabase/tests/dashboard_alarm_parity.sql');

interface ReferenceCase {
  id: string;
  beschreibung: string;
  regel: Record<string, unknown>;
  wert: number | null;
  zustand?: string;
  einheit?: string;
  erwartet: {
    stufe: string;
    grenze?: number;
  };
}

interface ParityCase {
  id: string;
  catalogId: string;
  pipeline: string | null;
  beschreibung: string;
  erwartet: {
    wert: number;
    einheit: string;
    zustand: string;
  };
}

const refCases = JSON.parse(readFileSync(refCasesPath, 'utf-8')) as ReferenceCase[];
const parityCases = JSON.parse(readFileSync(parityCasesPath, 'utf-8')) as ParityCase[];
const kpis = JSON.parse(readFileSync(kpisPath, 'utf-8')) as Array<{ id: string; name: string }>;

function buildSql(): string {
  const lines: string[] = [];
  const planCount = refCases.length + parityCases.length + kpis.length;

  lines.push('-- ============================================================================');
  lines.push('-- GENERATED FILE - NICHT VON HAND AENDERN');
  lines.push('-- Erzeugt durch: npx tsx scripts/generateAlarmParitySql.ts');
  lines.push('-- Quelle: thresholdReferenceCases.json & alarm_parity_cases.json');
  lines.push('-- ============================================================================');
  lines.push('BEGIN;');
  lines.push('');
  lines.push(`SELECT plan(${planCount});`);
  lines.push('SET CONSTRAINTS ALL IMMEDIATE;');
  lines.push('');

  // Setup Testdaten für Parität
  lines.push('-- Setup Organisation für Paritätstests');
  lines.push('INSERT INTO public.organizations (id, name, mode, status)');
  lines.push(
    "VALUES ('df670000-0000-0000-0000-00000000000a', 'Org Parity 167', 'synthetic', 'active');",
  );
  lines.push('');

  // Setup CRM Funnel Deals
  lines.push('-- CRM Test-Deals');
  lines.push(
    'INSERT INTO public.imported_funnel_deals (id, organization_id, deal_name, amount, stage, pipeline, close_date)',
  );
  lines.push('VALUES');
  lines.push(
    "  ('d1', 'df670000-0000-0000-0000-00000000000a', 'Deal 1', 50000, 'Gewonnen Abschluss', 'enterprise', current_date),",
  );
  lines.push(
    "  ('d2', 'df670000-0000-0000-0000-00000000000a', 'Deal 2', 25000, 'Qualifiziert', 'standard', current_date);",
  );
  lines.push('');

  // Setup Live Feed Messwerte
  lines.push('-- Live KPI Test-Feed');
  lines.push(
    'INSERT INTO public.live_kpi_public_feed (organization_id, kpi_id, value, unit, occurred_at, quality_status, source_system, ingested_at)',
  );
  lines.push('VALUES');
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'arr', 1200000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'mrr', 100000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'pipeline_coverage', 3.2, 'x', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'arr_direct', 600000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'arr_partner', 400000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'arr_outbound', 150000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'arr_other', 50000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'pipeline_leads', 180, 'Stück', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'pipeline_mql', 95, 'Stück', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'pipeline_sql', 48, 'Stück', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'pipeline_offers', 22, 'Stück', now() - interval '10 minutes', 'good', 'test', now()),",
  );
  lines.push(
    "  ('df670000-0000-0000-0000-00000000000a', 'pipeline_won', 12, 'Stück', now() - interval '10 minutes', 'good', 'test', now());",
  );
  lines.push('');

  // 1. KPI-Abdeckung prüfen
  lines.push(
    '-- 1. KPI-Abdeckung: Jede alarmfaehige Kennzahl liefert ueber alarm_kpi_value einen gueltigen Datensatz',
  );
  for (const kpi of kpis) {
    const safeKpi = kpi.id.replace(/'/g, "''");
    lines.push(`SELECT is(`);
    lines.push(
      `  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, '${safeKpi}')->>'zustand'),`,
    );
    lines.push(`  'ok',`);
    lines.push(`  'KPI ${safeKpi} ist alarmfaehig und liefert zustand ok'`);
    lines.push(`);`);
  }
  lines.push('');

  // 2. Paritätsfälle prüfen
  lines.push('-- 2. Paritaetstests gegen dieselben Erwartungswerte wie Vitest');
  for (const c of parityCases) {
    const pipelineParam = c.pipeline ? `'${c.pipeline}'` : 'NULL';
    const safeId = c.id.replace(/'/g, "''");
    const safeCat = c.catalogId.replace(/'/g, "''");
    lines.push(`SELECT is(`);
    lines.push(
      `  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, '${safeCat}', ${pipelineParam})->>'wert')::NUMERIC,`,
    );
    lines.push(`  ${c.erwartet.wert}::NUMERIC,`);
    lines.push(`  'Paritaetsfall ${safeId}: ${safeCat} wert = ${c.erwartet.wert}'`);
    lines.push(`);`);
  }
  lines.push('');

  // 3. Referenzfälle prüfen
  lines.push('-- 3. Schwellenwert-Referenzfaelle aus thresholdReferenceCases.json');
  for (const r of refCases) {
    const ruleJson = JSON.stringify(r.regel).replace(/'/g, "''");
    const wertParam = r.wert !== null ? `'${r.wert}'::TEXT` : 'NULL::TEXT';
    const zustandParam = r.zustand ? `'${r.zustand}'` : "'ok'";
    const einheitParam = r.einheit ? `'${r.einheit}'` : 'NULL';
    const safeDesc = r.beschreibung.replace(/'/g, "''");

    lines.push(`SELECT is(`);
    lines.push(
      `  public.alarm_evaluate_threshold('${ruleJson}'::jsonb, ${wertParam}, ${zustandParam}, ${einheitParam})->>'stufe',`,
    );
    lines.push(`  '${r.erwartet.stufe}',`);
    lines.push(`  'Referenzfall ${r.id}: ${safeDesc}'`);
    lines.push(`);`);
  }

  lines.push('');
  lines.push('SELECT * FROM finish();');
  lines.push('ROLLBACK;');
  lines.push('');

  return lines.join('\n');
}

const isCheckMode = process.argv.includes('--check');
const generatedSql = buildSql();

if (isCheckMode) {
  let existingSql = '';
  try {
    existingSql = readFileSync(targetSqlPath, 'utf-8');
  } catch {
    console.error(`❌ FEHLER: ${targetSqlPath} existiert nicht.`);
    process.exit(1);
  }

  if (existingSql !== generatedSql) {
    console.error(
      `❌ FEHLER: ${targetSqlPath} ist nicht aktuell! Bitte 'npx tsx scripts/generateAlarmParitySql.ts' ausführen.`,
    );
    process.exit(1);
  }

  console.log(`✅ ${targetSqlPath} ist aktuell und stimmt mit den JSON-Fixtures überein.`);
} else {
  writeFileSync(targetSqlPath, generatedSql, 'utf-8');
  console.log(
    `✅ ${targetSqlPath} erfolgreich generiert (${refCases.length} Referenzfälle + ${parityCases.length} Paritätsfälle + ${kpis.length} KPIs).`,
  );
}
