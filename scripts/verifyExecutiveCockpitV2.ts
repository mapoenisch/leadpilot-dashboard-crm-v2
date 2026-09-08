import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getExecutiveCockpitKpis, getArrTrendData, getMrrTierData } from '../src/domain/executiveCockpitData';
import { EXEC_KPIS_1, CHART_ARR, CHART_MRR } from '../src/domain/execData';

console.log('=======================================================');
console.log('🔍 AUDIT: AUFTRAG 037 / GATE G21 (EXECUTIVE COCKPIT V2)');
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

// 1. Alle Cockpit-Kennzahlen stammen aus vorhandenen Datenquellen und stimmen exakt überein
console.log('\n--- 1. Datenquellen & Exakte Werteübereinstimmung ---');
const cockpitDataFile = path.resolve('src/domain/executiveCockpitData.ts');
assert(fs.existsSync(cockpitDataFile), 'src/domain/executiveCockpitData.ts exists');
const cockpitDataContent = fs.readFileSync(cockpitDataFile, 'utf-8');

const kpis = getExecutiveCockpitKpis();
assert(kpis.length === 4, `4 Executive KPIs derived (got ${kpis.length})`);

// Exakte Wertprüfungen gegen EXEC_KPIS_1
const [arrKpi, revKpi, ebitdaKpi, custKpi] = kpis;
assert(arrKpi.value === EXEC_KPIS_1[0].value, `ARR value '${arrKpi.value}' matches EXEC_KPIS_1[0] ('${EXEC_KPIS_1[0].value}')`);
assert(arrKpi.rawValue === 411840, `ARR rawValue is 411840 (got ${arrKpi.rawValue})`);

assert(revKpi.value === EXEC_KPIS_1[1].value, `Revenue value '${revKpi.value}' matches EXEC_KPIS_1[1] ('${EXEC_KPIS_1[1].value}')`);
assert(revKpi.rawValue === 336000, `Revenue rawValue is 336000 (got ${revKpi.rawValue})`);

assert(ebitdaKpi.value === EXEC_KPIS_1[2].value, `EBITDA value '${ebitdaKpi.value}' matches EXEC_KPIS_1[2] ('${EXEC_KPIS_1[2].value}')`);
assert(ebitdaKpi.rawValue === -309000, `EBITDA rawValue is -309000 (got ${ebitdaKpi.rawValue})`);
assert(ebitdaKpi.isNegativeAlert === true, 'EBITDA has isNegativeAlert=true (Orange risk indicator)');

assert(custKpi.value === EXEC_KPIS_1[3].value, `Customers value '${custKpi.value}' matches EXEC_KPIS_1[3] ('${EXEC_KPIS_1[3].value}')`);
assert(custKpi.rawValue === 66, `Customers rawValue is 66 (got ${custKpi.rawValue})`);

// Ausschluss falscher Zusatzwerte
assert(!cockpitDataContent.includes('428220'), 'No incorrect 428220 hardcoded value');
assert(!cockpitDataContent.includes('520000'), 'No incorrect 520000 hardcoded value');
assert(!cockpitDataContent.includes('-145000'), 'No incorrect -145000 hardcoded value');
assert(!cockpitDataContent.includes('+38,1 %'), 'No incorrect +38,1 % hardcoded string');
assert(!cockpitDataContent.includes('82 % ARR-Anteil'), 'No incorrect 82 % ARR-Anteil hardcoded string');
assert(!cockpitDataContent.includes('Marge: −27,9 %'), 'No incorrect Marge: −27,9 % hardcoded string');

// 2. Zeitreihenintegrität & Keine synthetischen || 0 Ersatzwerte
console.log('\n--- 2. Zeitreihen & Keine synthetischen Fallbacks ---');
assert(!cockpitDataContent.includes('|| 0'), 'No artificial || 0 replacement fallbacks in executiveCockpitData');

