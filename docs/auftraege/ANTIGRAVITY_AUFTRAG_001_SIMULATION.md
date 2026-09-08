# Antigravity – Auftrag 001
## Simulation Core konsolidieren und deterministisch machen

### Kontext

Projekt: LeadPilot Dashboard-CRM

Die verbindliche Architektur steht in:

`ARCHITECTURE_DECISIONS.md`

Die aktuelle Code-Gap-Analyse steht in:

`LEADPILOT_GAP_ANALYSIS.md`

Der bestehende Code darf **nicht als Big-Bang-Rewrite** ersetzt werden.

---

# Ziel dieses Auftrags

Konsolidiere den bestehenden Simulationskern so, dass eine **einzige fachliche Simulation-Ausführung** existiert und der fachliche Tick **deterministisch und unabhängig von Browser-/Wall-Clock-APIs** ausgeführt werden kann.

Dieser Auftrag ist bewusst begrenzt.

## Noch NICHT implementieren

- Web Worker
- IndexedDB
- vollständige Szenarioversionierung
- Run Manifest
- vollständige Snapshot-Persistenz
- neue Dashboard-UI
- Cloud-Synchronisation

Diese Themen kommen nach dem stabilen Engine-Kern.

---

# 1. Vor Änderungen zuerst prüfen

Lies vollständig:

- `src/simulation/engine.ts`
- `src/simulation/simulationService.ts`
- `src/simulation/eventRules.ts`
- `src/simulation/aiDecisionMaker.ts`
- `src/simulation/ISimulationService.ts`
- `src/types/simulation.ts`
- `src/context/SimulationContext.tsx`
- `src/simulation/__tests__/simulationIntegrity.test.ts`

Prüfe zusätzlich die aktuellen Imports/Verwendungen dieser Module im Projekt.

Erstelle vor der Änderung gedanklich eine Abhängigkeitsskizze.

---

# 2. Eine fachliche Simulation behalten

Aktuell existieren zwei Simulationspfade:

- `SimulationEngine`
- `SimulationService`

Behalte `ISimulationService` und den Service als Application-/Orchestrierungsgrenze.

Entferne bzw. konsolidiere die zweite fachliche Simulation so, dass es anschließend **keine zwei unabhängigen Tick-Implementierungen** mehr gibt.

Bestehende UI-Aufrufe sollen nach Möglichkeit über `ISimulationService` weiter funktionieren.

Keine unnötigen API-Brüche.

---

# 3. Deterministischen RNG einführen

`Math.random()` darf im fachlichen Simulationskern nicht mehr verwendet werden.

Führe eine kleine, gut testbare RNG-Abstraktion ein, beispielsweise:

- expliziter Seed
- deterministische `next()`-Operation
- optional `nextInt()` / `pick()` / `nextBoolean()`

Die konkrete RNG-Technologie darfst du wählen, solange:

1. sie deterministisch ist,
2. sie bei gleichem Seed dieselbe Sequenz liefert,
3. sie keinen globalen Zustand benötigt,
4. sie leicht testbar ist.

Der Seed muss Bestandteil des Simulationskontexts sein.

**Wichtig:** Nicht `Math.random` nur wrappen und weiterhin intern verwenden.

---

# 4. Wall Clock aus dem fachlichen Tick entfernen

Im fachlichen Simulationskern dürfen keine fachlichen Entscheidungen von:

- `Date.now()`
- `new Date()`
- `toLocaleTimeString()`
- `toLocaleDateString()`

abhängen.

Eine technische Uhr darf später im UI/Scheduler existieren.

Für die Simulation selbst sollen Tick und Simulation Day aus einem fachlichen Clock-Modell kommen.

Mindestens erforderlich:

- `tick`
- `dayIndex`

Wenn ein fachlich sinnvoller Startzeitpunkt benötigt wird, muss er explizit Bestandteil des Simulationskontexts sein.

---

# 5. Fachliche IDs deterministisch machen

Keine Entity-/Event-ID darf mehr von `Date.now()` abhängen.

IDs sollen aus dem deterministischen Simulationskontext erzeugbar sein, z. B. über:

- Run ID
- Tick
- Entity-/Event-Typ
- deterministische Sequenz

Die IDs müssen bei gleicher Run-Konfiguration reproduzierbar sein.

