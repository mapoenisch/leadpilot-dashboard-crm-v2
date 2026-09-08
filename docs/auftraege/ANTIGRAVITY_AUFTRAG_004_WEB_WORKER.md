# Antigravity – Auftrag 004
## Web Worker Messaging-Protokoll & isolierte Hintergrund-Simulation

### Verbindliche Grundlagen

Vor Beginn lesen:

- `ARCHITECTURE_DECISIONS.md`
- `LEADPILOT_GAP_ANALYSIS.md`
- `ANTIGRAVITY_AUFTRAG_001_SIMULATION.md`
- `ANTIGRAVITY_AUFTRAG_002_SZENARIO_RUN.md`
- `ANTIGRAVITY_AUFTRAG_003_PARAMETER_REGISTRY.md`

Auftrag 001, 002 und 003 sind abgeschlossen.

Die Architektur legt für die Performance-/Monte-Carlo-Schicht fest:

- Simulation läuft in Batches.
- UI-Thread wird zwischen Batches entlastet.
- Web Worker wird verwendet.
- Worker besitzt einen klaren Input-/Output-Vertrag.
- Worker greift nicht direkt auf IndexedDB zu.
- Worker greift nicht auf React-State zu.
- Fortschritt basiert auf abgeschlossenen Runs.
- V1 zeigt keine vorläufigen KPI-Ergebnisse.
- Laufende Simulation kann abgebrochen werden.
- Cancellation wird zwischen Batches geprüft.
- Bereits berechnete Runs bleiben erhalten.
- Performanceoptimierung darf Genauigkeit und Reproduzierbarkeit nicht stillschweigend reduzieren. fileciteturn27file1

---

# Ziel

Die bestehende deterministische `SimulationEngine` soll über einen **klar definierten Web-Worker-Vertrag** im Hintergrund ausführbar werden.

Der Worker ist eine technische Ausführungsisolierung.

Er wird **keine eigene Simulationslogik** erhalten.

Zielarchitektur:

```text
React UI
   │
   ▼
SimulationService
   │
   │ Worker Command
   ▼
Web Worker
   │
   ▼
SimulationEngine.executeTick()
   │
   ├── DeterministicRNG
   └── EventRules
   │
   ▼
Worker Result
   │
   ▼
SimulationService
   │
   ▼
React UI
```

Der Worker darf weder React-State noch IndexedDB direkt kennen. Die Simulation selbst bleibt deterministisch und headless.

---

# 1. Vor Änderungen

Untersuche zuerst:

- `src/simulation/engine.ts`
- `src/simulation/simulationService.ts`
- `src/simulation/ISimulationService.ts`
- `src/simulation/prng.ts`
- `src/simulation/eventRules.ts`
- `src/simulation/scenarioService.ts`
- `src/types/scenario.ts`
- `src/types/simulation.ts`
- bestehende Tests
- Vite-/TypeScript-Konfiguration

Suche projektweit nach:

- `Worker`
- `postMessage`
- `onmessage`
- `SimulationService`
- `executeTick`
- `runScenarioVersion`
- `cancel`
- `pause`
- `resume`
- `speed`
- `setTimeout`

Keine parallele zweite Simulation Engine erzeugen.

---

# 2. Worker-Vertrag

Erstelle einen strikt typisierten Message-Vertrag.

Beispielsweise:

```text
WorkerCommand
├── START
├── PAUSE
├── RESUME
└── CANCEL
```

und:

```text
WorkerEvent
├── STARTED
├── PROGRESS
├── PAUSED
├── RESUMED
├── COMPLETED
├── CANCELLED
└── FAILED
```

Die konkreten Namen dürfen angepasst werden, wenn bestehende Konventionen besser passen.

Jede Nachricht muss eine eindeutige Korrelation ermöglichen.

Mindestens:

```text
runId
requestId / correlationId
```

verwenden, sofern technisch erforderlich.

---

# 3. START

`START` muss den vollständigen notwendigen Ausführungskontext enthalten.

Mindestens:

```text
runId
scenarioId
scenarioVersionId
RunManifest
initial simulation state
simulation configuration
```

Der Worker darf nicht selbst aus einem Repository laden.

Der Input muss alle Informationen enthalten, die für die deterministische Ausführung benötigt werden.

Keine versteckten globalen Inputs.

---

# 4. PAUSE

Bei `PAUSE`:

- keine neuen Simulationsticks starten
- bereits abgeschlossener Run/Batch bleibt erhalten
- Worker bleibt kontrolliert aktiv
- Zustand muss für `RESUME` erhalten bleiben

Pause darf nicht als Cancel behandelt werden.

---

# 5. RESUME

Bei `RESUME`:

- exakt mit dem pausierten Ausführungszustand fortsetzen
- keine neue Run-ID
- kein neuer Seed
- kein Zurücksetzen des RNG
- keine Neuerzeugung des RunManifest

Die Fortsetzung desselben Jobs behält seine `runId`.

---

# 6. CANCEL

Bei `CANCEL`:

