import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const EXPECTED_ASSETS = [
  {
    fileName: '01-marktlage-dach.webp',
    route: '/market/overview',
    pageFile: 'src/features/markt/pages/MarketOverviewPage.tsx',
    publicUrl: '/assets/auftrag-037d/01-marktlage-dach.webp',
    testId: 'market-dach-webp',
    sha256: 'b49f254506417ae97f3c0478657c65ed13e07d5b9b9055194c52aed4e71bb794',
  },
  {
    fileName: '02-wettbewerbslandschaft.webp',
    route: '/market/competition',
    pageFile: 'src/features/markt/pages/CompetitionPage.tsx',
    publicUrl: '/assets/auftrag-037d/02-wettbewerbslandschaft.webp',
    testId: 'market-competition-webp',
    sha256: 'c6bf17b194e10aa3abb1d317083682047e5c51e7e492b4deba4c72a824f7b207',
  },
  {
    fileName: '03-swot-analyse.webp',
    route: '/market/swot',
    pageFile: 'src/features/markt/pages/SwotPage.tsx',
    publicUrl: '/assets/auftrag-037d/03-swot-analyse.webp',
    testId: 'market-swot-webp',
    sha256: '82b45529d3ce42ffa9186072c3366b553d5cc28832a6b867ac0f28eb6fd0a57a',
  },
  {
    fileName: '04-ideal-customer-profile.webp',
    route: '/customers/icp',
    pageFile: 'src/features/kunden/pages/IcpPage.tsx',
    publicUrl: '/assets/auftrag-037d/04-ideal-customer-profile.webp',
    testId: 'customers-icp-webp',
    sha256: 'a81ad72622f69dd29a0d538b995e2b38ce20aa415fd0a3071c58934162581266',
  },
  {
    fileName: '05-buyer-persona-volker.webp',
    route: '/customers/persona',
    pageFile: 'src/features/kunden/pages/PersonaPage.tsx',
    publicUrl: '/assets/auftrag-037d/05-buyer-persona-volker.webp',
    testId: 'customers-persona-webp',
    sha256: '2ef4d75c1088a96d2b5e03abb2b0b617a36580fe26e1dd41a6bcc92c214ef445',
  },
  {
    fileName: '06-kundensegmente.webp',
    route: '/customers/segments',
    pageFile: 'src/features/kunden/pages/SegmentsPage.tsx',
    publicUrl: '/assets/auftrag-037d/06-kundensegmente.webp',
    testId: 'customers-segments-webp',
    sha256: '5a7be37ea98e62bbdca1a0698f63fd27365f5341e7d0ced85609b8b0bda04bf8',
  },
  {
    fileName: '07-top-10-kunden.webp',
    route: '/customers/top-customers',
    pageFile: 'src/features/kunden/pages/TopCustomersPage.tsx',
    publicUrl: '/assets/auftrag-037d/07-top-10-kunden.webp',
    testId: 'customers-top10-webp',
    sha256: 'df19b0d54d7d61f52617c7da1f8f7bbfeec4679b0719a6b2f282c4a468b7579a',
  },
];

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
  'src/domain/marktData.ts',
  'src/domain/icpData.ts',
  'src/domain/kundenData.ts',
  'src/domain/personaData.ts',
  'src/domain/executiveCockpitData.ts',
];

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

console.log('=======================================================');
console.log('🔍 AUDIT: AUFTRAG 037D / GATE G21D (MARKT & KUNDEN WEBP)');
console.log('=======================================================');

let errors = 0;

// 1. WebP existence and bit identity
console.log('\n--- 1. WebP-Asset Integrität & Bitidentität ---');
for (const item of EXPECTED_ASSETS) {
  const pubPath = path.resolve(process.cwd(), 'public/assets/auftrag-037d', item.fileName);
  const refPath = path.resolve(process.cwd(), 'docs/references/auftrag-037d', item.fileName);

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

// Check that global.css does NOT contain forbidden properties for .auftrag-037d-webp-img
const forbiddenCssProperties = ['filter', 'opacity', 'border-radius', 'box-shadow', 'object-fit', 'aspect-ratio', 'clip-path', 'mask'];
const webpImgCssMatch = globalCssContent.match(/\.auftrag-037d-webp-img\s*\{([^}]+)\}/);
if (webpImgCssMatch) {
  const cssBody = webpImgCssMatch[1];
  for (const prop of forbiddenCssProperties) {
    if (new RegExp(`\\b${prop}\\b`, 'i').test(cssBody)) {
      console.error(`❌ .auftrag-037d-webp-img must NOT declare property "${prop}"`);
      errors++;
    }
  }
  console.log('✅ .auftrag-037d-webp-img contains zero forbidden styling properties');
} else {
  console.error('❌ .auftrag-037d-webp-img class not found in src/styles/global.css');
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

  // Check visible <img> tag
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
  const forbiddenKeywords = ['object-fit', 'aspect-ratio', 'filter', 'opacity', 'mask', 'clip-path', 'border-radius', 'box-shadow'];
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
}

// 3. Protected scope diff check against ea22bf6
console.log('\n--- 3. Schutzbereichs-Integrität gegen Baseline ea22bf6 ---');
try {
  const diffCmd = `git diff --name-only ea22bf6..HEAD -- ${PROTECTED_PATHS.join(' ')}`;
  const diffOutput = execSync(diffCmd, { encoding: 'utf-8' }).trim();
  if (diffOutput.length > 0) {
    console.error(`❌ Protected paths diff against ea22bf6 is not empty:\n${diffOutput}`);
    errors++;
  } else {
    console.log('✅ Protected areas diff against ea22bf6 is exactly 0 lines');
  }
} catch (e: any) {
  console.error(`❌ Error checking git diff: ${e.message}`);
  errors++;
}

console.log('\n=======================================================');
if (errors === 0) {
  console.log('🎉 ALL MARKT & KUNDEN WEBP AUDIT CHECKS PASSED!');
  console.log('=======================================================');
  process.exit(0);
} else {
  console.error(`❌ AUDIT FAILED with ${errors} error(s)!`);
  console.log('=======================================================');
  process.exit(1);
}
