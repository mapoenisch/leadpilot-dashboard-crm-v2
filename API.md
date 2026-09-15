# API.md — Modul- und Service-Oberfläche

> Karte der internen Programmierschnittstellen von LeadPilot Dashboard-CRM.
> Stand: **v2.2.0**, Commit `9380ace`, erzeugt aus dem Ist-Stand des Codes.
>
> **Abgrenzung:** Diese Datei beschreibt *was es gibt und wo es liegt* — nicht,
> warum es so entschieden wurde. Entscheidungen stehen in
> `ARCHITECTURE_DECISIONS.md` (dort Teil A Historie, Teil B Ziel-Architektur,
> Teil C Implementierungsstand). Regeln stehen in `CLAUDE.md`. Bei Abweichungen
> gelten jene Dateien, nicht diese.
>
> Diese Datei ist **nicht** die HTTP-/REST-Dokumentation einer Backend-API.
> Externe Systeme sind Supabase (Postgres/Realtime) und n8n/HubSpot; deren
> Anbindung steht unter [Externe Systeme](#7-externe-systeme).

---

## 1. Schichtenmodell

Maschinell erzwungen über `import/no-restricted-paths` in `eslint.config.js`.
Erlaubte Importrichtung:

```
app → features → components → services → simulation | domain | types
```

Verbotene Richtungen (jeweils `error`, Meldung „Layering-Verstoß … Refactor nach G35"):

| Ziel-Schicht | darf **nicht** importieren aus |
|---|---|
| `src/components` | `src/features` |
| `src/services` | `src/components`, `src/features` |
| `src/simulation` | `src/components`, `src/features` |
| `src/domain` | `components`, `features`, `services`, `simulation` |
| `src/types` | `components`, `features`, `services`, `simulation` |

`src/types` und `src/domain` sind damit die blattnahen Schichten: Sie dürfen von
allen importiert werden, importieren selbst aber nichts von oben.

Ergänzende Datei-Regel: `max-lines: 400` (`skipBlankLines`, `skipComments`).
Die aktuell akzeptierten Überschreitungen sind über `MAX_LINES_BASELINE=4` in
`.github/workflows/ci.yml` geratscht — siehe [Abschnitt 8](#8-bekannte-ausnahmen).

---

## 2. Top-Level-Struktur `src/`

| Ordner | Rolle | Schutzbereich |
|---|---|---|
| `app/` | Routing, App-Shell, QueryClient | nein |
| `auth/` | Auth-Adapter, Kontext, Route-Guard | nein |
| `features/` | Fachliche Seiten und Feature-Komponenten | `features/resources/**` ja |
| `components/` | Wiederverwendbare UI-Bausteine (`components/ui`, Layout, Charts) | nein |
| `hooks/` | React-Hooks (Live-KPI, TanStack-Query-Wrapper) | nein |
| `services/` | Datenzugriff, Persistenz, Import, Live-KPI | `services/data/**` ja |
| `simulation/` | Simulations-Engine | **ja, vollständig** |
| `store/` | Zustand-Store (Slices + Selektor-Hooks) | nein |
| `domain/` | Statische Fach-/Präsentationsdaten | nein |
| `types/` | Typdefinitionen des Datenmodells | **ja** |
| `lib/` | Kleinstutilities (`cn`) | nein |
| `styles/` | Design-Tokens, globales CSS | nein |

Schutzbereiche nach `CLAUDE.md` §6 — ohne ausdrücklichen Auftrag nicht ändern.
`src/context/` existiert im aktuellen Stand **nicht**; App-State liegt in
`src/store/` (Zustand) und `src/auth/AuthContext.tsx`. `CLAUDE.md` §6 führt
`src/context/**` weiterhin als Schutzbereich auf — der Pfad ist derzeit leer,
die Regel bleibt für den Fall der Wiedereinführung bestehen.

---

## 3. `src/types` — Datenmodell

Rein deklarativ, keine Laufzeitlogik. Schutzbereich.

| Datei | Exporte |
|---|---|
| `crm.ts` | `LeadStatus`, `Company`, `Contact`, `ImportedFunnelDeal`, `Lead`, `Opportunity`, `Deal`, `Activity`, `CRMStatusHistory`, `ImportAuditSummary` |
| `simulation.ts` | `SimulationSpeed`, `LeadStatus`, `OpportunityStage`, `SimulationMetrics`, `SimulationState`, `SimulationLead`, `SimulationOpportunity`, `SimulationDeal`, `SimulationActivity`, `SimulationEventType`, `SimulationEvent` |
| `scenario.ts` | `ScenarioParameters`, `ScenarioStatus`, `Scenario`, `ScenarioVersion`, `RunStatus`, `RunManifest`, `SimulationRun`, `RunOptions`, `ScenarioError`, `ParameterDiffItem`, `KPIComparisonItem`, `VersionComparisonResult`, `TradeOffDimension`, `ParameterMatrixRow`, `KpiMatrixValue`, `KpiMatrixRow`, `TradeOffVersionEvaluation`, `TradeOffEvaluation`, `KeyDifferenceItem`, `MultiVersionComparisonResult` |
| `snapshot.ts` | `AnalyticsProjection`, `SimulationSnapshot`, `SnapshotPersistenceRecord`, `PersistenceErrorCode`, `SnapshotError` |
| `aggregation.ts` | `MetricStats`, `TimeSeriesPoint`, `SimulationRunResult`, `AggregatedMetrics`, `ScenarioAggregationResult`, `AggregationErrorCode`, `AggregationError` |
| `kpi.ts` | `KPIDirection`, `KPICategory`, `KPIDefinition`, `GoalTarget`, `GoalTargetStatus`, `GoalTargetEvaluationResult`, `BaselineComparisonMode`, `BaselineComparisonResult` |
| `liveKpi.ts` | `LIVE_KPI_CONTRACT_VERSION`, `LIVE_KPI_PROVENANCE`, `LiveKpiContractVersion`, `LiveKpiProvenance`, `LiveKpiQualityStatus`, `LiveKpiErrorCode`, `LiveKpiEvent`, `LiveKpiIngestStatus`, `LiveKpiIngestResult` |
| `measure.ts` | `MeasureParameterKey`, `MEASURE_PARAMETER_KEYS`, `MeasureChangeMode`, `MeasureChange`, `Measure`, `MeasureConflict`, `MeasureKpiDelta`, `MeasureError` |
| `parameter.ts` | `ParameterType`, `ChannelMix`, `ParameterDefinition`, `PreflightIssue`, `PreflightResult` |
| `salesQueue.ts` | `SalesQueueStatus`, `SalesQueueEntry`, `SalesQueueProjection`, `SalesQueueMetrics` |
| `csQueue.ts` | `CSQueueStatus`, `ChurnCause`, `CustomerHealthFactors`, `CustomerHealthMetrics`, `CSQueueEntry`, `CSQueueProjection`, `CSQueueMetrics` |
| `stateMachine.ts` | `EntityType`, `RejectedTransitionEntry`, `InvariantViolationReport`, `StateTransitionResult` |
| `workerMessages.ts` | `WORKER_PROTOCOL_VERSION`, `WorkerCommandType`, `WorkerEventType`, `WorkerState`, `WorkerCommandPayload`, `WorkerErrorPayload`, `WorkerEventPayload`, `WorkerMessageCommand`, `WorkerMessageEvent` |
| `dataSource.ts` | `HistoricalActivity`, `CrmReadModel`, `DataSourceInfo`, `DataSource`, `LiveDelta`, `Unsubscribe`, `LiveFeed`, `DataSourceError` |
| `financial.ts` | `FinancialMetrics` |
| `resource.ts` | `ResourceType`, `ResourceCategory`, `ResourceMetadata` |
| `dashboard.ts` | `NavSubItem`, `NavCategory`, `StatItem` |

---

## 4. `src/services` — Datenzugriff und Infrastruktur

### 4.1 `services/data` — DataSource-Abstraktion (Schutzbereich)

Sammelbarrel: `services/data/index.ts`.

| Modul | Exporte | Zweck |
|---|---|---|
| `dataSourceRegistry.ts` | `dataSourceRegistry` | Registry der verfügbaren Quellen |
| `sources/simulatedCrmSource.ts` | `simulatedCrmSource` | Rein simulierte Quelle |
| `sources/baselineFileSource.ts` | `makeBaselineFileSource`, `listBaselineFileVersions` | Baseline aus Datei |
| `sources/hubSpotBaselineSource.ts` | `makeHubSpotBaselineSource`, `listHubSpotBaselineVersions` | HubSpot-Baseline (Gate G4) |
| `baselineSnapshotService.ts` | `BaselineDataset`, `BaselineSnapshotService` | Baseline erfassen/prüfen |
| `runSourceAudit.ts` | `RunSourceAuditInfo`, `resolveRunSourceAudit` | Herkunftsnachweis je Run |

Vertrag der Quellen: `DataSource` / `LiveFeed` / `CrmReadModel` aus `types/dataSource.ts`.

### 4.2 `services/db` — Persistenz

| Modul | Exporte |
|---|---|
| `ISnapshotRepository.ts` | `ISnapshotRepository` (Port) |
| `indexedDbSnapshotRepository.ts` | `IndexedDbSnapshotRepository`, `InMemorySnapshotRepository`, `createSnapshotRepository` |
| `snapshotMapper.ts` | `SnapshotMapper` |
| `crmRepository.ts` | `CRMRepository` |
| `supabaseClient.ts` | `isSupabaseConfigured`, `supabase` |

`createSnapshotRepository` ist der Einstiegspunkt: IndexedDB im Browser,
In-Memory im Test. Die Schreibpfade von `crmRepository.ts` stehen nach
`CLAUDE.md` §6 unter Schutz.

### 4.3 `services/liveKpi` — Live-KPI-Pfad

| Modul | Exporte |
|---|---|
| `liveKpiDefinitions.ts` | `LiveKpiFormat`, `LiveKpiGroup`, `LiveKpiDefinition`, `LIVE_KPI_DEFINITIONS`, `LiveKpiId`, `LIVE_KPI_IDS`, `isSupportedLiveKpiId`, `getLiveKpiDefinition` |
| `liveKpiContract.ts` | `IDENTIFIER_REGEX`, `ISO_8601_REGEX`, `LiveKpiValidationSuccess`, `LiveKpiValidationFailure`, `LiveKpiValidationResult`, `buildIdempotencyKey`, `validateLiveKpiEvent` |
| `liveKpiReadAdapter.ts` | `LiveKpiReadStatus`, `LiveKpiSnapshot`, `LiveKpiSubscription`, `LiveKpiFeedConnectionState`, `computeBackoffDelay`, `isLiveKpiReadConfigured`, `fetchLatestLiveKpi`, `fetchLiveKpiHistory`, `subscribeToLiveKpiFeed` |
| `liveKpiStreamStore.ts` | `LiveKpiStreamState`, `LiveKpiStreamStore`, `LiveKpiStreamAdapter`, `RETENTION_MS`, `createLiveKpiStreamStore`, `liveKpiStreamStore` |

Fluss: Supabase-Realtime → `subscribeToLiveKpiFeed` → `validateLiveKpiEvent`
(Contract-Gate, Idempotenzschlüssel) → `liveKpiStreamStore` (Retention
`RETENTION_MS`) → Hooks in [Abschnitt 6](#6-srchooks--react-hooks).

### 4.4 `services/import` — CSV-Import und Seeding

| Modul | Exporte |
|---|---|
| `crmImporter.ts` | `CrmImportResult`, `parseCsv`, `importCrmData` |
| `crmSeeder.ts` | `SeedResult`, `seedSupabaseDatabase` |
| `rawCsvData.ts` | `RAW_COMPANIES_CSV`, `RAW_CONTACTS_CSV`, `RAW_DEALS_CSV` |

### 4.5 Sonstige

| Modul | Exporte |
|---|---|
| `services/query/queryKeys.ts` | `crmKeys` (TanStack-Query-Schlüssel) |
| `services/logger.ts` | `logger` |

---

## 5. `src/simulation` — Engine (vollständiger Schutzbereich)

Ohne dafür geschriebenen Auftrag nicht ändern. Vor jedem Commit muss
`git diff <baseline> -- src/simulation` leer sein.

### 5.1 Orchestrierung

| Modul | Exporte |
|---|---|
| `ISimulationService.ts` | `ISimulationService` (Port) |
| `simulationService.ts` | `SimulationService`, `simulationService` |
| `scenarioService.ts` | `RunExecutionResult`, `ScenarioService`, `scenarioService` |
| `scenarioRepository.ts` | `DEFAULT_BASE_2026_PARAMETERS`, `DEFAULT_BASE_2026_SCENARIO_ID`, `DEFAULT_BASE_2026_VERSION_ID`, `IScenarioRepository`, `ScenarioRepository`, `scenarioRepository` |
| `systemContext.ts` | `SystemContext`, `systemContext` |

### 5.2 Tick-Kette

| Modul | Exporte |
|---|---|
| `engine.ts` | `TickInput`, `TickOutput`, `SimulationEngine` |
| `eventRules.ts` | `TICKS_PER_DAY`, `SimulationClock`, `formatSimulatedDate`, `SimulationClockContext`, `SimulationEventRules` |
| `stateMachineEvaluator.ts` | `ClockContext`, `StateMachineEvaluator` |
| `tickInvariantValidator.ts` | `TickInvariantValidator` |
| `salesQueueManager.ts` | `SalesQueueManager` |
| `csQueueManager.ts` | `CSQueueManager` |
| `aiDecisionMaker.ts` | `AIDecision`, `AIDecisionMaker` |
| `prng.ts` | `DeterministicRNG` |
| `constants.ts` | `BASELINE_PERIOD_START` |

`DeterministicRNG` und das Seed-Verhalten sind eigens geschützt — Determinismus
ist Voraussetzung der Golden-Run-Tests.

### 5.3 Parameter, KPI, Finanzen

| Modul | Exporte |
|---|---|
| `parameterRegistry.ts` | `V1_PARAMETER_DEFINITIONS`, `ParameterRegistry`, `parameterRegistry` |
| `effectiveParameterResolver.ts` | `EffectiveParameterResolver` |
| `preflightValidator.ts` | `PreflightValidator` |
| `kpiRegistry.ts` | `KPIRegistry` |
| `goalTargetEvaluator.ts` | `GoalTargetEvaluator` |
| `financialModelManager.ts` | `FinancialCalculationParams`, `FinancialModelManager` |
| `monteCarloAggregator.ts` | `MonteCarloAggregator` |
| `managementPresenter.ts` | `ManagementViewData`, `ManagementPresenter` |

### 5.4 Snapshots

| Modul | Exporte |
|---|---|
| `snapshotIntegrityService.ts` | `SnapshotIntegrityService` |
| `snapshotPruningManager.ts` | `PruneSummary`, `SnapshotPruningManager` |

### 5.5 Worker

| Modul | Exporte |
|---|---|
| `worker/simulation.worker.ts` | `workerRunner` |
| `worker/workerAdapter.ts` | `ISimulationWorkerAdapter`, `BrowserWorkerAdapter`, `HeadlessTestWorkerAdapter`, `createWorkerAdapter` |

Protokoll zwischen Haupt-Thread und Worker: `types/workerMessages.ts`, versioniert
über `WORKER_PROTOCOL_VERSION`. `createWorkerAdapter` wählt Browser- oder
Headless-Adapter; letzterer trägt die Integrity-Suiten ohne echten Worker.

---

## 6. `src/hooks` — React-Hooks

| Hook | Exporte | Quelle |
|---|---|---|
| `useLiveKpi.ts` | `UseLiveKpiResult`, `useLiveKpi` | Live-KPI-Store |
| `useLiveKpiHistory.ts` | `UseLiveKpiHistoryResult`, `useLiveKpiHistory` | Live-KPI-Historie |
| `useLiveKpiActivity.ts` | `LiveKpiActivityItem`, `UseLiveKpiActivityResult`, `useLiveKpiActivity` | Live-KPI-Aktivität |
| `queries/useCrmQueries.ts` | `useCrmCompanies`, `useCrmContacts`, `useCrmDeals`, `useCrmAuditSummary` | TanStack Query |
| `queries/useCrmSync.ts` | `CrmSyncStatus`, `useCrmSyncStatus`, `useSeedDatabaseMutation` | TanStack Query |
| `queries/usePipelineOverview.ts` | `usePipelineOverview` | TanStack Query |
| `useReducedMotion.ts` | `useReducedMotion` | Media-Query |

---

## 7. `src/store` — Zustand-Store

`store/simulationStore.ts` exportiert `SimulationStoreState` und
`useSimulationStore`, zusammengesetzt aus drei Slices:

| Slice | Exporte |
|---|---|
| `slices/simulationSlice.ts` | `SimulationSlice`, `createSimulationSlice` |
| `slices/scenarioSlice.ts` | `ScenarioSlice`, `createScenarioSlice` |
| `slices/runSlice.ts` | `RunSlice`, `createRunSlice` |

**Komponenten greifen nicht direkt auf den Store zu**, sondern über die
Selektor-Hooks in `store/hooks.ts`:

`useSimulationState`, `useSimulationLeads`, `useSimulationOpportunities`,
`useSimulationDeals`, `useSimulationActivities`, `useSimulationEvents`,
`useSimulationControls`, `useScenarios`, `useActiveScenarioId`,
`useActiveScenario`, `useActiveVersionId`, `useScenarioVersions`,
`useActiveVersion`, `useScenarioActions`, `useDraftMeasures`,
`useMeasureActions`, `useRuns`, `useAggregation`, `useWorkerProgress`,
`useRunActions`.

---

## 8. `src/app` und `src/auth`

### App-Shell

| Modul | Exporte |
|---|---|
| `App.tsx` | `App`, `default` |
| `routes.tsx` | `AppRouteMeta`, `APP_ROUTES`, `AppRouteId`, `routeForViewId`, `routeForPathname` |
| `routePages.tsx` | `RoutePageEntry`, `ROUTE_PAGE_ENTRIES`, `ROUTE_PAGES` |
| `LegacyRouteView.tsx` | `LegacyRouteViewProps`, `LegacyRouteView` |
| `queryClient.ts` | `queryClient` |
| `DesignSystemPage.tsx` | `DesignSystemPage` |
| `NotFoundPage.tsx` | `NotFoundPage` |

`APP_ROUTES` ist die Registry aller Routen; `ROUTE_PAGES` bildet Route-Id auf
Komponente ab. Neue Seiten werden an diesen beiden Stellen registriert, nicht
verstreut im Router.

### Auth

| Modul | Exporte |
|---|---|
| `authAdapter.ts` | `User`, `AuthAdapter` (Port) |
| `localAuthAdapter.ts` | `AUTH_STORAGE_KEY`, `LocalAuthAdapter`, `defaultAuthAdapter` |
| `AuthContext.tsx` | `AuthContextValue`, `AuthProviderProps`, `AuthContext`, `AuthProvider`, `useAuth` |
| `ProtectedRoute.tsx` | `ProtectedRouteProps`, `ProtectedRoute` |

App-seitige Schicht gegen `AuthAdapter`. Rollen-Differenzierung und echte
Backend-Absicherung sind nach `docs/auftraege/ANTIGRAVITY_AUFTRAG_060_*`
ausdrücklich **nicht** Teil dieser Schicht.

---

## 9. Externe Systeme

| System | Anbindung | Konfiguration |
|---|---|---|
| Supabase (Postgres) | `services/db/supabaseClient.ts`, `crmRepository.ts` | `.env` (Vorlage: `.env.example`) |
| Supabase Realtime | `services/liveKpi/liveKpiReadAdapter.ts` | `isLiveKpiReadConfigured()` |
| IndexedDB | `services/db/indexedDbSnapshotRepository.ts` | Browser |
| HubSpot über n8n | `services/data/sources/hubSpotBaselineSource.ts`, `tools/n8n/` | Baseline-Dateien |

Schema: `supabase/schema.sql`. Secrets gehören nie ins Repo (`CLAUDE.md` §9).

---

## 10. Verifikation

| Befehl | Bedeutung |
|---|---|
| `npx tsc --noEmit` | muss 0 Fehler liefern |
| `npm run verify` | Integrity-Suiten aus `scripts/verifyIntegrity.ts` |
| `npm test` | Vitest |
| `npm run build` | Produktions-Build |
| `npm run lint` | ESLint, `--max-warnings 0` |
| `npm run format:check` | Prettier |

Vollständige Pflichtreihenfolge und Screenshot-Auflagen: `CLAUDE.md` §7.

---

## 11. Bekannte Ausnahmen

`max-lines` (400) wird von vier Altdateien überschritten. Nach Gate G43 /
`ANTIGRAVITY_AUFTRAG_065_MAX_LINES_AUSNAHME_UND_RATCHET.md` ist das eine
**dauerhaft akzeptierte Ausnahme**, mechanisch geratscht über
`MAX_LINES_BASELINE=4`, ausdrücklich statt eines risikobehafteten Refactorings
der geschützten Kernbereiche. Die Zahl darf steigen — dann schlägt CI an — aber
nicht ohne Auftrag durch ein Refactoring gesenkt werden.

`TSC_BASELINE=0` in `.github/workflows/ci.yml`: jede neue TypeScript-Regression
blockiert sofort.

---

## 12. Pflege

Diese Datei beschreibt die Oberfläche, nicht die Implementierung. Sie ist zu
aktualisieren, wenn ein Modul hinzukommt, entfällt oder seine Exporte ändert —
im selben Auftrag, der die Änderung vornimmt, und mit Vermerk im
Gate-Abschlussbericht in `docs/BUILD_LOG.md`.
