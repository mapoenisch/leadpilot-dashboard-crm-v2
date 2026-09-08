import fs from 'node:fs';
import path from 'node:path';

const MODULE_VIEWS = [
  'src/features/overview/OverviewView.tsx',
  'src/features/crm/CRMView.tsx',
  'src/features/unternehmen/UnternehmenView.tsx',
  'src/features/produkt/ProduktView.tsx',
  'src/features/markt/MarktView.tsx',
  'src/features/kunden/KundenView.tsx',
  'src/features/vertrieb/VertriebView.tsx',
  'src/features/finanzen/FinanzenView.tsx',
  'src/features/organisation/OrganisationView.tsx',
  'src/features/strategie/StrategieView.tsx',
  'src/features/recht/RechtView.tsx',
  'src/features/geschaeftsmodell/GeschaeftsmodellView.tsx',
  'src/features/projektkontext/ProjektkontextView.tsx',
];

const DISALLOWED_PATTERNS = [
  { regex: /if\s*\(\s*activeSubView/i, desc: 'activeSubView if-cascade' },
  { regex: /switch\s*\(\s*activeSubView/i, desc: 'activeSubView switch-cascade' },
  { regex: /<SectionHeader/i, desc: 'inline SectionHeader JSX' },
  { regex: /<Card/i, desc: 'inline Card JSX' },
  { regex: /<Table/i, desc: 'inline Table JSX' },
  { regex: /<SimpleChart/i, desc: 'inline SimpleChart JSX' },
  { regex: /<ChartFrame/i, desc: 'inline ChartFrame JSX' },
  { regex: /style=\{\{/i, desc: 'inline styling JSX' },
];

let failed = false;

for (const relPath of MODULE_VIEWS) {
  const fullPath = path.resolve(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`FAIL: File not found: ${relPath}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // Check line count (should be a concise compatibility delegate)
  if (lines.length > 45) {
    console.error(`FAIL: ${relPath} exceeds 45 lines (${lines.length} lines). Must be a concise delegate.`);
    failed = true;
  }

  // Check disallowed patterns
  for (const { regex, desc } of DISALLOWED_PATTERNS) {
    if (regex.test(content)) {
      console.error(`FAIL: ${relPath} contains disallowed ${desc}`);
      failed = true;
    }
  }

  // Check that it uses SUBVIEW_MAP and renders <Component />
  if (!content.includes('SUBVIEW_MAP')) {
    console.error(`FAIL: ${relPath} does not define a SUBVIEW_MAP.`);
    failed = true;
  }
  if (!content.includes('<Component />')) {
    console.error(`FAIL: ${relPath} does not render <Component />.`);
    failed = true;
  }

  console.log(`PASS: ${relPath} (${lines.length} lines, pure delegate)`);
}

if (failed) {
  console.error('\n❌ Gate check failed: Module views still contain cascades or domain JSX.');
  process.exit(1);
}

console.log(`\n✅ Gate check passed: All ${MODULE_VIEWS.length} module views are pure SUBVIEW_MAP delegates with zero cascades and zero domain JSX.`);
