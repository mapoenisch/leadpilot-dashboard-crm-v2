# LeadPilot Dashboard-CRM – Architektur-Gap-Analyse

**Stand:** 2026-08-30  
**Basis:** bereitgestellte Projektquellen und konsolidierte Architekturentscheidungen  
**Zweck:** Abgleich der beschlossenen Zielarchitektur mit dem aus den Quellen belegbaren technischen Projektstand.

> **Wichtig:** Die vorliegenden Quellen beschreiben den vorhandenen technischen Stand teilweise nur über Projekt-/Architekturdokumentation. Konkrete Quellcodedateien wie `engine.ts` wurden in den zugänglichen Quellen nicht vollständig als Code bereitgestellt. Daher werden hier keine nicht belegbaren Codebefunde erfunden. Ein tatsächliches Code-Gap wird erst nach Vorlage/Öffnung der entsprechenden Dateien als bestätigt markiert.

---

## 1. Gesamturteil

Die Zielarchitektur ist inzwischen ausreichend konkret, um in eine **technische Gap-Analyse und anschließend gezielte Implementierung** überzugehen.

Die Projektquellen bestätigen bereits wesentliche Grundlagen:

- React / TypeScript / Vite
- Trennung von UI und Simulation
- `ISimulationService`
- Simulation Engine als eigener Baustein
- Web Worker hinter dem Simulation Service
- Repository-/Storage-Abstraktion
- IndexedDB als V1-Speicher für große lokale Simulationsdaten
- Supabase/PostgreSQL für den bestehenden CRM-Bestand
- getrennte historische Ebene A und Simulationsebene B
- vorhandenes LeadPilot-Designsystem als verbindliche Foundation

Diese Grundlagen sind in den Projektquellen ausdrücklich dokumentiert.

---

## 2. Priorisierte GAP-Liste

| ID | Bereich | Ziel | Quellenstand | Bewertung | Priorität |
|---|---|---|---|---|---|
| GAP-001 | Simulation Engine | Pure/deterministische Engine, getrennt von UI | `engine.ts` ist als bestehender Baustein dokumentiert; konkreter Code liegt hier nicht vollständig vor | **Codeprüfung erforderlich** | P0 |
| GAP-002 | Simulation Clock | Zentrale fachliche Simulation Clock + `dayIndex` | Tick-/Zeitmodell ist dokumentiert; konkrete Implementierung muss geprüft werden | **Codeprüfung erforderlich** | P0 |
| GAP-003 | Event Pipeline | Definierter Event-Lifecycle und deterministische Reihenfolge | Events/Event-Rules sind als bestehende Module dokumentiert; konkrete Implementierung muss geprüft werden | **Codeprüfung erforderlich** | P0 |
| GAP-004 | State Machines | Explizite, validierte und atomare State Transitions | Zielarchitektur beschlossen; konkrete Domain-Implementierung muss geprüft werden | **Codeprüfung erforderlich** | P0 |
| GAP-005 | Run Manifest | Versionen, Baseline, Parameter, Seed/RNG etc. unveränderlich speichern | Zielarchitektur beschlossen | **wahrscheinlich Ergänzung erforderlich** | P0 |
| GAP-006 | Snapshots | Unveränderliche Snapshots + Rekonstruktion aus Events | Zielarchitektur beschlossen | **Implementierung prüfen/ergänzen** | P0 |
| GAP-007 | Command Layer | UI → Commands → Application Services → Domain | Zielarchitektur erst in späteren Entscheidungen festgelegt | **wahrscheinlich neu/Erweiterung** | P0 |
| GAP-008 | Application State | UI-State von fachlichem Simulation-State trennen | Zielarchitektur beschlossen | **Implementierung prüfen** | P1 |
| GAP-009 | Parameter Registry | Zentrale Definition von Typ, Einheit, Range, Validierung und Semantik | Zielarchitektur beschlossen | **wahrscheinlich Ergänzung** | P0 |
| GAP-010 | Preflight Validation | Run vor Start vollständig validieren | Zielarchitektur beschlossen | **wahrscheinlich Ergänzung** | P1 |
| GAP-011 | Baseline Versioning | CRM-/Baseline-Snapshot als unveränderlicher Run-Input | Zielarchitektur beschlossen | **Implementierung prüfen** | P0 |
| GAP-012 | Szenarioversionen | Szenario ≠ Version ≠ Run | Architektur vorhanden/beschlossen | **Implementierung prüfen** | P0 |
| GAP-013 | Audit Timeline | Benutzer-, System- und Simulation Events getrennt nachvollziehbar | Zielarchitektur beschlossen | **wahrscheinlich Ergänzung** | P1 |
| GAP-014 | Analytics | Read-only auf konsistenten Snapshots | Analytics-Schicht ist vorgesehen | **Implementierung prüfen** | P0 |
| GAP-015 | KPI-Projektionen | Dashboard nutzt optimierte Projektionen statt Voll-State | Zielarchitektur beschlossen | **Implementierung prüfen** | P1 |
| GAP-016 | Worker Protocol | Strukturierte Kommunikation, Progress, Cancel, Fehler | Worker ist vorgesehen | **Implementierung prüfen** | P0 |
| GAP-017 | Persistenz | Repository/Storage-Adapter und atomare fachliche Persistenz | Abstraktion ist vorgesehen | **Implementierung prüfen** | P0 |
| GAP-018 | Testing | Unit + Integration + E2E + Determinismus/Regression | Tests sind vorgesehen | **Testumfang prüfen/erweitern** | P0 |
| GAP-019 | Designsystem | Neue UI-Komponenten ausschließlich auf bestehender Foundation | Audit: Foundation nutzbar | **Konformität prüfen** | P1 |
| GAP-020 | Management UI | Management → Analyse → Technik, historische/simulierte Ebene getrennt | Architektur klar definiert | **UI-Code prüfen** | P1 |

