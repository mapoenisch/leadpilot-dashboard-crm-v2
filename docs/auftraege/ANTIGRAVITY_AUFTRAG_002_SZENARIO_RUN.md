# Antigravity – Auftrag 002
## Szenario-, Szenarioversion- und Run-Grundlage

### Kontext

Projekt: LeadPilot Dashboard-CRM

Verbindliche Grundlage:

- `ARCHITECTURE_DECISIONS.md`
- `LEADPILOT_GAP_ANALYSIS.md`
- Auftrag 001 inkl. Audit-Fixes ist abgeschlossen.

Die Architektur legt bereits fest:

- Ein Szenario ist ein **Parametersatz**, nicht der Live-Simulationszustand.
- Die Szenario-ID bleibt über Versionen stabil.
- Jede Szenarioversion enthält den vollständigen Parametersatz.
- Das Basis-2026-Szenario ist geschützt und duplizierbar.
- Ein Szenario kann maximal 10 Ergebnisläufe besitzen.
- Jeder neue Lauf erhält einen neuen Seed.
- „Erneut ausführen“ erzeugt einen neuen Seed.
- „Reproduzieren“ verwendet den ursprünglichen Seed/Zustand.
- Ein Run speichert u. a. Seed, RNG-State, Modellversion, Schema-Version und Baseline-Version.
- Jeder Run ist eindeutig einer Szenarioversion zugeordnet.
- Historische Runs dürfen durch spätere Änderungen nicht verändert werden.

Diese Vorgaben sind in den Projektquellen bereits festgelegt. fileciteturn21file1 fileciteturn21file11

---

# Ziel

Implementiere jetzt ausschließlich die **fachliche Grundlage für Szenario → Szenarioversion → Run**.

Noch **keine** vollständige Persistenz, kein Web Worker und keine neue umfangreiche UI.

Zielstruktur:

```text
Scenario
   │
   ├── ScenarioVersion 1
   ├── ScenarioVersion 2
   └── ScenarioVersion 3
          │
          ├── Run A
          ├── Run B
          └── Run C
```

Dabei gilt:

```text
Scenario ≠ ScenarioVersion ≠ Run
```

---

# 1. Vor Änderungen

Lies zuerst vollständig:

- `ARCHITECTURE_DECISIONS.md`
- `LEADPILOT_GAP_ANALYSIS.md`
- `src/types/simulation.ts`
- vorhandene Szenario-/Parameterdateien
- `src/simulation/simulationService.ts`
- `src/simulation/engine.ts`
- bestehende Context-/Service-Strukturen
- vorhandene Tests

Suche außerdem projektweit nach bestehenden Begriffen:

- `scenario`
- `runId`
- `seed`
- `resetSimulation`
- `SimulationState`
- `parameters`

Keine neue parallele Modellwelt erzeugen, wenn bereits passende Typen existieren.

---

# 2. Scenario Domain Model

Führe ein klares `Scenario`-Modell ein bzw. erweitere das vorhandene.

Mindestens:

- `id`
- `name`
- `description` optional
- `status`
- `createdAt` als technische Metainformation
- `updatedAt` als technische Metainformation
- `currentVersionId`
- `isProtected`
- `parentScenarioId` optional

Mögliche Statuswerte:

- `DRAFT`
- `ACTIVE`
- `ARCHIVED`

Keine physische Löschung in V1.

Das Basis-2026-Szenario muss als geschützt modellierbar sein.

---

# 3. ScenarioVersion

Führe ein eigenständiges `ScenarioVersion`-Modell ein.

Mindestens:

- `id`
- `scenarioId`
- `versionNumber`
- `parameters`
- `createdAt`
- `createdBy` bzw. technischer Actor optional
- `description` optional

Wichtig:

### Jede Version enthält den vollständigen Parametersatz.

Keine Version darf nur einen Delta-Patch als fachliche Wahrheit speichern.

Der vollständige Parametersatz ist die reproduzierbare Ausgangskonfiguration.

Eine Version ist nach ihrer Erstellung unveränderlich.

---

# 4. Scenario ID und Version ID

Die `scenarioId` bleibt über alle Versionen stabil.

Beispiel:

```text
scenario-abc
    version 1
    version 2
    version 3
```

Versionen erhalten eigene IDs.

Keine Wiederverwendung bereits verwendeter IDs.

