import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const EXPECTED_ASSETS = [
  {
    fileName: '01-unternehmenssteckbrief.webp',
    route: '/company/profile',
    pageFile: 'src/features/overview/pages/CompanyProfilePage.tsx',
    publicUrl: '/assets/auftrag-037g/01-unternehmenssteckbrief.webp',
    testId: 'overview-profile-webp',
    sha256: '628325f8250c9559a951520bba52a36d205a3eea82f9dbff102d9d4447500eef',
  },
  {
    fileName: '02-jahres-highlights-2025.webp',
    route: '/company/highlights',
    pageFile: 'src/features/overview/pages/YearHighlightsPage.tsx',
    publicUrl: '/assets/auftrag-037g/02-jahres-highlights-2025.webp',
    testId: 'overview-highlights-webp',
    sha256: 'c146677d2e19b8d11387eebc23db89a0efb40586f00859f68c3c39a6273fe86b',
  },
  {
    fileName: '03-datenbasis-konsistenz.webp',
    route: '/company/data-basis',
    pageFile: 'src/features/overview/pages/DataBasisPage.tsx',
    publicUrl: '/assets/auftrag-037g/03-datenbasis-konsistenz.webp',
    testId: 'overview-data-basis-webp',
    sha256: '17432a5e2e1b77aa5fbb9a3b2d82b8db2a950fa4cbbfc0018ed70accf02812c1',
  },
  {
    fileName: '04-geschaeftsidee.webp',
    route: '/company/idea',
    pageFile: 'src/features/unternehmen/pages/IdeaPage.tsx',
    publicUrl: '/assets/auftrag-037g/04-geschaeftsidee.webp',
    testId: 'company-idea-webp',
    sha256: '5ba23ab9ee034d2e4d98f8767b688832311982c1053a539de5be46a0060c15cf',
  },
  {
    fileName: '05-value-proposition.webp',
    route: '/company/value-proposition',
    pageFile: 'src/features/unternehmen/pages/ValuePropositionPage.tsx',
    publicUrl: '/assets/auftrag-037g/05-value-proposition.webp',
    testId: 'company-value-proposition-webp',
    sha256: '46d281b3e36b74b3e9baf62256458a0dd120a3f2809db222f37636dd2db5165c',
  },
  {
    fileName: '06-gruendung-entwicklung.webp',
    route: '/company/history',
    pageFile: 'src/features/unternehmen/pages/HistoryPage.tsx',
    publicUrl: '/assets/auftrag-037g/06-gruendung-entwicklung.webp',
    testId: 'company-history-webp',
    sha256: '69335f6ace793c761da9549e946643f5344b7ae501ac58cb3c9fc3aaa36ae90d',
  },
  {
    fileName: '07-produkt-funktionsweise.webp',
    route: '/product/features',
    pageFile: 'src/features/produkt/pages/FeaturesPage.tsx',
    publicUrl: '/assets/auftrag-037g/07-produkt-funktionsweise.webp',
    testId: 'product-features-webp',
    sha256: '8822a71627da3237bed951a80fc93e24079eceb88f834b2aa7132adb960161f2',
  },
  {
    fileName: '08-preismodell.webp',
    route: '/product/pricing',
    pageFile: 'src/features/produkt/pages/PricingPage.tsx',
    publicUrl: '/assets/auftrag-037g/08-preismodell.webp',
    testId: 'product-pricing-webp',
    sha256: 'c2f3f65afb101795176f27153143d79fb89cefbe3b6ce0689bb9e5051501aa1c',
  },
  {
    fileName: '09-produkt-performance-2025.webp',
    route: '/product/performance',
    pageFile: 'src/features/produkt/pages/PerformancePage.tsx',
    publicUrl: '/assets/auftrag-037g/09-produkt-performance-2025.webp',
    testId: 'product-performance-webp',
    sha256: 'a30d2f88bfc612d1f7c9a0c3e61fa1fce2129beca04296db868a6c7c0a146b8b',
  },
  {
    fileName: '10-releases-roadmap.webp',
    route: '/product/roadmap',
    pageFile: 'src/features/produkt/pages/RoadmapPage.tsx',
    publicUrl: '/assets/auftrag-037g/10-releases-roadmap.webp',
    testId: 'product-roadmap-webp',
    sha256: 'c1d53dc0840382f8cd36184715b4fad51308ea49e4b2c12564fde615c606cb45',
  },
];

const BASELINE = '22ae40d';

const PROTECTED_PATHS = [
  'src/simulation',
  'src/types',
  'src/context',
  'src/services/data',
  'src/services/db/supabaseClient.ts',
  'src/features/resources',
  'src/features/crm',
  'src/components/layout',
  'src/app',
  'src/domain/execData.ts',
  'src/domain/unternehmenData.ts',
  'src/domain/produktData.ts',
  'src/domain/executiveCockpitData.ts',
  'src/features/unternehmen/pages/LocationPage.tsx',
];

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

console.log('=======================================================');
console.log('🔍 AUDIT: AUFTRAG 037G / GATE G21G (OVERVIEW, UNTERNEHMEN & PRODUKT WEBP)');
console.log('=======================================================');

let errors = 0;

