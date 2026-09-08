# Antigravity – Auftrag 006
## Snapshot Store & IndexedDB-Persistenz

### Verbindliche Grundlagen

Vor Beginn vollständig lesen:

- `ARCHITECTURE_DECISIONS.md`
- `LEADPILOT_GAP_ANALYSIS.md`
- `ANTIGRAVITY_AUFTRAG_001_SIMULATION.md`
- `ANTIGRAVITY_AUFTRAG_002_SZENARIO_RUN.md`
- `ANTIGRAVITY_AUFTRAG_003_PARAMETER_REGISTRY.md`
- `ANTIGRAVITY_AUFTRAG_004_WEB_WORKER.md`
- `ANTIGRAVITY_AUFTRAG_005_MONTE_CARLO_AGGREGATION.md`

Auftrag 001–005 sind abgeschlossen.

---

# 1. Ziel

Implementiere die Persistenzgrundlage für Simulations-Snapshots über eine Repository-/Storage-Abstraktion mit **IndexedDB als V1-Browser-Persistenz**.

Die Architektur bleibt geschichtet:

```text
UI
 │
 ▼
Application / Services
 │
 ├── Scenario / Run
 ├── Aggregation
 └── Snapshot Access
        │
        ▼
  Snapshot Repository
        │
        ▼
 IndexedDB Adapter
```

Der Web Worker aus Auftrag 004 greift **nicht direkt auf IndexedDB** zu.

Der Worker liefert abgeschlossene Tick-Ergebnisse bzw. Snapshots an die dafür zuständige Application-/Persistence-Schicht.

Die Simulation Engine bleibt vollständig unabhängig von Persistence.

---

# 2. Verbindliche Architekturregeln

Aus der bestehenden Architektur sind insbesondere folgende Regeln verbindlich:

- Jeder abgeschlossene Tick besitzt einen unveränderlichen Snapshot-Zeitpunkt.
- Jeder Snapshot ist eindeutig `runId` und `tickId` zugeordnet.
- Snapshots speichern zusätzlich `simulationDay`.
- Ein Snapshot enthält den vollständigen Simulations-State.
- Zusätzlich existieren kompakte KPI-/Analytics-Projektionen.
- Das Dashboard arbeitet grundsätzlich mit Projektionen statt mit dem vollständigen State.
- Vollständiger State wird primär für Detailanalyse, Rekonstruktion und Debugging geladen.
- In V1 wird zunächst nach jedem abgeschlossenen Tick ein Snapshot erzeugt.
- Spätere Snapshot-Kompression und Snapshot-Intervalle müssen architektonisch möglich bleiben.
- Snapshots enthalten Modell- und Schema-Version.
- Snapshots sind nach Erstellung unveränderlich.
- Alte Snapshots werden in V1 grundsätzlich nicht automatisch gelöscht.
- Eine spätere technische Retention-Policy bleibt möglich.
- Ein Snapshot muss aus der Event-Historie reproduzierbar sein.
- Abweichungen zwischen gespeichertem und rekonstruiertem Snapshot werden als Integritätsfehler erkannt.
- Analytics arbeiten ausschließlich lesend auf konsistenten Snapshots.
- Identischer State und identische Parameter müssen deterministisch identische Analytics liefern. fileciteturn35file0turn35file10

Zusätzlich gilt:

- Persistence wird ausschließlich über Repository-/Storage-Interfaces angesprochen.
- Domain Model, Persistence Model und View Model bleiben getrennt.
- Transformationen erfolgen explizit über Mapper/Adapter. fileciteturn35file7

---

# 3. Wichtig: Snapshot ≠ Event

Snapshots ersetzen die Event-Historie ausdrücklich nicht.

```text
Event History
     │
     ├── autoritative historische Quelle
     │
     ▼
State Reconstruction
     │
     ▼
Snapshot
     │
     ├── Performance
     └── Analytics
```

Die Architektur unterstützt Snapshots zur Performance, hält aber Events als rekonstruierbare Grundlage.

Es darf keine Implementierung entstehen, bei der Events zugunsten von Snapshots verloren gehen.

---

# 4. Snapshot-Zeitpunkt

Nach jeder erfolgreich abgeschlossenen atomaren State Transition:

```text
Event
  ↓
Validation
  ↓
State Transition
  ↓
State Commit
  ↓
Snapshot
  ↓
Analytics
```

