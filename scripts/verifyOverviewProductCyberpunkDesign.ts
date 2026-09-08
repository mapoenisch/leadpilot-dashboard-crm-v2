import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=======================================================');
console.log('🔍 AUDIT: AUFTRAG 037C / GATE G21C (ÜBERSICHT & PRODUKT)');
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

// 1. Dateien der 7 Ansichten existieren
console.log('\n--- 1. Existenz der 7 Ansichten ---');
const profileFile = path.resolve('src/features/overview/pages/CompanyProfilePage.tsx');
const highlightsFile = path.resolve('src/features/overview/pages/YearHighlightsPage.tsx');
const dataBasisFile = path.resolve('src/features/overview/pages/DataBasisPage.tsx');
const featuresFile = path.resolve('src/features/produkt/pages/FeaturesPage.tsx');
const pricingFile = path.resolve('src/features/produkt/pages/PricingPage.tsx');
const performanceFile = path.resolve('src/features/produkt/pages/PerformancePage.tsx');
const roadmapFile = path.resolve('src/features/produkt/pages/RoadmapPage.tsx');

assert(fs.existsSync(profileFile), 'CompanyProfilePage.tsx exists');
assert(fs.existsSync(highlightsFile), 'YearHighlightsPage.tsx exists');
assert(fs.existsSync(dataBasisFile), 'DataBasisPage.tsx exists');
assert(fs.existsSync(featuresFile), 'FeaturesPage.tsx exists');
assert(fs.existsSync(pricingFile), 'PricingPage.tsx exists');
assert(fs.existsSync(performanceFile), 'PerformancePage.tsx exists');
assert(fs.existsSync(roadmapFile), 'RoadmapPage.tsx exists');

const profileContent = fs.readFileSync(profileFile, 'utf-8');
const highlightsContent = fs.readFileSync(highlightsFile, 'utf-8');
const dataBasisContent = fs.readFileSync(dataBasisFile, 'utf-8');
const featuresContent = fs.readFileSync(featuresFile, 'utf-8');
const pricingContent = fs.readFileSync(pricingFile, 'utf-8');
const performanceContent = fs.readFileSync(performanceFile, 'utf-8');
const roadmapContent = fs.readFileSync(roadmapFile, 'utf-8');

// 2. data-testid Identifikatoren
console.log('\n--- 2. data-testid Prüfungen ---');
assert(profileContent.includes('data-testid="company-profile-matrix"'), 'CompanyProfilePage renders data-testid="company-profile-matrix"');
assert(highlightsContent.includes('data-testid="year-highlights-deck"'), 'YearHighlightsPage renders data-testid="year-highlights-deck"');
assert(dataBasisContent.includes('data-testid="data-basis-flow"'), 'DataBasisPage renders data-testid="data-basis-flow"');
assert(featuresContent.includes('data-testid="product-features-grid"'), 'FeaturesPage renders data-testid="product-features-grid"');
assert(pricingContent.includes('data-testid="product-pricing-deck"'), 'PricingPage renders data-testid="product-pricing-deck"');
assert(performanceContent.includes('data-testid="product-performance-cockpit"'), 'PerformancePage renders data-testid="product-performance-cockpit"');
assert(roadmapContent.includes('data-testid="product-roadmap-scene"'), 'RoadmapPage renders data-testid="product-roadmap-scene"');

// 3. Datenbindung & Authentizität
console.log('\n--- 3. Datenbindung & Vermeidung von Fallback-Verschleierung ---');
assert(profileContent.includes('PROFILE'), 'CompanyProfilePage binds PROFILE');
assert(!profileContent.includes("?? 'HRB 40912'"), 'CompanyProfilePage does not contain hardcoded fallback ?? HRB 40912');
assert(!profileContent.includes("?? '31.250'"), 'CompanyProfilePage does not contain hardcoded fallback ?? 31.250');

assert(highlightsContent.includes('HIGHLIGHTS'), 'YearHighlightsPage binds HIGHLIGHTS');
// Keine Emojis wie 🎯, ⚡
assert(!highlightsContent.includes('🎯') && !highlightsContent.includes('⚡') && !highlightsContent.includes('🚀'), 'YearHighlightsPage does not contain emojis');

assert(dataBasisContent.includes('BRIDGES_ROWS') && dataBasisContent.includes('SOURCES_ROWS'), 'DataBasisPage binds BRIDGES_ROWS & SOURCES_ROWS');

assert(featuresContent.includes('FUNKTION'), 'FeaturesPage binds FUNKTION');
assert(pricingContent.includes('PRICING'), 'PricingPage binds PRICING');
assert(performanceContent.includes('PERF'), 'PerformancePage binds PERF');
assert(roadmapContent.includes('ROADMAP'), 'RoadmapPage binds ROADMAP');

// Bestseller-Badge nicht in Orange
assert(!pricingContent.includes("badge-orange") && !pricingContent.includes("text-[#FF7A3D]' : 'Bestseller'"), 'PricingPage does not use orange for bestseller badge');