// 1. WebP existence and bit identity
console.log('\n--- 1. WebP-Asset Integrität & Bitidentität ---');
for (const item of EXPECTED_ASSETS) {
  const pubPath = path.resolve(process.cwd(), 'public/assets/auftrag-037g', item.fileName);
  const refPath = path.resolve(process.cwd(), 'docs/references/auftrag-037g', item.fileName);

  if (!fs.existsSync(pubPath)) {
    console.error(`❌ Missing public asset: ${pubPath}`);
    errors++;
    continue;
  }
  if (!fs.existsSync(refPath)) {
    console.error(`❌ Missing reference asset: ${refPath}`);
    errors++;
    continue;
  }

  const pubHash = sha256File(pubPath);
  const refHash = sha256File(refPath);

  if (pubHash !== item.sha256) {
    console.error(`❌ Public asset hash mismatch for ${item.fileName}: expected ${item.sha256}, got ${pubHash}`);
    errors++;
  } else {
    console.log(`✅ ${item.fileName} public hash matches ASSET_SOURCE.md (${pubHash.substring(0, 12)}...)`);
  }

  if (pubHash !== refHash) {
    console.error(`❌ Public and reference files are not bit-identical for ${item.fileName}`);
    errors++;
  } else {
    console.log(`✅ ${item.fileName} is bit-identical to reference copy`);
  }
}

// 2. Page file checks
console.log('\n--- 2. Zielseiten-Integrität & Exakte Einbindung ---');
const globalCssContent = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/global.css'), 'utf-8');

// Check that global.css does NOT contain forbidden properties for .auftrag-037g-webp-img
const forbiddenCssProperties = ['filter', 'opacity', 'border-radius', 'box-shadow', 'object-fit', 'aspect-ratio', 'clip-path', 'mask', 'mix-blend-mode'];
const webpImgCssMatch = globalCssContent.match(/\.auftrag-037g-webp-img\s*\{([^}]+)\}/);
if (webpImgCssMatch) {
  const cssBody = webpImgCssMatch[1];
  for (const prop of forbiddenCssProperties) {
    if (new RegExp(`\\b${prop}\\b`, 'i').test(cssBody)) {
      console.error(`❌ .auftrag-037g-webp-img must NOT declare property "${prop}"`);
      errors++;
    }
  }
  console.log('✅ .auftrag-037g-webp-img contains zero forbidden styling properties');
} else {
  console.error('❌ .auftrag-037g-webp-img class not found in src/styles/global.css');
  errors++;
}

for (const item of EXPECTED_ASSETS) {
  const fullPath = path.resolve(process.cwd(), item.pageFile);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Page file missing: ${item.pageFile}`);
    errors++;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  // Check asset URL
  if (!content.includes(item.publicUrl)) {
    console.error(`❌ ${item.pageFile} does not contain exact asset URL ${item.publicUrl}`);
    errors++;
  } else {
    console.log(`✅ ${path.basename(item.pageFile)} contains exact asset URL ${item.publicUrl}`);
  }

  // Check testId
  if (!content.includes(`data-testid="${item.testId}"`)) {
    console.error(`❌ ${item.pageFile} missing data-testid="${item.testId}"`);
    errors++;
  } else {
    console.log(`✅ ${path.basename(item.pageFile)} renders data-testid="${item.testId}"`);
  }

  // Check visible <img> tag with eager loading
  if (!content.includes('<img') || !content.includes('loading="eager"')) {
    console.error(`❌ ${item.pageFile} must render visible <img ... loading="eager" />`);
    errors++;
  } else {
    console.log(`✅ ${path.basename(item.pageFile)} renders visible eager <img> tag`);
  }

  // Check non-empty alt text
  const altMatch = content.match(/alt=["']([^"']+)["']/);
  if (!altMatch || altMatch[1].trim().length === 0) {
    console.error(`❌ ${item.pageFile} missing valid non-empty alt attribute`);
    errors++;
  } else {
    console.log(`✅ ${path.basename(item.pageFile)} has descriptive alt: "${altMatch[1]}"`);
  }

  // Check forbidden styling keywords in component JSX
  const forbiddenKeywords = ['object-fit', 'aspect-ratio', 'filter', 'opacity', 'mask', 'clip-path', 'border-radius', 'box-shadow', 'mix-blend-mode'];
  for (const kw of forbiddenKeywords) {
    if (content.toLowerCase().includes(kw)) {
      console.error(`❌ ${item.pageFile} contains forbidden keyword "${kw}"`);
      errors++;
    }
  }

  // Check data isolation (no supabaseClient, no domain imports)
  if (content.includes('supabaseClient')) {
    console.error(`❌ ${item.pageFile} imports supabaseClient`);
    errors++;
  }

  if (content.includes('@/domain/execData') || content.includes('@/domain/unternehmenData') || content.includes('@/domain/produktData')) {
    console.error(`❌ ${item.pageFile} imports domain data`);
    errors++;
  }
}

// 3. Protected scope diff check against baseline 22ae40d
console.log(`\n--- 3. Schutzbereichs-Integrität gegen Baseline ${BASELINE} ---`);
try {
  const diffCmd = `git diff --name-only ${BASELINE}..HEAD -- ${PROTECTED_PATHS.join(' ')}`;
  const diffOutput = execSync(diffCmd, { encoding: 'utf-8' }).trim();
  if (diffOutput.length > 0) {
    console.error(`❌ Protected paths diff against ${BASELINE} is not empty:\n${diffOutput}`);
    errors++;
  } else {
    console.log(`✅ Protected areas diff against ${BASELINE} is exactly 0 lines`);
  }
} catch (e: any) {
  console.error(`❌ Error checking git diff: ${e.message}`);
  errors++;
}

console.log('\n=======================================================');
if (errors === 0) {
  console.log('🎉 ALL OVERVIEW, UNTERNEHMEN & PRODUKT WEBP AUDIT CHECKS PASSED!');
  console.log('=======================================================');
  process.exit(0);
} else {
  console.error(`❌ AUDIT FAILED with ${errors} error(s)!`);
  console.log('=======================================================');
  process.exit(1);
}