Es dürfen keine Zwischenzustände persistiert oder für Analytics veröffentlicht werden.

Ein fehlgeschlagener Tick/State-Commit darf keinen halb veränderten Snapshot erzeugen.

---

# 5. Snapshot-Modell

Definiere bzw. konsolidiere einen fachlichen `SimulationSnapshot`.

Mindestens erforderlich:

```text
snapshotId
runId
scenarioId
scenarioVersionId

tickId
simulationDay
simulatedDate

modelVersion
schemaVersion
baselineVersion

state
metrics / analytics projection

createdAt // technische Persistenzmetadaten
```

Falls der bestehende `SimulationState` bereits `seed`, `dayIndex` und `simulatedDate` enthält, keine parallele redundante fachliche Definition erzeugen.

Der Snapshot muss den für Rekonstruktion und Reproduzierbarkeit notwendigen State vollständig enthalten.

---

# 6. Snapshot-ID

Snapshot-IDs müssen eindeutig und deterministisch nachvollziehbar sein.

Die Kombination:

```text
runId + tickId
```

ist bereits fachlich eindeutig.

Die Persistenz darf diese Eindeutigkeit nicht durch zufällige oder wall-clock-basierte fachliche IDs unterlaufen.

---

# 7. Immutability

Nach erfolgreichem Schreiben gilt:

```text
Snapshot = immutable
```

Kein späteres Update eines bestehenden Snapshots.

Korrekturen oder Migrationen erzeugen keine rückwirkende Mutation des ursprünglichen Snapshots.

Falls technische Migration erforderlich wird, muss die ursprüngliche Version nachvollziehbar bleiben.

Die Architektur verlangt Versionsreferenzen und Rückführbarkeit migrierter Objekte. fileciteturn35file10

---

# 8. IndexedDB Repository

Implementiere eine Persistence-Abstraktion, z. B.:

```text
ISnapshotRepository
```

mit Operationen in der Art:

```text
save(snapshot)
get(snapshotId)
getByRun(runId)
getByRunAndTick(runId, tickId)
getLatestByRun(runId)
listProjectionByRun(runId)
```

Die konkreten Namen dürfen an bestehende Repository-Konventionen angepasst werden.

Wichtig:

**Domain-/Application-Code darf nicht direkt IndexedDB APIs verwenden.**

IndexedDB ist ein Adapter hinter dem Repository-Interface.

---

# 9. Persistence Model

Trenne:

```text
SimulationSnapshot
        │
        ▼
SnapshotPersistenceRecord
        │
        ▼
IndexedDB
```

Nicht direkt Domain-Objekte unkontrolliert in IndexedDB serialisieren, wenn dadurch Domain- und Persistence-Modell gekoppelt würden.

Explizite Mapper:

```text
toPersistenceRecord()
fromPersistenceRecord()
```

verwenden.

---

# 10. IndexedDB Schema

Definiere eine versionierte IndexedDB-Datenbank.

Mindestens:

- Datenbankname
- DB-Version
- Object Store(s)
- Primärschlüssel
- notwendige Indizes

Die konkrete technische Benennung darf frei gewählt werden, muss aber dokumentiert und stabil sein.

Sinnvolle Zugriffsmuster müssen unterstützt werden:

```text
runId
scenarioVersionId
runId + tickId
```

Da das Dashboard primär Projektionen lädt, soll die Persistenz effiziente Zugriffe auf kompakte Projektionen ermöglichen.

---

# 11. Full Snapshot und Projection

Ein Snapshot besteht logisch aus zwei Teilen:

### Full State

Für:

- Detailanalyse
- Rekonstruktion
- Debugging
- Wiederaufnahme, soweit erforderlich

### Analytics Projection

Für:

- Dashboard
- KPI-Verläufe
- schnelle Listen
- Aggregation/Charts

Ziel:

```text
Dashboard
   ↓
Projection

Detail / Debug
   ↓
Full Snapshot
```

Große Rohdaten werden nur bei Bedarf geladen. fileciteturn35file11

---

# 12. Snapshot-Frequenz

V1:

```text
jeder abgeschlossene Tick → 1 Snapshot
```

Diese Entscheidung ist verbindlich.

Die Architektur muss trotzdem spätere Optimierungen erlauben:

- Snapshot-Kompression
- Snapshot-Intervalle

