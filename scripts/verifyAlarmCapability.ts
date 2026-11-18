/**
 * Verification Script: Alarm Capability Matrix (Auftrag 166 / P13a)
 *
 * Prüft die vollständige Abdeckung der aktiven Katalogkennzahlen in ALARM_CAPABILITIES:
 * 1. Jede aktive Katalog-ID hat genau einen Eintrag
 * 2. Keine inaktive oder fremde ID existiert in ALARM_CAPABILITIES
 * 3. Status ist einer von: ausgeschlossen, pruefbar, nicht_einzelwert
 * 4. Bei pruefbar ist eine serverquelle angegeben
 * 5. Tabellarische Ausgabe und Zählung
 */

import { DASHBOARD_CATALOG } from '../src/features/dashboard/model/dashboardCatalog';
import { ALARM_CAPABILITIES } from '../src/features/dashboard/model/alarmCapability';

console.log('===============================================================');
console.log('🔍 PRÜFUNG DER ALARM-FÄHIGKEITSMATRIX (AUFTRAG 166 / P13A)');
console.log('===============================================================\n');

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
let countPruefbar = 0;
let countAusgeschlossen = 0;
let countNichtEinzelwert = 0;

console.log('\n--- ALARM-FÄHIGKEITSMATRIX ---');
console.log(`${'ID'.padEnd(35)} | ${'Status'.padEnd(18)} | ${'Serverquelle'.padEnd(42)} | Grund`);
console.log('-'.repeat(120));

for (const id of Array.from(activeIds).sort()) {
  const cap = ALARM_CAPABILITIES[id];
  if (!cap) continue;

  if (cap.status === 'pruefbar') {
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
    console.error(`❌ FEHLER bei ${id}: Unbekannter Status '${(cap as any).status}'!`);
    errors++;
  }

  const quelle = cap.serverquelle ?? '-';
  console.log(`${id.padEnd(35)} | ${cap.status.padEnd(18)} | ${quelle.padEnd(42)} | ${cap.grund}`);
}

console.log('-'.repeat(120));
console.log(`Zusammenfassung:`);
console.log(`  - Prüfbar (vorerst, Paritätstest in 167): ${countPruefbar}`);
console.log(`  - Ausgeschlossen (feste Referenzwerte):    ${countAusgeschlossen}`);
console.log(`  - Nicht-Einzelwert (Zeitreihen etc.):      ${countNichtEinzelwert}`);
console.log(`  - Gesamt erfasste aktive Kennzahlen:       ${matrixIds.length}`);

if (errors > 0) {
  console.error(`\n❌ VERIFIKATION FEHLGESCHLAGEN: ${errors} Fehler gefunden.`);
  process.exit(1);
}

console.log('\n✅ VERIFIKATION ERFOLGREICH: Alarmfähigkeitsmatrix ist vollständig und konsistent.');
