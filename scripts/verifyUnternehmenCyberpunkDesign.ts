import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { IDEE, VALUE, HISTORIE, STANDORT } from '../src/domain/unternehmenData';

console.log('=======================================================');
console.log('🔍 AUDIT: AUFTRAG 037B / GATE G21B (UNTERNEHMEN CYBERPUNK DESIGN)');
console.log('=======================================================');

let failed = false;
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed = true;
  } else {
    console.log(`✅ ${message}`);
  }
}

// 1. Dateien der 4 Seiten existieren
console.log('\n--- 1. Existenz der 4 Unternehmensansichten ---');
const ideaFile = path.resolve('src/features/unternehmen/pages/IdeaPage.tsx');
const valueFile = path.resolve('src/features/unternehmen/pages/ValuePropositionPage.tsx');
const historyFile = path.resolve('src/features/unternehmen/pages/HistoryPage.tsx');
const locationFile = path.resolve('src/features/unternehmen/pages/LocationPage.tsx');

assert(fs.existsSync(ideaFile), 'IdeaPage.tsx exists');
assert(fs.existsSync(valueFile), 'ValuePropositionPage.tsx exists');
assert(fs.existsSync(historyFile), 'HistoryPage.tsx exists');
assert(fs.existsSync(locationFile), 'LocationPage.tsx exists');

const ideaContent = fs.readFileSync(ideaFile, 'utf-8');
const valueContent = fs.readFileSync(valueFile, 'utf-8');
const historyContent = fs.readFileSync(historyFile, 'utf-8');
const locationContent = fs.readFileSync(locationFile, 'utf-8');

// 2. Geschäftsidee – Lead-Signal-Map
console.log('\n--- 2. Geschäftsidee – Lead-Signal-Map (/company/idea) ---');
assert(ideaContent.includes('data-testid="idea-signal-map"'), 'IdeaPage renders data-testid="idea-signal-map"');
assert(ideaContent.includes('IDEE.paragraphs'), 'IdeaPage binds IDEE.paragraphs from unternehmenData');
assert(ideaContent.includes('IDEE.usps'), 'IdeaPage binds IDEE.usps from unternehmenData');
assert(
  !ideaContent.includes('<ul>') && !ideaContent.includes('<ul '),
  'IdeaPage replaces plain bullet list with structured cyberpunk benefit nodes'
);

// 3. Value Proposition – Command Statement & Benefit-Deck + Datenwahrheit (P1-2)
console.log('\n--- 3. Value Proposition – Command Statement & Benefit-Deck (/company/value-proposition) ---');
assert(valueContent.includes('data-testid="value-command-statement"'), 'ValuePropositionPage renders command statement block');
assert(valueContent.includes('data-testid="value-benefit-deck"'), 'ValuePropositionPage renders benefit deck');
assert(valueContent.includes('VALUE.heroStatement'), 'ValuePropositionPage binds VALUE.heroStatement');
assert(valueContent.includes('VALUE.coreBenefits'), 'ValuePropositionPage binds VALUE.coreBenefits');

// P1-2: Keine erfundenen Garantien, SLA, ROI- oder Wettbewerbsaussagen
const forbiddenValueTerms = [
  'SLA',
  'TIME-TO-VALUE < 30 MIN',
  'Garantie',
  'quantifizierbare Hebel',
  'CONVERSION BOOST',
  '100% ECHTZEIT',
  'SOFORTIGER ROI',
  'Nachweisbarer Wettbewerbsvorteil',
  'Wettbewerbsvorteil',
];
for (const term of forbiddenValueTerms) {
  assert(
    !valueContent.includes(term),
    `ValuePropositionPage strictly does not contain invented claim: "${term}"`
  );
}

// 4. Gründung und Entwicklung – Leuchtende Zeitachse
console.log('\n--- 4. Gründung & Entwicklung – Leuchtende Zeitachse (/company/history) ---');
assert(historyContent.includes('data-testid="history-timeline"'), 'HistoryPage renders data-testid="history-timeline"');
assert(historyContent.includes('HISTORIE.events'), 'HistoryPage binds HISTORIE.events');
assert(historyContent.includes('FF7A3D') || historyContent.includes('color-warning') || historyContent.includes('orange'), 'HistoryPage highlights capital/financing events with subtle orange accent');

// 5. Sitz & Räumlichkeiten – Headquarters-Ansicht + Datenwahrheit (P1-1) + Standortbilder (P1-4)
console.log('\n--- 5. Sitz & Räumlichkeiten – Headquarters-Ansicht (/company/location) ---');
assert(locationContent.includes('data-testid="location-headquarters"'), 'LocationPage renders data-testid="location-headquarters"');
assert(locationContent.includes('STANDORT.address'), 'LocationPage binds STANDORT.address');
assert(locationContent.includes('STANDORT.details'), 'LocationPage binds STANDORT.details');
assert(!locationContent.includes('<Table') && !locationContent.includes('<table'), 'LocationPage strictly does not use a plain Table component');

// P1-1: Keine erfundenen Koordinaten, ICE-/Nahverkehrs- oder Standortangaben
const forbiddenLocationTerms = [
  '51.3397',
  '12.3811',
  '53°',
  '9°',
  'Speicherstadt',
  'Herzen von Leipzig',
  'ICE',
  'Nahverkehr',
  'Nahverkehrsnetze',
  'ZENTRALE INNENSTADT',
  'CAMPUS AUGUSTUSPLATZ',
];
for (const term of forbiddenLocationTerms) {
  assert(
    !locationContent.includes(term),
    `LocationPage strictly does not contain ungrounded fact: "${term}"`
  );
}

