# CONTEXT.md — Domänenmodell und Orientierung

> Einstiegsdokument: **Was** ist dieses Projekt fachlich, **welche Begriffe**
> gelten, **wie** fließen Daten. Stand: v2.2.0, Commit `9380ace`.
>
> Abgrenzung zu den Nachbardateien:
>
> | Datei | Frage |
> |---|---|
> | `CLAUDE.md` | Welche **Regeln** gelten beim Arbeiten? (verbindlich) |
> | `AGENTS.md` | Kurzfassung derselben Regeln für alle Agenten |
> | `API.md` | **Wo** liegt welches Modul, was exportiert es? |
> | **`CONTEXT.md`** | **Was** bedeuten die Begriffe, wie hängt die Fachlichkeit zusammen? |
> | `ARCHITECTURE_DECISIONS.md` | **Warum** ist es so? (Entscheidungs-SSoT) |
> | `BUILD_PLAN.md` | **Was kommt als Nächstes?** |
> | `docs/BUILD_LOG.md` | **Was ist passiert?** (Ledger) |
>
> Bei Widersprüchen gelten `CLAUDE.md` und `ARCHITECTURE_DECISIONS.md`, nicht
> diese Datei.

---

## 1. Worum es geht

LeadPilot Dashboard-CRM ist ein Echtzeit-Dashboard für das **fiktive**
Unternehmen LeadPilot. Es verbindet zwei Dinge, die in echten CRM-Produkten
getrennt sind:

1. **CRM-Sicht** — Firmen, Kontakte, Leads, Opportunities, Deals, Aktivitäten,
   gespeist aus einer realen Datenquelle (Supabase, HubSpot-Baseline über n8n)
   oder aus simulierten Daten.
