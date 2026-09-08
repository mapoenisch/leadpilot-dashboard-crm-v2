# Antigravity – Auftrag 005
## Multi-Run / Monte-Carlo Aggregation

### Verbindliche Grundlagen
Vor Beginn vollständig lesen:
- `ARCHITECTURE_DECISIONS.md`
- `LEADPILOT_GAP_ANALYSIS.md`
- `ANTIGRAVITY_AUFTRAG_001_SIMULATION.md`
- `ANTIGRAVITY_AUFTRAG_002_SZENARIO_RUN.md`
- `ANTIGRAVITY_AUFTRAG_003_PARAMETER_REGISTRY.md`
- `ANTIGRAVITY_AUFTRAG_004_WEB_WORKER.md`

Auftrag 001–004 sind abgeschlossen.

Die Architektur legt fest:
- maximal 10 Ergebnisläufe pro Szenario
- Monte-Carlo-Run-Anzahl ist kein normaler Nutzerhebel
- Median ist Hauptprognose
- P10–P90 ist Standardunsicherheitskorridor
- Ausreißer werden nicht automatisch entfernt
- Einzelruns bleiben untersuchbar und reproduzierbar
- große Rohdaten werden nur bei Bedarf geladen
- Performanceoptimierung darf statistische Qualität/Reproduzierbarkeit nicht reduzieren. fileciteturn31file1turn31file2

## 1. Ziel

Eine eigenständige fachliche Multi-Run-/Monte-Carlo-Aggregationsschicht berechnet aus abgeschlossenen SimulationRuns statistisch belastbare Ergebnisse.

```text
ScenarioVersion
      │
      ├── Run 1 ──► Result
      ├── Run 2 ──► Result
      └── Run N ──► Result
                    │
                    ▼
              Aggregation
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
      Median       P10         P90
        ├── Mean
        ├── StdDev
        ├── Min
        └── Max
```

Die Aggregation ist keine zweite Simulation Engine.

## 2. Vor Änderungen

Untersuche zuerst:
- bestehende Run-/Result-/Metrics-Typen
- `scenario.ts`, `simulation.ts`
- `scenarioService.ts`, `scenarioRepository.ts`
- `engine.ts`
- Worker-Implementierung
- bestehende KPI-/Metrics-Logik
- vorhandene Statistikfunktionen

Suche nach:
`SimulationRun`, `RunManifest`, `Metrics`, `ARR`, `MRR`, `customers`, `dealsWon`, `aggregation`, `median`, `percentile`, `monte`, `runCount`.

Bestehende Definitionen konsolidieren, keine parallele KPI-Welt erzeugen.

## 3. Fachliche Trennung

```text
Simulation
  ↓
einzelner Run
  ↓
Run Result
  ↓
Aggregation
  ↓
Scenario Result
```

Einzelruns werden nicht überschrieben.

## 4. Run Result

Definiere bzw. konsolidiere einen klaren Ergebnisdatentyp für einen abgeschlossenen Run.

Mindestens:
- ARR
- MRR
- Kunden
- gewonnene Deals

Weitere bereits vorhandene fachlich relevante Metrics nicht unnötig entfernen.

Jeder Result-Datensatz ist eindeutig einem `runId` zugeordnet.

## 5. Aggregation Input

Nur gültige abgeschlossene Ergebnisse:

```text
COMPLETED → aggregieren
CANCELLED → nicht aggregieren
FAILED    → nicht aggregieren
RUNNING   → nicht aggregieren
```

Keine Simulation darf durch die Aggregation fortgesetzt werden.

## 6. ScenarioVersion-Zugehörigkeit

Nur Runs derselben fachlichen Vergleichsgruppe gemeinsam aggregieren.

Primär:
`scenarioVersionId`

Zusätzlich müssen Model-, Schema- und Baseline-Version kompatibel sein.

Inkompatible Runs nicht stillschweigend mischen; strukturierten Fehler liefern.

## 7. Statistische Kennzahlen

Für jede aggregierte V1-KPI berechnen:
- Median
- P10
- P90
- Mean
- Standardabweichung
- Minimum
- Maximum
- Anzahl gültiger Runs

Median ist Hauptprognose; P10–P90 Standardunsicherheitskorridor. fileciteturn31file1

## 8. Quantildefinition

Die Quantil-/Perzentilberechnung muss explizit und deterministisch definiert werden.

Dokumentiere:
- Sortierreihenfolge
- Quantildefinition
- Interpolation
- Verhalten bei 1 Run
- Verhalten bei 2 Runs
- Verhalten bei identischen Werten

Nicht ungeprüft eine Bibliothekskonvention übernehmen.

## 9. Ausreißer

Keine automatische Ausreißerentfernung:
- keine Winsorization
- kein Clipping
- kein automatisches Entfernen extremer Runs

Alle gültigen abgeschlossenen Runs gehen in die Basisaggregation ein.

## 10. Determinismus

Identische Run Results müssen unabhängig von Eingangsreihenfolge identische Aggregation liefern.

Die Aggregation verwendet:
- keinen RNG
- keine Wall Clock
- keinen globalen mutable State
- keine zufällige Reihenfolge

## 11. Input-Immutability

Aggregation darf nicht verändern:
- runId
- seed
- manifest
- state
- metrics
- status

Sie erzeugt ein separates Ergebnisobjekt.

## 12. ScenarioAggregationResult