Diese Optimierungen sind **nicht Teil dieses Auftrags**.

---

# 13. Run-Lifecycle und Persistenz

Die Architektur unterscheidet:

```text
CREATED
RUNNING
INCOMPLETE
COMPLETED
FAILED
CANCELLED
```

Während eines Runs kann der Zustand temporär persistiert werden.

Ein unvollständiger Lauf wird als `INCOMPLETE` geführt.

Ein erfolgreicher Lauf erhält `COMPLETED`.

Fehlerhafte Läufe erhalten `FAILED`.

Bewusst abgebrochene Läufe erhalten `CANCELLED`.

Nur vollständige, statistisch geprüfte Runs dürfen als finale Prognose gelten. fileciteturn35file18

---

# 14. Bereits berechnete Runs

Bei Cancel oder Fehler:

- bereits erfolgreich berechnete Run-/Tick-Daten bleiben erhalten
- der Lauf wird nicht als vollständige Prognose behandelt
- bereits gültige historische Ergebnisse dürfen nicht zerstört werden

Das entspricht den bestehenden Worker-/Run-Regeln. fileciteturn35file11

---

# 15. Resume / Wiederaufnahme

Die Persistenz muss die Grundlage für spätere Wiederaufnahme eines laufenden Jobs bilden.

Ein gespeicherter Zustand muss dafür eindeutig zuordenbar sein:

```text
runId
tickId
RNG-State
SimulationState
RunManifest
modelVersion
schemaVersion
baselineVersion
```

Eine Fortsetzung desselben Jobs kann dieselbe `runId` behalten.

Der Fortsetzungszeitpunkt wird technisch dokumentiert.

**Wichtig:** Auftrag 006 definiert die Persistenzgrundlage; eine vollständige neue Resume-Orchestrierung soll nicht parallel als neues Feature erfunden werden, sofern sie nicht für den Persistence-Test zwingend erforderlich ist.

Die bestehenden Reproduzierbarkeitsregeln bleiben unverändert. fileciteturn35file7

---

# 16. Reproduzierbarkeit

Ein gespeicherter Snapshot darf niemals die deterministische Simulation verändern.

Für identischen:

```text
RunManifest
+
State
+
RNG-State
+
Model Version
+
Schema Version
+
Baseline Version
```

muss die Rekonstruktion denselben fachlichen Zustand ergeben.

Persistence ist passive Speicherung.

Kein Persistence-Aufruf darf:

- RNG verändern
- Tick ausführen
- Simulation verändern
- Wall-Clock in fachliche Werte einbringen

---

# 17. Event-Rekonstruktion

Implementiere die technische Grundlage für:

```text
Event History
      ↓
State Reconstruction
      ↓
Snapshot Comparison
```

Die vollständige Event-Replay-Engine soll nur verwendet werden, wenn sie bereits vorhanden ist.

Falls sie noch nicht vollständig implementiert ist, darf Auftrag 006 keine zweite Replay-Engine erzeugen.

Stattdessen:

- Snapshot-Struktur vorbereiten
- Integritätsvergleich definieren
- vorhandene Rekonstruktionslogik verwenden

---

# 18. Integritätsprüfung

Für einen gespeicherten Snapshot soll überprüfbar sein:

```text
storedSnapshot
      vs.
reconstructedSnapshot
```

Bei Gleichheit:

```text
VALID
```

Bei Abweichung:

```text
INTEGRITY_ERROR
```

Die Abweichung darf nicht stillschweigend korrigiert werden.

Der Fehler muss diagnostisch nachvollziehbar sein.

---

# 19. Versionierung

Snapshots speichern mindestens:

```text
modelVersion
schemaVersion
baselineVersion
```

Die Snapshot-Persistenz muss spätere Schema-Migration ermöglichen.

Eine Migration darf:

- Originalherkunft nicht verlieren
- Event-Sequenzen nicht neu nummerieren
- ursprüngliche Version nachvollziehbar lassen

Die bestehende Architektur verlangt genau diese Rückführbarkeit. fileciteturn35file10

---

# 20. Keine automatische Retention

V1:

**Keine automatische Löschung alter Snapshots.**

Keine:

- FIFO-Löschung
- „älter als X Tage löschen“
- automatisches Pruning
- stilles Speicherlimit

Eine spätere explizite technische Retention-Policy kann ergänzt werden.

