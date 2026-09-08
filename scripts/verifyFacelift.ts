import fs from 'fs';
import path from 'path';
import {
  FACELIFT_VISUAL_IDS,
  FACELIFT_VISUAL_REGISTRY,
  FACELIFT_ASSETS,
  FACELIFT_SOURCES,
  REQUIRED_FACELIFT_GLYPHS,
  FaceliftVisualId,
} from '../src/domain/faceliftVisualData';

/**
 * Feste, verbindlich spezifizierte Menge aller 32 Visual-IDs
 * (Referenz: docs/superpowers/plans/2026-09-03-facelift-antigravity-auftraege.md)
 */
export const EXPECTED_FACELIFT_VISUAL_IDS: readonly string[] = [
  // 1. Überblick (Auftrag 2)
  'company-register',
  'performance-pulse',
  'source-decision',
  // 2. Unternehmen (Auftrag 3 & 4)
  'business-idea-signals',
  'benefit-stage',
  'funding-timeline',
  'location-atlas',
  // 3. Produkt (Auftrag 5)
  'operations-hub',
  'product-health',
  'roadmap-horizons',
  // 4. Markt (Auftrag 6)
  'market-opportunity-stack',
  'decision-topology',
  'swot-compass',
  // 5. Kunden (Auftrag 7)
  'icp-fit-map',
  'persona-dossier',
  'volker-day-timeline',
  'segment-fields',
  'revenue-staircase',
  'customer-portfolio',
  // 6. Vertrieb (Auftrag 8)
  'funnel-leakage-waterfall',
  'sla-swimlane',
  'channel-investment-route',
  'budget-target-ladder',
  // 7. Finanzen (Auftrag 9)
  'revenue-cost-shoreline',
  'capital-cut',
  'saas-motor',
  // 8. Organisation (Auftrag 10)
  'organisation-scaffold',
  'people-health-rail',
  'capacity-network',
  'role-legend',
  // 9. Strategie (Auftrag 11)
  'goal-runway',
  'bsc-path',
] as const;

export const EXPECTED_SOURCES = {
  kfw: {
    url: 'https://www.kfw.de/%C3%9Cber-die-KfW/Newsroom/Aktuelles/News-Details_875136.html',
    metric: '868.000 digital umsatzaktive KMU in Deutschland',
  },
  destatis: {
    url: 'https://www.destatis.de/EN/Themes/Economic-Sectors-Enterprises/Enterprises/ICT-Enterprises-ICT-Sector/Tables/icte-06-enterprises-cloud-computing.html',
    metric: '21 % Cloud-CRM-Nutzung bei Unternehmen mit 10–49 Beschäftigten',
  },
} as const;

