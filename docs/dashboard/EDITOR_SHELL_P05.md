# Dashboard-Editor: Vier-Zonen-Shell, Bibliothek und Inspector (P05)

**Stand:** 11.11.2026  
**Status:** Baugrundlage und Architekturspezifikation für Paket P05  
**Bezug:** [Dashboard-Editor-Masterplan, Revision 2](./DASHBOARD_EDITOR_MASTERPLAN.md), [EDITOR_UX_FACHVERTRAEGE_145.md](./EDITOR_UX_FACHVERTRAEGE_145.md) und [EDITOR_KERN_P04.md](./EDITOR_KERN_P04.md)  
**Autor:** Antigravity (Builder) · **Prüfung:** Unabhängiges Review durch Codex  

---

## 1. Einleitung und Zielsetzung

Paket P05 realisiert die sichtbare Vier-Zonen-Arbeitsumgebung für den neuen LeadPilot Dashboard-Editor (V2). Aufbauend auf dem in Paket P04 entkoppelten Editor-Kern (`DashboardEditorCore`, reversible Commands, unbegrenztes Undo/Redo, Eingabebündelung) verbindet P05 die Benutzeroberfläche mit den bestehenden Kachel- und Diagramm-Renderern, stellt eine durchsuchbare Widget-Bibliothek sowie einen multifunktionalen Inspector bereit und ermöglicht über den Rollout-Schalter `VITE_DASHBOARD_EDITOR_V2` einen sicheren, isolierten Pilotzugang.

### 1.1 Leitprinzipien der Shell

1. **WYSIWYG auf 12 Spalten:** Der Canvas spiegelt während der Bearbeitung die reale Anordnung wider. Ein Umschalter erlaubt die direkte Reinvorschau (ohne Editor-Gitter und Panels).
2. **Entkopplung & Zustandsstabilität:** Sämtliche Editor-Aktionen laufen über den Reversible-Command-Bus aus P04 (`execute`, `undo`, `redo`). UI-Zustand (wie ausgewählte Kachel, aktiver Tab, offene Seitenleisten) ist strikt flüchtig und wird niemals in die persistierte Dashboard-Konfiguration geschrieben.
3. **Wiederverwendung erprobter Renderer:** Alle bestehenden Diagramme und Kennzahlenkacheln (`LazyDashboardTile`, `DashboardTile`, `DashboardChart`) werden ohne Duplizierung direkt angebunden.
4. **Keine Beeinträchtigung regulärer Nutzer:** Standardmäßig bleibt `VITE_DASHBOARD_EDITOR_V2 = false`. Reguläre Nutzer arbeiten weiterhin im bewährten V1-Arbeitsbereich (`DashboardWorkspace.tsx`).

---

## 2. Zonen-Architektur der Shell

```text
+---------------------------------------------------------------------------------------------------------+
| Zone 1: Top-Bar (Dashboard-Auswahl, Scope, Titel*, Globale Filter, Live/Pause, Breakpoints, Vorschau)   |
+--------------------------+---------------------------------------------------+--------------------------+
| Zone 2: Widget-Pallette  | Zone 3: 12-Spalten Canvas (WYSIWYG)               | Zone 4: Inspector        |
| (Breite: ~260 px)        |                                                   | (Breite: ~320 px)        |
| - Suchfeld               |  +--------------------+   +---------------------+ | - Tabs:                  |
| - Kategorien (Pills)     |  | Kachel 1 (6 Sp.)   |   | Kachel 2 (6 Sp.)    | |   1. Daten & Filter      |
| - Kachelkarten           |  +--------------------+   +---------------------+ |   2. Darstellung         |
|   (Klick/Drag-Add)       |  +----------------------------------------------+ |   3. Schwellenwerte      |
| - 24-Kachel-Budget       |  | Kachel 3 (12 Sp. / Selektionsrahmen aktiv)   | |   4. Interaktion         |
|                          |  +----------------------------------------------+ | - Leerzustand bei Desel. |
+--------------------------+---------------------------------------------------+--------------------------+
| Zone 5: Statusleiste (Verbindungszustand, Datenaktualität, Kachelzähler 12/24, Revisions-/Undo-Stand)    |
+---------------------------------------------------------------------------------------------------------+
```

### 2.1 Zone 1: Top-Bar (`EditorTopBarV2`)

- **Dashboard-Titel:** Klickbare Inline-Bearbeitung des Titels mit Änderungsmarkierung (Stern `*` und Status-Dot bei `isDirty = true`).
- **Scope-Kennzeichnung:** Optische Unterscheidung zwischen persönlichem Dashboard (`Scope: Persönlich`, blau), geteiltem Team-Dashboard (`Scope: Team`, violett) und Organisationsstandard (grün).
- **Globale Filter:**
  - Standard-Zeitraum-Auswahl (`Heute`, `7 Tage`, `30 Tage`, `Quartal`, `Jahr`, `Gesamt`).
  - Standard-Pipeline-Filter (wirkt auf alle Kacheln ohne kachelspezifischen Override).
- **Live-Streaming Steuerung:** Schalter für Pause/Wiedergabe von Live-Daten zur Beruhigung der Ansicht während des Layoutierens.
- **Breakpoint-Wahlschalter:** Vorschauumschaltung für Desktop (12 Spalten), Tablet (6 Spalten) und Mobile (1 Spalte).
- **Vorschau-Modus:** Blendet Widget-Bibliothek, Inspector und Bearbeitungswerkzeuge aus, um das Dashboard in Reinform zu betrachten.
- **Aktionen:** Undo (`Cmd+Z`), Redo (`Cmd+Shift+Z`), Abbrechen (mit Navigationsschutz) und Speichern.

