import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const EXPECTED_ASSETS = [
  {
    fileName: '01-headcount-entwicklung.webp',
    route: '/organisation/headcount',
    pageFile: 'src/features/organisation/pages/HeadcountPage.tsx',
    publicUrl: '/assets/auftrag-037f/01-headcount-entwicklung.webp',
    testId: 'organisation-headcount-webp',
    sha256: 'f0399d156ecb4766a9855b5265e4758752520bb951bd117bcf01918af5aa1a05',
  },
  {
    fileName: '02-hr-kennzahlen.webp',
    route: '/organisation/hr',
    pageFile: 'src/features/organisation/pages/HrPage.tsx',
    publicUrl: '/assets/auftrag-037f/02-hr-kennzahlen.webp',
    testId: 'organisation-hr-webp',
    sha256: '9ec026956cf8f2e2bf557f57ff86ef28d70f9042aa2a504a048b73120a6dea2f',
  },
  {
    fileName: '03-teamstruktur-engpaesse.webp',
    route: '/organisation/team',
    pageFile: 'src/features/organisation/pages/TeamStructurePage.tsx',
    publicUrl: '/assets/auftrag-037f/03-teamstruktur-engpaesse.webp',
    testId: 'organisation-team-webp',
    sha256: 'f0176d1633b0bac30c1ed93dd6753910e695733fe4a11675e9c97fdb742b973c',
  },
  {
    fileName: '04-ziele-okrs.webp',
    route: '/strategy/okrs',
    pageFile: 'src/features/strategie/pages/OkrsPage.tsx',
    publicUrl: '/assets/auftrag-037f/04-ziele-okrs.webp',
    testId: 'strategy-okrs-webp',
    sha256: '45c88b0019b159ac02d968c2fa2ea64a37d8955e8e41c9ebf211e619c8c4884b',
  },
  {
    fileName: '05-balanced-scorecard.webp',
    route: '/strategy/balanced-scorecard',
    pageFile: 'src/features/strategie/pages/BalancedScorecardPage.tsx',
    publicUrl: '/assets/auftrag-037f/05-balanced-scorecard.webp',
    testId: 'strategy-bsc-webp',
    sha256: '7951f033dec51b932ff72625e177e7297f0882e2ea2dd0b26b7a7ba4fdeb0ef9',
  },
  {
    fileName: '06-wachstumstreiber.webp',
    route: '/strategy/growth-drivers',
    pageFile: 'src/features/strategie/pages/GrowthDriversPage.tsx',
    publicUrl: '/assets/auftrag-037f/06-wachstumstreiber.webp',
    testId: 'strategy-growth-webp',
    sha256: '512232abd590f41b56c80588ce7bc6da69524beddcff5e8efc71ca2af721ec62',
  },
  {
    fileName: '07-satzung-leadpilot.webp',
    route: '/legal/articles',
    pageFile: 'src/features/recht/pages/ArticlesPage.tsx',
    publicUrl: '/assets/auftrag-037f/07-satzung-leadpilot.webp',
    testId: 'legal-articles-webp',
    sha256: 'd8e09cd6fabffbc191a921fc79b86b7fc4836452a85aeb08b054a444d7133337',
  },
  {
    fileName: '08-gesellschafterliste.webp',
    route: '/legal/shareholders',
    pageFile: 'src/features/recht/pages/ShareholdersPage.tsx',
    publicUrl: '/assets/auftrag-037f/08-gesellschafterliste.webp',
    testId: 'legal-shareholders-webp',
    sha256: '5f3f805ac1aca49287d9e8b654398884b0f68ca7fe1701f4f89ea298fcefe87f',
  },
  {
    fileName: '09-handelsregister.webp',
    route: '/legal/commercial-register',
    pageFile: 'src/features/recht/pages/CommercialRegisterPage.tsx',
    publicUrl: '/assets/auftrag-037f/09-handelsregister.webp',
    testId: 'legal-register-webp',
    sha256: '2134306e38781635af5d4b43693f11518819755264c07a563695fc8ddaa3822f',
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
  'src/domain/organisationData.ts',
  'src/domain/strategieData.ts',
  'src/domain/rechtData.ts',
  'src/domain/executiveCockpitData.ts',
];

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

console.log('=======================================================');
console.log('🔍 AUDIT: AUFTRAG 037F / GATE G21F (ORG, STRAT & RECHT WEBP)');
console.log('=======================================================');

let errors = 0;

// 1. WebP existence and bit identity
console.log('\n--- 1. WebP-Asset Integrität & Bitidentität ---');
for (const item of EXPECTED_ASSETS) {
  const pubPath = path.resolve(process.cwd(), 'public/assets/auftrag-037f', item.fileName);
  const refPath = path.resolve(process.cwd(), 'docs/references/auftrag-037f', item.fileName);

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

// Check that global.css does NOT contain forbidden properties for .auftrag-037f-webp-img
const forbiddenCssProperties = ['filter', 'opacity', 'border-radius', 'box-shadow', 'object-fit', 'aspect-ratio', 'clip-path', 'mask', 'mix-blend-mode'];
const webpImgCssMatch = globalCssContent.match(/\.auftrag-037f-webp-img\s*\{([^}]+)\}/);
if (webpImgCssMatch) {
  const cssBody = webpImgCssMatch[1];
  for (const prop of forbiddenCssProperties) {
    if (new RegExp(`\\b${prop}\\b`, 'i').test(cssBody)) {
      console.error(`❌ .auftrag-037f-webp-img must NOT declare property "${prop}"`);
      errors++;
    }
  }
  console.log('✅ .auftrag-037f-webp-img contains zero forbidden styling properties');
} else {
  console.error('❌ .auftrag-037f-webp-img class not found in src/styles/global.css');
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

  if (content.includes('@/domain/organisationData') || content.includes('@/domain/strategieData') || content.includes('@/domain/rechtData')) {
    console.error(`❌ ${item.pageFile} imports domain data`);
    errors++;
  }
}

// 3. Protected scope diff check against e789de9
console.log('\n--- 3. Schutzbereichs-Integrität gegen Baseline e789de9 ---');
try {
  const diffCmd = `git diff --name-only e789de9..HEAD -- ${PROTECTED_PATHS.join(' ')}`;
  const diffOutput = execSync(diffCmd, { encoding: 'utf-8' }).trim();
  if (diffOutput.length > 0) {
    console.error(`❌ Protected paths diff against e789de9 is not empty:\n${diffOutput}`);
    errors++;
  } else {
    console.log('✅ Protected areas diff against e789de9 is exactly 0 lines');
  }
} catch (e: any) {
  console.error(`❌ Error checking git diff: ${e.message}`);
  errors++;
}

console.log('\n=======================================================');
if (errors === 0) {
  console.log('🎉 ALL ORGANISATION, STRATEGIE & RECHT WEBP AUDIT CHECKS PASSED!');
  console.log('=======================================================');
  process.exit(0);
} else {
  console.error(`❌ AUDIT FAILED with ${errors} error(s)!`);
  console.log('=======================================================');
  process.exit(1);
}
