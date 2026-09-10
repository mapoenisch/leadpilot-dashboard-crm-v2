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

## Mutations-Beweise — alle 24 Suiten (R3-Nachweis, 2026-09-09)

Jede Mutation wurde temporär eingebaut, **beide** Varianten (Vitest-Wrapper +
Legacy-Harness via `tsx`) mussten rot werden, danach wurde revertiert
(`git status` sauber bis auf die dokumentierte 016-Härtung).
Harness-Einzelnachweise für 008/014 mit demselben Seed-Setup wie das
Wrapper-`beforeAll` (`runScenarioVersion(DEFAULT_BASE_2026_VERSION_ID, 42, 10)`).

| # | Suite | Mutation (Produktcode, temporär) | Vitest | Verify | Trip |
|---|---|---|---|---|---|
| 001 | Data Integrity | `src/simulation/prng.ts` — `next()` + `Math.random()*1e-9` (Determinismus gebrochen) | ❌ | ❌ | TEST A (PRNG-Sequenzen divergieren) |
| 002 | Scenario Run | `src/simulation/preflightValidator.ts:79` `>= 10`→`>= 11` **+** `src/simulation/scenarioRepository.ts` `>= 10`→`>= 11` (beide Schichten nötig, s. Erkenntnisse) | ❌ | ❌ | TEST H (11. Run nicht abgewiesen) |
| 003 | Parameter Registry | `src/simulation/parameterRegistry.ts` — `salesRepCount`-Default `2`→`3` | ❌ | ❌ | TEST B (Defaults divergieren) |
| 004 | Worker | `src/simulation/worker/simulation.worker.ts:60` — `!==`→`===` (gültige Kommandos abgewiesen) | ❌ | ❌ | Timeout 2000 ms (kein STARTED-Event) |
| 005 | Monte Carlo | `src/simulation/monteCarloAggregator.ts` — Median-Perzentil `0.5`→`0.6` | ❌ | ❌ | TEST B (Median) + TEST G |
| 006 | Snapshot | `src/services/db/snapshotMapper.ts` — `fromPersistenceRecord`: `tickId + 1` | ❌ | ❌ | TEST G (Tick-Reihenfolge) + TEST K |
| 007 | UI | `src/simulation/scenarioService.ts` — `reproduce()`: `seed + 1` | ❌ | ❌ | TEST I (Reproduce-Seed-Mismatch) |
| 008 | Time Series Aggregation | `src/simulation/monteCarloAggregator.ts` — `expectedTick + 1` | ❌ | ❌ | `AggregationError` INCOMPATIBLE_TIMESERIES |
| 009 | Sales Queue | `src/simulation/salesQueueManager.ts:28` — Kapazität `+ 1` | ❌ | ❌ | TEST A (2→3, 5→6) + TEST C |
| 010 | CS Health | `src/simulation/csQueueManager.ts` — Onboarding-Gewicht `0.25`→`0` | ❌ | ❌ | TEST A (out of bounds) + TEST B |
| 011 | Financial Model | `src/simulation/financialModelManager.ts:82` — `netRevenue - totalOpex`→`+ totalOpex` (EBITDA-Vorzeichen; Re-Verifikation 09.09.) | ❌ | ❌ | TEST J (EBITDA-Mismatch −205 vs. 2261) |
| 012 | State Machine | `src/simulation/stateMachineEvaluator.ts:53` — `success: false`→`true` (Re-Verifikation 09.09.) | ❌ | ❌ | TEST B + TEST H (verbotene Transition erlaubt) |
| 013 | Snapshot Pruning | `src/simulation/snapshotPruningManager.ts:25` — `keep.add(0)` entfernt | ❌ | ❌ | TEST B (Tick 0 fehlt) + TEST F |
| 014 | Scenario Comparison | `src/simulation/goalTargetEvaluator.ts:48` — AT_RISK-Schwelle `>= 80`→`>= 90` | ❌ | ❌ | TEST E (88 % → MISSED) + TEST H |
| 015 | Internal Resources | `src/domain/resourceRegistry.ts` — `res-praesentation`-ID dupliziert (`res-roadmap-h2-2026`) | ❌ | ❌ | TEST B (Duplicate IDs) |
| 016 | Reconstructed Charts | `src/domain/produktData.ts` — Aktivierungsrate Q4 `58`→`59`; nach Härtung zusätzlich Q1 `49`→`50` | ❌ | ❌ | TEST C (Numerical deviation) |
| 017 | Region Split | `src/domain/kundenData.ts` — REGIONEN Deutschland `61`→`62` | ❌ | ❌ | TEST C (inkonsistente Regionalwerte) |
| 019 | Reproducibility | `src/simulation/prng.ts:26` — Mulberry32-Konstante `0x6d2b79f5`→`0x6d2b79f6` (+ Härtung, s. unten) | ❌ (nach Härtung) | s. Hinweis | Golden-Value-Test |
| 020 | Queue History | `src/simulation/salesQueueManager.ts:261` — `entries.slice(-20)`→unbegrenzt | ❌ | ❌ | Bound-Test (Projection 348 > 20) |
| 021 | Data Source | `src/services/data/dataSourceRegistry.ts:19` — `UNKNOWN_SOURCE`-Throw entfernt | ❌ | ❌ | `unknown source throws UNKNOWN_SOURCE` |
| 022 | Measures | `src/simulation/effectiveParameterResolver.ts:154` — Clamp entfernt | ❌ | ❌ (Throw) | TEST 3 (Clamp 99 statt 10) |
| 023 | KPI Time Series | `src/simulation/monteCarloAggregator.ts` — p10/p90 vertauscht (`0.1`↔`0.9`) | ❌ | ❌ (Throw) | TEST 1 (p10 424176 > Median 411840) |
| 024 | Multi-Scenario | `src/simulation/scenarioService.ts:815` — `< 2`→`< 1` | ❌ | ❌ (Throw) | TEST 5 (< 2 Versionen nicht abgewiesen) |
| 025 | HubSpot Source | `src/services/data/sources/hubSpotBaselineSource.ts:12` — `kind: 'external'`→`'simulated'` | ❌ | ❌ | kind-Check + Baseline-Load |