- Worker beendet weitere Simulation
- bereits abgeschlossene Runs bleiben erhalten
- Status wird `CANCELLED`
- kein neues Ergebnis wird als vollständig abgeschlossen veröffentlicht

Cancellation soll zwischen Batches geprüft werden, nicht mitten in einer atomaren Tick-Operation.

---

# 7. Fortschritt

Der Worker sendet Fortschrittsmeldungen.

Fortschritt basiert auf:

```text
completedRuns / totalRuns
```

Nicht auf:

- verstrichener Zeit
- geschätzten Prozentwerten
- Anzahl erzeugter Events
- UI-Timer

Beispiel:

```text
6300 / 10000
```

V1 sendet keine vorläufigen KPI-Ergebnisse.

---

# 8. Batching

Die Simulation muss in Batches organisiert werden.

Nach jedem Batch:

1. abgeschlossene Runs zählen
2. Cancellation prüfen
3. Progress senden
4. dem Worker/Event Loop Gelegenheit zur Kommunikation geben
5. nächsten Batch ausführen

Die Batchgröße soll technisch konfigurierbar sein.

Sie ist **kein neuer Nutzerhebel**.

---

# 9. Determinismus

Der Worker darf die Reproduzierbarkeit nicht verändern.

Für identischen:

```text
RunManifest
+
initial State
+
Seed
+
RNG State
+
Model Version
+
Schema Version
+
Baseline Version
```

muss gelten:

```text
Main-thread execution
        =
Worker execution
```

Das Ergebnis muss fachlich identisch sein.

Keine Verwendung von:

- `Math.random()`
- `Date.now()` für fachliche Simulation
- `new Date()` für fachliche Simulation
- Worker-Zeitstempeln als Simulationszeit

Die technische Worker-Laufzeit darf nicht in das Simulationsergebnis eingehen.

---

# 10. Worker-Isolation

Der Worker darf NICHT:

- React importieren
- React Context verwenden
- auf Browser-DOM zugreifen
- auf IndexedDB zugreifen
- auf `window` zugreifen
- auf globale UI-Zustände zugreifen
- direkt `ScenarioRepository` verwenden
- direkt `SimulationService` verwenden

Der Worker erhält Daten über seinen Input-Vertrag.

Die Engine bleibt die einzige fachliche Simulation.

---

# 11. SimulationService

`SimulationService` bleibt die Application-/Orchestrierungsschicht.

Er übernimmt:

- Worker-Lifecycle
- Start/Pause/Resume/Cancel
- Message Routing
- Run-ID-Korrelation
- Progress-Weitergabe
- Fehler-Mapping
- Abschlusszustand

Er enthält keine neue Tick-Logik.

Ziel:

```text
SimulationService
    │
    ├── validates / prepares Run
    ├── creates Worker
    ├── sends commands
    ├── receives events
    └── exposes state to UI
```

---

# 12. Mehrere Runs / Monte-Carlo

Der Worker-Vertrag muss mehrere Runs unterstützen.

Jeder einzelne Run besitzt:

- eigene `runId`
- eigenen Seed
- eigenes RunManifest

Progress aggregiert über die abgeschlossenen Runs.

Beispiel:

```text
Run 1 ✓
Run 2 ✓
Run 3 ✓
Run 4 ...
```

Die bereits beschlossene Run-Semantik bleibt unverändert.

---

# 13. Fehler

Worker-Fehler müssen strukturiert zurückkommen.

Mindestens:

```text
errorId
runId
code
message
recoverable
```

Technische Details können zusätzlich übertragen werden.

Fehler dürfen historische Daten nicht verändern.

Ein fehlgeschlagener Run darf nicht als gültige Prognose veröffentlicht werden.

Der bestehende Fehler-/Fallback-Vertrag darf nicht umgangen werden. fileciteturn27file12

---

# 14. Message-Versionierung

Der Message-Vertrag muss eine Schema-/Protocol-Version besitzen.

Beispiel:

```text
protocolVersion: "1.0"
```

Damit spätere Worker-Versionen sauber erweitert werden können.

Unbekannte oder inkompatible Nachrichten werden strukturiert abgelehnt.

---

# 15. Worker-Lifecycle

Definiere klar:

```text
CREATED
  ↓
STARTING
  ↓
RUNNING
  ├── PAUSED
  │     ↓
  │   RUNNING
  │
  ├── CANCELLED
  │
  ├── FAILED
  │
  └── COMPLETED
```

Nach `COMPLETED`, `CANCELLED` oder `FAILED` darf der Worker nicht weiterlaufen.

Kein Worker-Leak.

---

# 16. Race Conditions

Berücksichtige insbesondere:

- CANCEL unmittelbar nach START
- PAUSE unmittelbar nach START
- RESUME nach CANCEL
- CANCEL während eines Batches
- doppelte CANCEL-Nachricht
- RESUME ohne vorherige PAUSE
- verspätete Worker-Messages
- Worker-Fehler während RUNNING

Ungültige Zustandsübergänge werden strukturiert behandelt.

