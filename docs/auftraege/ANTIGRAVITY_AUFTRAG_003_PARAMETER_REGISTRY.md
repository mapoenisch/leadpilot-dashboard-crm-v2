# Antigravity – Auftrag 003
## Zentrale Parameter Registry & Preflight Validation

### Kontext

Projekt: LeadPilot Dashboard-CRM

Verbindliche Grundlagen:

- `ARCHITECTURE_DECISIONS.md`
- `LEADPILOT_GAP_ANALYSIS.md`
- `ANTIGRAVITY_AUFTRAG_001_SIMULATION.md`
- `ANTIGRAVITY_AUFTRAG_002_SZENARIO_RUN.md`

Auftrag 001 (Simulation Core) ist abgeschlossen.
Auftrag 002 (Scenario / ScenarioVersion / Run) ist abgeschlossen.

Die Architektur definiert die sieben steuerbaren V1-Hebel:

1. Marketing-Budget
2. Kanal-Mix
3. Trial-to-Paid
4. Sales-Kapazität
5. Customer-Success-Kapazität
6. Churn
7. Sales Cycle

Die V1-Standardwerte und Wertebereiche sind bereits fachlich festgelegt. Die Parameter Registry soll diese Definitionen zentralisieren und darf keine neuen fachlichen Werte oder Formeln erfinden.

---

# Ziel

Es soll **eine zentrale Parameter Registry** geben, die für jeden steuerbaren Simulationsparameter mindestens folgende Informationen definiert:

- eindeutige technische ID
- Anzeigename
- Datentyp
- Einheit
- Defaultwert
- Minimalwert
- Maximalwert
- Validierungsregeln
- fachliche Beschreibung
- Änderbarkeit durch den Benutzer

Die Registry ist die **Single Source of Truth für Parameterdefinition und Eingabevalidierung**.

Sie darf nicht selbst die Simulationslogik enthalten.

---

# 1. Vor Änderungen

Lies vollständig:

- `ARCHITECTURE_DECISIONS.md`
- `LEADPILOT_GAP_ANALYSIS.md`
- `src/types/scenario.ts`
- `src/simulation/scenarioService.ts`
- `src/simulation/scenarioRepository.ts`
- `src/simulation/engine.ts`
- `src/simulation/eventRules.ts`
- vorhandene Parameter-/Scenario-Dateien
- bestehende Tests

Suche projektweit nach:

- `ScenarioParameters`
- `marketing`
- `budget`
- `channel`
- `trial`
- `sales`
- `customer success`
- `churn`
- `sales cycle`
- `min`
- `max`
- `validation`

Wenn bereits passende Parameterdefinitionen existieren, konsolidieren statt eine zweite Parameterwelt zu erzeugen.

---

# 2. Parameter Definition

Führe einen zentralen Typ für eine Parameterdefinition ein bzw. erweitere einen vorhandenen Typ.

Beispielhafte Struktur:

```text
ParameterDefinition
├── id
├── label
├── description
├── type
├── unit
├── defaultValue
├── min
├── max
├── step
├── userAdjustable
└── validation
```

Die konkrete Struktur darf angepasst werden, wenn der bestehende Code eine bessere Architektur vorgibt.

Wichtig:

**Parameterdefinition ≠ Parameterwert.**

Beispiel:

```text
Registry:
marketingBudget
min = 30000
max = 150000
default = 65000

ScenarioVersion:
marketingBudget = 65000
```

---

# 3. Zentrale Registry

Erstelle eine zentrale Registry, beispielsweise:

`src/simulation/parameterRegistry.ts`

Sie enthält die Definitionen aller V1-Steuerungsparameter.

Mindestens:

### Marketing-Budget

- Einheit: €/Jahr
- Minimum: 30.000
- Maximum: 150.000
- Default: 65.000

### Kanal-Mix

Kanäle:

- LinkedIn-Content
- SEO / Content
- Partner / Empfehlung
- Webinare
- Outbound-E-Mail

V1-Defaults:

- LinkedIn: 38 %
- SEO / Content: 22 %
- Partner / Empfehlung: 18 %
- Webinare: 12 %
- Outbound: 10 %

Die Kanalanteile müssen zusammen 100 % ergeben.

### Trial-to-Paid

- Minimum: 10 %
- Maximum: 40 %
- Default: 18 %

### Sales-Kapazität

- Minimum: 2
- Maximum: 10
- Default: 2

### Customer-Success-Kapazität

- Minimum: 2
- Maximum: 10
- Default: 2

### Ziel-Churn

