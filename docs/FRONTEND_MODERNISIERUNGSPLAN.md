# LeadPilot – Plan zur technischen Frontend-Modernisierung

## Leitplanken

- Sidebar, Zweiteilung, Routing, Simulationsebenen, bestehende Daten und Geschäftslogik bleiben erhalten.
- Das Farbsystem bleibt: Forest Green als Fläche, Cyan als aktive/positive Aktion, Orange für Risiko/Warnung.
- `Internal Resources` ist ausdrücklich ausgenommen.
- Keine Änderung an Simulation, Engine, Services, Repositories, Persistenz, Run-/Version-Semantik oder Auditdaten.
- Auftrag 021 bleibt der vorherige allgemeine Frontend-Polish. Die Folgeaufträge 022–024 schließen die konkret im Browser belegten Simulations- und Visualisierungslücken, ohne 021 doppelt zu planen.

## Zielarchitektur der Oberfläche

| Ebene | Aufgabe | Visuelles Prinzip |
|---|---|---|
| Command Strip | Simulation steuern und Live-Zustand sehen | Eine primäre Aktion, kompakte sekundäre Aktionen |
| Cockpit-Header | Leitkennzahl, Zielstatus und Handlungsbedarf | Wert, Delta, Ziel und Aussagekraft in einer klaren Einheit |
| Dynamik | Entwicklung, Unsicherheit und Ursachen verstehen | Zeitreihe, Korridor, Zielpfad, Treiber und Event-Stream |
| Operation | Funnel, Kapazität und Warteschlangen steuern | Fluss-/Funnelansicht mit sichtbar gemachten Engpässen |
| Analyse & Audit | Details nachvollziehen und vergleichen | Kontextuell erreichbare, nicht ständig konkurrierende Bereiche |

## Technische Gestaltungsregeln

1. **Kein perspektivisches 3D für Zahlen.** Räumliche Wirkung entsteht über Ebenen, Glow, transparente Bänder und zurückhaltende Motion; Skalen bleiben exakt lesbar.
2. **Wenige wiederverwendbare Chart-Primitives.** Die vorhandenen `Charts.tsx`-/SVG-Komponenten werden um ein zentrales Theme und klar getrennte Renderer erweitert, nicht durch eine neue Bibliothek ersetzt.
3. **Einheitliche Controls.** `Select`, `NumberStepper`, `Modal`, `Tabs`, `StatusChip` und `Toolbar` werden als zugängliche Komponenten umgesetzt. Native Plattform-Overlays sind nur als Touch-Fallback zulässig.
4. **Responsive zuerst.** Unter einem festgelegten Breakpoint wird die Sidebar ein Drawer; breite Tabellen werden zu gestapelten Vergleichskarten oder erhalten eine klar sichtbare Scroll-Hilfe.
5. **Keine Fiktion bei Datenqualität.** Verteilung, Unsicherheit und Vergleich werden erst angezeigt, wenn ihre Datengrundlage ausreichend ist; davor erklären hilfreiche Zustände, was für eine Aussage fehlt.

## Reihenfolge

### Auftrag 022 – Live-Cockpit und Designfundament

- Responsive Sidebar und Layout-Schale.
- Command Strip, priorisierte Aktionshierarchie, Cockpit-Header.
- Simulationsbezogene Controls: Select, NumberStepper, Modal und Tabellenverhalten.
- Management-Ebene als Cockpit; keine Änderung an Stores, Actions, Daten oder Test-IDs.
- Sichtprüfung bei Desktop, Tablet und schmaler Ansicht sowie `npm run verify` und `npm run build`.

### Auftrag 023 – Alle Visualisierungen (außer Internal Resources)

- Zentrales Chart-Theme mit Achsen, Legenden, Tooltips, Statusfarben und reduzierter Bewegung.
- Zeitreihe/Korridor, Funnel/Fluss, Ring+Vergleichsbalken, Waterfall/Impact, Monte-Carlo-Zustände und Szenariovergleich.
- Inhaltliche Richtigkeit von Quantilen, Verteilungen und Zielstatus bleibt durch die vorhandenen Integrity-Tests geschützt.

### Auftrag 024 – Entscheidungsflüsse

- Maßnahmenformular mit klarer Abfolge und Wirkungsvorschau.
- Szenarioverwaltung und Multi-Vergleich mit sichtbarer Referenz und kompakten Auswahlkarten.
- Mobile/Tablet-Varianten für Parameter- und KPI-Matrizen.
- Vollständiger Keyboard-, Fokus- und Dialogdurchlauf.

## Gemeinsame Abnahme für 022–024

- Alle bisherigen Funktionen bleiben über die vorhandenen Navigationswege erreichbar.
- Keine Änderungen an Berechnungen oder fachlichen Daten; nur Präsentationsschicht und UI-Adapter.
- `npx tsc --noEmit`, `npm run verify` und `npm run build` fehlerfrei.
- Kein horizontaler Body-Scroll, keine abgeschnittenen Controls bei 375 px, 768 px und 1440 px.
- Sichtbarer Fokus, bedienbare Dialoge, zugängliche Namen für Buttons und Controls.
- Vorher-/Nachher-Screenshots pro bearbeitetem Flow dokumentiert.