Für technische IDs darf eine deterministische oder UUID-basierte Strategie verwendet werden. Die technische ID einer persistenten Domain-Entität muss nicht vom Simulations-RNG abhängen.

---

# 5. Run-Modell

Führe ein eigenständiges `SimulationRun`-/`Run`-Modell ein.

Mindestens:

- `runId`
- `scenarioId`
- `scenarioVersionId`
- `seed`
- `rngState`
- `modelVersion`
- `schemaVersion`
- `baselineVersion`
- `status`
- `startedAt`
- `completedAt` optional

Zusätzlich vorbereiten für:

- Simulation duration
- run quality/mode
- result reference
- error information

Nicht alles muss bereits vollständig benutzt werden, aber die Struktur darf spätere Erweiterungen nicht verhindern.

---

# 6. Run Status

Definiere explizite Zustände.

Mindestens:

```text
PREPARING
RUNNING
COMPLETED
CANCELLED
FAILED
```

Falls der vorhandene Code bereits passende Zustände besitzt, konsolidiere statt eine zweite State Machine anzulegen.

Unvollständige Runs dürfen niemals wie erfolgreiche Prognosen behandelt werden.

---

# 7. Run Manifest

Implementiere ein unveränderliches `RunManifest`.

Der Manifest-Inhalt muss mindestens eindeutig festhalten:

```text
runId
scenarioId
scenarioVersionId
seed
rngState
modelVersion
schemaVersion
baselineVersion
```

Zusätzlich sinnvoll:

```text
createdAt
simulationStartDate
simulationDuration
```

Das Manifest beschreibt die exakten Eingangsbedingungen eines Runs.

Nach `RUNNING` darf es nicht mehr verändert werden.

---

# 8. Start eines Runs

Ein Run darf nur aus einer konkreten `ScenarioVersion` gestartet werden.

Nicht:

```text
Scenario → Run
```

sondern:

```text
Scenario
   ↓
ScenarioVersion
   ↓
Run
```

Beim Start werden die relevanten Daten der Version in das Run Manifest übernommen.

Spätere Änderungen am Szenario dürfen den Run nicht verändern.

---

# 9. Neuer Run

„Erneut ausführen“ bedeutet:

- neue `runId`
- neuer Seed
- gleiche Szenario-Version
- gleiche relevanten Parameter
- gleiche Modell-/Schema-/Baseline-Version, sofern unverändert

Der neue Run ist fachlich ein eigener Run.

---

# 10. Reproduzieren

„Reproduzieren“ bedeutet:

- ursprüngliche ScenarioVersion
- ursprünglicher Seed
- ursprünglicher relevanter RNG-Ausgangszustand
- gleiche Modellversion
- gleiche Schema-Version
- gleiche Baseline-Version

→ identisches Simulationsergebnis.

Die Implementierung muss diese Unterscheidung sauber vorbereiten:

```text
RE-RUN      → neuer Seed
REPRODUCE   → ursprünglicher Seed/Zustand
```

---

# 11. Scenario Änderungen

Wenn ein Benutzer Parameter verändert:

```text
aktive ScenarioVersion
        ↓
ungespeicherte Änderungen
        ↓
explizit speichern
        ↓
neue ScenarioVersion
```

Die alte Version bleibt unverändert.

Das Laden eines Szenarios darf nicht automatisch den laufenden Live-Simulationszustand verändern.

---

# 12. Parent Scenario

Wenn ein neues Szenario aus einem bestehenden Szenario oder Ergebnis abgeleitet wird:

- neues `scenarioId`
- ursprüngliches Szenario bleibt unverändert
- `parentScenarioId` wird gesetzt

Falls diese Funktion aktuell noch keine UI besitzt, reicht die Domain-/Typvorbereitung.

---

# 13. Maximal 10 Ergebnisläufe

Die Architektur sieht maximal 10 Ergebnisläufe pro Szenario vor.

Implementiere die Regel dort, wo sie fachlich sinnvoll geprüft werden kann.

Wichtig:

- Nicht einfach alte Runs automatisch löschen.
- Bei Erreichen des Limits einen strukturierten fachlichen Fehler liefern.
- Reproduzieren eines bestehenden Runs muss möglich bleiben, sofern dadurch kein neuer gespeicherter Run angelegt wird.
- „Erneut ausführen“ zählt als neuer Run.

---

# 14. Keine Persistenz in diesem Auftrag

Noch NICHT implementieren:

- IndexedDB
- Supabase für Runs
- Web Worker
- Snapshot Store
- Event Store Persistenz
- Cloud Sync