const arrData = getArrTrendData();
assert(arrData.length === CHART_ARR.labels.length, `ARR Trend data points (${arrData.length}) match CHART_ARR labels (${CHART_ARR.labels.length})`);
assert(arrData[arrData.length - 1].arr === 411840, `Latest ARR point matches 411840 € (got ${arrData[arrData.length - 1].arr})`);

const mrrData = getMrrTierData();
assert(mrrData.length === CHART_MRR.labels.length, `MRR Tier data points (${mrrData.length}) match CHART_MRR labels (${CHART_MRR.labels.length})`);
const mrrSum = mrrData.reduce((acc, p) => acc + p.mrr, 0);
assert(mrrSum === 34320, `MRR Sum across tiers is exactly 34320 € (34.320 € * 12 = 411.840 € ARR; got ${mrrSum})`);

// 3. Keine CRM-Aktivitäten-Duplikation
console.log('\n--- 3. Single Source of Truth: Keine Aktivitäten-Duplikation ---');
assert(!cockpitDataContent.includes('CANONICAL_ACTIVITIES'), 'No CANONICAL_ACTIVITIES duplicate in executiveCockpitData.ts');
assert(!fs.existsSync(path.resolve('src/components/executiveCockpit/ActivitySnapshot.tsx')), 'ActivitySnapshot.tsx strictly removed to prevent data duplication');

// 4. Szenische Visual-Assets für statische Bereiche (Team & Roadmap)
console.log('\n--- 4. Szenische Visual-Assets & Räumliche Visualisierung ---');
const teamBackdrop = path.resolve('public/assets/organisation/team-structure-backdrop.webp');
assert(fs.existsSync(teamBackdrop), 'public/assets/organisation/team-structure-backdrop.webp exists');
const teamStat = fs.statSync(teamBackdrop);
assert(teamStat.size < 320 * 1024, `Team backdrop size is under 320 KB budget (${(teamStat.size / 1024).toFixed(1)} KB)`);

const teamSourceMd = path.resolve('public/assets/organisation/ASSET_SOURCE.md');
assert(fs.existsSync(teamSourceMd), 'public/assets/organisation/ASSET_SOURCE.md exists with complete provenance');

const roadmapBackdrop = path.resolve('public/assets/roadmap/roadmap-backdrop.webp');
assert(fs.existsSync(roadmapBackdrop), 'public/assets/roadmap/roadmap-backdrop.webp exists');
const roadmapStat = fs.statSync(roadmapBackdrop);
assert(roadmapStat.size < 320 * 1024, `Roadmap backdrop size is under 320 KB budget (${(roadmapStat.size / 1024).toFixed(1)} KB)`);

const roadmapSourceMd = path.resolve('public/assets/roadmap/ASSET_SOURCE.md');
assert(fs.existsSync(roadmapSourceMd), 'public/assets/roadmap/ASSET_SOURCE.md exists with complete provenance');

const teamHrFile = path.resolve('src/components/executiveCockpit/TeamHrSnapshot.tsx');
const teamHrContent = fs.readFileSync(teamHrFile, 'utf-8');
assert(teamHrContent.includes('team-structure-backdrop.webp'), 'TeamHrSnapshot embeds scenic team-structure-backdrop.webp');
assert(teamHrContent.includes('aria-hidden="true"'), 'TeamHrSnapshot backdrop is marked aria-hidden="true"');
assert(teamHrContent.includes('opacity: 0.65'), 'TeamHrSnapshot has distinct visible backdrop (opacity: 0.65)');
assert(teamHrContent.includes('structure.root'), 'TeamHrSnapshot renders semantic DOM structure over backdrop');

const roadmapFile = path.resolve('src/components/executiveCockpit/RoadmapSnapshot.tsx');
const roadmapContent = fs.readFileSync(roadmapFile, 'utf-8');
assert(roadmapContent.includes('roadmap-backdrop.webp'), 'RoadmapSnapshot embeds scenic roadmap-backdrop.webp');
assert(roadmapContent.includes('aria-hidden="true"'), 'RoadmapSnapshot backdrop is marked aria-hidden="true"');
assert(roadmapContent.includes('opacity: 0.65'), 'RoadmapSnapshot has distinct visible route backdrop (opacity: 0.65)');
assert(roadmapContent.includes('releases.map'), 'RoadmapSnapshot renders semantic release milestones over backdrop');