Hinweis 019: Der Legacy-Harness prüft relative Gleichheit, nicht absolute Werte —
die PRNG-Mutation überlebt ihn (echte Lücke, dokumentiert). Der gehärtete
Vitest-Wrapper (Golden Values Seed 42 → 0.6011/0.4483/0.8525) wird rot und fängt
sie ab. Hinweis 022–024: Boolean-Suiten werfen statt `false` zurückzugeben —
Vitest-`it()` und `verifyIntegrity` (`.catch` → Exit 1) werden beide rot.

### Überlebte Mutationen & Erkenntnisse (keine offenen Lücken außer behobener 016)

- **002:** Erste Mutation (nur Preflight `>= 11`) überlebte — `ScenarioRepository.saveRun`
  erzwingt das 10-Run-Limit unabhängig ein zweites Mal. Erst die Doppel-Mutation
  (beide Schichten) machte beide Varianten rot. Befund: Defense-in-Depth, kein Härtungsbedarf.
- **007:** Erste Mutation (p10/p90-Swap im Aggregator) überlebte — die UI-Suite läuft
  gegen die deterministische Baseline (`validRunCount: 0`-Pfad, p10 == Median == p90),
  Ordering ist dort trivial erfüllt. Schärfere Mutation (`reproduce`-Seed `+1`) machte
  beide rot (TEST I). Kein Härtungsbedarf: Wrapper und Harness teilen dieselbe Assertion.
- **016 (behoben):** Erste Mutation (`CHART_PRODUKT` `data[0]` 49→50) überlebte — TEST C
  prüfte nur `data[3]`. Echte (kleine) Lücke → gehärtet (s. unten). Zweitmutation
  (`data[3]` 58→59) war von Anfang an beidseitig rot.
- **021:** Erste Mutation (falsche Schicht: `BaselineSnapshotService.get`) überlebte —
  der Harness prüft den Registry-Pfad (`dataSourceRegistry.get`). Korrekte Mutation
  machte beide rot. Kein Härtungsbedarf.
- **023 bestätigt 007:** derselbe p10/p90-Swap ist dort beidseitig rot, weil die
  KPI-Zeitreihe echte Lauf-Varianz enthält (Tick 4: p10 424176 > Median 411840).

### Härtungen in `run*Test()`-Dateien (R3-gedeckt, Testcode, Engine unberührt)