export async function runFaceliftVerification(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  let success = true;

  const assert = (condition: boolean, passMsg: string, failMsg: string) => {
    if (condition) {
      log.push(`✅ ${passMsg}`);
    } else {
      log.push(`❌ FAIL: ${failMsg}`);
      success = false;
    }
  };

  log.push('=================================================================');
  log.push('LEADPILOT FACELIFT QUALITY GATE & ASSET VERIFICATION');
  log.push('=================================================================\n');

  // 1. Exakte Mengenprüfung der Visual-IDs
  log.push('--- PRÜFUNG 1: Exakte Mengenprüfung der 32 Visual-IDs ---');
  const expectedSet = new Set(EXPECTED_FACELIFT_VISUAL_IDS);
  const actualSet = new Set(FACELIFT_VISUAL_IDS);

  assert(
    EXPECTED_FACELIFT_VISUAL_IDS.length === 32,
    `Erwartete Menge umfasst exakt 32 Visual-IDs`,
    `Erwartete Menge weicht ab: ${EXPECTED_FACELIFT_VISUAL_IDS.length}`
  );

  assert(
    FACELIFT_VISUAL_IDS.length === 32,
    `Aktuelle Konfiguration enthält exakt 32 Visual-IDs`,
    `Aktuelle Konfiguration hat falsche Anzahl: ${FACELIFT_VISUAL_IDS.length} (erwartet 32)`
  );

  assert(
    actualSet.size === FACELIFT_VISUAL_IDS.length,
    'Keine Duplikate in FACELIFT_VISUAL_IDS',
    `Duplikate gefunden: ${FACELIFT_VISUAL_IDS.length - actualSet.size}`
  );

  const missingIds = EXPECTED_FACELIFT_VISUAL_IDS.filter((id) => !actualSet.has(id as FaceliftVisualId));
  assert(
    missingIds.length === 0,
    'Keine Visual-IDs fehlen',
    `Fehlende Visual-IDs: ${missingIds.join(', ')}`
  );

  const unexpectedIds = FACELIFT_VISUAL_IDS.filter((id) => !expectedSet.has(id));
  assert(
    unexpectedIds.length === 0,
    'Keine unerwarteten zusätzlichen Visual-IDs vorhanden',
    `Unerwartete Visual-IDs: ${unexpectedIds.join(', ')}`
  );

  // Registry-Vollständigkeit
  let allRegistryComplete = true;
  for (const id of EXPECTED_FACELIFT_VISUAL_IDS) {
    const entry = FACELIFT_VISUAL_REGISTRY[id as FaceliftVisualId];
    if (!entry || !entry.title || !entry.feature || !entry.description || !entry.fallbackType) {
      allRegistryComplete = false;
      log.push(`❌ Unvollständiger Registry-Eintrag für Visual-ID: "${id}"`);
      success = false;
    }
  }
  if (allRegistryComplete) {
    log.push(`✅ Alle 32 Visual-IDs sind vollständig und fehlerfrei in FACELIFT_VISUAL_REGISTRY registriert`);
  }

  // 2. Erforderliche Facelift-Glyphen
  log.push('\n--- PRÜFUNG 2: Erforderliche semantische Glyphen ---');
  const expectedGlyphs = [
    'contactToCustomer',
    'focus',
    'ready',
    'success',
    'challenge',
    'fit',
    'risk',
    'opportunity',
  ];
  for (const g of expectedGlyphs) {
    assert(
      REQUIRED_FACELIFT_GLYPHS.includes(g as any),
      `Erforderliches Glyphen-Symbol "${g}" definiert`,
      `Fehlendes Glyphen-Symbol: "${g}"`
    );
  }

  // 3. Standortbilder (Company Atlas)
  log.push('\n--- PRÜFUNG 3: Company Atlas Standortbilder auf Datenträger ---');
  assert(
    FACELIFT_ASSETS.standortImages.length === 4,
    'Exakt 4 Standortbilder in Konfiguration hinterlegt',
    `Erwartet 4 Standortbilder, erhalten: ${FACELIFT_ASSETS.standortImages.length}`
  );

  for (const relPath of FACELIFT_ASSETS.standortImages) {
    const fullPath = path.resolve(process.cwd(), relPath);
    const exists = fs.existsSync(fullPath);
    if (exists) {
      const stats = fs.statSync(fullPath);
      assert(
        stats.size > 50000,
        `Standortbild existiert mit gültiger Dateigröße: ${relPath} (${(stats.size / 1024).toFixed(0)} KB)`,
        `Standortbild hat unzureichende Dateigröße: ${relPath} (${stats.size} Bytes)`
      );
    } else {
      assert(false, '', `Standortbild fehlt auf Datenträger: ${fullPath}`);
    }
  }

  // 4. Logo-Asset
  log.push('\n--- PRÜFUNG 4: Offizielles Logo-Asset ---');
  const logoPath = path.resolve(process.cwd(), FACELIFT_ASSETS.logo);
  const logoExists = fs.existsSync(logoPath);
  if (logoExists) {
    const stats = fs.statSync(logoPath);
    assert(
      stats.size > 1000,
      `Logo-Asset existiert: ${FACELIFT_ASSETS.logo} (${(stats.size / 1024).toFixed(0)} KB)`,
      `Logo-Asset hat unzureichende Dateigröße: ${FACELIFT_ASSETS.logo}`
    );
  } else {
    assert(false, '', `Logo-Asset nicht gefunden unter: ${logoPath}`);
  }

  // 5. Exakte Prüfung der externen Quellenangaben (KfW und Destatis)
  log.push('\n--- PRÜFUNG 5: Exakte Prüfung der Quellen-URLs & Kennzahlen ---');
  const kfw = FACELIFT_SOURCES.kfw;
  assert(
    kfw.url === EXPECTED_SOURCES.kfw.url,
    `Exakte KfW-URL verifiziert: ${kfw.url}`,
    `KfW-URL weicht ab. Erwartet "${EXPECTED_SOURCES.kfw.url}", erhalten "${kfw?.url}"`
  );
  assert(
    kfw.metric === EXPECTED_SOURCES.kfw.metric,
    `Exakte KfW-Kennzahl verifiziert: "${kfw.metric}"`,
    `KfW-Kennzahl weicht ab. Erwartet "${EXPECTED_SOURCES.kfw.metric}", erhalten "${kfw?.metric}"`
  );

  const destatis = FACELIFT_SOURCES.destatis;
  assert(
    destatis.url === EXPECTED_SOURCES.destatis.url,
    `Exakte Destatis-URL verifiziert: ${destatis.url}`,
    `Destatis-URL weicht ab. Erwartet "${EXPECTED_SOURCES.destatis.url}", erhalten "${destatis?.url}"`
  );
  assert(
    destatis.metric === EXPECTED_SOURCES.destatis.metric,
    `Exakte Destatis-Kennzahl verifiziert: "${destatis.metric}"`,
    `Destatis-Kennzahl weicht ab. Erwartet "${EXPECTED_SOURCES.destatis.metric}", erhalten "${destatis?.metric}"`
  );

  log.push('\n=================================================================');
  if (success) {
    log.push('🎉 FACELIFT VERIFICATION ERFOLGREICH ABGESCHLOSSEN!');
  } else {
    log.push('❌ FACELIFT VERIFICATION MIT FEHLERN BEENDET.');
  }
  log.push('=================================================================');

  return { success, log };
}

async function main() {
  const result = await runFaceliftVerification();
  console.log(result.log.join('\n'));
  if (!result.success) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('verifyFacelift.ts')) {
  main().catch((err) => {
    console.error('Fatal error in verifyFacelift:', err);
    process.exit(1);
  });
}
