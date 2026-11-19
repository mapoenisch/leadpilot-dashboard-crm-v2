/**
 * Verification Script: Alarm Capability Matrix (Auftrag 166 / 167 - P13a / P13b)
 *
 * Prüft die vollständige Abdeckung der aktiven Katalogkennzahlen in ALARM_CAPABILITIES:
 * 1. Jede aktive Katalog-ID hat genau einen Eintrag
 * 2. Keine inaktive oder fremde ID existiert in ALARM_CAPABILITIES
 * 3. Status ist einer von: ausgeschlossen, pruefbar, nicht_einzelwert, alarmfaehig
 * 4. Bei pruefbar und alarmfaehig ist eine serverquelle angegeben
 * 5. Jede alarmfaehig-ID kommt in alarm_kpis.json vor und umgekehrt
 * 6. Jede alarmfaehig-ID hat mindestens einen Paritätsfall
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { DASHBOARD_CATALOG } from '../src/features/dashboard/model/dashboardCatalog';
import { ALARM_CAPABILITIES } from '../src/features/dashboard/model/alarmCapability';

console.log('===============================================================');
console.log('🔍 PRÜFUNG DER ALARM-FÄHIGKEITSMATRIX (AUFTRAG 167 / P13B)');
console.log('===============================================================\n');

const __dirname = dirname(fileURLToPath(import.meta.url));
const kpiFixturePath = resolve(
  __dirname,
  '../supabase/tests/fixtures/alarm_parity/alarm_kpis.json',
);
const parityFixturePath = resolve(
  __dirname,
  '../supabase/tests/fixtures/alarm_parity/alarm_parity_cases.json',
);

const alarmKpisFixture = JSON.parse(readFileSync(kpiFixturePath, 'utf-8')) as Array<{ id: string }>;
const parityCasesFixture = JSON.parse(readFileSync(parityFixturePath, 'utf-8')) as Array<{
  catalogId: string;
}>;

const activeEntries = DASHBOARD_CATALOG.filter((c) => c.status === 'aktiv');
const activeIds = new Set(activeEntries.map((c) => c.id));
const matrixIds = Object.keys(ALARM_CAPABILITIES);
const matrixIdSet = new Set(matrixIds);

let errors = 0;

// 1. Fehlende IDs prüfen
const missingIds = activeEntries.filter((c) => !matrixIdSet.has(c.id)).map((c) => c.id);
if (missingIds.length > 0) {
  console.error(
    `❌ FEHLER: ${missingIds.length} aktive Katalog-IDs fehlen in ALARM_CAPABILITIES:`,
    missingIds,
  );
  errors++;
} else {
  console.log(`✅ Alle ${activeIds.size} aktiven Katalog-IDs sind in ALARM_CAPABILITIES erfasst.`);
}

// 2. Überzählige IDs prüfen
const extraIds = matrixIds.filter((id) => !activeIds.has(id));
if (extraIds.length > 0) {
  console.error(
    `❌ FEHLER: ${extraIds.length} überzählige IDs in ALARM_CAPABILITIES gefunden:`,
    extraIds,
  );
  errors++;
} else {
  console.log(`✅ Keine überzähligen oder inaktiven IDs in ALARM_CAPABILITIES vorhanden.`);
}

// 3. Status und Felder validieren & Zählen
let countAlarmfaehig = 0;
let countPruefbar = 0;
let countAusgeschlossen = 0;
let countNichtEinzelwert = 0;

console.log('\n--- ALARM-FÄHIGKEITSMATRIX ---');
console.log(`${'ID'.padEnd(35)} | ${'Status'.padEnd(18)} | ${'Serverquelle'.padEnd(42)} | Grund`);
console.log('-'.repeat(120));

const alarmfaehigeIds: string[] = [];

for (const id of Array.from(activeIds).sort()) {
  const cap = ALARM_CAPABILITIES[id];
  if (!cap) continue;

  if (cap.status === 'alarmfaehig') {
    countAlarmfaehig++;
    alarmfaehigeIds.push(id);
    if (!cap.serverquelle) {
      console.error(`❌ FEHLER bei ${id}: Status 'alarmfaehig' erfordert eine 'serverquelle'!`);
      errors++;
    }
  } else if (cap.status === 'pruefbar') {
    countPruefbar++;
    if (!cap.serverquelle) {
      console.error(`❌ FEHLER bei ${id}: Status 'pruefbar' erfordert eine 'serverquelle'!`);
      errors++;
    }
  } else if (cap.status === 'ausgeschlossen') {
    countAusgeschlossen++;
  } else if (cap.status === 'nicht_einzelwert') {
    countNichtEinzelwert++;
  } else {
    console.error(
      `❌ FEHLER bei ${id}: Unbekannter Status '${(cap as unknown as { status: string }).status}'!`,
    );
    errors++;
  }

  const quelle = cap.serverquelle ?? '-';
  console.log(`${id.padEnd(35)} | ${cap.status.padEnd(18)} | ${quelle.padEnd(42)} | ${cap.grund}`);
}

console.log('-'.repeat(120));
console.log(`Zusammenfassung:`);
console.log(`  - Alarmfähig (Parität verifiziert):        ${countAlarmfaehig}`);
console.log(`  - Prüfbar (noch ohne Paritätsnachweis):     ${countPruefbar}`);
console.log(`  - Ausgeschlossen (feste Referenzwerte):    ${countAusgeschlossen}`);
console.log(`  - Nicht-Einzelwert (Zeitreihen etc.):      ${countNichtEinzelwert}`);
console.log(`  - Gesamt erfasste aktive Kennzahlen:       ${matrixIds.length}`);

// 4. Parität mit alarm_kpis.json prüfen
const fixtureIds = new Set(alarmKpisFixture.map((k) => k.id));
const alarmfaehigSet = new Set(alarmfaehigeIds);

for (const id of alarmfaehigeIds) {
  if (!fixtureIds.has(id)) {
    console.error(`❌ FEHLER: alarmfaehig-ID ${id} fehlt in alarm_kpis.json!`);
    errors++;
  }
}
for (const id of fixtureIds) {
  if (!alarmfaehigSet.has(id)) {
    console.error(
      `❌ FEHLER: ID ${id} in alarm_kpis.json ist nicht 'alarmfaehig' in ALARM_CAPABILITIES!`,
    );
    errors++;
  }
}

// 5. Mindestens ein Paritätsfall je alarmfaehig-ID
const parityKpisInCases = new Set(parityCasesFixture.map((c) => c.catalogId));
for (const id of alarmfaehigeIds) {
  if (!parityKpisInCases.has(id)) {
    console.error(
      `❌ FEHLER: Keine Paritäts-Testfälle für alarmfaehige Kennzahl ${id} in alarm_parity_cases.json!`,
    );
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n❌ VERIFIKATION FEHLGESCHLAGEN: ${errors} Fehler gefunden.`);
  process.exit(1);
}

console.log(
  '\n✅ VERIFIKATION ERFOLGREICH: Alarmfähigkeitsmatrix und Paritätsbindung sind konsistent.',
);