2. **Simulationssicht** — eine deterministische Engine, die
   Geschäftsentwicklung über simulierte Zeit fortschreibt, damit Szenarien
   („was passiert, wenn wir Parameter X ändern?") vergleichbar werden.

Reifer Stand. Es wird verbessert und erweitert, nicht neu gebaut.

**Stack:** React 18, TypeScript, Vite, Tailwind, Radix, Recharts,
TanStack Query, Zustand, Framer Motion, Supabase.

---

## 2. Die zwei Zeitachsen

Der häufigste Verständnisfehler in diesem Projekt: *reale Zeit* und
*simulierte Zeit* zu verwechseln.

| | Reale Zeit | Simulierte Zeit |
|---|---|---|
| Treiber | Supabase Realtime, Nutzeraktionen | `SimulationClock`, Ticks |
| Einheit | Wanduhr / ISO-Zeitstempel | Tick, `TICKS_PER_DAY` |
| Sichtbar in | Live-KPI-Kacheln, CRM-Listen | Szenario-Läufe, Zeitreihen, Vergleiche |
| Code | `services/liveKpi/**`, `hooks/useLiveKpi*` | `simulation/**` |
| Determinismus | nein | **ja, zwingend** |

Beide Achsen zeigen KPIs, aber es sind verschiedene KPI-Begriffe — siehe
[KPI](#kpi) und [Live-KPI](#live-kpi) im Glossar.

---

## 3. Glossar

Jeder Eintrag nennt die Datei, in der der Begriff definiert ist. Die Typdatei
ist maßgeblich; steht hier etwas anders als im Typ, gilt der Typ.

### CRM-Begriffe

Definiert in `src/types/crm.ts`.

- **Company** — Firma. Oberste Entität der CRM-Hierarchie.
- **Contact** — Ansprechperson, gehört zu einer Company.
- **Lead** — noch nicht qualifizierte Verkaufschance. Trägt `LeadStatus`.
- **Opportunity** — qualifizierte Verkaufschance. Trägt `OpportunityStage`
  (definiert in `types/simulation.ts`).
- **Deal** — Abschluss. `ImportedFunnelDeal` ist die importierte Variante aus
  der externen Quelle, abgegrenzt vom simulierten `SimulationDeal`.
- **Activity** — Interaktion an einer der obigen Entitäten.
- **CRMStatusHistory** — Historie der Statusübergänge; Grundlage für
  Funnel-Auswertungen.
- **ImportAuditSummary** — Ergebnisbericht eines Imports: was kam an, was wurde
  verworfen.

Der Funnel läuft **Lead → Opportunity → Deal**. Die simulierten Gegenstücke
heißen `SimulationLead`, `SimulationOpportunity`, `SimulationDeal`
(`types/simulation.ts`) und sind bewusst eigene Typen — sie leben auf der
simulierten Zeitachse.

### Simulationsbegriffe

- **Tick** — kleinste Zeiteinheit der Simulation. `TICKS_PER_DAY` in
  `simulation/eventRules.ts` legt die Auflösung fest.
- **SimulationClock** — führt die simulierte Zeit; `formatSimulatedDate`
  erzeugt die Anzeige. Startpunkt: `BASELINE_PERIOD_START`
  (`simulation/constants.ts`).
- **SimulationEngine** — nimmt `TickInput`, liefert `TickOutput`
  (`simulation/engine.ts`). Der Kern der Fortschreibung.
- **SimulationEventRules** — Regelwerk, welche Ereignisse pro Tick eintreten.
- **StateMachineEvaluator** — bewertet erlaubte Statusübergänge der Entitäten;
  abgelehnte Übergänge landen als `RejectedTransitionEntry`
  (`types/stateMachine.ts`).
- **TickInvariantValidator** — prüft nach jedem Tick die Invarianten; Verstöße
  als `InvariantViolationReport`.
- **DeterministicRNG** (`simulation/prng.ts`) — geseedeter Zufall. **Kein
  `Math.random()` und kein `Date.now()` in der Tick-Kette.** Sonst brechen die
  Golden-Run-Tests, und Läufe sind nicht mehr reproduzierbar.
- **SalesQueue / CSQueue** — Arbeitsvorräte für Vertrieb bzw. Customer Success
  (`types/salesQueue.ts`, `types/csQueue.ts`), verwaltet von
  `SalesQueueManager` / `CSQueueManager`. Die CS-Seite trägt
  `CustomerHealthFactors` und `ChurnCause`.
- **AIDecisionMaker** — trifft im Lauf regelbasierte Entscheidungen
  (`AIDecision`); nicht zu verwechseln mit einem LLM.

### Szenario, Version, Lauf

Definiert in `src/types/scenario.ts`. Diese drei Ebenen werden oft verwechselt:

- **Scenario** — benannte Frage („aggressiver Vertrieb 2026"). Trägt
  `ScenarioStatus`.
- **ScenarioVersion** — konkrete Parameterbelegung innerhalb eines Szenarios.
  Vergleiche laufen zwischen *Versionen*, nicht zwischen Szenarien.
- **SimulationRun** — eine tatsächliche Ausführung einer Version. Trägt
  `RunStatus` und ein **`RunManifest`**: den Herkunftsnachweis (Seed,
  Datenquelle, Parameter), der einen Lauf reproduzierbar macht.
- **ScenarioParameters** — die Stellschrauben; Definitionen und Grenzen in
  `simulation/parameterRegistry.ts` (`V1_PARAMETER_DEFINITIONS`).
- **Ausgangspunkt:** `DEFAULT_BASE_2026_SCENARIO_ID` /
  `DEFAULT_BASE_2026_VERSION_ID` (`simulation/scenarioRepository.ts`).

**Vergleichsergebnisse:** `VersionComparisonResult` (zwei Versionen),
`MultiVersionComparisonResult` (mehrere), mit `ParameterDiffItem`,
`KPIComparisonItem`, `TradeOffEvaluation` und `KeyDifferenceItem` als Bausteine.

### Measure

`src/types/measure.ts`. Eine **Measure** ist eine geplante Maßnahme: ein
benanntes Bündel von Parameteränderungen (`MeasureChange`, `MeasureChangeMode`)
auf den erlaubten Schlüsseln `MEASURE_PARAMETER_KEYS`. Measures können in
Konflikt geraten (`MeasureConflict`) und tragen ihre KPI-Wirkung als
`MeasureKpiDelta`. Aufgelöst werden sie vom
`EffectiveParameterResolver` zur effektiven Parameterbelegung eines Laufs; der
`PreflightValidator` prüft vorab (`PreflightResult`, `PreflightIssue`).

Merksatz: *Parameter* ist der Wert, *Measure* ist die beabsichtigte Änderung
daran, *Version* ist das Ergebnis der Auflösung.

### KPI

`src/types/kpi.ts`, Registry in `simulation/kpiRegistry.ts`. Eine
`KPIDefinition` trägt `KPICategory` und `KPIDirection` (ist hoch gut oder
schlecht?). Ein **GoalTarget** ist ein Zielwert dazu; der
`GoalTargetEvaluator` liefert `GoalTargetStatus` /
`GoalTargetEvaluationResult`. Vergleiche gegen eine Baseline laufen über
`BaselineComparisonMode` / `BaselineComparisonResult`.

### Live-KPI

`src/types/liveKpi.ts` und `src/services/liveKpi/**`. Getrennt vom KPI-Begriff
der Simulation: ein **LiveKpiEvent** kommt über Supabase Realtime aus der realen
Welt.

- **Contract** — `LIVE_KPI_CONTRACT_VERSION` und `validateLiveKpiEvent`
  (`liveKpiContract.ts`) bilden das Eingangstor. Nur vertragskonforme Events
  gelangen in den Store.
- **Idempotenz** — `buildIdempotencyKey` verhindert Doppelzählung bei
  Wiederzustellung.
- **Provenance** — `LiveKpiProvenance` sagt, woher ein Wert stammt;
  `LiveKpiQualityStatus` sagt, wie belastbar er ist.
- **Retention** — `RETENTION_MS` im `liveKpiStreamStore` begrenzt die
  vorgehaltene Historie.
- **Backoff** — `computeBackoffDelay` steuert das Wiederverbinden.

### Snapshot und Aggregation

- **SimulationSnapshot** (`types/snapshot.ts`) — eingefrorener Zustand eines
  Laufs, persistiert als `SnapshotPersistenceRecord`, gemappt vom
  `SnapshotMapper`, geprüft vom `SnapshotIntegrityService`, beschnitten vom
  `SnapshotPruningManager` (`PruneSummary`).
- **AnalyticsProjection** — die für Auswertung aufbereitete Sicht auf einen
  Snapshot.
- **AggregatedMetrics / ScenarioAggregationResult** (`types/aggregation.ts`) —
  Ergebnis der Verdichtung über Läufe hinweg, mit `MetricStats` und
  `TimeSeriesPoint`.
- **MonteCarloAggregator** — verdichtet viele Läufe derselben Version zu einer
  Verteilung statt eines Einzelwerts.

### Datenquellen

`src/types/dataSource.ts`, Implementierungen in `src/services/data/`.

Eine **DataSource** liefert ein `CrmReadModel` und optional einen `LiveFeed`
(`LiveDelta`, `Unsubscribe`). Drei Ausprägungen:

| Quelle | Herkunft |
|---|---|
| `simulatedCrmSource` | vollständig simuliert |
| `baselineFileSource` | Baseline-Datei im Repo |
| `hubSpotBaselineSource` | HubSpot über n8n (Gate G4) |

Welche Quelle einen Lauf gespeist hat, hält `resolveRunSourceAudit`
(`RunSourceAuditInfo`) fest — zusammen mit dem `RunManifest` der Nachweis,
worauf ein Ergebnis beruht.

---

## 4. Datenflüsse

### Simulationslauf

```
ScenarioVersion + Measures
   └→ EffectiveParameterResolver → effektive Parameter
        └→ PreflightValidator (bricht bei PreflightIssue ab)
             └→ ScenarioService startet Run (seeded, RunManifest)
                  └→ WorkerAdapter → simulation.worker.ts
                       └→ SimulationEngine: Tick für Tick
                            ├→ SimulationEventRules
                            ├→ StateMachineEvaluator
                            ├→ SalesQueueManager / CSQueueManager
                            ├→ FinancialModelManager
                            └→ TickInvariantValidator
                  └→ Snapshot → SnapshotIntegrityService → Repository
                  └→ Aggregation → KPIRegistry → GoalTargetEvaluator
                       └→ Store (runSlice) → Selektor-Hooks → UI
```

Der Worker hält den Haupt-Thread frei. Protokoll: `types/workerMessages.ts`,
versioniert über `WORKER_PROTOCOL_VERSION`. Im Test tritt der
`HeadlessTestWorkerAdapter` an die Stelle des Browser-Workers.

### Live-KPI

```
Supabase Realtime
   └→ subscribeToLiveKpiFeed (Backoff bei Abriss)
        └→ validateLiveKpiEvent (Contract-Gate, Idempotenzschlüssel)
             └→ liveKpiStreamStore (Retention)
                  └→ useLiveKpi / useLiveKpiHistory / useLiveKpiActivity
                       └→ UI
```

Ungültige Events werden am Contract-Gate verworfen, nicht stillschweigend
durchgereicht.

### CRM-Lesepfad

```
Supabase ── crmRepository ── TanStack Query (crmKeys)
                                  └→ useCrmCompanies / useCrmContacts /
                                     useCrmDeals / useCrmAuditSummary → UI
```

Import/Seeding läuft getrennt über `crmImporter` / `crmSeeder`.

---

## 5. State — wer hält was

| Art des Zustands | Ort |
|---|---|
| Simulationszustand, Szenarien, Läufe | Zustand-Store (`src/store/`) |
| Servergestützte CRM-Daten | TanStack Query (`crmKeys`) |
| Live-KPI-Strom | `liveKpiStreamStore` |
| Angemeldete Person | `AuthContext` |
| Persistierte Snapshots | IndexedDB über `createSnapshotRepository` |

Regel: Komponenten lesen den Store **nur** über die Selektor-Hooks in
`store/hooks.ts`, nie direkt. Das hält Re-Render-Flächen klein — Hintergrund in
`docs/auftraege/ANTIGRAVITY_AUFTRAG_058_RENDERING_OPTIMIERUNG_KOMPONENTEN_SPLITTING.md`.

---

## 6. Was geschützt ist und warum

Vollständige Liste und Prüfbefehl: `CLAUDE.md` §6.

| Bereich | Grund |
|---|---|
| `src/simulation/**` | Determinismus. Jede Änderung kann Golden-Run-Tests und die Reproduzierbarkeit aller bisherigen Läufe brechen. |
| `src/types/**` | Datenmodell; Änderungen strahlen in jede Schicht aus. |
| `src/services/data/**` | Quellen-Abstraktion; Herkunftsnachweise hängen daran. |
| `src/features/resources/**` | Bewusst eingefroren. |
| RNG/Seed, Run-/Versionsmodell, Persistenz, `crmRepository`-Schreibpfade | Reproduzierbarkeit und Datenintegrität. |

Das ist keine Qualitätsaussage über den Code dort. Es heißt: Änderungen brauchen
einen dafür geschriebenen Auftrag, weil die Folgekosten eines Fehlers hoch sind.

Konkretes Beispiel: Die vier Dateien über 400 Zeilen liegen in diesen Bereichen.
Nach Gate G43 (`AUFTRAG_065`) ist die Größe eine **dauerhaft akzeptierte,
geratschte Ausnahme** — ausdrücklich gewählt statt eines risikobehafteten
Refactorings. Wer hier „aufräumen" will, arbeitet gegen eine getroffene
Entscheidung.

---

## 7. Arbeitsablauf in einem Satz

Antigravity baut nach Auftrag aus `docs/auftraege/` → Codex oder Claude Code
prüft (Review + Gates, baut nicht) → Befund in `docs/BUILD_LOG.md` → Antigravity
baut nach → bis alle Gates grün sind. Details: `CLAUDE.md` §4–§7.

---

## 8. Erster Tag im Projekt

1. `CLAUDE.md` vollständig — die Regeln sind verbindlich.
2. Diese Datei — Begriffe und Flüsse.
3. `API.md` — wo liegt was.
4. `BUILD_PLAN.md` §6 — wo stehen wir.
5. `docs/BUILD_LOG.md` von oben — die letzten drei Gates.
6. `ARCHITECTURE_DECISIONS.md` erst gezielt, wenn eine Warum-Frage auftaucht;
   die Datei ist groß und als Nachschlagewerk gedacht.

Dann: `npm install`, `npm run dev`, und `npm run verify` einmal grün gesehen
haben, bevor irgendetwas geändert wird.

---

## 9. Pflege

Neue Begriffe gehören hierher, sobald sie in mehr als einem Modul auftauchen.
Widerspricht ein Eintrag dem Code, gilt der Code — dann ist dieser Eintrag zu
korrigieren, nicht der Code. Begriffsänderungen laufen über denselben Auftrag,
der sie verursacht, mit Vermerk im Gate-Abschlussbericht.
