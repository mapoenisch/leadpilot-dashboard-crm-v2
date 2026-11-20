/**
 * Generator & Checker für dashboard_unit_conversions in SQL (Auftrag 169 / P14a)
 *
 * Synchronisiert die TypeScript-Positivliste aus:
 *   src/features/dashboard/model/transformations/unitConversions.ts
 * mit der Migration:
 *   supabase/migrations/20261126_dashboard_transformations.sql
 *
 * Aufruf:
 *   npx tsx scripts/generateUnitConversionsSql.ts          (erzeugt / aktualisiert)
 *   npx tsx scripts/generateUnitConversionsSql.ts --check  (prüft Aktualität, Exit 1 bei Abweichung)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { UNIT_CONVERSIONS } from '../src/features/dashboard/model/transformations/unitConversions';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const migrationPath = resolve(
  rootDir,
  'supabase/migrations/20261126_dashboard_transformations.sql',
);

const isCheck = process.argv.includes('--check');

function generateSqlSnippet(): string {
  const lines: string[] = [];
  lines.push('-- BEGIN GENERATED UNIT CONVERSIONS');
  lines.push('-- Erzeugt durch: npx tsx scripts/generateUnitConversionsSql.ts');
  lines.push('TRUNCATE TABLE public.dashboard_unit_conversions;');
  lines.push(
    'INSERT INTO public.dashboard_unit_conversions (id, von, zu, faktor, operation, operand, ziel_format, begruendung)',
  );
  lines.push('VALUES');

  const valueRows = UNIT_CONVERSIONS.map((c, idx) => {
    const isLast = idx === UNIT_CONVERSIONS.length - 1;
    const semicolon = isLast ? ';' : ',';
    const escapedReason = c.begruendung.replace(/'/g, "''");
    return `  ('${c.id}', '${c.von}', '${c.zu}', ${c.faktor}, '${c.operation}', ${c.operand}, '${c.zielFormat}', '${escapedReason}')${semicolon}`;
  });

  lines.push(...valueRows);
  lines.push('-- END GENERATED UNIT CONVERSIONS');
  return lines.join('\n');
}

export function run(): void {
  const snippet = generateSqlSnippet();

  if (!existsSync(migrationPath)) {
    if (isCheck) {
      console.error(`❌ FEHLER: Migration ${migrationPath} existiert noch nicht.`);
      process.exit(1);
    } else {
      console.log(
        `ℹ️ Migration ${migrationPath} existiert noch nicht; Snippet wird bereitgestellt.`,
      );
      return;
    }
  }

  const content = readFileSync(migrationPath, 'utf-8');
  const beginMarker = '-- BEGIN GENERATED UNIT CONVERSIONS';
  const endMarker = '-- END GENERATED UNIT CONVERSIONS';

  const beginIdx = content.indexOf(beginMarker);
  const endIdx = content.indexOf(endMarker);

  if (beginIdx === -1 || endIdx === -1) {
    console.error(
      '❌ FEHLER: Markierungen BEGIN/END GENERATED UNIT CONVERSIONS nicht in Migration gefunden.',
    );
    process.exit(1);
  }

  const existingSnippet = content.substring(beginIdx, endIdx + endMarker.length);

  if (isCheck) {
    if (existingSnippet.trim() !== snippet.trim()) {
      console.error(
        '❌ FEHLER: dashboard_unit_conversions in Migration weicht von unitConversions.ts ab!',
      );
      console.error(
        'Führe `npx tsx scripts/generateUnitConversionsSql.ts` aus, um sie zu synchronisieren.',
      );
      process.exit(1);
    }
    console.log('✅ Unit Conversions SQL Parität: Migration stimmt exakt mit TypeScript überein.');
  } else {
    const updatedContent =
      content.substring(0, beginIdx) + snippet + content.substring(endIdx + endMarker.length);
    writeFileSync(migrationPath, updatedContent, 'utf-8');
    console.log('✅ Migration mit aktuellen Unit Conversions aktualisiert.');
  }
}

run();
