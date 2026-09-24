# Quality-Debt-Budget

**Issue:** #7 — CI-Quality-Baselines abbauen statt dauerhaft tolerieren
**Owner:** @mapoenisch · **Nächster Review:** 2026-12-31
**Maschinenlesbare Quelle:** [`debt-budget.json`](./debt-budget.json) · **Prüfung:** `npm run verify:quality-budget` (CI-Job `lint`)

## Zwei Ebenen

1. **Harte Baselines in `.github/workflows/ci.yml`** — alle auf **0**, Ziel erreicht:

   | Env-Variable | Gemessen | Ist | Budget |
   |---|---|---|---|
   | `LINT_BASELINE` | ESLint-Fehler **+ Warnungen** (bisher nur Fehler) | 0 | 0 |
   | `TSC_BASELINE` | `tsc --noEmit`-Fehler | 0 | 0 |
   | `MAX_LINES_BASELINE` | ESLint `max-lines`-Treffer (bisher nicht ausgewertet) | 0 | 0 |
   | `INLINE_STYLE_BASELINE` | ESLint `react/forbid-dom-props`-Treffer (bisher nicht ausgewertet) | 0 | 0 |

2. **Debt-Budget für Schulden, die ESLint nicht meldet** — `debt-budget.json`:
   - **Suppressions:** jede `eslint-disable`-Direktive in `src/`, je Regel gezählt.
   - **Inline-Styles:** `style={…}` in Produktions-TSX, das **nicht** durch eine zeilengenaue, begründete `react/forbid-dom-props`-Ausnahme gedeckt ist. Die Regel greift nur in ausgewählten Ordnern und nur an DOM-Elementen — `style` an Custom-Komponenten (z. B. `<Badge style>`) und alle Dateien außerhalb der Scopes waren bisher unsichtbar.

## Stand 2026-09-24 (Baseline)

| Metrik | Ist | Budget | Ziel | Begründung / Plan |
|---|---:|---:|---:|---|
| `suppressions:max-lines` | 1 | 1 | 1 | Ausnahme: generierte Supabase-Typen |
| `suppressions:no-console` | 1 | 1 | 1 | Ausnahme: zentraler Logger |
| `suppressions:react-hooks/exhaustive-deps` | 1 | 1 | 1 | Ausnahme: `useSyncExternalStore`-Trigger |
| `suppressions:react/forbid-dom-props` | 35 | 35 | 35 | Ausnahme: Laufzeit-Geometrie/-Farbe und style-Passthrough (Aufträge 053–057) |
| `inlineStyles:src/features/resources/` | 96 | 96 | 96 | Ausnahme, solange der Schutzbereich eingefroren ist (CLAUDE.md §6); mit eigenem Auftrag → 0 |
| `inlineStyles:src/components/ui/charts/` | 128 | 128 | **0** | Abbau in Wellen (G39-Rest) |
| `inlineStyles:src/` (Rest) | 17 | 17 | **0** | v. a. `Badge style` in `liveKpi/` → Badge-Variante/Größe ergänzen |

Summe unbegründeter Inline-Styles außerhalb des eingefrorenen Bereichs: **145 → Ziel 0**.

## Regeln der Ratsche

- **Ist > Budget → CI rot.** Neue Schulden sind nur mit einer Budget-Erhöhung im selben PR möglich — sichtbar im Diff und damit im Review.
- **Ist < Budget → CI rot**, bis das Budget im selben PR auf den neuen Ist-Wert gesenkt ist. Abgebaute Schulden können so nicht stillschweigend wieder aufgebaut werden.
- **Ziel > Budget → ungültig.** Das Ziel ist 0, außer bei einer im `rationale` fachlich begründeten Ausnahme.
- Eine neue `eslint-disable`-Regel ohne Budget-Eintrag hat implizit Budget 0 und schlägt fehl.

## Abbauplan

| Bis | Schritt | Zielwert |
|---|---|---|
| 2026-10-31 | `liveKpi/`-Badges, AIInsightDrawer, RouteErrorBoundary, SimulationBar, KpiTimeSeriesChartSection migrieren | `src/` 17 → 0 |
| 2026-11-30 | Chart-Welle 1: `ChartTooltip`, `ChartLegend`, `ChartFrame`, `ChartMetricHeader`, `ManagementChartTooltip`, `ChartEmptyState`, `ChartInsight`, `ManagementChartState` | `charts/` 128 → ≤ 69 |
| 2026-12-31 | Chart-Welle 2: restliche Chart-Komponenten; echte Laufzeit-Geometrie zeilengenau begründen (wandert ins Suppression-Budget) | `charts/` → 0 |
| Review 2026-12-31 | Budget, Ausnahmen und Termine prüfen; Resources nur mit eigenem Auftrag | — |

Die Umsetzung jedes Schritts läuft über einen eigenen `ANTIGRAVITY_AUFTRAG_*` (AGENTS.md/CLAUDE.md §4); dieses Dokument legt nur Budget und Reihenfolge fest.
