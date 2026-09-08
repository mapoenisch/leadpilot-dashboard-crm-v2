import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BASELINE_COMMIT = '98bb53a';

function logPass(msg: string) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg: string) {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
}

let hasErrors = false;

function assert(condition: boolean, passMsg: string, failMsg: string) {
  if (condition) {
    logPass(passMsg);
  } else {
    logFail(failMsg);
    hasErrors = true;
  }
}

console.log('================================================================');
console.log('Gate G22 / Auftrag 038 Motion & Performance Verifikation');
console.log('================================================================\n');

// 1. Audit AnimatedKpiValue.tsx
console.log('--- 1. Audit AnimatedKpiValue.tsx ---');
const animatedPath = path.resolve('src/components/liveKpi/AnimatedKpiValue.tsx');
assert(fs.existsSync(animatedPath), 'AnimatedKpiValue.tsx existiert', 'AnimatedKpiValue.tsx fehlt');

if (fs.existsSync(animatedPath)) {
  const code = fs.readFileSync(animatedPath, 'utf8');

  assert(
    code.includes("from 'framer-motion'") && code.includes('useReducedMotion'),
    'framer-motion und useReducedMotion werden importiert',
    'framer-motion oder useReducedMotion fehlt im Import'
  );

  assert(
    code.includes('interface AnimatedKpiValueProps') &&
      code.includes('value: number') &&
      code.includes('unit?: string') &&
      code.includes('fallbackUnit?: string') &&
      code.includes('shouldAnimate: boolean'),
    'Props entsprechen exakt der Spezifikation (value, unit, fallbackUnit, shouldAnimate)',
    'Props weichen von der Spezifikation ab'
  );

  assert(
    code.includes('shouldReduceMotion') &&
      (code.includes('shouldReduceMotion') &&
        (code.includes('!shouldAnimate || shouldReduceMotion') ||
          code.includes('shouldAnimate && !shouldReduceMotion'))),
    'Sofortiger Endwert ohne Animation bei Reduced Motion oder deaktivierter Animation',
    'Reduced Motion oder Sofort-Endwert-Logik unvollständig'
  );

  assert(
    code.includes('aria-live="polite"') && code.includes('aria-atomic="true"'),
    'Screenreader-freundliche Region mit aria-live="polite" und aria-atomic="true" vorhanden',
    'aria-live="polite" oder aria-atomic="true" fehlt'
  );

  assert(
    code.includes('aria-hidden="true"'),
    'Sichtbare Zwischenwerte sind für Screenreader per aria-hidden="true" verborgen',
    'aria-hidden="true" fehlt bei den visuellen Werten'
  );
}

// 2. Audit LiveKpiCard.tsx
console.log('\n--- 2. Audit LiveKpiCard.tsx ---');
const cardPath = path.resolve('src/components/liveKpi/LiveKpiCard.tsx');
assert(fs.existsSync(cardPath), 'LiveKpiCard.tsx existiert', 'LiveKpiCard.tsx fehlt');

if (fs.existsSync(cardPath)) {
  const code = fs.readFileSync(cardPath, 'utf8');

  assert(
    code.includes('React.memo(function LiveKpiCard(') || code.includes('React.memo('),
    'LiveKpiCard bleibt mit React.memo memoisiert',
    'LiveKpiCard ist nicht mit React.memo umschlossen'
  );

  assert(
    code.includes("from '@/hooks/useLiveKpi'") &&
      !code.includes("from '@/context/SimulationContext'") &&
      !code.includes("from '@/services/liveKpiSimulator'"),
    'LiveKpiCard importiert ausschließlich useLiveKpi als Datenquelle',
    'LiveKpiCard importiert unerlaubte Datenquellen'
  );

  assert(
    code.includes('prevValueRef') && code.includes('AnimatedKpiValue'),
    'LiveKpiCard verfolgt Vorwerte per Ref und bindet AnimatedKpiValue ein',
    'LiveKpiCard verwendet AnimatedKpiValue oder prevValueRef nicht wie vorgegeben'
  );
}