Mindestens:

```text
scenarioId
scenarioVersionId
runCount
validRunCount

metrics:
  ARR:
    median
    p10
    p90
    mean
    stdDev
    min
    max
  MRR: ...
  customers: ...
  wonDeals: ...

aggregatedAt  // technische Metadaten
```

`aggregatedAt` darf nicht in die Simulation eingehen.

## 13. Unvollständige Aggregationen

Beispiel:

```text
10 geplant
7 completed
2 running
1 cancelled
```

Dann:
`validRunCount = 7`

Die Aggregation darf nur die 7 gültigen Ergebnisse verwenden und darf nicht den Eindruck einer vollständigen 10-Run-Prognose erzeugen.

## 14. Managementdarstellung

Die Aggregationsschicht liefert Rohstatistiken.

Spätere UI kann darstellen:

```text
P10 ───────── Median ───────── P90
```

Keine Managementtexte oder fachlichen Interpretationen in dieser Schicht erfinden.

## 15. Einzelruns

Einzelruns bleiben über `runId` auffindbar und reproduzierbar.

Aggregation ersetzt niemals die Roh-/Einzelergebnisse.

## 16. Run Count

Run Count ist kein neuer Nutzerhebel und kein Parameter-Registry-Eintrag.

Keine Änderung der sieben V1-Steuerungsparameter.

Eine technische Run-Anzahl darf als Ausführungsoption behandelt werden, sofern die bestehende Architektur dadurch nicht verletzt wird.

## 17. Performance

Keine unnötigen Deep Copies großer Simulation States.

Für Statistik möglichst nur benötigte Ergebniswerte verarbeiten.

Große Rohdaten nur bei Bedarf laden.

Keine unnötige UI-Thread-Blockierung.

## 18. Worker-Kompatibilität

Die Aggregationslogik soll später mit der bestehenden Worker-Architektur kombinierbar sein.

Keine neue Worker-Architektur bauen.

## 19. Keine Persistenz

NICHT implementieren:
- IndexedDB
- Snapshot Store
- Supabase
- Cloud-Persistenz
- Offline-Sync

Die Aggregation arbeitet zunächst auf übergebenen Run Results/In-Memory-Abstraktionen.

## 20. Tests

### Test A – Single Run
Ein Run: `median = p10 = p90 = mean = min = max = value`, `stdDev = 0`.

### Test B – Median
Mehrere Runs liefern den korrekt definierten Median.

### Test C – P10/P90
P10/P90 nach der dokumentierten Quantildefinition.

### Test D – Mean/StdDev
Korrekt und deterministisch.

### Test E – Min/Max
Korrekte Extremwerte.

### Test F – Outlier Preservation
Extreme gültige Runs bleiben enthalten.

### Test G – Run Filtering
Nur `COMPLETED` wird aggregiert.

### Test H – ScenarioVersion Isolation
Unterschiedliche Versionen werden nicht vermischt.

### Test I – Model/Baseline Compatibility
Inkompatible Versionen werden strukturiert behandelt.

### Test J – Order Independence
Andere Eingangsreihenfolge → identisches Ergebnis.

### Test K – Input Immutability
Keine Mutation von Run/Manifest.

### Test L – Determinism
Identischer Input → byte-identisches Ergebnis.

### Test M – Partial Run Set
7/10 completed → `validRunCount = 7`.

### Test N – Existing Integrity
Alle Tests 001–004 bleiben grün.

## 21. Verifikation

```text
npx tsc --noEmit
npm run build
npx tsx scripts/verifyIntegrity.ts
```

Alle bisherigen Integrity Suites müssen weiterhin erfolgreich sein.

## 22. Abschlusskriterien

- [ ] eigenständige Aggregationsschicht
- [ ] klares Run-Result-Modell
- [ ] nur gültige completed Runs
- [ ] ScenarioVersion-Isolation
- [ ] Model/Schema/Baseline-Kompatibilität
- [ ] Median
- [ ] P10/P90
- [ ] Mean/StdDev
- [ ] Min/Max
- [ ] keine automatische Ausreißerentfernung
- [ ] deterministisch
- [ ] Inputs unverändert
- [ ] Einzelruns erhalten
- [ ] Partial Runs korrekt
- [ ] keine zweite Simulation Engine
- [ ] keine Persistenz
- [ ] Tests A–N grün
- [ ] Tests 001–004 grün
- [ ] TypeScript grün
- [ ] Build grün
- [ ] Integrity Suite grün

## 23. Nicht eigenmächtig fortsetzen

Nach diesem Auftrag nicht automatisch implementieren:
- IndexedDB
- Snapshot Store
- neue UI
- weitere Statistikmodelle
- automatische Ausreißeranalyse
- neue Monte-Carlo-Parameter
- neue Simulationslogik

Zuerst Abschlussbericht liefern, danach erfolgt das Audit.

## 24. Abschlussbericht

Berichten:
1. neue/geänderte Dateien
2. Aggregationsmodell
3. Run-Result-Modell
4. Quantildefinition
5. Median/P10/P90/Mean/StdDev/Min/Max
6. Behandlung unvollständiger Runs
7. ScenarioVersion-/Modellkompatibilität
8. Determinismus
9. Input-Immutability
10. Tests A–N
11. TypeScript
12. Build
13. Integrity Suite
14. verbleibende Architektur-Gaps
