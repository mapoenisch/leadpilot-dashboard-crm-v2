# Auftrag 148 – Dashboard-Editor: Vier-Zonen-Shell, Bibliothek und Inspector (P05)

**Ziel:** Implementierung der Vier-Zonen-Shell (Top-Bar, linke Widget-Bibliothek, Canvas in der Mitte, rechter Inspector sowie Statusleiste unten) für den neuen Dashboard-Editor (V2) auf Basis des entkoppelten Editor-Kerns (P04). Anbindung der bestehenden Kachel- und Diagramm-Renderer (`DashboardTile`, `LazyDashboardTile`, `DashboardChart`), interaktives Hinzufügen, Auswählen, Bearbeiten und Löschen von Kacheln, Bereitstellung der 4 Inspector-Tabs (Daten & Filter, Darstellung, Schwellenwerte, Interaktion) sowie sichere Einbindung des internen Pilotzugangs hinter dem Rollout-Schalter `VITE_DASHBOARD_EDITOR_V2` bei 100 % unveränderter Stabilität des V1-Bestandspfads für reguläre Nutzer.

**Masterplan:** [Dashboard-Editor-Masterplan, Revision 2](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), insbesondere P05 sowie Abschnitte 3.1, 4.A, 5 und 6.

**Vorgelagert:**
- [Auftrag 144 (Bestandsprüfung, PR #168)](./ANTIGRAVITY_AUFTRAG_144_DASHBOARD_EDITOR_BESTANDSPRUEFUNG.md)
- [Auftrag 145 (UX-Konzept & Fachverträge, PR #169)](./ANTIGRAVITY_AUFTRAG_145_DASHBOARD_EDITOR_UX_FACHVERTRAEGE.md) mit [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md)
- [Auftrag 146 (Grid-Vergleich & Ziel-Speichermodell, PR #170)](./ANTIGRAVITY_AUFTRAG_146_DASHBOARD_EDITOR_GRID_ZIEL_SPEICHERMODELL.md) mit [GRID_VERGLEICH_ZIELMODELL_146.md](../dashboard/GRID_VERGLEICH_ZIELMODELL_146.md)
- [Auftrag 147 (Entkopplung des Editor-Kerns, PR #171 & #172)](./ANTIGRAVITY_AUFTRAG_147_DASHBOARD_EDITOR_KERN_ENTKOPPELN.md) mit [EDITOR_KERN_P04.md](../dashboard/EDITOR_KERN_P04.md)

**Baseline:** `main`, Commit `815ce21` (nach Merge von PR #172).

**Builder:** Antigravity. **Prüfer:** Codex (chatgpt-codex-connector auf GitHub) gemäß `CLAUDE.md` §4.1. **Merge und Release:** Marc.

**Status:** BEREIT ZUR PRÜFUNG (PR wird eröffnet).

---

## 1. Ergebnis dieses Auftrags

Dieser Auftrag setzt Paket P05 aus dem Dashboard-Editor-Masterplan um. Er schafft die sichtbare Arbeitsumgebung für den neuen Dashboard-Editor und integriert den in P04 entkoppelten Editor-Kern in eine vollwertige, reaktive Benutzeroberfläche.

Am Ende liegen vor:

1. **Vier-Zonen-Shell (`src/features/dashboard/components/editor/DashboardEditorShellV2.tsx`):**
   - Nahtlose Koordination von Top-Bar, Widget-Bibliothek, Canvas, Inspector und Statusleiste.
   - Reaktiver Bearbeitungsmodus und umschaltbarer Vorschau-Modus (WYSIWYG-Reinvorschau ohne Hilfsrahmen und Panels).
   - Responsive Anpassung: Einklappbare Seitenleisten (Bibliothek links, Inspector rechts) für mobile Bildschirme und kompakte Arbeitsansichten.
2. **Top-Bar (`src/features/dashboard/components/editor/EditorTopBarV2.tsx`):**
   - Dashboard-Titel mit Inline-Bearbeitung, Dirty-Stern (`*`) und Statusanzeige.
   - Dashboard-Scope-Badge (`Persönlich`, `Team`, `Organisation`).
   - Breakpoint-Wahlschalter (Desktop 12 Spalten, Tablet 6 Spalten, Smartphone 1 Spalte).
   - Globale Filter (Zeitraum-Schnellauswahl, Pipeline-Filter).
   - Live/Pause-Schalter für Datenaktualisierungen.
   - Vorschau-Umschalter (Preview-Modus an/aus).
   - Undo/Redo-Aktionen mit Tooltips und Tastatur-Shortcuts.
   - Speichern- und Abbrechen-Schaltflächen mit Bestätigungsdialog bei ungespeicherten Änderungen.
3. **Widget-Bibliothek (`src/features/dashboard/components/editor/WidgetLibraryV2.tsx`):**
   - Palette der freigegebenen Kennzahlen aus `DASHBOARD_CATALOG`.
   - Live-Suche nach Name, Kategorie und ID.
   - Kategorie-Filter (Alle, CRM & Vertrieb, Finanzen & SaaS, Live, Kombination).
   - Kennzahlen-Karten mit Darstellungs-Icons, Standardgrößen und Herkunfts-Badges (`CRM`, `Baseline`, `Live`, `Kombi`).
   - Hinzufügen-Aktionen per Klick (Auto-Placement an nächster freier Rasterposition via `AddTileCommand`) und Vorbereitung für Drag-and-Drop.
   - Kachel-Budget-Prüfung: Deaktivierung bei 24 Kacheln mit verständlicher Begründung.
4. **Canvas mit Kachel-Auswahl & Renderer-Anbindung (`src/features/dashboard/components/editor/EditorCanvasV2.tsx`):**
   - 12-Spalten-Layout (Desktop) bzw. 6-Spalten (Tablet) und 1-Spalte (Mobile).
   - Vollständige Anbindung der bestehenden Kachel- und Diagramm-Renderer (`LazyDashboardTile`, `DashboardTile`, `DashboardChart`).
   - Kachel-Selektion per Klick mit sichtbarem Akzentrahmen (`ring-2 ring-primary`) und Deselektion per Klick außerhalb oder `Escape`.
   - Schnelle Kachel-Aktionen im Bearbeitungsmodus (Löschen via `RemoveTileCommand`, Duplizieren via `AddTileCommand`, Bearbeiten im Inspector).
   - Aussagekräftiger Leerzustand, wenn noch keine Kacheln platziert sind.
5. **Inspector (`src/features/dashboard/components/editor/EditorInspectorV2.tsx`):**
   - Leerzustand mit allgemeinen Dashboard-Einstellungen (Titel, Scope, Standardzeitraum, globaler Pipeline) und Schnelleinstieg.
   - Detailansicht für die ausgewählte Kachel mit 4 strukturierten Tabs:
     - **Tab 1: Daten & Filter:** Kennzahl-Info, Zeitraum-Override, Pipeline-Override, Aggregation.
     - **Tab 2: Darstellung:** Darstellungsart (Zahl, Balken, Linie, Donut, Tabelle, Trichter, etc.), Titel mit Debounce-Eingabe via `recordTextInput`, visuelle Optionen.
     - **Tab 3: Schwellenwerte:** Warn- und Kritisch-Grenzwerte mit Operatoren.
     - **Tab 4: Interaktion:** Drilldown-Ziele (CRM-Pipeline, Details).
6. **Statusleiste (`src/features/dashboard/components/editor/EditorStatusBarV2.tsx`):**
   - Verbindungsstatus (`Verbunden`, `Pausiert`, `Offline`).
   - Datenstand-Zeitstempel.
   - Kachel-Budget-Anzeige (`X / 24 Kacheln`) mit optischer Warnung ab 20 Kacheln.
   - Speicher- und Revisions-Status aus `historyStats` (Undo-Schritte, Speicherbedarf).
7. **Deterministische V1→V2-Kopiermigration (`src/features/dashboard/model/dashboardMigrationV1V2.ts`):**
   - Vollständige Umsetzung des in P03 (§5) spezifizierten Kopiermigrations-Algorithmus zur verlustfreien Überführung existierender V1-Konfigurationen in V2.
8. **Pilot-Integration & Rollout-Umschalter:**
   - Einbindung in `PersonalExecutiveDashboard.tsx`: Bei aktiviertem `isDashboardEditorV2Enabled()` startet die V2-Shell.
   - Einfacher Beta-Pilot-Toggle für berechtigte Tester; V1 bleibt Standard (`false`) für alle regulären Nutzer.
   - Vorschau-Erweiterung in `DashboardPreviewPage.tsx` für entwicklerseitige Begutachtung ohne Login (`?bereich=editor_v2`).
9. **Vitest-Testsuite & Architekturdokumentation:**
   - Vollständige Unittests für Shell, TopBar, Library, Canvas, Inspector, StatusBar und Kopiermigration.
   - Dokumentation unter `docs/dashboard/EDITOR_SHELL_P05.md`.

---

## 2. Verbindliche Grenzen

1. `CLAUDE.md` strikt einhalten. Die Schutzbereiche (`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`) bleiben unangetastet (Diff = 0 Bytes).
2. Der bestehende V1-Editor (`src/features/dashboard/components/DashboardWorkspace.tsx`, `useDashboardEditor.ts`, etc.) bleibt für reguläre Nutzer voll funktionsfähig und darf nicht gebrochen werden.
3. Keine neuen externen npm-Abhängigkeiten. Die Shell und Komponenten nutzen vorhandene UI-Primitives (`Button`, `Badge`, `Modal`, `lucide-react`, `Tailwind CSS`).
4. Keine unzulässigen Kennzahlen oder fremde Datenquellen erfinden; ausschließlich Kennzahlen aus `DASHBOARD_CATALOG` verwenden.

---

## 3. Ziel-Dateien

| Pfad | Erlaubte Änderung / Zweck |
| :--- | :--- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_148_DASHBOARD_EDITOR_SHELL_BIBLIOTHEK_INSPECTOR.md` | Dieser Auftrag |
| `docs/dashboard/EDITOR_SHELL_P05.md` | Neu: Architektur- und Funktionsspezifikation der Vier-Zonen-Shell (P05) |
| `src/features/dashboard/model/dashboardMigrationV1V2.ts` | Neu: Deterministische V1→V2-Kopiermigration gemäß P03 §5 |
| `src/features/dashboard/components/editor/DashboardEditorShellV2.tsx` | Neu: 4-Zonen-Shell Koordinator & Preview-Modus |
| `src/features/dashboard/components/editor/EditorTopBarV2.tsx` | Neu: Top-Bar mit Titel, Filtern, Scope, Undo/Redo & Aktionen |
| `src/features/dashboard/components/editor/WidgetLibraryV2.tsx` | Neu: Widget-Bibliothek mit Suche, Kategorien & Add-Aktionen |
| `src/features/dashboard/components/editor/EditorCanvasV2.tsx` | Neu: 12-Spalten-Canvas mit Selektion & Kachel-Renderern |
| `src/features/dashboard/components/editor/EditorInspectorV2.tsx` | Neu: Rechter Inspector mit 4 Tabs & Leerzustand |
| `src/features/dashboard/components/editor/EditorStatusBarV2.tsx` | Neu: Statusleiste mit Verbindungsstatus, Budget & Stats |
| `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx` | Erweitern: Pilotweiche auf V2-Shell bei aktivem Rollout-Schalter |
| `src/features/dashboard/preview/DashboardPreviewPage.tsx` | Erweitern: `?bereich=editor_v2` Option für Vorschau |
| `src/features/dashboard/preview/DashboardEditorPreviewV2.tsx` | Neu: Vorschau-Komponente für den V2-Editor ohne Login |
| `src/features/dashboard/__tests__/dashboardMigrationV1V2.vitest.ts` | Neu: Tests für V1→V2-Kopiermigration |
| `src/features/dashboard/__tests__/DashboardEditorShellV2.ui.vitest.tsx` | Neu: UI-Tests für Shell, TopBar, Library, Canvas, Inspector |
| `src/features/dashboard/__tests__/WidgetLibraryV2.ui.vitest.tsx` | Neu: UI-Tests für Bibliothek, Suche, Kategorien |
| `src/features/dashboard/__tests__/EditorInspectorV2.ui.vitest.tsx` | Neu: UI-Tests für Inspector Tabs & Eingaben |
| `docs/BUILD_LOG.md` | Builder-Eintrag & Prüfnachweis |
| `BUILD_PLAN.md` | Statusaktualisierung |

---

## 4. Verifikation & Prüfnachweis

- **TypeScript-Prüfung:** `npx tsc --noEmit` fehlerfrei (0 Typfehler).
- **ESLint & Prettier:** `npm run lint` (0 Warnings) & `npm run format:check` (100 % pass).
- **Vitest-Testsuite:**
  - `src/features/dashboard/__tests__/dashboardMigrationV1V2.vitest.ts`: 3/3 Tests bestanden.
  - `src/features/dashboard/__tests__/WidgetLibraryV2.ui.vitest.tsx`: 4/4 Tests bestanden.
  - `src/features/dashboard/__tests__/EditorInspectorV2.ui.vitest.tsx`: 5/5 Tests bestanden.
  - `src/features/dashboard/__tests__/DashboardEditorShellV2.ui.vitest.tsx`: 6/6 Tests bestanden.
  - Gesamttests: `npm test` mit 362 Testdateien und 2690 Tests bestanden.
- **Integritätsprüfung:** `npm run verify` erfolgreich (Suites 001–025 alle grün).
- **Produktions-Build:** `npm run build` erfolgreich (`dist/` sauber erzeugt).
- **Schutzbereichs-Integrität:** `git diff origin/main -- src/simulation src/types src/context src/services/data src/features/resources` exakt 0 Bytes.