// 3. Audit routePages.tsx und App.tsx
console.log('\n--- 3. Audit routePages.tsx & App.tsx ---');
const routePagesPath = path.resolve('src/app/routePages.tsx');
assert(fs.existsSync(routePagesPath), 'routePages.tsx existiert', 'routePages.tsx fehlt');

if (fs.existsSync(routePagesPath)) {
  const code = fs.readFileSync(routePagesPath, 'utf8');

  // Zähle React.lazy Aufrufe
  const lazyMatches = code.match(/React\.lazy\(/g);
  const lazyCount = lazyMatches ? lazyMatches.length : 0;
  assert(
    lazyCount === 41,
    `routePages.tsx enthält genau 41 React.lazy Aufrufe (gefunden: ${lazyCount})`,
    `routePages.tsx enthält ${lazyCount} React.lazy Aufrufe statt 41`
  );

  // Stelle sicher, dass keine Page-Komponenten statisch importiert werden
  const staticPageImports = code.match(/import\s+{[^}]+Page[^}]*}\s+from/g);
  assert(
    !staticPageImports,
    'Keine statischen Page-Imports in routePages.tsx',
    `Statische Page-Imports in routePages.tsx gefunden: ${JSON.stringify(staticPageImports)}`
  );
}

const appPath = path.resolve('src/app/App.tsx');
assert(fs.existsSync(appPath), 'App.tsx existiert', 'App.tsx fehlt');

if (fs.existsSync(appPath)) {
  const code = fs.readFileSync(appPath, 'utf8');

  assert(
    code.includes('<React.Suspense') &&
      code.includes('role="status"') &&
      code.includes('aria-live="polite"') &&
      code.includes('Ansicht wird geladen …'),
    'App.tsx stellt React.Suspense mit barrierefreiem statischem Fallback bereit',
    'React.Suspense Fallback in App.tsx weicht von der Spezifikation ab'
  );
}

// 4. Prüfung gegen Baseline 98bb53a
console.log('\n--- 4. Prüfung gegen Baseline 98bb53a ---');
try {
  // Schutzbereichs-Diff
  const protectedDirs = [
    'src/simulation',
    'src/types',
    'src/context',
    'src/services',
    'src/features/resources',
    'src/features/crm',
    'src/components/layout',
    'src/domain',
    'public/assets/auftrag-037d',
    'public/assets/auftrag-037e',
    'public/assets/auftrag-037f',
    'public/assets/auftrag-037g',
    'docs/references/auftrag-037d',
    'docs/references/auftrag-037e',
    'docs/references/auftrag-037f',
    'docs/references/auftrag-037g',
  ];

  execSync(`git diff --exit-code ${BASELINE_COMMIT}..HEAD -- ${protectedDirs.join(' ')}`, {
    stdio: 'pipe',
  });
  logPass('Schutzbereichs-Diff gegen Baseline 98bb53a ist exakt leer (0 Diff-Zeilen)');
} catch (err) {
  logFail('Schutzbereiche wurden gegenüber Baseline 98bb53a verändert!');
  hasErrors = true;
}

// Keine WebP-URLs in JS-Chunks / JS-Imports
console.log('\n--- 5. Prüfung: Keine WebP-URLs in JS-Imports ---');
try {
  const tsFiles = execSync('git ls-files "src/**/*.ts" "src/**/*.tsx"', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

  let webpImportFound = false;
  const webpImportRegex = /(import\s+[^;]+from\s+['"][^'"]*\.webp['"]|import\s*\(\s*['"][^'"]*\.webp['"]\s*\))/;
  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (webpImportRegex.test(content)) {
      logFail(`WebP-Asset in JavaScript-Import gefunden in ${file}`);
      webpImportFound = true;
    }
  }

  if (!webpImportFound) {
    logPass('Keine G21-Asset-URLs in JavaScript-Imports vorhanden');
  } else {
    hasErrors = true;
  }
} catch (err: any) {
  logFail(`Fehler bei der Prüfung auf WebP-Imports: ${err.message}`);
  hasErrors = true;
}

console.log('\n================================================================');
if (hasErrors) {
  console.error('\x1b[31mGate G22 Audit FEHLGESCHLAGEN. Bitte Fehler beheben.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mGate G22 Audit ERFOLGREICH BESTANDEN.\x1b[0m');
  process.exit(0);
}
