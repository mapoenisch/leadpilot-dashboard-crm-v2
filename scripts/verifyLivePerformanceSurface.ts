/**
 * Verification Script: Live Performance Surface (Gate G26 / Auftrag 042)
 *
 * Deterministische lokale Verifikation ohne externe Abhängigkeiten:
 * 1. Existenz der fünf neuen Komponenten & Einbindung in ExecutiveDashboardPage
 * 2. Keine LiveKpiCard-Übergabe mehr an ExecutiveCockpit
 * 3. Exakt 3 Kern-Karten (arr, mrr, pipeline_coverage) mit React.memo, data-testid="live-kpi-card" & data-kpi-id
 * 4. Alle verlangten Surface Test-IDs vorhanden
 * 5. Reine G24-Katalog & G25-Hook-Imports; strikt kein SupabaseClient, kein raw context, keine Event-IDs, keine Fixtures
 * 6. StreamingAreaChart bindet useLiveKpiHistory('arr') mit Recharts AreaChart & Textalternative
 * 7. LiveArrMixDonut bindet useLiveKpiActivity mit den 4 ARR-Mix-IDs; unvollständiger Mix zeigt ehrlichen Text
 * 8. LiveFunnelBarChart bindet useLiveKpiActivity mit den 5 Funnel-IDs; fehlende Stufen zeigen Wartetext statt 0
 * 9. LiveActivityFeed bindet alle 12 Katalog-IDs und mappt nur display-sichere Felder
 * 10. CSS Animation live-kpi-pulse 1.2s, #00f2fe und prefers-reduced-motion Abschaltung
 * 11. Schutzbereichs-Audit & keine neuen npm-Abhängigkeiten
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('===============================================================');
console.log('🔍 VERIFYING LIVE PERFORMANCE SURFACE (GATE G26 / AUFTRAG 042)');
console.log('===============================================================\n');

function runVerification() {
  // -------------------------------------------------------------
  // 1. Datei-Existenz
  // -------------------------------------------------------------
  console.log('--- 1. Verifying Component Existence & Dashboard Integration ---');
  const sectionFile = path.join(ROOT_DIR, 'src/components/liveKpi/LivePerformanceSection.tsx');
  const areaChartFile = path.join(ROOT_DIR, 'src/components/liveKpi/StreamingAreaChart.tsx');
  const arrMixFile = path.join(ROOT_DIR, 'src/components/liveKpi/LiveArrMixDonut.tsx');
  const funnelFile = path.join(ROOT_DIR, 'src/components/liveKpi/LiveFunnelBarChart.tsx');
  const activityFile = path.join(ROOT_DIR, 'src/components/liveKpi/LiveActivityFeed.tsx');
  const dashboardFile = path.join(ROOT_DIR, 'src/features/overview/pages/ExecutiveDashboardPage.tsx');

  assert(fs.existsSync(sectionFile), 'LivePerformanceSection.tsx exists');
  assert(fs.existsSync(areaChartFile), 'StreamingAreaChart.tsx exists');
  assert(fs.existsSync(arrMixFile), 'LiveArrMixDonut.tsx exists');
  assert(fs.existsSync(funnelFile), 'LiveFunnelBarChart.tsx exists');
  assert(fs.existsSync(activityFile), 'LiveActivityFeed.tsx exists');

  const dashboardSrc = fs.readFileSync(dashboardFile, 'utf8');
  assert(dashboardSrc.includes('LivePerformanceSection'), 'ExecutiveDashboardPage renders LivePerformanceSection');
  assert(!dashboardSrc.includes('liveKpiCard={<LiveKpiCard'), 'ExecutiveCockpit no longer receives individual liveKpiCard prop');

  // Abschnitt 11: Platzierung VOR ExecutiveCockpit
  const sectionIdx = dashboardSrc.indexOf('<LivePerformanceSection');
  const cockpitIdx = dashboardSrc.indexOf('<ExecutiveCockpit');
  assert(
    sectionIdx !== -1 && cockpitIdx !== -1 && sectionIdx < cockpitIdx,
    'ExecutiveDashboardPage renders LivePerformanceSection directly BEFORE ExecutiveCockpit'
  );

  // -------------------------------------------------------------
  // 2. Test-IDs und Struktur
  // -------------------------------------------------------------
  console.log('\n--- 2. Verifying Test-IDs & Section Layout ---');
  const sectionSrc = fs.readFileSync(sectionFile, 'utf8');
  assert(sectionSrc.includes('data-testid="live-performance-section"'), 'LivePerformanceSection has data-testid="live-performance-section"');
  assert(sectionSrc.includes('Live Performance'), 'Section title "Live Performance" rendered');
  assert(sectionSrc.includes('Ebene C'), 'Ebene C badge / label rendered in section');

  // Abschnitt 11: Technische Bühne mit Eyebrow und Raster/Lichtsaum
  assert(
    sectionSrc.includes('live-performance-stage') || sectionSrc.includes('live-performance-surface'),
    'LivePerformanceSection uses reference-grade technical stage / surface class'
  );

  // Kernkarten in Section
  assert(sectionSrc.includes('kpiId="arr"'), 'Section includes arr LiveKpiCard');
  assert(sectionSrc.includes('kpiId="mrr"'), 'Section includes mrr LiveKpiCard');
  assert(sectionSrc.includes('kpiId="pipeline_coverage"'), 'Section includes pipeline_coverage LiveKpiCard');

  // Teilkomponenten in Section eingebunden
  assert(sectionSrc.includes('<StreamingAreaChart'), 'Section renders StreamingAreaChart');
  assert(sectionSrc.includes('<LiveArrMixDonut'), 'Section renders LiveArrMixDonut');
  assert(sectionSrc.includes('<LiveFunnelBarChart'), 'Section renders LiveFunnelBarChart');
  assert(sectionSrc.includes('<LiveActivityFeed'), 'Section renders LiveActivityFeed');

  // -------------------------------------------------------------
  // 3. LiveKpiCard Erweiterungen
  // -------------------------------------------------------------
  console.log('\n--- 3. Verifying LiveKpiCard & Data Pulse ---');
  const cardFile = path.join(ROOT_DIR, 'src/components/liveKpi/LiveKpiCard.tsx');
  const cardSrc = fs.readFileSync(cardFile, 'utf8');

  assert(cardSrc.includes('React.memo'), 'LiveKpiCard remains React.memo wrapped');
  assert(cardSrc.includes('data-testid="live-kpi-card"'), 'LiveKpiCard has data-testid="live-kpi-card"');
  assert(cardSrc.includes('data-kpi-id={kpiId}'), 'LiveKpiCard has data-kpi-id attribute');
  assert(cardSrc.includes('live-kpi-pulse'), 'LiveKpiCard renders live-kpi-pulse overlay');
  assert(
    cardSrc.includes("pointerEvents: 'none'") ||
      cardSrc.includes('pointer-events: none') ||
      cardSrc.includes('pointer-events-none'),
    'Pulse overlay is pointer-events: none',
  );

  // -------------------------------------------------------------
  // 4. StreamingAreaChart
  // -------------------------------------------------------------
  console.log('\n--- 4. Verifying StreamingAreaChart ---');
  const areaSrc = fs.readFileSync(areaChartFile, 'utf8');
  assert(areaSrc.includes('data-testid="live-performance-arr-chart"'), 'StreamingAreaChart has data-testid="live-performance-arr-chart"');
  assert(areaSrc.includes("useLiveKpiHistory('arr')") || areaSrc.includes('useLiveKpiHistory("arr")'), 'StreamingAreaChart binds useLiveKpiHistory("arr")');
  assert(areaSrc.includes('AreaChart'), 'StreamingAreaChart uses Recharts AreaChart');
  assert(areaSrc.includes('ResponsiveContainer'), 'StreamingAreaChart uses ResponsiveContainer');
  assert(areaSrc.includes('MANAGEMENT_CHART_THEME'), 'StreamingAreaChart references MANAGEMENT_CHART_THEME');
  assert(areaSrc.includes('linearGradient') || areaSrc.includes('Gradient'), 'StreamingAreaChart defines gradient');
  assert(areaSrc.includes('aria-label') || areaSrc.includes('role="region"'), 'StreamingAreaChart has accessible label or region');

  // -------------------------------------------------------------
  // 5. LiveArrMixDonut
  // -------------------------------------------------------------
  console.log('\n--- 5. Verifying LiveArrMixDonut ---');
  const arrMixSrc = fs.readFileSync(arrMixFile, 'utf8');
  assert(arrMixSrc.includes('data-testid="live-performance-arr-mix"'), 'LiveArrMixDonut has data-testid="live-performance-arr-mix"');
  assert(arrMixSrc.includes('arr_direct') && arrMixSrc.includes('arr_partner') && arrMixSrc.includes('arr_outbound') && arrMixSrc.includes('arr_other'), 'LiveArrMixDonut targets all 4 ARR mix IDs');
  assert(arrMixSrc.includes('useLiveKpiActivity'), 'LiveArrMixDonut binds useLiveKpiActivity');
  assert(arrMixSrc.includes('unvollständig') || arrMixSrc.includes('Unvollständig'), 'LiveArrMixDonut has explicit incomplete mix handling');
  assert(arrMixSrc.includes('PieChart'), 'LiveArrMixDonut uses Recharts PieChart');

  // -------------------------------------------------------------
  // 6. LiveFunnelBarChart (Abschnitt 10 & 11: Pseudo-3D Balken mit shape)
  // -------------------------------------------------------------
  console.log('\n--- 6. Verifying LiveFunnelBarChart & Pseudo-3D Geometry ---');
  const funnelSrc = fs.readFileSync(funnelFile, 'utf8');
  assert(funnelSrc.includes('data-testid="live-performance-funnel"'), 'LiveFunnelBarChart has data-testid="live-performance-funnel"');
  assert(
    funnelSrc.includes('pipeline_leads') &&
    funnelSrc.includes('pipeline_mql') &&
    funnelSrc.includes('pipeline_sql') &&
    funnelSrc.includes('pipeline_offers') &&
    funnelSrc.includes('pipeline_won'),
    'LiveFunnelBarChart targets all 5 funnel IDs'
  );
  assert(funnelSrc.includes('useLiveKpiActivity'), 'LiveFunnelBarChart binds useLiveKpiActivity');
  assert(funnelSrc.includes('BarChart'), 'LiveFunnelBarChart uses Recharts BarChart');

  // Hard checks for Pseudo-3D shape
  assert(funnelSrc.includes('shape=') || funnelSrc.includes('shape={'), 'LiveFunnelBarChart uses custom SVG shape on Bar');
  assert(funnelSrc.includes('<polygon') || funnelSrc.includes('polygon'), 'Custom shape renders polygon facets for top/side depth');
  assert(funnelSrc.includes('depth') || funnelSrc.includes('DEPTH'), 'Custom shape computes limited depth');
  assert(!funnelSrc.includes('repeat: Infinity') && !funnelSrc.includes('infinite'), 'No infinite decorative animations in funnel');
  assert(
    funnelSrc.includes('renderPseudo3dBar(props: BarShapeProps)') &&
    !funnelSrc.includes('renderPseudo3dBar(props: any)'),
    'renderPseudo3dBar is strictly typed with BarShapeProps (no any)'
  );

  // -------------------------------------------------------------
  // 7. LiveActivityFeed
  // -------------------------------------------------------------
  console.log('\n--- 7. Verifying LiveActivityFeed ---');
  const actSrc = fs.readFileSync(activityFile, 'utf8');
  assert(actSrc.includes('data-testid="live-performance-activity"'), 'LiveActivityFeed has data-testid="live-performance-activity"');
  assert(actSrc.includes('useLiveKpiActivity'), 'LiveActivityFeed binds useLiveKpiActivity');
  assert(actSrc.includes('aria-live="polite"'), 'LiveActivityFeed uses aria-live="polite"');
  assert(!actSrc.includes('sourceSystem'), 'LiveActivityFeed does NOT render sourceSystem');
  assert(!actSrc.includes('eventId'), 'LiveActivityFeed does NOT render eventId');
  assert(!actSrc.includes('correlationId'), 'LiveActivityFeed does NOT render correlationId');
  assert(!actSrc.includes('raw_context'), 'LiveActivityFeed does NOT render raw_context');

  // -------------------------------------------------------------
  // 8. CSS & Reduced Motion
  // -------------------------------------------------------------
  console.log('\n--- 8. Verifying CSS Data Pulse & Reduced Motion ---');
  const cssFile = path.join(ROOT_DIR, 'src/styles/global.css');
  const cssSrc = fs.readFileSync(cssFile, 'utf8');
  assert(cssSrc.includes('.live-kpi-pulse'), 'global.css contains .live-kpi-pulse class');
  assert(cssSrc.includes('#00f2fe') || cssSrc.includes('0, 242, 254'), 'global.css uses cyan #00f2fe for pulse');
  assert(cssSrc.includes('1.2s'), 'global.css specifies 1.2s duration for pulse animation');
  assert(
    cssSrc.includes('@media (prefers-reduced-motion: reduce)') &&
    cssSrc.includes('animation: none'),
    'global.css explicitly disables pulse animation on prefers-reduced-motion: reduce'
  );

  // -------------------------------------------------------------
  // 9. Zero-Leak & Client-Isolierung in allen neuen/angepassten UI-Dateien
  // -------------------------------------------------------------
  console.log('\n--- 9. Verifying Zero-Leak & Clean Data Boundaries ---');
  const uiFilesToCheck = [
    sectionFile,
    areaChartFile,
    arrMixFile,
    funnelFile,
    activityFile,
    cardFile,
    dashboardFile,
  ];

  for (const f of uiFilesToCheck) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(ROOT_DIR, f);
    assert(!/supabaseClient/i.test(src), `No supabaseClient import in ${rel}`);
    assert(!/from\s+['"][^'"]*supabase['"]/i.test(src), `No supabase import in ${rel}`);
    assert(!/live_kpi_events/i.test(src), `No live_kpi_events reference in ${rel}`);
    assert(!/live_kpi_rejections/i.test(src), `No live_kpi_rejections reference in ${rel}`);
    assert(!/setInterval/i.test(src), `No setInterval polling in ${rel}`);
    assert(!/fixture/i.test(src), `No fixture import in ${rel}`);
  }

  // -------------------------------------------------------------
  // 10. No Dashed Borders in Live Performance Surface (Abschnitt 12: Inset-Zustand)
  // -------------------------------------------------------------
  console.log('\n--- 10. Verifying No Dashed Borders in Live Surface (Calm Inset) ---');
  const liveSurfaceComponents = [
    cardFile,
    funnelFile,
    areaChartFile,
    arrMixFile,
    activityFile,
  ];

  for (const f of liveSurfaceComponents) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(ROOT_DIR, f);
    assert(!src.includes('dashed'), `No dashed borders allowed in ${rel} (calm integrated inset required)`);
  }

  // -------------------------------------------------------------
  // 11. (G31-Nacharbeit Runde 3) Abschnitt entfernt: prüfte
  // scripts/captureAuftrag042GateScreenshots.mjs (S8 gelöscht).
  // Ersatz: Playwright (e2e/visual.spec.ts + captureGateScreenshots.mjs).
  // Auftrag sagte 235–236, tatsächlich musste der ganze Block weichen —
  // schon readFileSync (237) stürzt ohne die Datei mit ENOENT ab.
  // -------------------------------------------------------------

  console.log('\n===============================================================');
  console.log('🎉 ALL LIVE PERFORMANCE SURFACE AUDITS PASSED (GATE G26)');
  console.log('===============================================================');
}

runVerification();
