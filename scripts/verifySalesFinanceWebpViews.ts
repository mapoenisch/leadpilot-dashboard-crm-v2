import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const EXPECTED_ASSETS = [
  {
    fileName: '01-sales-funnel-2025.webp',
    route: '/sales/funnel',
    pageFile: 'src/features/vertrieb/pages/FunnelPage.tsx',
    publicUrl: '/assets/auftrag-037e/01-sales-funnel-2025.webp',
    testId: 'sales-funnel-webp',
    sha256: '9ee40767cc423ffb075bad8227f96d3bedbe6bbb63abec133da22ee04bc00b9f',
  },
  {
    fileName: '02-sla-marketing-sales.webp',
    route: '/sales/sla',
    pageFile: 'src/features/vertrieb/pages/SlaPage.tsx',
    publicUrl: '/assets/auftrag-037e/02-sla-marketing-sales.webp',
    testId: 'sales-sla-webp',
    sha256: '632d1e7658e741cbe472f2682e17a77f28812ea2cc6bcd61bf9062b6e2e56dbf',
  },
  {
    fileName: '03-kanalperformance-cac.webp',
    route: '/sales/channels',
    pageFile: 'src/features/vertrieb/pages/ChannelsPage.tsx',
    publicUrl: '/assets/auftrag-037e/03-kanalperformance-cac.webp',
    testId: 'sales-channels-webp',
    sha256: '82f6963405e1a7a8340f9e92efe8b5875f3aa6f80cb4e818b422cbd9c5d4278f',
  },
  {
    fileName: '04-marketingplanung-h2-2026.webp',
    route: '/sales/planning',
    pageFile: 'src/features/vertrieb/pages/PlanningPage.tsx',
    publicUrl: '/assets/auftrag-037e/04-marketingplanung-h2-2026.webp',
    testId: 'sales-planning-webp',
    sha256: 'f081a18651ef8f2a1aadc3e58ebfba16db079016b1ac79bbd51834b71d81a30c',
  },
  {
    fileName: '05-gewinn-verlustrechnung.webp',
    route: '/finance/p-and-l',
    pageFile: 'src/features/finanzen/pages/PnLPage.tsx',
    publicUrl: '/assets/auftrag-037e/05-gewinn-verlustrechnung.webp',
    testId: 'finance-pnl-webp',
    sha256: '6ea43daa8a844ad8aa34b8883d333715c187bb15e2ef1594792b12817b2c2058',
  },
  {
    fileName: '06-bilanz-saas.webp',
    route: '/finance/balance-sheet',
    pageFile: 'src/features/finanzen/pages/BalanceSheetPage.tsx',
    publicUrl: '/assets/auftrag-037e/06-bilanz-saas.webp',
    testId: 'finance-balance-sheet-webp',
    sha256: 'ee073c65b9cd214a1a617873a1ee8d43cf2803013a5b00049738b3a875dadd76',
  },
  {
    fileName: '07-unit-economics-2026.webp',
    route: '/finance/unit-economics',
    pageFile: 'src/features/finanzen/pages/UnitEconomicsPage.tsx',
    publicUrl: '/assets/auftrag-037e/07-unit-economics-2026.webp',
    testId: 'finance-unit-economics-webp',
    sha256: '034c45466a0642bc3c64442ef1a8f50985db42e4d44bc4e6a964452df316b97c',
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
  'src/domain/vertriebData.ts',
  'src/domain/finanzenData.ts',
  'src/domain/executiveCockpitData.ts',
];

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

console.log('=======================================================');
console.log('🔍 AUDIT: AUFTRAG 037E / GATE G21E (VERTRIEB & FINANZEN WEBP)');
console.log('=======================================================');

let errors = 0;

// 1. WebP existence and bit identity
console.log('\n--- 1. WebP-Asset Integrität & Bitidentität ---');
for (const item of EXPECTED_ASSETS) {
  const pubPath = path.resolve(process.cwd(), 'public/assets/auftrag-037e', item.fileName);
  const refPath = path.resolve(process.cwd(), 'docs/references/auftrag-037e', item.fileName);

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

// Check that global.css does NOT contain forbidden properties for .auftrag-037e-webp-img
const forbiddenCssProperties = ['filter', 'opacity', 'border-radius', 'box-shadow', 'object-fit', 'aspect-ratio', 'clip-path', 'mask', 'mix-blend-mode'];
const webpImgCssMatch = globalCssContent.match(/\.auftrag-037e-webp-img\s*\{([^}]+)\}/);
if (webpImgCssMatch) {
  const cssBody = webpImgCssMatch[1];
  for (const prop of forbiddenCssProperties) {
    if (new RegExp(`\\b${prop}\\b`, 'i').test(cssBody)) {
      console.error(`❌ .auftrag-037e-webp-img must NOT declare property "${prop}"`);
      errors++;
    }
  }
  console.log('✅ .auftrag-037e-webp-img contains zero forbidden styling properties');
} else {
  console.error('❌ .auftrag-037e-webp-img class not found in src/styles/global.css');
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

  if (content.includes('@/domain/vertriebData') || content.includes('@/domain/finanzenData')) {
    console.error(`❌ ${item.pageFile} imports domain data`);
    errors++;
  }
}

// 3. Protected scope diff check against ed496cf
console.log('\n--- 3. Schutzbereichs-Integrität gegen Baseline ed496cf ---');
try {
  const diffCmd = `git diff --name-only ed496cf..HEAD -- ${PROTECTED_PATHS.join(' ')}`;
  const diffOutput = execSync(diffCmd, { encoding: 'utf-8' }).trim();
  if (diffOutput.length > 0) {
    console.error(`❌ Protected paths diff against ed496cf is not empty:\n${diffOutput}`);
    errors++;
  } else {
    console.log('✅ Protected areas diff against ed496cf is exactly 0 lines');
  }
} catch (e: any) {
  console.error(`❌ Error checking git diff: ${e.message}`);
  errors++;
}

console.log('\n=======================================================');
if (errors === 0) {
  console.log('🎉 ALL VERTRIEB & FINANZEN WEBP AUDIT CHECKS PASSED!');
  console.log('=======================================================');
  process.exit(0);
} else {
  console.error(`❌ AUDIT FAILED with ${errors} error(s)!`);
  console.log('=======================================================');
  process.exit(1);
}