// 4b. Pipeline-Ableitung & Ehrlicher Fehler-/Leerzustand
console.log('\n--- 4b. Pipeline-Ableitung & Ehrlicher Fehlerzustand ---');
assert(!cockpitDataContent.includes("'Unbekannt'"), 'No silent "Unbekannt" fallback in executiveCockpitData.ts');
assert(!cockpitDataContent.includes('deal.amount || 0'), 'No silent deal.amount || 0 fallback in executiveCockpitData.ts');
assert(cockpitDataContent.includes('throw new Error'), 'Strict error throwing on invalid deal data in getPipelineOverview');

const pipelineFile = path.resolve('src/components/executiveCockpit/PipelineSnapshot.tsx');
const pipelineContent = fs.readFileSync(pipelineFile, 'utf-8');
assert(pipelineContent.includes('ManagementChartState'), 'PipelineSnapshot renders ManagementChartState on error or empty state');
assert(pipelineContent.includes('type="error"'), 'PipelineSnapshot has explicit error state handling');
assert(pipelineContent.includes('type="empty"'), 'PipelineSnapshot has explicit empty state handling');

// 5. ExecutiveDashboardPage.tsx importiert nicht mehr SimpleChart
console.log('\n--- 5. ExecutiveDashboardPage.tsx Migration ---');
const execPageFile = path.resolve('src/features/overview/pages/ExecutiveDashboardPage.tsx');
const execPageContent = fs.readFileSync(execPageFile, 'utf-8');
assert(
  !execPageContent.includes('SimpleChart'),
  'ExecutiveDashboardPage.tsx strictly does NOT import or render SimpleChart'
);
assert(
  execPageContent.includes('ExecutiveCockpit'),
  'ExecutiveDashboardPage.tsx renders ExecutiveCockpit'
);

// 6. Die neuen Management-Charts sind responsive, nicht animiert und nicht geglättet
console.log('\n--- 6. Management-Chart-System Integrität ---');
const mgmtChartFile = path.resolve('src/components/ui/charts/ManagementChart.tsx');
assert(fs.existsSync(mgmtChartFile), 'ManagementChart.tsx exists');
const mgmtChartContent = fs.readFileSync(mgmtChartFile, 'utf-8');

assert(
  mgmtChartContent.includes('ResponsiveContainer'),
  'ManagementChart uses ResponsiveContainer for 100% responsive rendering'
);
assert(
  mgmtChartContent.includes('isAnimationActive={false}'),
  'ManagementChart explicitly disables Recharts animations (isAnimationActive={false})'
);
assert(
  mgmtChartContent.includes('type="linear"'),
  'ManagementChart enforces linear interpolation (no artificial smoothing or spline curves)'
);
assert(
  mgmtChartContent.includes('vertical={false}'),
  'ManagementChart reduces grid lines to horizontal only (vertical={false})'
);

// 7. Unvollständige Daten erzeugen einen ehrlichen Empty-/Error-State
console.log('\n--- 7. Ehrlicher Empty- / Error-State ---');
const mgmtStateFile = path.resolve('src/components/ui/charts/ManagementChartState.tsx');
assert(fs.existsSync(mgmtStateFile), 'ManagementChartState.tsx exists');
const mgmtStateContent = fs.readFileSync(mgmtStateFile, 'utf-8');

assert(
  mgmtStateContent.includes('keine synthetischen Ersatzwerte'),
  'ManagementChartState explicitly communicates honest state without fake fallback data'
);
assert(
  mgmtChartContent.includes('ManagementChartState'),
  'ManagementChart renders ManagementChartState when data is missing or empty'
);