### 2.2 Zone 2: Widget-Bibliothek (`WidgetLibraryV2`)

- **Katalogintegration:** Bezieht alle freigegebenen Kennzahlen aus `DASHBOARD_CATALOG`.
- **Suchfunktion:** Filtert in Echtzeit über Kachelname, Kategorie, Einheiten und Quell-ID.
- **Kategorie-Pills:** Schnellauswahl nach Domänen (`Alle`, `CRM & Vertrieb`, `Finanzen & SaaS`, `Live-Performance`, `Kombination`).
- **Kachel-Karten:**
  - Titel, empfohlene Standarddimensionen (`w × h`), unterstützte Visualisierungs-Icons und Herkunfts-Badge.
  - Hinzufügen-Aktion: Klick auf `+ Hinzufügen` erzeugt einen `AddTileCommand` an der nächsten freien Position im 12-Spalten-Raster.
  - Budget-Schutz: Sobald 24 Kacheln belegt sind, wird das Hinzufügen deaktiviert und ein Hinweis eingeblendet.
- **Collapsible:** Einklappbar für maximale Arbeitsfläche auf mittleren Bildschirmen.

### 2.3 Zone 3: Canvas (`EditorCanvasV2`)

- **Responsive Raster:**
  - Desktop: 12 Spalten (`grid-cols-12`).
  - Tablet: 6 Spalten (`grid-cols-6`).
  - Mobile: 1 Spalte (`grid-cols-1`).
- **Kachel-Selektion:**
  - Klick auf eine Kachel aktiviert ihren Selektionsrahmen (`ring-2 ring-primary border-primary`).
  - Tastatur `Escape` oder Klick auf freien Canvas hebt die Selektion auf.
- **Kachel-Werkzeugleiste im Bearbeitungsmodus:**
  - Aktionen: Duplizieren (`AddTileCommand` mit Klon-Konfiguration), Löschen (`RemoveTileCommand`), Bearbeiten im Inspector.
- **Renderer-Bridge:**
  - Jede V2-Kachel (`DashboardTileConfigV2`) wird über eine Adapterbrücke in die V1-Schnittstelle von `LazyDashboardTile` überführt, sodass 100 % aller bestehenden Diagramme (Säulen, Linien, Sparklines, Gauges, Funnels, Donuts) ohne Code-Duplizierung gerendert werden.

### 2.4 Zone 4: Inspector (`EditorInspectorV2`)

- **Leerzustand (keine Kachel selektiert):**
  - Zeigt Dashboard-Metadaten (Titel, Scope, Mandant, Kachelbudget) und allgemeine Filter.
  - Gibt praxisnahe Tipps zur Anordnung und Tastatur-Shortcuts.
- **Kachel-Inspektion (Kachel selektiert):**
  - **Tab 1: Daten & Filter:**
    - Kennzahlen-Metadaten (Katalog-ID, Datenquelle, Einheit).
    - Pipeline-Override (vom Dashboard erben oder fixieren).
    - Zeitraum-Override.
    - Aggregationsauswahl.
  - **Tab 2: Darstellung:**
    - Darstellungsart (Zahl, Balken, Linie, Donut, Tabelle, Trichter, Gauge, etc.).
    - Kacheltitel mit Debounce-Eingabebündelung (`recordTextInput`).
    - Visuelle Optionen (Legende, Präfix, Suffix, Nachkommastellen).
  - **Tab 3: Schwellenwerte:**
    - Warn- und Kritisch-Grenzwerte mit Operatoren (`>`, `<`, `>=`, `<=`, `Zwischen`).
  - **Tab 4: Interaktion:**
    - Drilldown-Ziele (CRM-Pipeline, Detailansicht).

### 2.5 Zone 5: Statusleiste (`EditorStatusBarV2`)

- **Verbindungsindikator:** Zeigt aktuellen Transport- und Streaming-Zustand.
- **Aktualitätsstempel:** Exakter Zeitstempel des letzten Datenabrufs.
- **Kachelbudget:** Zähler `X / 24 Kacheln belegt` (Warnstufe ab 20 Kacheln).
- **Historie & Speicher:** Anzeige der verfügbaren Undo-Schritte und des dynamisch überwachten Speicherbedarfs (Soft-Limit 15 MiB).

---

## 3. V1→V2-Kopiermigration (`dashboardMigrationV1V2.ts`)

Um bestehende Dashboards aus V1 verlustfrei im neuen V2-Editor zu öffnen, implementiert P05 den deterministischen Transformationsalgorithmus aus P03 §5:
- Größenklassen (`klein`, `mittel`, `gross`, `voll`) werden in standardisierte Rasterdimensionen überführt:
  - `klein` → Desktop `3×3`, Tablet `3×3`, Mobile `1×3`
  - `mittel` → Desktop `6×4`, Tablet `6×4`, Mobile `1×4`
  - `gross` → Desktop `9×5`, Tablet `6×5`, Mobile `1×5`
  - `voll` → Desktop `12×6`, Tablet `6×6`, Mobile `1×6`
- Sequenzielle Kacheln werden zeilenweise kollisionsfrei auf dem 12-Spalten-Raster platziert.
- Kachel-IDs, Metrik-Bezüge, Ansichten und benutzerdefinierte Filter bleiben 1:1 erhalten.
- Metadaten kennzeichnen die Konfiguration als `migrated_from_v1: true`.
