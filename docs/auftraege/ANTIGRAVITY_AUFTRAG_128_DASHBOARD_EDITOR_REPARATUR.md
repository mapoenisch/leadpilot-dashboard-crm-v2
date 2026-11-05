# Auftrag 128 – Dashboard-Editor Interaktions- & UI-Reparatur

**Builder:** Claude Code · **Prüfer:** Codex (GitHub App) · **Baseline:** `413e55f` (`main` nach PR #137) · **Branch:** `claude/auftrag-128-dashboard-editor-reparatur`

## Anlass

Sichtung durch Marc am 05.11.2026:
1. **Größen-Schaltflächen:** Auf der Vorschauseite (`dashboard-vorschau.html`) waren die Größen-Buttons der veralteten Testkachel funktionslos. Im eigentlichen Arbeitsbereich waren sie im Kachelmenü versteckt.
2. **Inhaltsabhängige Größen-Sperre:** Kacheln mit großen Diagrammen (z. B. Säulen, Linien, Flächen, Trichter, Tabellen) dürfen nicht in unlesbare 3-Spalten-Formate (oder 3- & 6-Spalten) gebracht werden; diese Größen müssen visuell gesperrt und deaktiviert sein (`disabled`, `opacity-40` mit Tooltip).
3. **Verschieben (Drag & Drop):** Verschieben verhielt sich wie ein starres 1D-Array; beim Bewegen über Kachel-Kinder brach der Browser den Drop ab und die Kachel sprang zurück. Es fehlte ein dynamischer Live-Ghost-Platzhalter.
4. **Kontraste & Theme:** Dropdown-Menüs (wie das Vorlagenmenü) zeigten helle Schrift auf hellem Grund; die Vorschauseite war nicht im Theme-Wrapper gekapselt.
5. **Drawer:** Der Konfigurator öffnete sich mit 640 px als erdrückender Block mit schwerem Backdrop, der fast 70 % des Dashboards ausgraute.
6. **Kachel-Details:** Klick auf „Details“ war in der Vorschau nicht verdrahtet.

## Ziel

Vollständige Überarbeitung der Interaktionen gemäß `DASHBOARD_EDITOR_REPAIR_PLAN.md`:
1. Reordering mit dynamischem Live-Ghost-Platzhalter, `pointer-events: none` während des Drags und räumlicher Vor/Nach-Erkennung.
2. Direkte, sichtbare Größen-Buttons (3, 6, 9, 12 Spalten) an jeder Kachel im Bearbeitungsmodus mit automatischer inhaltlicher Sperre (`minSizeFor`) für große Diagramme.
3. Feste, garantierte Kontrastfarben in allen Menüs und Kapselung der Vorschauseite im echten Theme.
4. Schlanker 420-px-Drawer mit klarem Dashboard-Blick links daneben.
5. Funktionsfähiger Kachel-Detaildialog (`TileDetailModal.tsx`) bei Klick auf „Details“.
6. Bereinigung der Vorschauseite auf den echten, interaktiven Arbeitsbereich.

## Ziel-Dateien

| Datei | Änderung |
|---|---|
| `src/features/dashboard/components/DashboardGrid.tsx` | Live-Ghost beim Drag & Drop, sichtbare Größen-Buttons mit `minSize`-Sperre, Pointer-Shield |
| `src/features/dashboard/components/TileResizeHandle.tsx` | Min-Rank-Begrenzung und Tooltip-Feedback beim Ziehen |
| `src/components/ui/Drawer.tsx` | Kompakte Breite (420 px Standard / wählbar), dezenter Backdrop |
| `src/features/dashboard/components/TileConfigurator.tsx` | Schlankes 420-px-Layout mit strukturierter Gliederung |
| `src/features/dashboard/components/EditorToolbar.tsx` | Kontrastreiche Theme-Farben für Vorlagenmenü und Badges |
| `src/features/dashboard/components/detail/TileDetailModal.tsx` | Neu: Detailansicht für Kacheln (Kennzahlen, Historie, Tabelle) |
| `src/features/dashboard/components/DashboardWorkspace.tsx` | Integration des Detail-Dialogs |
| `src/features/dashboard/preview/DashboardEditorPreview.tsx` | Verdrahtung von `onShowDetails` |
| `src/features/dashboard/preview/DashboardPreviewPage.tsx` | Bereinigung: Fokus auf den echten Arbeitsbereich, Theme-Wrapper |
| `dashboard-vorschau.html` | Theme-Wrapper und Styling |
| Tests in `src/features/dashboard/__tests__/` | Aktualisierung & neue Tests für Min-Size, Drag-Ghost und Kontraste |
| `docs/BUILD_LOG.md`, dieser Auftrag | Dokumentation |

## Globale Grenzen

Schutzbereiche (`CLAUDE.md` §6: `src/simulation/`, `src/types/`, etc.) bleiben zu 100 % unberührt. Keine neuen externen Abhängigkeiten.

## Tasks

- [x] T1 Drag & Drop überarbeiten: Dynamischer Ghost-Platzhalter (`data-testid="drag-ghost"`), `pointer-events: none` auf Kachel-Kindern, stabile Drop-Zonen.
- [x] T2 Kachel-Resizing & Min-Size-Sperre: Sichtbare Spalten-Buttons an jeder Kachel; automatische Deaktivierung von 3 Spalten (bzw. 3 & 6 Spalten) bei komplexen Diagrammen mit Tooltip; Eck-Anfasser respektiert `minRank`.
- [x] T3 Kontraste & Theme: Feste Tokens für Vorlagen-Dropdown; Vorschauseite mit Dark-Theme-Wrapper ausstatten.
- [x] T4 Drawer verschlanken: Breite auf 420 px anpassen, Backdrop aufhellen/minimieren, Formularfelder ergonomisch anordnen.
- [x] T5 Kachel-Details: `TileDetailModal.tsx` erstellen und in Workspace + Vorschau verdrahten.
- [x] T6 Vorschauseite bereinigen: Alte statische Testkachel entfernen, Standardansicht zeigt direkt den vollen Arbeitsbereich.
- [x] T7 Tests & Gates: Vitest-Tests aktualisieren, `tsc`, `lint`, `format:check`, `verify`, `test`, `build` grün fahren.
- [x] T8 BUILD_LOG schreiben, Commit, Push, PR öffnen für Codex-Review.
