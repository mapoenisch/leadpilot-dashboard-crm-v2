# ANTIGRAVITY AUFTRAG 022 — Live-Simulation-Cockpit & responsive UI-Fundament

**Phase:** 6 · **Gate:** G6  
**Status:** DRAFT / SPEZIFIKATION  
**Referenzen:** `docs/FRONTEND_DESIGN_AUDIT_2026-09-01.md`, `docs/FRONTEND_MODERNISIERUNGSPLAN.md`, Auftrag 021, `readme.md`, `src/styles/global.css`  
**Voraussetzung:** aktueller `main` ist buildbar; vor jedem Umbau `npm run verify` als Baseline ausführen.

---

## 1. Ziel

Die Live-Simulation wird visuell und technisch zu einem modernen **Live Revenue & Operations Cockpit** umgebaut. Sie muss auf Desktop, Tablet und schmalen Ansichten gut steuerbar und lesbar sein.

Der vollständige Funktionsumfang bleibt erhalten: Simulation starten/pausieren, Tempo, Tick, Runs, Re-Run, Reset, Szenarien, Maßnahmen, Vergleich, Detail, Audit, Snapshots, Quantile und Event-Informationen. Die Änderung betrifft ausschließlich Präsentation, Layout und zugängliche UI-Adapter.

Auftrag 021 enthält den allgemeinen Frontend-Polish. Auftrag 022 plant ihn nicht erneut, sondern setzt die konkret belegten Restlücken im Simulationsbereich um.

## 2. Unverrückbare Grenzen

- Sidebar und die Zweiteilung der Anwendung bleiben; sie wird nur responsiv ein-/ausblendbar.
- Die Dark-Forest-Green-/Cyan-/Orange-Farbwelt bleibt unverändert in ihrer Semantik. Cyan ist die einzige primäre Aktionsfarbe, Orange signalisiert Risiko/Warnung.
- `Internal Resources` bleibt vollständig unverändert.
- Keine Änderungen in `src/simulation/**`, Engine, Services, Repositories, Persistenz, Run-/Version-Modell, Berechnungen oder Architekturentscheidungen.
- Kein Wechsel zu Tailwind, CSS-Modules oder einer neuen Chart-Bibliothek.
- Keine perspektivisch verzerrten 3D-Diagramme. Räumlichkeit nur durch Layering, Glow, transparente Korridore und dezente Motion; Datenwerte müssen exakt vergleichbar bleiben.
- Keine Emoji als neue UI-Icons. Bestehende Symbolik darf mit `lucide-react` vereinheitlicht werden.

## 3. Ist-Befunde, die dieser Auftrag lösen muss

1. In der Simulation stehen Tabs, sechs Aktionen, Status, KPI-Karten und Charts gleichwertig nebeneinander; die Führungsfrage „Was passiert, warum, was tun?“ wird nicht priorisiert beantwortet.
2. Bei schmaler Breite bleibt die Desktop-Sidebar offen und nimmt dem Inhalt entscheidende Breite.
3. Native Select-Overlays, Number-Spinner und Plattform-Fokus passen nicht zur LeadPilot-Produktsprache.
4. Maßnahmen- und Vergleichsdialoge brauchen eine klarere Zonierung sowie Basis-Accessibility.
5. Tabellen brauchen responsive, sichtbare Überlaufstrategie statt unkommentierten Horizontal-Scroll.

## 4. Umsetzung

### Schritt 0 — Sicheres Inventar und Baseline

1. Vor Änderungen `git status --short`, `npm run verify` und `npm run build` ausführen; Ergebnis in `docs/BUILD_LOG.md` erfassen.
2. Nur Dateien in `src/components/**`, `src/features/simulation/**`, `src/styles/**`, `docs/**` und ggf. `readme.md` bearbeiten. Jede abweichende Datei vorher begründen und dokumentieren.
3. Vorher-Screenshots der Management-Ebene, Detail-Ebene, Maßnahmen-Dialog und Multi-Szenario-Vergleich bei 1440 px, 768 px und 375 px erstellen und in `docs/` ablegen.

### Schritt 1 — Responsive App-Schale

1. Die Desktop-Sidebar in ihrer aktuellen Informationsarchitektur erhalten.
2. Unter einem nachvollziehbaren Breakpoint (empfohlen: 1024 px) als Drawer umsetzen:
   - zugänglicher Menübutton im Header,
   - Overlay mit Schließen per Escape, Klick außerhalb und Navigation,
   - Fokusführung und Rückgabe des Fokus,
   - Hauptinhalt nutzt im geschlossenen Zustand die volle Breite.
3. Header und SimulationBar dürfen bei kleineren Breiten umbrechen oder sich stapeln; Start/Pause, Zustand und Leit-KPI müssen sichtbar bleiben.
4. Kein horizontaler Body-Scroll bei 375 px, 768 px und 1440 px.

### Schritt 2 — UI-Primitives im Simulationskontext