// Dynamische Zähler statt harter Textzahlen
assert(!performanceContent.includes("'4 Kernmetriken'") && !performanceContent.includes('"4 Kernmetriken"'), 'PerformancePage derives metrics count dynamically');

// P1-Nacharbeit: Roadmap Berglandschaft & Meilensteine
console.log('\n--- 3b. P1-Nacharbeit: Roadmap Berglandschaft & Meilensteine ---');
const roadmapAssetFile = path.resolve('public/assets/roadmap/roadmap-backdrop.webp');
assert(fs.existsSync(roadmapAssetFile), 'Roadmap backdrop asset exists on disk (public/assets/roadmap/roadmap-backdrop.webp)');
const roadmapAssetStat = fs.statSync(roadmapAssetFile);
assert(roadmapAssetStat.size < 320 * 1024, `Roadmap backdrop is under 320 KB (${(roadmapAssetStat.size / 1024).toFixed(1)} KB)`);

assert(roadmapContent.includes('src="/assets/roadmap/roadmap-backdrop.webp"'), 'RoadmapPage uses exact asset URL /assets/roadmap/roadmap-backdrop.webp');
assert(roadmapContent.includes('<img') && roadmapContent.includes('roadmap-backdrop.webp'), 'RoadmapPage visibly renders <img> with mountain backdrop');
assert(!roadmapContent.includes('milestoneCoordinates'), 'RoadmapPage strictly does NOT contain hardcoded milestoneCoordinates constant');
assert(roadmapContent.includes('ROADMAP.releases.map'), 'RoadmapPage derives waypoints dynamically from ROADMAP.releases.map');
assert(roadmapContent.includes('Flag') || roadmapContent.includes('Gipfelflagge'), 'RoadmapPage renders visible orange summit flag');
assert(roadmapContent.includes('product-v2-waypoint-align'), 'RoadmapPage uses responsive waypoint alignment classes to prevent mobile clipping');

const roadmapSourceMd = path.resolve('public/assets/roadmap/ASSET_SOURCE.md');
assert(fs.existsSync(roadmapSourceMd), 'public/assets/roadmap/ASSET_SOURCE.md exists');
const roadmapSourceContent = fs.readFileSync(roadmapSourceMd, 'utf-8');
assert(roadmapSourceContent.includes('roadmap-backdrop.webp'), 'ASSET_SOURCE.md documents roadmap-backdrop.webp');
assert(roadmapSourceContent.includes('Berglandschaft') || roadmapSourceContent.includes('mountain'), 'ASSET_SOURCE.md documents mountain landscape');

// P1-Nacharbeit: Ausschluss nicht autorisierter fachlicher Zusätze (Datenwahrheit)
console.log('\n--- 3c. Ausschluss nicht autorisierter fachlicher Zusätze (Datenwahrheit) ---');
// 1. CompanyProfilePage
assert(!profileContent.includes('Leipzig, Deutschland'), 'CompanyProfilePage does not contain unauthorized string "Leipzig, Deutschland"');
assert(!profileContent.includes('Aktiv & Operativ'), 'CompanyProfilePage does not contain unauthorized string "Aktiv & Operativ"');
assert(!profileContent.includes('Geschäftsjahr 2025/2026'), 'CompanyProfilePage does not contain unauthorized string "Geschäftsjahr 2025/2026"');
assert(!profileContent.includes('vollumfänglich im Handelsregister'), 'CompanyProfilePage does not contain unauthorized governance claims');
assert(!profileContent.includes('GmbH Leipzig'), 'CompanyProfilePage does not contain unauthorized "GmbH Leipzig" badge');

// 2. DataBasisPage
assert(!dataBasisContent.includes('100% Konsistenz'), 'DataBasisPage does not contain unauthorized "100% Konsistenz"');
assert(!dataBasisContent.includes('über alle 12 Fachmodule'), 'DataBasisPage does not contain unauthorized "über alle 12 Fachmodule"');
assert(!dataBasisContent.includes('Integritäts-Garantie'), 'DataBasisPage does not contain unauthorized "Integritäts-Garantie"');
assert(!dataBasisContent.includes('Keine Differenzen zwischen CRM'), 'DataBasisPage does not contain unauthorized claims about missing differences');

// 3. FeaturesPage
assert(!featuresContent.includes('CAP-01') && !featuresContent.includes('ML-02') && !featuresContent.includes('NUR-03') && !featuresContent.includes('CRM-04'), 'FeaturesPage does not contain unauthorized telemetry codes');
assert(!featuresContent.includes('Multi-Channel Inbound'), 'FeaturesPage does not contain unauthorized "Multi-Channel Inbound"');
assert(!featuresContent.includes('Proprietäres Scoring v1.5'), 'FeaturesPage does not contain unauthorized "Proprietäres Scoring v1.5"');
assert(!featuresContent.includes('Echtzeit-Pipeline Cockpit'), 'FeaturesPage does not contain unauthorized "Echtzeit-Pipeline Cockpit"');
assert(!featuresContent.includes('ISO / DSGVO Standard'), 'FeaturesPage does not contain unauthorized "ISO / DSGVO Standard"');
assert(!featuresContent.includes('INTEGR'), 'FeaturesPage does not import or use INTEGR stack');
assert(featuresContent.includes('SmartLeadCaptureVisual') && featuresContent.includes('KiScoringVisual'), 'FeaturesPage renders spatial 3D isometric visuals');