- **019 (Bestand):** `reproducibilityIntegrity.vitest.ts` — Golden-Value-Test
  (Mulberry32 Seed 42 → v1≈0.6011, v2≈0.4483, v3≈0.8525).
- **016 (neu, 2026-09-09):** `reconstructedChartsIntegrity.test.ts`, TEST C —
  zusätzlich `CHART_PRODUKT.datasets[0]?.data[0] === 49` (Q1-Referenz; `?.` damit
  `tsc --noEmit` bei 764 ≤ Baseline 765 bleibt, R2-Ratsche grün). Rot-Nachweis mit
  finaler Zeile: `data[0]` 49→50 → beide rot (TEST C).

---

## Alle 24 Suiten — Migrationsstatus

| # | Suite | Wrapper | beforeAll-Setup | Mutations-Beweis (09.09., alle revertiert) | Status |
|---|---|---|---|---|---|
| 001 | Data Integrity | `simulationIntegrity.vitest.ts` | — | PRNG + `Math.random()` → TEST A, beide rot | ✅ |
| 002 | Scenario Run Integrity | `scenarioRunIntegrity.vitest.ts` | — | Preflight + Repo `>= 11` → TEST H, beide rot | ✅ |
| 003 | Parameter Registry | `parameterRegistryIntegrity.vitest.ts` | — | Default 2→3 → TEST B, beide rot | ✅ |
| 004 | Worker Integrity | `workerIntegrity.vitest.ts` | — | Protokoll-Inversion → Timeout, beide rot | ✅ |
| 005 | Monte Carlo Integrity | `monteCarloIntegrity.vitest.ts` | — | Median-Perzentil 0.6 → TEST B/G, beide rot | ✅ |
| 006 | Snapshot Integrity | `snapshotIntegrity.vitest.ts` | — | `tickId + 1` → TEST G/K, beide rot | ✅ |
| 007 | UI Integrity | `uiIntegrity.vitest.ts` | — | Reproduce-Seed +1 → TEST I, beide rot | ✅ |
| 008 | Time Series Aggregation | `timeSeriesAggregationIntegrity.vitest.ts` | ✅ Seed-Run v1 | `expectedTick + 1` → INCOMPATIBLE_TIMESERIES, beide rot | ✅ |
| 009 | Sales Queue | `salesQueueIntegrity.vitest.ts` | — | Kapazität +1 → TEST A/C, beide rot | ✅ |
| 010 | CS Health | `csHealthIntegrity.vitest.ts` | — | Onboarding-Gewicht 0 → TEST A/B, beide rot | ✅ |
| 011 | Financial Model | `financialIntegrity.vitest.ts` | — | EBITDA-Vorzeichen → TEST J, beide rot (re-verifiziert) | ✅ |
| 012 | State Machine | `stateMachineIntegrity.vitest.ts` | — | Rejection→Success → TEST B/H, beide rot (re-verifiziert) | ✅ |
| 013 | Snapshot Pruning | `snapshotPruningIntegrity.vitest.ts` | — | `keep.add(0)` entfernt → TEST B/F, beide rot | ✅ |
| 014 | Scenario Comparison | `scenarioComparisonIntegrity.vitest.ts` | ✅ Seed-Run v1 | AT_RISK-Schwelle 90 → TEST E/H, beide rot | ✅ |
| 015 | Internal Resources | `resourceInfrastructureIntegrity.vitest.ts` | — | Duplikat-ID → TEST B, beide rot | ✅ |
| 016 | Reconstructed Charts | `reconstructedChartsIntegrity.vitest.ts` | — | Q4 58→59 + Q1 49→50 (nach Härtung) → TEST C, beide rot | ✅ + Härtung |
| 017 | Region Split | `regionSplitIntegrity.vitest.ts` | — | DE 61→62 → TEST C, beide rot | ✅ |
| 019 | Reproducibility | `reproducibilityIntegrity.vitest.ts` | — | PRNG-Konstante + Golden-Value-Härtung (Bestand) | ✅ + Härtung |
| 020 | Queue History | `queueHistoryIntegrity.vitest.ts` | — | Slice-Bound entfernt → 348 > 20, beide rot | ✅ |
| 021 | Data Source | `dataSourceIntegrity.vitest.ts` | — | Registry-Throw entfernt → UNKNOWN_SOURCE-Test, beide rot | ✅ |
| 022 | Measures | `measureIntegrity.vitest.ts` | — | Clamp entfernt → TEST 3 (Throw), beide rot | ✅ |
| 023 | KPI Time Series | `kpiTimeSeriesIntegrity.vitest.ts` | — | p10/p90-Swap → TEST 1 (Throw), beide rot | ✅ |
| 024 | Multi-Scenario Comparison | `multiScenarioComparisonIntegrity.vitest.ts` | — | `< 2`→`< 1` → TEST 5 (Throw), beide rot | ✅ |
| 025 | HubSpot Source | `hubSpotSourceIntegrity.vitest.ts` | — | `kind` external→simulated → beide rot | ✅ |