Keine stillen Zustandskorruptionen.

---

# 17. UI-Kompatibilität

Die bestehende UI muss grundsätzlich weiter funktionieren:

- Start
- Pause
- Resume
- Cancel
- Speed 1x
- Speed 2x
- Speed 5x
- Speed 10x

Wichtig:

**Speed Controls verändern die fachliche Simulation nicht.**

Sie steuern ausschließlich die Ausführungs-/Playback-Geschwindigkeit.

Die Architektur sieht diese Steuerung bereits über `ISimulationService` vor. fileciteturn27file0

---

# 18. Keine IndexedDB

In diesem Auftrag ausdrücklich NICHT implementieren:

- IndexedDB
- Snapshot Store
- Persistenz der Worker-Rohdaten
- Supabase-Persistenz
- Background-Service außerhalb der laufenden Sitzung

Der Worker bleibt zunächst eine In-Memory-Ausführungsschicht.

Die Persistenz kommt in einem separaten Auftrag.

---

# 19. Tests

Implementiere mindestens:

### Test A – Worker Start

START erzeugt einen korrekten Worker-Ausführungszustand.

### Test B – Input Contract

Worker akzeptiert nur einen vollständigen und validen Input.

### Test C – Run Correlation

Worker-Messages enthalten die korrekte `runId`.

### Test D – Pause / Resume

Pause stoppt weitere Batches; Resume setzt mit identischem State/RNG fort.

### Test E – Cancel

Cancel verhindert weitere Batches nach dem nächsten sicheren Cancellation-Punkt.

### Test F – Progress

Progress basiert auf `completedRuns / totalRuns`.

### Test G – Completion

Ein vollständiger Lauf erzeugt exakt einen `COMPLETED`-Abschluss.

### Test H – Error

Ein Worker-Fehler erzeugt eine strukturierte Fehlermeldung und keinen gültigen Abschluss.

### Test I – Determinism

Identischer RunManifest + State + Seed erzeugt im Worker dasselbe Ergebnis wie die direkte Engine-Ausführung.

### Test J – Worker Isolation

Worker-Code importiert weder React noch IndexedDB noch SimulationService.

### Test K – Race Conditions

Ungültige oder verspätete Zustandsübergänge führen nicht zu korruptem Run-State.

### Test L – Existing Integrity

Alle Tests aus Auftrag 001–003 bleiben erfolgreich.

---

# 20. Technische Verifikation

Nach Implementierung ausführen:

```text
npx tsc --noEmit
npm run build
npx tsx scripts/verifyIntegrity.ts
```

Alle bestehenden Integrity Suites müssen weiterhin erfolgreich sein.

Zusätzlich muss der Worker-Build tatsächlich von Vite/TypeScript korrekt auflösbar sein.

---

# 21. Keine vorgezogenen Folgefeatures

Nicht implementieren:

- IndexedDB
- Snapshot-Persistenz
- Monte-Carlo-Qualitätsauswahl
- neue Szenarioverwaltung
- neue Parameter
- neue Wirkungsformeln
- neue Management-UI
- Cloud-Synchronisation

---

# 22. Abschlusskriterien

Der Auftrag ist abgeschlossen, wenn:

- [ ] Worker existiert
- [ ] Worker Input-/Output-Vertrag typisiert ist
- [ ] Protocol-Version vorhanden ist
- [ ] runId-Korrelation vorhanden ist
- [ ] START funktioniert
- [ ] PAUSE funktioniert
- [ ] RESUME funktioniert
- [ ] CANCEL funktioniert
- [ ] Progress korrekt übertragen wird
- [ ] Batch-Ausführung vorhanden ist
- [ ] Worker keine React-/IndexedDB-/SimulationService-Abhängigkeit besitzt
- [ ] SimulationEngine der einzige fachliche Tick-Pfad bleibt
- [ ] Worker-Ausführung deterministisch zur direkten Engine-Ausführung ist
- [ ] strukturierte Fehler vorhanden sind
- [ ] Worker-Lifecycle sauber beendet wird
- [ ] Race Conditions getestet sind
- [ ] bestehende Tests 001–003 weiterhin grün sind
- [ ] neue Tests A–K grün sind
- [ ] `npx tsc --noEmit` erfolgreich ist
- [ ] `npm run build` erfolgreich ist
- [ ] `npx tsx scripts/verifyIntegrity.ts` erfolgreich ist

---

# 23. Abschlussbericht

Nach Implementierung berichten:

1. neue/geänderte Dateien
2. Worker-Architektur
3. Message Contract
4. Lifecycle
5. Batch-/Progress-Modell
6. Cancellation-Verhalten
7. Determinismus-Test
8. Isolation-Test
9. Race-Condition-Tests
10. TypeScript-Ergebnis
11. Build-Ergebnis
12. Integrity-Suite-Ergebnis
13. verbleibende Gaps

**Nach diesem Auftrag nicht eigenständig mit IndexedDB/Snapshots fortfahren.**

Danach erfolgt der Architektur-/Code-Audit.
