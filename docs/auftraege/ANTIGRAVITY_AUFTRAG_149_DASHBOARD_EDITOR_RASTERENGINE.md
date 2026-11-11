# Auftrag 149 – Dashboard-Editor: Rasterengine (P06)

**Ziel:** Vollständige Implementierung der nativen CSS-Grid-Rasterengine (Paket P06 aus dem Dashboard-Editor-Masterplan) für den neuen Dashboard-Editor V2. Freie zweidimensionale Positionierung (`x, y`) und Größenanpassung (`w, h`) im 12-Spalten-Raster (Desktop), 6-Spalten-Raster (Tablet) und 1-Spalten-Raster (Mobile). Kollisionserkennung und deterministischer Auto-Reflow (kompakt nach oben, kein Kachelverlust, keine Überlappungen), Pointer-basiertes Drag & Drop und Resize mit visueller Geistervorschau, Drag & Drop aus der Widget-Bibliothek, Auto-Scroll bei Annäherung an Ränder, WAI-ARIA `grid`-Tastatursteuerung (`Alt+Pfeiltasten` zum Verschieben, `Alt+Shift+Pfeiltasten` zum Skalieren) und strikte Breakpoint-Isolation bei 0 Bytes externer Third-Party-Abhängigkeiten.

**Masterplan:** [Dashboard-Editor-Masterplan, Revision 2](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), insbesondere P06 sowie Abschnitte 3.1, 4.A, 5.2 und 6.