**Gesamt: 24/24 mit dokumentiertem Mutations-Beweis (beide Varianten rot, alle
revertiert), 25/25 Vitest-Tests grün, `verifyIntegrity.ts` vollständig erhalten
(Parallelbetrieb, nichts entfernt). 2 Härtungen (019 Bestand, 016 neu).**

---

## Playwright-e2e (S2–S6, 2026-09-09)

- `playwright.config.ts`: Projekte 1440×900 / 768×1024 / 375×812, `webServer`
  `vite preview` (Port 4321, `reuseExistingServer` lokal), `reducedMotion: reduce`,
  `maxDiffPixelRatio: 0.02`.
- `e2e/routes.spec.ts`: alle 41 Pfade aus `src/app/routes.tsx` — als Literal, weil
  der e2e-Kontext kein Vite-Define hat (`import.meta.env.DEV`-Guard in `routes.tsx`
  wirft außerhalb von Vite). Bei Routenänderung synchronisieren. Stand: 123/123 grün.
- `e2e/a11y.spec.ts`: `@axe-core/playwright` gegen `/dashboard`, `/crm/leads`,
  `/finance/p-and-l`, `/market/overview`; fail bei `critical`/`serious`.
  **Offener Befund (kein Fix in G31 — `src/**` tabu):** `/dashboard` meldet 1×
  `serious` (`scrollable-region-focusable`): `<main style="overflow-y: auto">`
  aus dem Layout hat keinen Tastaturzugriff. Fix (`tabindex`/`role=region`) gehört
  nach G35. Die anderen 3 Routen sind sauber.
  Nacharbeit Runde 3 (Marc-Entscheid): Delta-Ratsche — `e2e/a11y-baseline.json`
  listet je Route akzeptierte `v.id`-Werte, der Spec lässt nur NEUE Verstöße
  durchfallen (Mechanik negativ getestet: ohne Baseline-Eintrag rot). Kanon auch
  in `docs/QUALITY_BASELINE_V2_2_0.md` (Abschnitt Axe-Baseline, Zielgate G35).
- `e2e/visual.spec.ts`: siehe S5 unten.
- S5-Ergebnis (09.09.): 12 Baselines (`e2e/visual.spec.ts-snapshots/`, 4 Routen ×
  3 Viewports, `fullPage`). Lauf 1 angelegt, Lauf 2 + 3 je 12/12 grün —
  stabil ohne `mask:`, kein STOPP nötig.
- Axe-Baseline für G35 (Nacharbeit 10.09.): `/dashboard` meldet 1× `serious`
  (`scrollable-region-focusable` — `<main style="overflow-y: auto">` ohne
  Tastaturzugriff, alle 3 Viewports, lokal wie CI). `/crm/leads`,
  `/finance/p-and-l`, `/market/overview` sauber. Fix (`tabindex`/`role=region`)
  ist G35-Scope (`src/`-Fix, nicht G31).

## Capture-Skripte — Determinismus-Analyse (S1, 2026-09-09)

Der alte Harness (`scripts/captureAuftrag042GateScreenshots.mjs`, 515 Zeilen, CDP
handgebaut) friert **keine Zeit** ein und nutzt **keinen Seed**. Er verlässt sich auf:
(a) lokale App ohne Live-Daten ist quasi statisch, (b) feste `sleep(1500)`-Wartezeiten
nach Navigate/Reload, (c) SHA-Vergleich Vorher/Nachher, wo volatile Inhalte sich
gegenseitig aufheben. Assertions: Titel, `<main>`, kein 404-Text, 0px H-Overflow —
plus 042-spezifische `live-performance-*`-Testids (nicht portieren, das war Gate-Sonderlocke).