// 4. PricingPage
assert(!pricingContent.includes('Keine Einrichtungsgebühr'), 'PricingPage does not contain unauthorized "Keine Einrichtungsgebühr"');
assert(!pricingContent.includes('Rechtssicher & DSGVO-konform'), 'PricingPage does not contain unauthorized "Rechtssicher & DSGVO-konform"');
assert(!pricingContent.includes('Transparente Abrechnung'), 'PricingPage does not contain unauthorized "Transparente Abrechnung"');
assert(!pricingContent.includes('Persönlicher Onboarding-Support'), 'PricingPage does not contain unauthorized "Persönlicher Onboarding-Support"');
assert(pricingContent.includes('StarterPedestal') && pricingContent.includes('GrowthPedestal') && pricingContent.includes('ProPedestal'), 'PricingPage renders 3D isometric pedestals');

// 5. PerformancePage
assert(!performanceContent.includes('Audit: Q4 2025'), 'PerformancePage does not contain unauthorized "Audit: Q4 2025"');
assert(!performanceContent.includes('Customer Success Audit'), 'PerformancePage does not contain unauthorized "Customer Success Audit"');

// 6. YearHighlightsPage
assert(!highlightsContent.includes("'4 Fokus-Bereiche'") && !highlightsContent.includes('"4 Fokus-Bereiche"'), 'YearHighlightsPage derives focus areas count dynamically');
assert(!highlightsContent.includes("'4 Top-Erfolge'") && !highlightsContent.includes('"4 Top-Erfolge"'), 'YearHighlightsPage derives top successes count dynamically');
assert(!highlightsContent.includes('Ebene A Review'), 'YearHighlightsPage does not contain unauthorized "Ebene A Review"');

// 4. Datenquellen-Isolation
console.log('\n--- 4. Datenquellen-Isolation ---');
const ALL_PAGES = [
  { name: 'CompanyProfilePage', content: profileContent },
  { name: 'YearHighlightsPage', content: highlightsContent },
  { name: 'DataBasisPage', content: dataBasisContent },
  { name: 'FeaturesPage', content: featuresContent },
  { name: 'PricingPage', content: pricingContent },
  { name: 'PerformancePage', content: performanceContent },
  { name: 'RoadmapPage', content: roadmapContent },
];

for (const p of ALL_PAGES) {
  assert(!p.content.includes('supabaseClient'), `${p.name} does not import supabaseClient`);
}

// 5. Asset-Hygiene
console.log('\n--- 5. Asset-Hygiene & Größenbegrenzung (< 320 KB) ---');
for (const dir of ['public/assets/overview', 'public/assets/product']) {
  const fullDir = path.resolve(dir);
  if (fs.existsSync(fullDir)) {
    const files = fs.readdirSync(fullDir).filter((f) => !f.endsWith('.md') && !f.startsWith('.'));
    for (const f of files) {
      const p = path.join(fullDir, f);
      const stat = fs.statSync(p);
      assert(stat.size < 320 * 1024, `Asset ${dir}/${f} is under 320 KB (${(stat.size / 1024).toFixed(1)} KB)`);
    }
    const sourceMd = path.join(fullDir, 'ASSET_SOURCE.md');
    if (files.length > 0) {
      assert(fs.existsSync(sourceMd), `${dir}/ASSET_SOURCE.md exists`);
    }
  }
}

// 6. Schutzbereichs-Integrität gegen Baseline 8cb500d
console.log('\n--- 6. Schutzbereichs-Integrität gegen Baseline 8cb500d ---');
try {
  const protectedDiff = execSync(
    'git diff --exit-code 8cb500d -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources src/features/crm src/domain src/components/layout src/components/ui src/app src/features/unternehmen src/features/markt src/features/kunden src/features/vertrieb src/features/finanzen src/features/organisation src/features/strategie src/features/recht src/features/geschaeftsmodell src/features/projektkontext src/features/overview/pages/ExecutiveDashboardPage.tsx',
    { stdio: 'pipe' }
  ).toString();
  assert(protectedDiff.trim() === '', 'Protected areas diff against 8cb500d is exactly 0 lines');
} catch {
  assert(false, 'Protected areas diff against 8cb500d is NOT empty!');
}

console.log('=======================================================');
if (failed) {
  console.error('❌ OVERVIEW & PRODUCT AUDIT FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL OVERVIEW & PRODUCT AUDIT CHECKS PASSED!');
  console.log('=======================================================');
}
