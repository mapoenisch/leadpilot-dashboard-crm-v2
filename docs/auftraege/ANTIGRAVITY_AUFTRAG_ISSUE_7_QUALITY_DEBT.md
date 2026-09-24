# ANTIGRAVITY_AUFTRAG_ISSUE_7 — Qualitätsschulden abbauen statt tolerieren (Issue #7)

> **Builder:** Claude Code (Rollenwechsel bis v2.3.0, `CLAUDE.md` §4) · **Prüfer:** Codex
> **Nachtrag:** Dieser Auftrag wurde **nachträglich** angelegt, nachdem Codex im Review
> von PR #25 (P1, Kommentar 4098557318) den fehlenden Detailauftrag bemängelt hatte.
> Der bereits gebaute Patch wurde gegen die unten stehende Ziel-Dateiliste und die
> Abnahmekriterien geprüft (siehe „Scope-Prüfung“). Künftige Aufträge entstehen vor dem Bau.

## Ziel

Issue #7: Die CI toleriert Qualitätsabweichungen über Baselines. Ziel ist, die Schulden
**im Code abzubauen**, den Rest als begründetes, schrumpfendes Budget zu führen und jede
Erhöhung in der CI zu blockieren.

Akzeptanzkriterien aus dem Issue:

1. Die aktuelle Baseline ist dokumentiert.
2. Die CI verhindert jede Erhöhung der Baseline.
3. Die Baseline wird schrittweise reduziert.
4. Der Zielwert ist 0 oder eine fachlich begründete Ausnahme.

Zusätzlich (Entscheidung Marc, 24.09.2026): Rollenwechsel — Claude Code baut bis zum
Release v2.3.0, Codex prüft.

## Baseline

- `main` `81410f7` · Branch `claude/ci-quality-baselines-reduce-u1yo54` · PR #25.
- Schutzbereichs-Baseline: `81410f7`. `src/simulation`, `src/types`, `src/context`,
  `src/services/data`, `src/features/resources`: **Nulldiff** (nicht freigegeben).

## Ziel-Dateien

| Bereich | Dateien | Aktion |
|---|---|---|
| Auftrag/Governance | `docs/auftraege/ANTIGRAVITY_AUFTRAG_ISSUE_7_QUALITY_DEBT.md`, `CLAUDE.md`, `AGENTS.md`, `BUILD_PLAN.md`, `docs/superpowers/plans/2026-09-16-v2-3-0-master-implementation-plan.md`, `docs/BUILD_LOG.md` | NEU/MODIFY |
| Debt-Budget | `docs/quality/DEBT_BUDGET.md`, `docs/quality/debt-budget.json`, `scripts/verifyQualityBudget.ts`, `scripts/__tests__/verifyQualityBudget.vitest.ts`, `package.json` (`verify:quality-budget`), `.gitignore` (`eslint-report.json`) | NEU/MODIFY |
| CI | `.github/workflows/ci.yml` (Lint zählt Fehler + Warnungen, wertet `MAX_LINES_BASELINE`/`INLINE_STYLE_BASELINE` aus, Budget-Schritt) | MODIFY |
| Lint-Regeln | `eslint.config.js` (Inline-Style-Verbot für ganz `src/**/*.tsx`, DOM + Komponenten) | MODIFY |
| Primitives | `src/components/ui/Badge.tsx`, `Button.tsx`, `RouteErrorBoundary.tsx`; `src/components/facelift/DiagramCanvas.tsx`, `FaceliftGlyph.tsx`, `MetricToken.tsx`; `src/components/ai/AIInsightDrawer.tsx`; `src/components/layout/SimulationBar.tsx` | MODIFY |
| Live-KPI | `src/components/liveKpi/LiveActivityFeed.tsx`, `LiveArrMixDonut.tsx`, `LiveFunnelBarChart.tsx`, `LiveKpiCard.tsx`, `LivePerformanceSection.tsx`, `StreamingAreaChart.tsx` | MODIFY |
| Charts | alle 16 Dateien in `src/components/ui/charts/*.tsx` mit Inline-Styles (ChartEmptyState, ChartFrame, ChartInsight, ChartLegend, ChartMetricHeader, ChartTooltip, DivergingBarChart, DonutRingChart, ManagementChart, ManagementChartState, ManagementChartTooltip, MonteCarloHistogramChart, MultiScenarioComparisonChart, SteppedFunnelChart, TimeSeriesCorridorChart, WaterfallChart) | MODIFY |
| Simulation-UI | `src/features/simulation/components/KpiTimeSeriesChartSection.tsx`, `kpiTimeSeriesConfig.ts` | MODIFY |
| Tests | `src/components/ui/__tests__/Badge.ui.vitest.tsx`, `src/components/layout/__tests__/SimulationBar.branch3.ui.vitest.tsx`, `src/components/ui/charts/__tests__/ChartsSupplement.branch2.ui.vitest.tsx` | MODIFY |
| Screenshot-Nachweis | `scripts/captureIssue7ParityScreenshots.mjs`, `docs/screenshots/issue-7/README.md` | NEU |

## Globale Grenzen

- Reiner Refactor: **pixelgleiche** Darstellung. Nachweis per SHA-256-Vergleich
  vorher/nachher auf 41 Routen × 1440/768/375 und 0 px horizontalem Overflow.
- Echte Laufzeitwerte (Geometrie/Farbe aus Daten, Props des Aufrufers) bleiben als
  zeilengenaue, begründete `eslint-disable-next-line react/forbid-dom-props`-Ausnahme.
- `src/features/resources/**` bleibt eingefroren (96 Inline-Styles als begründete Ausnahme).
- Keine neuen npm-Pakete, keine Secrets.

## Tasks

- [x] 1. Baseline messen und dokumentieren (`docs/quality/DEBT_BUDGET.md`).
- [x] 2. CI-Ratsche: Erhöhung und nicht nachgezogene Senkung sind rot.
- [x] 3. Unbegründete Inline-Styles außerhalb von Resources auf 0 abbauen, `style`-Passthrough entfernen.
- [x] 4. ESLint-Regel auf ganz `src/**/*.tsx` ausweiten (DOM + Komponenten).
- [x] 5. Screenshot-Parität vorher/nachher mit Harness und Matrix nachweisen.
- [x] 6. Codex-Befunde aus dem Review von PR #25 umsetzen (Whitespace im Muster, längstes Präfix, dieser Auftrag, Matrix).
- [x] 7. Vollgates, BUILD_LOG, Übergabe an Codex.

## Verifikation

```
npx tsc --noEmit
npm run lint && npm run format:check
npm run verify:quality-budget
npm run test:coverage
npm run verify
npm run build
node scripts/captureIssue7ParityScreenshots.mjs --capture … (vorher/nachher/vorher-2) + --compare
```

## Scope-Prüfung (nachträglich)

`git diff --name-only origin/main...HEAD` enthält ausschließlich Dateien aus der
Ziel-Dateiliste oben; der Schutzbereichs-Diff gegen `81410f7` ist leer. Ergebnis im
BUILD_LOG-Eintrag zu diesem Auftrag.