Dabei dürfen historische Fach-/Auditdaten nicht unbemerkt gelöscht werden.

---

# 21. Fehlerbehandlung

Definiere strukturierte Persistence-Fehler, z. B.:

```text
SNAPSHOT_NOT_FOUND
PERSISTENCE_ERROR
SCHEMA_VERSION_ERROR
INTEGRITY_ERROR
DUPLICATE_SNAPSHOT
```

Die konkreten Fehlercodes dürfen an bestehende Projektkonventionen angepasst werden.

Fehler dürfen keine teilweise gespeicherten oder inkonsistenten Domain-Zustände zurücklassen.

---

# 22. Atomisches Schreiben

Das Speichern eines Snapshots muss innerhalb einer IndexedDB-Transaktion erfolgen.

Ziel:

```text
Snapshot + Projection
        ↓
atomare Persistenz
```

Entweder beide logisch zusammengehörigen Daten sind erfolgreich gespeichert oder keine Teilpersistenz wird als gültiger Snapshot veröffentlicht.

Ein halbfertiger Snapshot darf nicht als gültig erscheinen.

---

# 23. Worker-Integration

Der Worker bleibt frei von IndexedDB.

```text
Worker
  │
  ▼
Worker Event / completed tick result
  │
  ▼
SimulationService / Application layer
  │
  ▼
Snapshot Repository
  │
  ▼
IndexedDB
```

Keine:

```text
Worker → IndexedDB
```

Die bestehende Worker-Architektur aus Auftrag 004 bleibt unverändert. fileciteturn35file12

---

# 24. Dashboard-Zugriff

Das Dashboard lädt bevorzugt:

```text
Analytics Projection
```

und nicht standardmäßig den vollständigen State.

Vollständige Snapshots werden nur für:

- Detailansicht
- Debugging
- Rekonstruktion
- technische Analyse

geladen.

Damit bleibt die Performancearchitektur aus den bestehenden Entscheidungen erhalten. fileciteturn35file11

---

# 25. Tests

Implementiere mindestens:

### Test A – Snapshot Creation

Nach einem erfolgreich abgeschlossenen Tick existiert genau ein Snapshot.

### Test B – Snapshot Identity

`runId + tickId` identifiziert einen Snapshot eindeutig.

### Test C – Simulation Day

Snapshot speichert den korrekten `simulationDay` und die fachliche Simulationszeit.

### Test D – Full State

Der vollständige Simulations-State wird vollständig gespeichert und wieder geladen.

### Test E – Analytics Projection

Kompakte KPI-/Analytics-Projektion wird korrekt gespeichert und geladen.

### Test F – Immutability

Ein gespeicherter Snapshot kann nicht durch einen späteren Tick verändert werden.

### Test G – Tick Sequence

Mehrere Ticks erzeugen eine lückenlose Snapshot-Sequenz innerhalb eines Runs.

### Test H – IndexedDB Roundtrip

Save → Load liefert fachlich identischen Snapshot.

### Test I – Query by Run

Alle Snapshots eines Runs können effizient geladen werden.

### Test J – Query by Run/Tick

Ein einzelner Snapshot kann eindeutig geladen werden.

### Test K – Latest Snapshot

Der letzte Snapshot eines Runs wird korrekt bestimmt.

### Test L – Atomic Persistence

Snapshot und Projection werden atomar gespeichert.

### Test M – Schema Version

Schema-/Model-/Baseline-Versionen werden korrekt gespeichert und geprüft.

### Test N – No Retention Deletion

Alte Snapshots werden nicht automatisch gelöscht.

### Test O – Event Reconstruction

Gespeicherter Snapshot entspricht dem aus der Event-Historie rekonstruierten State, soweit vorhandene Replay-Logik dies unterstützt.

### Test P – Integrity Error

Eine absichtlich abweichende Rekonstruktion erzeugt `INTEGRITY_ERROR`.

### Test Q – Worker Isolation

Worker-Code enthält weiterhin keinen IndexedDB-Zugriff.

### Test R – Run Lifecycle

`INCOMPLETE`, `COMPLETED`, `FAILED` und `CANCELLED` werden korrekt behandelt.

### Test S – Resume Foundation

Gespeicherter State enthält die für eine spätere deterministische Fortsetzung notwendigen Informationen.

### Test T – Deterministic Roundtrip

Save → Load → Simulation/Analytics liefert identische fachliche Werte.