- Einheit: %/Monat
- Default: 2,8 %/Monat

Der bestehende fachliche Wertebereich ist zu verwenden. Falls der genaue Bereich in der aktuellen Masterdatei nicht maschinenlesbar vorliegt, **nicht erfinden**, sondern die bestehende Quelle im Projekt identifizieren und verwenden.

### Sales Cycle

- Einheit: Tage
- Default: 38 Tage

Auch hier keinen neuen fachlichen Wertebereich erfinden, wenn er nicht bereits im Projekt festgelegt ist.

---

# 4. Historische Werte nicht als Simulationsparameter überschreiben

Die Registry muss strikt zwischen historischen Ebene-A-Werten und steuerbaren Simulationseingaben unterscheiden.

Beispiel:

```text
Historischer Media Spend 2025
        ≠
Simulation Marketing-Budget 2026
```

Die historischen Werte bleiben unverändert.

---

# 5. Kanal-Mix-Validierung

Kanal-Mix benötigt eine eigene fachliche Validierung.

Regeln:

1. Alle fünf Kanäle müssen vorhanden sein.
2. Jeder Anteil muss numerisch und im zulässigen Bereich liegen.
3. Die Summe muss fachlich 100 % ergeben.
4. Floating-Point-Rundungsfehler dürfen nicht zu falschen Ablehnungen führen.
5. Eine ungültige Konfiguration darf nicht stillschweigend als gültig gespeichert werden.

Die vorhandene Entscheidung zur automatischen Normalisierung darf nicht durch eine zweite, widersprüchliche Validierungslogik ersetzt werden.

Falls die bestehende Architektur vorsieht, Eingaben zunächst zu normalisieren und danach zu validieren, diese Reihenfolge beibehalten.

---

# 6. Allgemeine Validierung

Implementiere zentrale Validierungsfunktionen, z. B.:

```text
validateParameter(id, value)
validateScenarioParameters(parameters)
```

Sie müssen strukturierte Fehler zurückgeben.

Mindestens unterscheiden:

- unbekannter Parameter
- falscher Datentyp
- Wert unter Minimum
- Wert über Maximum
- ungültiger Kanal-Mix
- fehlender Pflichtparameter
- ungültige Parameterkombination

Keine stillen Fallbacks.

---

# 7. Preflight Validation

Führe eine zentrale Run-Preflight-Validierung ein.

Vor dem Start eines Runs müssen mindestens geprüft werden:

```text
Scenario vorhanden
ScenarioVersion vorhanden
vollständiger Parametersatz vorhanden
alle Parameter gültig
Parameterkombination gültig
Baseline-Version vorhanden
Model-Version vorhanden
Schema-Version vorhanden
Seed vorhanden
Run-Limit nicht überschritten
```

Das Ergebnis soll strukturiert sein:

```text
PreflightResult
├── valid
├── errors[]
└── warnings[]
```

Ein Run darf bei `valid = false` nicht gestartet werden.

---

# 8. Preflight ist keine Simulation

Preflight darf:

- Parameter validieren
- Versionen prüfen
- Run-Voraussetzungen prüfen
- Konfigurationsfehler melden

Preflight darf NICHT:

- Leads erzeugen
- Events erzeugen
- RNG-Zustand verändern
- Simulationsticks ausführen
- historische Daten verändern

Ein Preflight muss deshalb ohne Seiteneffekte ausführbar sein.

---

# 9. Parameter Registry und ScenarioVersion

`ScenarioVersion.parameters` muss gegen die Registry validiert werden.

Damit gilt:

```text
ScenarioVersion
       ↓
Parameter Registry
       ↓
Validation
       ↓
gültige Version
```

Die Registry definiert die erlaubten Parameter.

Die Version enthält die konkreten Werte.

---

# 10. Application-Service-Integration

`ScenarioService` bleibt die Application-/Orchestrierungsschicht.

Er darf die Registry und Preflight Validation verwenden, aber keine eigene Parameterdefinition duplizieren.

Ziel:

```text
UI
 ↓
ScenarioService
 ↓
Parameter Registry
 ↓
Preflight Validation
 ↓
Run Manifest
 ↓
SimulationEngine
```

Die Engine soll weiterhin keine UI- oder Repository-Verantwortung übernehmen.

---

# 11. Kein Formeleditor

In diesem Auftrag NICHT implementieren:

- mathematische Wirkungsformeln
- neue Marketing-Kurven
- neue Conversion-Faktoren
- neue Churn-Formeln
- neue Sales-Capacity-Formeln
- neue CS-Formeln
- neue Monte-Carlo-Logik