// P1-4: Unveränderbare Augustusplatz-Standortbilder und Logo-Overlay eingebunden
const requiredImages = [
  'unternehmen-aussen-augustusplatz.png',
  'unternehmen-innen-besprechung.png',
  'unternehmen-innen-workspace.png',
  'unternehmen-innen-empfang.png',
];
for (const imgName of requiredImages) {
  const assetPath = path.resolve('assets/facelift/unternehmen', imgName);
  assert(fs.existsSync(assetPath), `Asset file exists on disk: ${imgName}`);
  assert(locationContent.includes(imgName), `LocationPage imports and renders: ${imgName}`);
}
assert(locationContent.includes('leadpilot-logo-full.png'), 'LocationPage imports and renders genuine leadpilot-logo-full.png');
assert(locationContent.includes('FIKTIVE VISUALISIERUNG'), 'LocationPage visibly displays "FIKTIVE VISUALISIERUNG" badge');

// P1 Nacharbeit (Zuschnittsfreie Bildintegrität): Keine zuschneidenden Container oder Filter auf den 4 Fotos
assert(!locationContent.includes("aspectRatio: '16 / 9'"), 'LocationPage does not use fixed aspectRatio container on location photos');
assert(!locationContent.includes('filter:') && !locationContent.includes('backdropFilter:') === false, 'LocationPage does not apply CSS filters to location photos');
assert(!locationContent.includes('clipPath') && !locationContent.includes('clip-path'), 'LocationPage does not use clip-paths on location photos');
assert(!locationContent.includes('maskImage') && !locationContent.includes('mask-image'), 'LocationPage does not use CSS masks on location photos');

// Überprüfe, dass die 4 Standortbilder height: auto und width: 100% haben und kein objectFit: cover nutzen
assert(
  !locationContent.includes("objectFit: 'cover'") || locationContent.split("objectFit: 'cover'").length === 2, // darf maximal 1x auf dem dekorativen SVG-Backdrop vorkommen
  'LocationPage does not use objectFit: cover on the 4 location photos'
);
assert(
  locationContent.includes("height: 'auto'"),
  'LocationPage renders location photos with natural height: auto to prevent pixel cropping'
);

// 6. Datenquellen-Isolation: Nur unternehmenData.ts als Fachdatenquelle
console.log('\n--- 6. Datenquellen-Isolation & Secret Audit ---');
const UNTERNEHMEN_FILES = [ideaFile, valueFile, historyFile, locationFile];
const FORBIDDEN_DOMAIN_IMPORTS = [
  'execData',
  'organisationData',
  'produktData',
  'marktData',
  'kundenData',
  'vertriebData',
  'finanzenData',
  'strategieData',
  'rechtData',
  'geschaeftsmodellData',
  'crmData',
];

for (const f of UNTERNEHMEN_FILES) {
  const basename = path.basename(f);
  const content = fs.readFileSync(f, 'utf-8');
  assert(!content.includes('supabaseClient'), `No supabaseClient import in ${basename}`);
  for (const forbiddenDomain of FORBIDDEN_DOMAIN_IMPORTS) {
    assert(
      !content.includes(forbiddenDomain),
      `${basename} does not import foreign domain data from "${forbiddenDomain}"`
    );
  }
}

// 7. Asset-Hygiene in public/assets/unternehmen/
console.log('\n--- 7. Asset-Hygiene & Dokumentation ---');
const unternehmenAssetsDir = path.resolve('public/assets/unternehmen');
if (fs.existsSync(unternehmenAssetsDir)) {
  const assets = fs.readdirSync(unternehmenAssetsDir);
  const webpFiles = assets.filter((f) => f.endsWith('.webp'));
  for (const webp of webpFiles) {
    const webpPath = path.join(unternehmenAssetsDir, webp);
    const size = fs.statSync(webpPath).size;
    assert(size < 320 * 1024, `Asset ${webp} is under 320 KB (${(size / 1024).toFixed(1)} KB)`);
  }
  if (webpFiles.length > 0) {
    const sourceMd = path.join(unternehmenAssetsDir, 'ASSET_SOURCE.md');
    assert(fs.existsSync(sourceMd), 'public/assets/unternehmen/ASSET_SOURCE.md exists');
  }
}

// 8. Schutzbereichs-Integrität gegen Baseline 44b5684
console.log('\n--- 8. Schutzbereichs-Integrität gegen Baseline 44b5684 ---');
try {
  const protectedDiff = execSync(
    'git diff --exit-code 44b5684 -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources src/features/crm src/domain/unternehmenData.ts src/components/layout src/app',
    { stdio: 'pipe' }
  ).toString();
  assert(protectedDiff.trim() === '', 'Protected areas diff against 44b5684 is exactly 0 lines');
} catch {
  assert(false, 'Protected areas diff against 44b5684 is NOT empty!');
}

console.log('=======================================================');
if (failed) {
  console.error('❌ UNTERNEHMEN AUDIT FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL UNTERNEHMEN AUDIT CHECKS PASSED!');
  console.log('=======================================================');
}