Empirie (Playwright-Chromium, `vite preview` aus `npx vite build`, je Route 2 Läufe
mit `networkidle` + `document.fonts.ready` + 1500 ms, SHA-12 über `body.innerText`):

| Route | `.live-kpi-pulse` | Aktualisiert-Tokens | Uhrzeit-Strings | Lauf 1 vs. 2 |
|---|---|---|---|---|
| `/dashboard` | 0 | 0 | 0 | STABIL (identisch) |
| `/crm/leads` | 0 | 0 | 0 | STABIL |
| `/finance/p-and-l` | 0 | 0 | 0 | STABIL |
| `/market/overview` | 0 | 0 | 0 | STABIL |

Erwartung bestätigt: keine Live-Snapshots → keine `Aktualisiert: vor Xs`-Stempel,
kein Puls. Text-Stabilität ≠ Pixel-Stabilität (Canvas-Charts, Font-Raster,
framer-motion) — das entscheidet S5 (3× Baseline-Läufe).

Determinismus-Ansatz für Playwright: `reducedMotion: 'reduce'` im Context,
`waitUntil: 'networkidle'` + `document.fonts.ready` + kurze Settle-Wartezeit,
`maxDiffPixelRatio: 0.02` (nur Anti-Aliasing/Subpixel-Drift). **Kein `mask:`**
initial — erst bei konkret als flaky nachgewiesenen Regionen.

Korrekturen am Bauauftrag: Routenquelle ist `src/app/routes.tsx` (41 Routen, nicht
`routes.ts`). Echte Pfade: `/finance/p-and-l` (nicht `/finanzen/pnl`),
`/market/overview` (nicht `/markt/overview`). e2e nutzt ausschließlich echte Pfade.

## Capture-Skripte — Gleichwertigkeitsnachweis (S6, 2026-09-09)

Ersatz: `scripts/captureGateScreenshots.mjs` — ein parametrisiertes Skript
(`--routes`, `--viewports`, `--out`, `--port`; eigener `vite preview`,
`reducedMotion`, `networkidle` + `fonts.ready` + 1000 ms, Full-Page-PNGs).
Verifiziert: `/dashboard` × 1440/768/375 capturte fehlerfrei.

Zwillings-Nachweis mit bekannter Änderung (temporär, danach revertiert):
Sidebar-`<nav>` per `display: none` ausgeblendet (`Sidebar.tsx`), neu gebaut.

| Verfahren | Ergebnis |
|---|---|
| Alt-Prinzip (SHA-Vergleich der PNG-Sätze, wie alte Matrix) | SHA `dcf31109…` → `5e8c6bdb…` (alle Viewports verschieden) → erkannt ✅ |
| Neu-Prinzip (`toHaveScreenshot`, Toleranz 0) | FAIL „7161 pixels (ratio 0.01) are different" + Diff-Bild → erkannt ✅ |

Beide sehen dieselbe Regression. Der alte 042-Harness als Ganzes ist aktuell
nicht lauffähig (seine Stage baut via `tsc && vite build`, tsc ist rot) —
nachgewiesen ist die Gleichwertigkeit der Detektionsprinzipien am selben Artefakt.

Schwellen-Korrektur (begründete Abweichung vom Auftragswert 0.01–0.02):
Erster Nachweisversuch (Titel-Suffix, dann Sidebar) blieb mit `maxDiffPixelRatio:
0.02` **grün** — die Sidebar-Regression sind nur 7161 px (Ratio 0.01). Erst
`maxDiffPixelRatio: 0` macht sie rot. Entscheidung-5-Forderung („strenger, nicht
schwächer") ist damit erst bei 0 erfüllt. Stabilität mit 0: 3 volle Läufe je
12/12 grün (kein Anti-Aliasing-Rauschen dank `reducedMotion` + statischer Daten).
`playwright.config.ts` steht daher auf 0. Fällt 0 auf anderen Maschinen (CI,
Fonts) durch Rauschen auf → Schwelle dort gezielt anheben + hier dokumentieren.