---

# 6. Engine vom Browser entkoppeln

Der fachliche Tick darf nicht `window.setTimeout`, `window.clearTimeout` oder andere Browser-APIs benötigen.

Der Engine-Kern muss einen Tick direkt ausführen können.

Beispielhafte Zielrichtung:

`engine.executeTick(context/state) -> result`

Scheduling gehört außerhalb des fachlichen Kerns.

Der bestehende Echtzeitmodus darf funktional erhalten bleiben, aber der Timer muss außerhalb der reinen Tick-Logik liegen.

---

# 7. Event-Historie nicht mehr fachlich auf 50 begrenzen

Die aktuelle Implementierung schneidet die Event-Historie auf 50 Einträge.

Das darf im fachlichen Event Store nicht mehr passieren.

Die UI darf später eine Projektion wie „letzte 50 Events“ anzeigen.

Die vollständige Historie muss erhalten bleiben.

---

# 8. Keine fachliche Änderung der historischen Ebene A

Die bestehende Ebene-A-Integritätslogik darf durch diesen Auftrag nicht verschlechtert werden.

Die Simulation darf weiterhin nicht die historischen CRM-Referenzdaten verändern.

---

# 9. Typisierung verbessern, aber begrenzen

Ersetze im direkt bearbeiteten Simulationskern offensichtliche `any`-Typen wie:

`SimulationEvent.affectedLead?: any`

durch passende konkrete Typen.

Keine großflächige Typmigration des gesamten Projekts in diesem Auftrag.

---

# 10. Tests

Füge Tests hinzu für mindestens:

### Test A – deterministischer RNG

Gleicher Seed → gleiche RNG-Sequenz.

### Test B – gleiche Simulation

Gleicher initialer State + gleicher Seed + gleiche Parameter → gleiche Tick-Ergebnisse.

### Test C – andere Seeds

Unterschiedliche Seeds dürfen unterschiedliche Ergebnisse erzeugen.

### Test D – keine Wall-Clock-Abhängigkeit

Ein Tick darf bei identischer Eingabe nicht von der aktuellen Systemzeit abhängen.

### Test E – Event-Historie

Mehr als 50 Events dürfen nicht automatisch gelöscht werden.

### Test F – Ebene A

Der vorhandene Integritätstest darf nicht verschlechtert werden.

---

# 11. Testbarkeit

Der fachliche Tick muss ohne:

- Browser
- React
- DOM
- Timer
- echte Systemzeit

ausführbar sein.

Das ist eine zentrale Voraussetzung für den späteren Web Worker.

---

# 12. Keine neuen Architektur-Abkürzungen

Nicht machen:

- `Math.random()` als Fallback
- `Date.now()` für IDs
- globale Singleton-Zustände im neuen RNG
- UI-Callbacks im Engine-Kern
- direkte React-Imports in der Engine
- direkte IndexedDB-Aufrufe
- direkte Supabase-Aufrufe aus der Engine

---

# 13. Abschlusskriterien

Der Auftrag ist erst abgeschlossen, wenn:

- [ ] nur noch eine fachliche Tick-Ausführung existiert
- [ ] `Math.random()` aus dem fachlichen Simulationspfad entfernt ist
- [ ] `Date.now()` aus fachlicher Simulation/ID-Erzeugung entfernt ist
- [ ] `new Date()` nicht mehr für fachliche Simulationszeit verwendet wird
- [ ] Tick ohne Browser-Timer ausführbar ist
- [ ] `dayIndex` fachlich modelliert ist
- [ ] Event-Historie nicht mehr auf 50 Einträge begrenzt wird
- [ ] deterministische Tests vorhanden sind
- [ ] bestehende UI-Anbindung weiterhin funktioniert
- [ ] TypeScript erfolgreich kompiliert
- [ ] vorhandene Integritätstests weiterhin funktionieren

---

# 14. Danach

Nach Abschluss dieses Auftrags **nicht eigenmächtig mit Worker/IndexedDB/Szenarien weitermachen**.

Stattdessen:

1. Änderungen zusammenfassen
2. Tests/Build-Ergebnis nennen
3. betroffene Dateien auflisten
4. verbleibende Architektur-Gaps nennen

Danach erfolgt ein erneuter Architekturabgleich und erst dann Auftrag 002.
