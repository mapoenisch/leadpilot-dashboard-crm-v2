# LeadPilot Frontend-Design-Audit – 01.09.2026

**Prüfgegenstand:** laufende Anwendung und Quellstand `main`  
**Schwerpunkt:** Simulationsebene, Visualisierungen, Szenario-/Maßnahmen-Controls und Responsive-Verhalten  
**Nicht verändert:** fachliche Logik, Simulation, Persistenz, Architekturentscheidungen, `Internal Resources`

## Belegte Grundlagen

- Der Projektstand enthält ein etabliertes UI-System und eine selbstgeschriebene SVG-/CSS-Chart-Schicht (`src/components/ui/Charts.tsx`); keine externe Chart-Library ist installiert.
- Die laufende Anwendung wurde im Browser geprüft. Als Sichtbelege liegen Executive Dashboard, Management- und Detail-Ebene, Monte-Carlo-Verteilung, Multi-Szenario-Vergleich, Maßnahmen-Dialog sowie offene Szenario-Selects vor.
- Auftrag 021 (`docs/auftraege/ANTIGRAVITY_AUFTRAG_021_FRONTEND_POLISH.md`) existiert bereits. Dieses Dokument ersetzt ihn nicht, sondern beschreibt die nachweisbar verbliebenen bzw. stärker fokussierten Runtime-Gaps.

## Positiver Bestand – bleibt erhalten

- Zweiteilung aus Sidebar und Arbeitsbereich.
- Dunkle Forest-Green-/Cyan-/Orange-Markenwelt.
- Fachlicher Aufbau der Anwendung, alle Navigationspunkte, die vier Simulationsebenen und der gesamte vorhandene Funktionsumfang.
- Das bestehende Diagramm-Rendering als technische Basis; die visuelle Schicht wird darauf aufgebaut statt eine neue Bibliothek einzuführen.

## Priorisierte Befunde

| Priorität | Befund | Sichtbeleg | Auswirkung |
|---:|---|---|---|
| P1 | Die Simulation hat keine dominante Informationshierarchie. Tabs, sechs Aktionen, KPI-Karten, Statusbadges, Text und Charts sind gleichzeitig gleich laut. | Management- und Detail-Ebene | Die Kernfrage „Was passiert gerade, warum und was ist jetzt zu tun?“ ist nicht sofort beantwortbar. |
| P1 | Die schmale Ansicht lässt die breite Desktop-Sidebar offen. Arbeitsbereich, Karten, Filter und Tabellen verlieren nutzbare Breite. | Browserprüfung bei 541 × 912 px | CRM- und Simulationsansichten sind unterwegs bzw. im schmalen Fenster schwer bedienbar. |
| P1 | Native Select-Overlays, Nummern-Spinner und System-Fokus brechen die LeadPilot-Produktfamilie. | Szenario-Auswahl, Vergleichs-Selects, Maßnahmenformular | Der Eindruck ist je Browser unterschiedlich und nicht professionell integriert. |
| P1 | Das Histogramm bei einem einzigen validen Run vermittelt visuell keine belastbare Verteilung. | Monte-Carlo-Häufigkeitsverteilung | Kein Rechenfehler, aber ein unklarer Datenzustand. Der Leer-/Vorbereitungszustand muss ehrlich und erklärend sein. |
| P2 | Maßnahmen- und Multi-Szenario-Dialoge sind großflächig und vermischen Auswahl, Erklärung, Status und Aktion. | Maßnahmen & Wirkungsvorschau, Multi-Szenario-Vergleich | Hohe kognitive Last bei komplexen Entscheidungsflüssen. |
| P2 | Vergleiche verwenden sehr breite Tabellen mit horizontalem Scrollen als Hauptlösung. | Treiber-/Parameter-Matrix, KPI-Gegenüberstellung | Auf schmalen Breiten ist Vergleichbarkeit nicht mehr gegeben. |
| P2 | Vorhandene Charts zeigen Werte, schaffen aber noch keine einheitliche visuelle Entscheidungsführung. | Segmentbalken, Zeitreihe, Histogramm | Ursache, Verlauf, Unsicherheit und Handlung sind zu selten zusammen sichtbar. |

## Zielbild: Live Revenue & Operations Cockpit

1. **Command Strip:** Status, Start/Pause, Tempo, Tick sowie wenige Live-KPIs. Nur Start/Pause ist primär; Reset, Re-Run und technische Aktionen sind sekundär.
2. **Cockpit-Header:** Leitkennzahl mit Delta zur Baseline, Zielstatus, Datenqualität und klarer Handlungshinweis.
3. **Dynamik-Zone:** Zeitreihe mit P10/P90-Band, Zielpfad, Top-Treibern und Event-Stream.
4. **Operative-Zone:** Funnel/Fluss von Lead bis Won, Kapazität und Queue-Engpässe.
5. **Analyse-/Audit-Zone:** Detail, Maßnahmen, Vergleich und Audit bleiben vollständig verfügbar, dominieren aber nicht die Führungsansicht.

## Visualisierungsprinzip

Keine perspektivisch verzerrten 3D-Charts: Sie würden den Vergleich von Geschäftskennzahlen verfälschen. Die gewünschte räumliche Wirkung entsteht durch Layering, Glow, transparente Korridore, gute Tiefenstaffelung, Animation bei Echtzeitdaten und klar kodierte Zustände – bei präzisen zweidimensionalen Skalen.

| Frage | Zielvisualisierung |
|---|---|
| Entwicklung und Unsicherheit | Median-Zeitreihe mit P10/P90-Korridor, Zielpfad und Ereignismarkern |
| Lead-to-Won und Engpässe | Stufen-Funnel plus Fluss- und Kapazitätsansicht |
| Anteil und Rangfolge | Ring mit Gesamtwert plus sortierte Vergleichsbalken |
| Ursache einer Veränderung | Divergierende Impact-Balken oder Waterfall |
| Monte Carlo | Echte Verteilung erst mit ausreichender Run-Anzahl; vorher aussagekräftiger Bereitschaftszustand |
| Szenariovergleich | Verlauf plus Delta-/Impact-Ansicht je Kennzahl, ohne künstlichen Gesamtscore |

## Nächste Auftragsfolge

- **Auftrag 022:** Designfundament im Simulationsbereich, responsive Sidebar, Command Strip und Live-Cockpit.
- **Auftrag 023:** Migration aller Visualisierungen außerhalb von `Internal Resources` auf das neue Visualisierungssystem.
- **Auftrag 024:** Maßnahmen, Szenarioverwaltung, Multi-Vergleich und breite Matrixansichten als zugängliche, responsive Entscheidungsflüsse.

Die Aufteilung hält die Simulation fachlich stabil: Jeder Schritt bleibt test- und screenshotbar, statt alle Ansichten, Charts und Controls in einem nicht prüfbaren Großumbau zu vermischen.