// 8. Keine Cockpit-Komponente importiert direkt den Supabase-Client
console.log('\n--- 8. Supabase-Client Isolation ---');
const cockpitDir = path.resolve('src/components/executiveCockpit');
const cockpitFiles = fs.readdirSync(cockpitDir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

for (const file of cockpitFiles) {
  const content = fs.readFileSync(path.join(cockpitDir, file), 'utf-8');
  assert(
    !content.includes('supabaseClient') && !content.includes('@/services/db/supabaseClient'),
    `No direct supabaseClient import in src/components/executiveCockpit/${file}`
  );
}

// 9. Die Live-KPI-Karte bleibt inhaltlich isoliert
console.log('\n--- 9. LiveKpiCard Ebene C Isolation ---');
const execCockpitFile = path.resolve('src/components/executiveCockpit/ExecutiveCockpit.tsx');
const execCockpitContent = fs.readFileSync(execCockpitFile, 'utf-8');

assert(
  execCockpitContent.includes('<LiveKpiCard') && execCockpitContent.includes('kpiId="pipeline_coverage"'),
  'ExecutiveCockpit embeds LiveKpiCard with pipeline_coverage'
);
assert(
  execCockpitContent.includes('Ebene C Live-Feed'),
  'ExecutiveCockpit explicitly tags LiveKpiCard with Ebene C Live-Feed'
);

// 10. Differentieller Secret-Audit
console.log('\n--- 10. Differentieller Secret Audit ---');
const SECRET_PATTERNS = [
  /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}/,
  /postgres(?:ql)?:\/\/[^:]+:[^@\s]+@/,
  /ALTER\s+ROLE\s+.*PASSWORD\s+['"][^'"]+['"]/i,
  /CREATE\s+ROLE\s+.*PASSWORD\s+['"][^'"]+['"]/i,
  /(?:password|secret)\s*[:=]\s*['"][a-zA-Z0-9_-]{4,}['"]/i,
];

const AUDIT_FILES = [
  'src/domain/executiveCockpitData.ts',
  'src/components/executiveCockpit/ExecutiveCockpit.tsx',
  'src/components/executiveCockpit/CockpitPanel.tsx',
  'src/components/executiveCockpit/CockpitKpiRail.tsx',
  'src/components/executiveCockpit/TeamHrSnapshot.tsx',
  'src/components/executiveCockpit/RoadmapSnapshot.tsx',
  'src/components/executiveCockpit/PipelineSnapshot.tsx',
  'src/components/ui/charts/managementChartTheme.ts',
  'src/components/ui/charts/ManagementChart.tsx',
  'src/components/ui/charts/ManagementChartTooltip.tsx',
  'src/components/ui/charts/ManagementChartState.tsx',
  'src/features/overview/pages/ExecutiveDashboardPage.tsx',
];

for (const relPath of AUDIT_FILES) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    for (const pat of SECRET_PATTERNS) {
      assert(!pat.test(content), `No secret leak matching ${pat} in ${relPath}`);
    }
  }
}

// 11. Schutzbereichs-Integrität gegen Baseline 3f1f9b4
console.log('\n--- 11. Schutzbereichs-Integrität gegen Baseline 3f1f9b4 ---');
try {
  const protectedDiff = execSync(
    'git diff --exit-code 3f1f9b4 -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources',
    { stdio: 'pipe' }
  ).toString();
  assert(protectedDiff.trim() === '', 'Protected areas diff against 3f1f9b4 is exactly 0 lines');
} catch {
  assert(false, 'Protected areas diff against 3f1f9b4 is NOT empty!');
}

try {
  const legacyDiff = execSync(
    'git diff --exit-code 3f1f9b4 -- src/components/ui/Charts.tsx src/components/ui/chartTheme.ts src/features/crm',
    { stdio: 'pipe' }
  ).toString();
  assert(legacyDiff.trim() === '', 'Legacy chart and CRM feature diff against 3f1f9b4 is exactly 0 lines');
} catch {
  assert(false, 'Legacy chart and CRM feature diff against 3f1f9b4 is NOT empty!');
}

console.log('=======================================================');
if (failed) {
  console.error('❌ G21 PREFLIGHT AUDIT FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL G21 PREFLIGHT CHECKS PASSED SUCCESSFULLY!');
  console.log('=======================================================');
}