**Vorgelagert:**
- [Auftrag 144 (Bestandsprüfung, PR #168)](./ANTIGRAVITY_AUFTRAG_144_DASHBOARD_EDITOR_BESTANDSPRUEFUNG.md)
- [Auftrag 145 (UX-Konzept & Fachverträge, PR #169)](./ANTIGRAVITY_AUFTRAG_145_DASHBOARD_EDITOR_UX_FACHVERTRAEGE.md) mit [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md)
- [Auftrag 146 (Grid-Vergleich & Ziel-Speichermodell, PR #170)](./ANTIGRAVITY_AUFTRAG_146_DASHBOARD_EDITOR_GRID_ZIEL_SPEICHERMODELL.md) mit [GRID_VERGLEICH_ZIELMODELL_146.md](../dashboard/GRID_VERGLEICH_ZIELMODELL_146.md)
- [Auftrag 147 (Entkopplung des Editor-Kerns, PR #171 & #172)](./ANTIGRAVITY_AUFTRAG_147_DASHBOARD_EDITOR_KERN_ENTKOPPELN.md) mit [EDITOR_KERN_P04.md](../dashboard/EDITOR_KERN_P04.md)
- [Auftrag 148 (Vier-Zonen-Shell, Bibliothek, Inspector, PR #173)](./ANTIGRAVITY_AUFTRAG_148_DASHBOARD_EDITOR_SHELL_BIBLIOTHEK_INSPECTOR.md) mit [EDITOR_SHELL_P05.md](../dashboard/EDITOR_SHELL_P05.md)

**Baseline:** `main`, Commit `b773d4a` (nach Merge von PR #173).

**Builder:** Antigravity. **Prüfer:** Codex (chatgpt-codex-connector auf GitHub) gemäß `CLAUDE.md` §4.1. **Merge und Release:** Marc.

**Status:** IN ARBEIT.

---

## 1. Ergebnis dieses Auftrags

Dieser Auftrag setzt Paket P06 aus dem Dashboard-Editor-Masterplan um. Aufbauend auf der Vier-Zonen-Shell (Auftrag 148 / P05) und den reversiblen Befehlen des Editor-Kerns (Auftrag 147 / P04) wird die in Auftrag 146 (P03 §2) verbindlich ausgewählte maßgeschneiderte native 12-Spalten-CSS-Grid-Engine implementiert.

Am Ende liegen vor:

1. **Mathematische Raster- & Reflow-Engine (`src/features/dashboard/components/editor/grid/gridEngine.ts`):**
   - 2D-Kollisionsprüfung zwischen Kacheln (`rectsIntersect`).
   - Deterministischer Auto-Reflow-Algorithmus: Verschieben einer Kachel verdrängt kollidierende Kacheln nach unten.
   - Vertikale Kompaktierung (`compactLayout`): Schließt unnötige Leerräume nach oben, ohne die relative Reihenfolge zu verletzen.
   - Mathematische Grenzen: Einhaltung von `minW`, `minH`, `maxW` (Rasterbreite) und `maxH` (12 Zeilen).
   - Deterministische Serialisierung und Kachel-Sortierung nach `(y, x)` für einheitliche Layout-Zustände.
2. **Pointer-basiertes Drag & Drop und Resize (`src/features/dashboard/components/editor/grid/useGridDragAndDrop.ts`):**
   - Drag per Pointer-Events an Kachelkopf / Drag-Handle.
   - Visuelle Platzierungsvorschau (Ghost / Drop-Indikator im Raster).
   - Interaktive Resize-Handles (Ecke unten-rechts sowie Unterkante/Rechtskante).
   - Reversible Command-Bündelung: Während der Interaktion flüssige visuelle Aktualisierung; beim Loslassen (`pointerup`) genau **ein** atomarer Undo-Befehl (`MoveTileCommand`, `ResizeTileCommand` oder `BatchMoveTilesCommand`).
3. **Drop aus der Widget-Bibliothek:**
   - HTML5 / Pointer Drag & Drop von Kennzahlen-Karten aus `WidgetLibraryV2` direkt auf das Canvas-Raster.
   - Automatischer Reflow und Platzierung an der Drop-Koordinate via `AddTileCommand`.
4. **Auto-Scroll-Mechanismus:**
   - Automatisches, sanftes Scrollen des Canvas-Containers bei Annäherung des Mauszeigers an den oberen (< 60 px) oder unteren (< 60 px) Rand während eines Drags.
5. **WAI-ARIA `grid`-Tastatursteuerung (`src/features/dashboard/components/editor/grid/useGridKeyboard.ts`):**
   - Barrierefreie Semantik: `role="grid"` auf dem Rastercontainer, `role="gridcell"` auf den Kacheln.
   - Navigation im Raster: `Pfeiltasten` wechseln den Fokus zwischen benachbarten Kacheln.
   - Verschieben per Tastatur: `Alt + Pfeiltasten` bewegt die selektierte Kachel um 1 Rastereinheit in die jeweilige Richtung (mit Auto-Reflow).
   - Skalieren per Tastatur: `Alt + Shift + Pfeiltasten` vergrößert oder verkleinert die Kachel um 1 Einheit.
   - Screenreader-Ansagen: Barrierefreie Statusausgabe über `aria-live="polite"` bei jeder Rasteränderung.
6. **Breakpoint-Isolation (Desktop 12, Tablet 6, Mobile 1 Spalte):**
   - Desktop (12 Spalten): Volles 2D-Raster.
   - Tablet (6 Spalten): 6-Spalten-Raster mit isolierten Koordinaten.
   - Mobile (1 Spalte / 375 px): Strikt 1 Spalte (100 % Breite). Horizontales Dragging deaktiviert; vertikale Schnell-Sortierung per `Nach oben` / `Nach unten`-Schaltflächen.
   - Änderungen am Tablet- oder Mobile-Layout mutieren niemals das Desktop-Layout.
   - 0 px horizontaler Überlauf bei 1440 px, 768 px und 375 px.
7. **Vitest-Testsuite & Architekturdokumentation:**
   - Umfassende Unittests für Kollision, Reflow, Kompaktierung, Drag/Resize-Berechnung und Tastatursteuerung.
   - Dokumentation unter `docs/dashboard/RASTERENGINE_P06.md`.

---

## 2. Verbindliche Grenzen

1. `CLAUDE.md` strikt einhalten. Die Schutzbereiche (`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`) bleiben unangetastet (Diff = 0 Bytes).
2. Der V1-Bestandspfad bleibt 100 % funktionsfähig; V2 bleibt hinter `isDashboardEditorV2Enabled()`.
3. Keine neuen externen npm-Abhängigkeiten in `package.json` (0 KiB zusätzliches Third-Party-Gewicht).
4. Einhaltung der Dateigrößengrenze (< 400 Zeilen je Datei nach ESLint `max-lines`).

---

## 3. Ziel-Dateien

| Pfad | Erlaubte Änderung / Zweck |
| :--- | :--- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_149_DASHBOARD_EDITOR_RASTERENGINE.md` | Dieser Auftrag |
| `docs/dashboard/RASTERENGINE_P06.md` | Neu: Architektur- und Funktionsspezifikation der Rasterengine (P06) |
| `src/features/dashboard/components/editor/grid/gridEngine.ts` | Neu: Matrix-Kollisionsberechnung, Reflow, Kompaktierung |
| `src/features/dashboard/components/editor/grid/useGridDragAndDrop.ts` | Neu: Hook für Pointer-Drag, Resize & Auto-Scroll |
| `src/features/dashboard/components/editor/grid/useGridKeyboard.ts` | Neu: WAI-ARIA `grid`-Tastatursteuerung & Ansagen |
| `src/features/dashboard/components/editor/grid/GridResizeHandle.tsx` | Neu: Kanten- und Ecken-Resize-Handles |
| `src/features/dashboard/components/editor/EditorCanvasV2.tsx` | Erweitern: Einbindung der Rasterengine, Drag-Ghosts & Handles |
| `src/features/dashboard/components/editor/WidgetLibraryV2.tsx` | Erweitern: Drag-Quellen für Drop auf Canvas |
| `src/features/dashboard/components/editor/DashboardEditorShellV2.tsx` | Erweitern: Drop-Koordination und Breakpoint-Verwaltung |
| `src/features/dashboard/__tests__/gridEngine.vitest.ts` | Neu: Unittests für Kollision, Reflow, Kompaktierung |
| `src/features/dashboard/__tests__/gridInteraction.ui.vitest.tsx` | Neu: UI- und Integrationstests für Drag, Resize & Tastatur |
| `docs/BUILD_LOG.md` | Builder-Eintrag & Prüfnachweis |
| `BUILD_PLAN.md` | Statusaktualisierung |