1. Bestehende Primitives tokenbasiert ergänzen bzw. härten:
   - `Modal`: Dialog-Semantik, `aria-modal`, Titel-Verknüpfung, Escape, Focus Trap, Fokus-Rückgabe, sichtbarer Close-Button mit Namen, `max-height`/internes Scrolling.
   - `Select`: LeadPilot-konforme Trigger-/Optionsansicht mit Tastatursteuerung, sichtbarem Fokus, Auswahlstatus und optionalem nativen Touch-Fallback. Keine sichtbaren Desktop-macOS-Overlays.
   - `NumberStepper`: Einheit, Min/Max/Step, Plus/Minus, direkte Eingabe, Fehler-/Hilfetext, `aria-invalid`/`aria-describedby` bei Fehlern. Browser-Spinner nicht als sichtbares Designelement verwenden.
   - `Table`: klarer Overflow-Wrapper; auf schmalen Simulation-/Vergleichsansichten eine gestapelte bzw. verdichtete Alternative vorbereiten.
   - `StatusChip` und `Toolbar`: eine gemeinsame Variante für Datenqualität, Zielstatus, Run-Status und sekundäre Aktionen.
2. Bestehende Datenattribute, Button-Texte und Testanker nicht unnötig ändern.

### Schritt 3 — Simulation als Cockpit neu zusammensetzen

1. **Command Strip:** Run-Zustand, Start/Pause, Tempo, Tick und Live-KPIs. Nur Start/Pause ist die visuell primäre Aktion. Re-Run, Reset und technische Aktionen in eine sekundäre, weiterhin klar erreichbare Gruppe legen.
2. **Cockpit-Header der Management-Ebene:**
   - eine Leitkennzahl mit Wert, Delta zur Baseline, Zielstatus und kurzer Management-Aussage,
   - Szenario, Run-Fortschritt und Datenqualität als sekundäre Statuschips,
   - Tabs bleiben vollständig erhalten, aber mit klarer aktiver Markierung und Keyboard-Semantik.
3. **Informationshierarchie:** Die erste sichtbare Zone beantwortet Ergebnis, Zielstatus und nächste Handlung. Detail- und Audit-Informationen bleiben über Tabs/sekundäre Bereiche erreichbar, verdrängen die Leitkennzahl aber nicht.
4. **Keine neue fachliche Deutung:** Die Oberfläche darf nur vorhandene Werte, Status und Hinweise darstellen. Keine Scores, Schwellen oder Empfehlungen erfinden.

### Schritt 4 — Bestehende zentrale Visualisierungen visuell einbetten

1. Die vorhandene Zeitreihenlogik (`KpiTimeSeriesDetailView`) unverändert lassen, aber die Darstellung rahmen: klare Legende, Median-Führungslinie, dezenter P10/P90-Korridor, Zielpfad und Ereignismarker.
2. Bei weniger als ausreichenden validen Monte-Carlo-Läufen keinen pseudo-aussagekräftigen Chart erzeugen. Stattdessen den vorhandenen Datenstand, die Aussagegrenze und eine klare nächste Aktion anzeigen.
3. Neue, umfangreiche Funnel-, Ring-, Flow- und Impact-Renderer gehören explizit in Auftrag 023. In Auftrag 022 nur die Cockpit-Flächen und die vorhandenen Charts optisch einordnen.

### Schritt 5 — Dialoge im Simulationskontext

1. `MeasureManagerModal`, `ScenarioManagerModal` und `MultiScenarioComparisonModal` nur so weit anpassen, wie es für die neuen Modal-/Select-/Stepper-Primitives und klare Abschnitte nötig ist.
2. Maßnahmenformular in sichtbare Bereiche gliedern: Beschreibung → Zeitfenster → Treiber → Intensität → Wirkungsvorschau → Speichern.
3. Referenzszenario im Vergleich jederzeit eindeutig markieren; keine künstliche Gesamtwertung einführen.
4. Größere Inhaltserweiterungen und die vollständige responsive Vergleichsansicht bleiben Auftrag 024 vorbehalten.

## 5. Abnahmekriterien (Gate G6)

- [ ] Alle vorhandenen Simulationsfunktionen bleiben erreichbar und verhalten sich fachlich unverändert.
- [ ] `npx tsc --noEmit`, `npm run verify` und `npm run build` laufen fehlerfrei.
- [ ] Sidebar bleibt auf Desktop unverändert nutzbar und ist unter dem Breakpoint als zugänglicher Drawer bedienbar.
- [ ] Bei 375 px, 768 px und 1440 px: kein horizontaler Body-Scroll, keine abgeschnittenen Kerncontrols, keine überlappenden Elemente.
- [ ] Command Strip hat genau eine primäre Aktion; sekundäre Aktionen bleiben erreichbar.
- [ ] Modal, Select und NumberStepper sind per Tastatur nutzbar, haben sichtbaren Fokus und zugängliche Namen.
- [ ] Monte-Carlo-Ansicht kommuniziert bei geringer Run-Anzahl die Aussagegrenze klar, ohne Werte oder Statistik zu verfälschen.
- [ ] `Internal Resources` sowie die fachliche Simulations-/Persistenzschicht weisen keinen Diff auf.
- [ ] Vorher-/Nachher-Screenshots der vier Baseline-Flows sind in `docs/` dokumentiert; `docs/BUILD_LOG.md` enthält den Gate-G6-Eintrag.

## 6. Abschlussbericht

Der Abschlussbericht muss enthalten:

1. Liste der veränderten Dateien mit kurzer Begründung.
2. Nachweis der unveränderten Fachschicht und der ausgeführten Prüfungen.
3. Screenshots bei 1440 px, 768 px und 375 px.
4. Offene Punkte, die bewusst an Auftrag 023 bzw. 024 übergeben werden.
5. Keinen Claim über vollständige Accessibility-Konformität ohne tatsächlich durchgeführten Keyboard-/Screenreader-Test.
