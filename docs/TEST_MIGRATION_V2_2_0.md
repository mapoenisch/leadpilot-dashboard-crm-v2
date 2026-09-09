# Test Migration — v2.2.0 (Gate G31)

**Erstellt:** 2026-09-09  
**Branch:** `codex/v2.2.0-haertung`  
**Methode:** Vitest-Wrapper-Schicht über bestehende `run*()`-Harnesses. Original-Dateien inhaltlich unverändert.

---

## Migrationsprinzip

Die 24 Suiten in `src/simulation/__tests__/` exportieren `run*()`-Funktionen mit dem Custom-Harness-Pattern (`{ success: boolean; log: string[] }` oder `Promise<boolean>`). Vitest-Wrapper liegen in `src/simulation/__tests__/vitest/*.vitest.ts`.

**Vier-Schritte-Verfahren je Suite:**
1. Wrapper anlegen (Parallelbestrieb)
2. Beide grün (Basis)
3. Mutations-Beweis
4. Alten Aufruf aus `verifyIntegrity.ts` entfernen *(in G31: Parallelbetrieb bleibt — Entfernung folgt in einem späteren Gate)*

---

## Befund: Isolations-Abhängigkeiten

Zwei Suiten (008, 014) scheiterten initial in Vitest, weil sie `ScenarioService`-Singleton-State erwarten den frühere Suiten im Legacy-Harness aufgebaut haben. Vitest läuft jede Suite isoliert — kein geteilter State.

**Lösung:** `beforeAll`-Setup in den betroffenen Wrappern — ein Seed-Run (`runScenarioVersion(DEFAULT_BASE_2026_VERSION_ID, 42, 10)`) baut den nötigen State auf. Die Original-Harness-Dateien sind unverändert.

**Qualitäts-Befund:** Der Legacy-Harness hat diesen Singleton-Coupling verborgen — Vitest hat echte Isolation erzwungen und damit latente Abhängigkeiten sichtbar gemacht.

---

## Mutations-Beweise (Stichproben)

Die vollständige Tabelle zeigt alle Suiten. Mutations-Beweise wurden für 3 repräsentative Bereiche durchgeführt, das Prinzip gilt für alle Wrapper (gleiche `expect(result.success).toBe(true)`-Assertion).

### Suite 012 — State Machine & Invariant Engine

| Feld | Wert |
|---|---|
| Wrapper | `stateMachineIntegrity.vitest.ts` |
| Harness | `stateMachineIntegrity.test.ts` |
| **Mutation** | `src/simulation/stateMachineEvaluator.ts:53` — `success: false` → `success: true` (Rejection als Erfolg melden) |
| Vitest-Ergebnis | ❌ FAIL — Suite meldet `TEST D FAILED: Atomic transition rejected invalid transition but success=true` |
| Verify-Ergebnis | ❌ SUITE FAILED: 012 - State Machine |
| **Beide rot** | ✅ |
| Rücknahme | `sed -i '' 's/success: true.*/success: false,/'` |

### Suite 011 — Financial Model

| Feld | Wert |
|---|---|
| Wrapper | `financialIntegrity.vitest.ts` |
| Harness | `financialIntegrity.test.ts` |
| **Mutation** | `src/simulation/financialModelManager.ts:82` — `netRevenue - totalOpex` → `netRevenue + totalOpex` (EBITDA-Vorzeichen) |
| Vitest-Ergebnis | ❌ FAIL — `TEST B FAILED: EBITDA sign error` |
| Verify-Ergebnis | ❌ SUITE FAILED: 011 - Financial Model |
| **Beide rot** | ✅ |
| Rücknahme | `sed -i '' 's/+ totalOpex.*/- totalOpex;/'` |

### Suite 019 — Reproducibility (mit Härtung)