---

## 3. Was bereits als Architektur-Grundlage gilt

### Datenebenen

**Ebene A – historisch:** unveränderliche Referenzdaten.

**Ebene B – Simulation:** dynamischer Simulationszustand.

Die Simulation darf niemals in die historische Datenwelt zurückschreiben.

### CRM

Der vorhandene CRM-Bestand umfasst laut Projektquellen:

- 20 Unternehmen
- 100 Kontakte
- 40 Funnel Deals

CRM-Datenzugriff erfolgt über eine Repository-Schicht. Supabase/PostgreSQL ist für den CRM-Bestand vorgesehen.

### Simulation

Der bestehende technische Aufbau sieht grundsätzlich vor:

`UI → Simulation Service → Simulation Engine → State / Events`

Parallel:

`State / Events → Analytics → Dashboard / Reports`

Storage:

`Storage Abstraction → IndexedDB V1 → später optional Backend / Cloud`

Diese Architektur ist bereits in den Projektquellen dokumentiert.

---

## 4. Was NICHT gemacht werden soll

### Kein Big-Bang-Rewrite

Der vorhandene `engine.ts` soll nicht blind ersetzt werden.

Stattdessen:

1. vorhandenen Code öffnen
2. gegen Zielarchitektur prüfen
3. konforme Teile erhalten
4. Abweichungen gezielt refaktorieren
5. fehlende Bausteine ergänzen
6. Tests ausführen

### Kein zweites Designsystem

Das bestehende LeadPilot-Designsystem bleibt Foundation.

Neue Komponenten wie:

- KPI Card
- Trend Chart
- Confidence Band
- Funnel Chart
- Risk Indicator
- Bottleneck Card
- Scenario Card
- Simulation Progress
- Event Timeline

werden darauf aufgebaut.

---

## 5. Technische Prüf-Reihenfolge

### P0 – zuerst prüfen

1. `src/simulation/engine.ts`
2. `src/simulation/simulationService.ts`
3. `src/simulation/eventRules.ts`
4. `src/simulation/ISimulationService.ts`
5. vorhandene Simulation-Tests
6. Domain-/State-Strukturen
7. Storage-/Repository-Schicht

### P1 – danach

8. Szenario-/Parameterlogik
9. Analytics
10. Simulation UI
11. Dashboard
12. Designsystem-Integration
13. Worker-Kommunikation

### P2 – anschließend

14. Audit-/Diagnose-UI
15. Performance-/Observability-Details
16. Release-/Deployment-Qualität

---

## 6. Nächster konkreter Arbeitsschritt

**Nicht weiter Architekturfragen stellen.**

Der nächste Schritt ist die **Datei-für-Datei-Codeprüfung**.

Benötigt werden dafür insbesondere die tatsächlichen Inhalte von:

```text
src/simulation/engine.ts
src/simulation/simulationService.ts
src/simulation/eventRules.ts
src/simulation/ISimulationService.ts
src/simulation/__tests__/simulationIntegrity.test.ts
src/features/simulation/LiveDashboardView.tsx
src/components/layout/SimulationBar.tsx
```

sowie die vorhandenen Domain-, Context-, Service- und Storage-Dateien.

Erst danach werden die GAPs von:

**„Codeprüfung erforderlich“**

zu:

**„OK / Refactoring / Neu implementieren“**

klassifiziert.

---

## 7. Arbeitsregel für Antigravity

Antigravity soll bei der Umsetzung niemals nur aufgrund dieser Gap-Liste Dateien neu erfinden.

Für jeden GAP gilt:

**bestehenden Code lesen → Architekturregel zuordnen → kleinste sinnvolle Änderung bestimmen → implementieren → Tests → Ergebnis dokumentieren**

Dabei bleiben bestehende funktionierende Teile erhalten, sofern sie mit der Zielarchitektur kompatibel sind.

---

## 8. Status

**Architekturentscheidungen:** bis 1873 dokumentiert.

**Architekturphase:** vorerst abgeschlossen.

**Aktuelle Phase:** Gap-Analyse.

**Nächster Meilenstein:** bestätigte Code-Gap-Liste.

**Danach:** gezielte Refactor-/Implementierungsaufträge für Antigravity.