Die fachliche Wirkungslogik ist bereits als eigenes Modell vorgesehen und darf nicht nebenbei durch die Registry entstehen.

---

# 12. UI

Keine große neue UI bauen.

Falls bestehende Slider-/Zahlenfeld-Komponenten aktuell Min/Max/Defaults hart codiert enthalten, dürfen sie auf die Registry umgestellt werden.

Ziel:

```text
UI
 ↓
Registry
```

statt:

```text
UI
 ├── eigener Min-Wert
 ├── eigener Max-Wert
 └── eigener Default-Wert
```

Damit gibt es keine widersprüchlichen Parameterdefinitionen.

---

# 13. Tests

Implementiere mindestens:

### Test A – Registry Vollständigkeit

Alle sieben V1-Steuerungsbereiche sind registriert.

### Test B – Defaultwerte

Die Registry liefert exakt die beschlossenen V1-Defaults.

### Test C – Wertebereiche

Unterhalb/oberhalb eines gültigen Bereichs wird korrekt abgelehnt.

### Test D – Datentypen

Ungültige Datentypen werden abgelehnt.

### Test E – Kanal-Mix

Gültiger Mix mit 100 % wird akzeptiert.

Ungültiger Mix wird abgelehnt bzw. entsprechend der bestehenden Normalisierungsregel behandelt.

### Test F – Vollständiger Parametersatz

Eine ScenarioVersion ohne Pflichtparameter wird vom Preflight abgelehnt.

### Test G – Preflight ohne Seiteneffekt

Preflight verändert weder State noch RNG-State noch Event-Historie.

### Test H – Ungültiger Run

Ein Run mit ungültigen Parametern wird nicht gestartet.

### Test I – Gültiger Run

Ein vollständig gültiger Run passiert Preflight.

### Test J – Historische Ebene A

Parametervalidierung und Preflight verändern die historischen CRM-Daten nicht.

### Test K – Registry Single Source of Truth

UI-/Service-Parameterdefinitionen dürfen keine abweichenden hart codierten Min/Max/Defaultwerte enthalten.

---

# 14. Kompatibilität mit Auftrag 001 und 002

Die bisherigen Eigenschaften müssen erhalten bleiben:

- deterministische Simulation
- Reproduzierbarkeit
- ScenarioVersion-Immutability
- RunManifest-Immutability
- Re-Run mit neuem Seed
- Reproduce mit ursprünglichem Seed/RNG-Zustand
- Ebene-A-Integrität
- vollständige Event-Historie

Die bestehenden Tests aus Auftrag 001 und 002 dürfen nicht verschlechtert werden.

---

# 15. Abschlusskriterien

Der Auftrag ist abgeschlossen, wenn:

- [ ] zentrale Parameter Registry existiert
- [ ] alle V1-Steuerungsparameter zentral definiert sind
- [ ] Defaultwerte zentral definiert sind
- [ ] vorhandene Wertebereiche zentral definiert sind
- [ ] Datentypen zentral definiert sind
- [ ] Einheiten zentral definiert sind
- [ ] Kanal-Mix zentral validiert wird
- [ ] vollständiger Parametersatz validiert wird
- [ ] Preflight Validation existiert
- [ ] Preflight keine Simulations-/RNG-Seiteneffekte hat
- [ ] ungültige Runs nicht gestartet werden
- [ ] ScenarioVersion gegen die Registry validiert wird
- [ ] keine widersprüchlichen UI-Parameterdefinitionen bestehen
- [ ] bestehende Tests aus Auftrag 001 und 002 weiterhin erfolgreich sind
- [ ] neue Tests erfolgreich sind
- [ ] `npx tsc --noEmit` erfolgreich ist
- [ ] `npm run build` erfolgreich ist
- [ ] `npx tsx scripts/verifyIntegrity.ts` erfolgreich ist

---

# 16. Nicht eigenmächtig fortsetzen

Nach Abschluss dieses Auftrags **nicht** mit Web Worker, IndexedDB, Snapshot Store oder Monte-Carlo-Erweiterungen fortfahren.

Zuerst Abschlussbericht liefern.

Danach erfolgt ein Architektur-/Code-Audit.

---

# 17. Abschlussbericht

Bitte berichten:

1. geänderte Dateien
2. neue Dateien
3. Registry-Struktur
4. validierte Parameter
5. Preflight-Ablauf
6. Tests A–K
7. Ergebnisse von TypeScript, Build und Integrity Suite
8. verbleibende Gaps