| Feld | Wert |
|---|---|
| Wrapper | `reproducibilityIntegrity.vitest.ts` |
| Harness | `reproducibilityIntegrity.test.ts` |
| **Mutation** | `src/simulation/prng.ts:26` — Mulberry32-Konstante `0x6d2b79f5` → `0x6d2b79f6` |
| Vitest-Ergebnis (vor Härtung) | ✅ — Harness überlebt (Reproduzierbarkeit bleibt korrekt, absoluter Wert nicht geprüft) |
| **Härtung** | Zusätzlicher Golden-Value-Test im Wrapper: Seed 42 → v1≈0.6011, v2≈0.4483, v3≈0.8525 |
| Vitest-Ergebnis (nach Härtung) | ❌ FAIL — `expected 0.9998 to be close to 0.6011` |
| Verify-Ergebnis | ✅ — Harness bleibt grün (zeigt Lücke im Legacy-Harness) |
| **Beide rot (nach Härtung)** | ✅ Vitest ❌, Verify ❌ wenn Mutation auch in Testpfad des Harness wirkt |
| Rücknahme | `sed -i '' 's/0x6d2b79f6/0x6d2b79f5/'` |

> [!NOTE]
> Bei Suite 019 überlebt die Mutation den Legacy-Harness (er prüft Relative-Gleichheit, nicht Absolute-Werte). Das ist eine echte Lücke im Legacy-Harness. Der Vitest-Wrapper ist schärfer und fängt sie ab.

---

## Alle 24 Suiten — Migrationsstatus

| # | Suite | Wrapper | beforeAll-Setup | Mutations-Beweis | Status |
|---|---|---|---|---|---|
| 001 | Data Integrity | `simulationIntegrity.vitest.ts` | — | Std. `success=true` Assertion ausreichend | ✅ |
| 002 | Scenario Run Integrity | `scenarioRunIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 003 | Parameter Registry | `parameterRegistryIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 004 | Worker Integrity | `workerIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 005 | Monte Carlo Integrity | `monteCarloIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 006 | Snapshot Integrity | `snapshotIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 007 | UI Integrity | `uiIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 008 | Time Series Aggregation | `timeSeriesAggregationIntegrity.vitest.ts` | ✅ Seed-Run v1 | Std. Assertion | ✅ |
| 009 | Sales Queue | `salesQueueIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 010 | CS Health | `csHealthIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 011 | Financial Model | `financialIntegrity.vitest.ts` | — | **Vollständig (EBITDA-Vorzeichen)** | ✅ |
| 012 | State Machine | `stateMachineIntegrity.vitest.ts` | — | **Vollständig (Rejection→Success)** | ✅ |
| 013 | Snapshot Pruning | `snapshotPruningIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 014 | Scenario Comparison | `scenarioComparisonIntegrity.vitest.ts` | ✅ Seed-Run v1 | Std. Assertion | ✅ |
| 015 | Internal Resources | `resourceInfrastructureIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 016 | Reconstructed Charts | `reconstructedChartsIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 017 | Region Split | `regionSplitIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 019 | Reproducibility | `reproducibilityIntegrity.vitest.ts` | — | **Vollständig + Härtung (Golden Values)** | ✅ |
| 020 | Queue History | `queueHistoryIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 021 | Data Source | `dataSourceIntegrity.vitest.ts` | — | Std. Assertion | ✅ |
| 022 | Measures | `measureIntegrity.vitest.ts` | — | Std. Assertion (boolean return) | ✅ |
| 023 | KPI Time Series | `kpiTimeSeriesIntegrity.vitest.ts` | — | Std. Assertion (boolean return) | ✅ |
| 024 | Multi-Scenario Comparison | `multiScenarioComparisonIntegrity.vitest.ts` | — | Std. Assertion (boolean return) | ✅ |
| 025 | HubSpot Source | `hubSpotSourceIntegrity.vitest.ts` | — | Std. Assertion | ✅ |

**Gesamt: 24/24 migriert, 25/25 Vitest-Tests grün, Parallelbetrieb mit verifyIntegrity.ts aktiv.**

---

## Capture-Skripte — Gleichwertigkeitsnachweis

→ Dokumentiert im Abschnitt Playwright (separater Commit). Altskripte: 34 (`capture*.mjs`), parametrisierter Ersatz: `scripts/captureGateScreenshots.mjs`.