Verwende stattdessen eine Repository-Abstraktion bzw. In-Memory-Implementierung, wenn für Tests erforderlich.

Die spätere Persistenz muss austauschbar bleiben.

---

# 15. Keine neue große UI

Keine neue Szenarioverwaltung bauen.

Bestehende UI nur so weit anpassen, wie es notwendig ist, damit die neue Domainstruktur nicht kaputtgeht.

Die Managementdarstellung soll weiterhin reduziert bleiben; die vollständige Run-Liste gehört laut Architektur in die Analyse-/Audit-Ebene. fileciteturn21file7

---

# 16. Tests

Implementiere mindestens:

### Test A – Szenario-Versionierung

Ein Szenario besitzt mehrere Versionen mit stabiler `scenarioId`.

### Test B – vollständiger Parametersatz

Version 2 enthält den vollständigen Parametersatz und verändert Version 1 nicht.

### Test C – Run-Zuordnung

Ein Run referenziert exakt:

- ein Szenario
- eine Szenarioversion

### Test D – Run Manifest

Das Manifest enthält alle Reproduzierbarkeitsinformationen.

### Test E – Re-Run

„Erneut ausführen“ erzeugt:

- neue runId
- neuen Seed
- gleiche ScenarioVersion

### Test F – Reproduce

„Reproduzieren“ verwendet den ursprünglichen Seed/Zustand.

### Test G – Immutable Run

Nach Start darf eine ScenarioVersionänderung den Run nicht verändern.

### Test H – maximal 10 Runs

Der elfte gespeicherte Ergebnislauf wird fachlich abgelehnt.

### Test I – Basis-2026 geschützt

Das geschützte Basis-Szenario kann nicht gelöscht bzw. physisch entfernt werden.

---

# 17. Reproduzierbarkeitstest

Nutze die aus Auftrag 001 bereits etablierte deterministische Engine.

Teste:

```text
ScenarioVersion
+
RunManifest
+
Seed
+
gleicher Ausgangszustand
```

→ gleicher Simulation Output.

Damit verbinden wir die neue Run-Domain mit der bereits erfolgreich deterministischen Simulation Engine.

---

# 18. Architekturregeln

Nicht zulassen:

- Run enthält mutable Referenz auf live veränderliche Scenario-Parameter.
- ScenarioVersion wird nach Run-Start verändert.
- Run wird nachträglich auf eine andere ScenarioVersion umgebogen.
- Run übernimmt aktuelle CRM-Daten dynamisch nach seinem Start.
- Re-Run und Reproduce werden identisch behandelt.
- Run-ID basiert auf `Date.now()`.
- Simulation Engine erhält direkte Kenntnis von ScenarioRepository.
- UI erzeugt fachliche Runs direkt ohne Application-/Service-Grenze.

---

# 19. Abschlusskriterien

Der Auftrag ist abgeschlossen, wenn:

- [ ] `Scenario` und `ScenarioVersion` getrennte Modelle sind
- [ ] Scenario-ID über Versionen stabil bleibt
- [ ] jede Version vollständige Parameter enthält
- [ ] Versionen nach Erstellung unveränderlich sind
- [ ] `SimulationRun` eigenständiges Modell ist
- [ ] Run genau eine ScenarioVersion referenziert
- [ ] Run Manifest unveränderliche Reproduzierbarkeitsdaten enthält
- [ ] Re-Run neuen Seed verwendet
- [ ] Reproduce ursprünglichen Seed/Zustand verwendet
- [ ] maximal 10 gespeicherte Ergebnisläufe pro Szenario gelten
- [ ] Basis-2026 geschützt modellierbar ist
- [ ] keine Persistenz/Worker-Infrastruktur vorgezogen wird
- [ ] automatisierte Tests vorhanden sind
- [ ] `npx tsc --noEmit` erfolgreich ist
- [ ] `npm run build` erfolgreich ist

---

# 20. Abschlussbericht

Nach der Implementierung berichten:

1. geänderte Dateien
2. neue Dateien
3. Datenmodelle
4. Abhängigkeitsrichtung
5. Tests
6. TypeScript-Ergebnis
7. Build-Ergebnis
8. verbleibende Gaps

**Nicht eigenmächtig mit Auftrag 003 oder Web Worker/IndexedDB weitermachen.**

Nach diesem Auftrag erfolgt erneut ein Architektur-Audit.