### Test U – Input Immutability

Save/Load verändert die ursprünglichen Domain-Objekte nicht.

### Test V – Existing Integrity

Alle Integrity Suites 001–005 bleiben grün.

---

# 26. Technische Verifikation

Nach Implementierung ausführen:

```text
npx tsc --noEmit
npm run build
npx tsx scripts/verifyIntegrity.ts
```

Zusätzlich muss die Anwendung im Browser mit IndexedDB korrekt initialisieren können.

Der Build muss die bestehende Worker-Integration weiterhin korrekt bündeln.

---

# 27. Keine vorgezogenen Folgefeatures

Nicht eigenständig implementieren:

- neue Simulation Engine
- neue Parameter
- neue Szenarienlogik
- neue Monte-Carlo-Statistik
- neue Worker-Architektur
- Supabase
- Cloud-Synchronisation
- automatische Retention
- Snapshot-Kompression
- Snapshot-Intervalle
- umfangreiche neue UI
- vollständige neue Replay-Engine

---

# 28. Abschlusskriterien

Der Auftrag ist abgeschlossen, wenn:

- [ ] Snapshot Domain Model existiert
- [ ] Persistence Model existiert
- [ ] Mapper/Adapter vorhanden
- [ ] Snapshot Repository Interface vorhanden
- [ ] IndexedDB Adapter vorhanden
- [ ] DB-Versionierung vorhanden
- [ ] notwendige Object Stores/Indizes vorhanden
- [ ] jeder abgeschlossene Tick einen Snapshot erzeugen kann
- [ ] Snapshot `runId` und `tickId` eindeutig enthält
- [ ] `simulationDay` vorhanden ist
- [ ] vollständiger State gespeichert wird
- [ ] Analytics Projection gespeichert wird
- [ ] Model-/Schema-/Baseline-Version gespeichert wird
- [ ] Snapshots immutable sind
- [ ] keine automatische Retention stattfindet
- [ ] Event-Historie erhalten bleibt
- [ ] Snapshot aus Events rekonstruierbar bleibt
- [ ] Integritätsvergleich möglich ist
- [ ] Worker keinen IndexedDB-Zugriff besitzt
- [ ] Dashboard primär Projektionen verwenden kann
- [ ] atomisches Speichern vorhanden ist
- [ ] Run-Lifecycle korrekt persistiert wird
- [ ] Tests A–V grün sind
- [ ] Tests 001–005 weiterhin grün sind
- [ ] `npx tsc --noEmit` erfolgreich ist
- [ ] `npm run build` erfolgreich ist
- [ ] `npx tsx scripts/verifyIntegrity.ts` erfolgreich ist

---

# 29. Abschlussbericht

Nach Implementierung berichten:

1. neue/geänderte Dateien
2. Snapshot Domain Model
3. Persistence Model
4. IndexedDB-Schema und Version
5. Object Stores und Indizes
6. Repository-/Adapter-Architektur
7. Full Snapshot vs. Analytics Projection
8. Snapshot-Zeitpunkt
9. Immutability
10. Run-Lifecycle
11. atomisches Schreiben
12. Versionierung/Migration
13. Rekonstruktions-/Integritätsprüfung
14. Worker-Isolation
15. Tests A–V
16. TypeScript-Ergebnis
17. Build-Ergebnis
18. globale Integrity-Suite
19. verbleibende Architektur-Gaps

**Nach diesem Auftrag nicht eigenständig mit weiteren Folgefeatures fortfahren.**

---

## Architektur-Kern von Auftrag 006

```text
                  SimulationEngine
                         │
                         ▼
                 abgeschlossener Tick
                         │
                         ▼
                atomarer State Commit
                         │
                         ▼
                  SimulationSnapshot
                    /                              /                               ▼               ▼
           Full State        KPI Projection
                  │               │
                  └──────┬────────┘
                         ▼
                 Snapshot Repository
                         │
                         ▼
                     IndexedDB

Event History ───────────────► Rekonstruktion
                                   │
                                   ▼
                            Snapshot Integrity
                            Comparison
```

**Grundsatz:**

> **Events bleiben historische Quelle. Snapshots sind unveränderliche Performance-/Analytics-Projektionen und vollständige Rekonstruktionsanker. IndexedDB ist ausschließlich Persistenzinfrastruktur hinter einem Repository-Interface.**

