# Barrierefreiheits-Abnahme Dashboard-Editor V2 (P15b, Auftrag 172)

Stand: 21.11.2026 · Builder: Claude Code · Grundlage: Masterplan §3.3, Auftrag 172 §2.2

## 1. Geprüfte Ansichten

| Ansicht | Datei(en) | Zuständigkeit |
| --- | --- | --- |
| Editor (Canvas, Sektionen, Top-Bar, Statusleiste) | `components/editor/DashboardEditorShellV2.tsx`, `EditorTopBarV2.tsx`, `sections/*`, `EditorCanvasV2.tsx`, `canvas/CanvasTileCard.tsx` | Editor-Hülle |
| Listenmodus Telefon | `canvas/MobileTileListActions.tsx`, `canvas/editorListMode.ts`, `canvas/TileSectionMenu.tsx` | neu in 172 |
| Widget-Bibliothek | `components/editor/WidgetLibraryV2.tsx` | Editor |
| Inspector (Tabs Daten, Darstellung, Schwellenwerte/Alarme, Interaktion) | `EditorInspectorV2.tsx`, `inspector/*` | Editor |
| Panel-Editor | in V2 durch den Inspector abgedeckt; `onOpenPanelEditor` wird von keiner Seite angebunden | – |
| Versionen | `versions/RevisionHistoryPanelV2.tsx` u. a. | Versionen (P12) |
| Import/Export, Neu/Duplizieren/Löschen | `selection/*Dialog*.tsx` (gemeinsame `Modal`-Komponente) | Auswahl (P09b/P12) |
| Team-Freigaben | `selection/DashboardSwitcherMenuV2.tsx`, `ShareWithTeamDialogV2.tsx` | P11 |
| Alarme | `components/alarms/*`, `pages/DashboardAlarmsPage.tsx` | P13 |
| Kiosk | `components/kiosk/*`, `pages/DashboardKioskPage.tsx` | P15a |
| Vorschau / Report | `components/export/DashboardReportV2.tsx`, `DashboardPrintViewV2.tsx` | neu in 172 |

## 2. Automatischer Scan (axe, alle Stufen)

Lauf über alle Ansichten aus §1 auf 1440 und 375 px (Vorschau-Build).

| Befund vor 172 (T0) | Ursache | Behebung |
| --- | --- | --- |
| `aria-required-children` / `aria-required-parent` (critical) | `role="grid"` ohne `role="row"` | eine Zeile mit `display: contents` um die gridcells (Raster und Sektionen) |
| `color-contrast` (serious, 9–26 Knoten je Ansicht) | Ohne Tailwind-Preflight werden `bg-black/20`, `bg-white/5` usw. für die Farbvariablen nicht erzeugt; Schaltflächen zeigten hellgraue Browser-Standardflächen mit heller Schrift | `editorScope.css`: Grundwerte für Formularelemente im V2-Bereich mit Spezifität 0; Vorschau-Tabs und `+n`-Hinweis der Bibliothek angepasst |
| `label-title-only` (serious) | Zeitraum- und Pipeline-Auswahl nur mit `title` | `aria-label` |
| `select-name` (critical) | Dashboard-Filter der Alarmliste ohne Namen | `aria-label` |
| `heading-order`, `page-has-heading-one`, `landmark-unique`, `region` (moderate) | fehlende Seitenüberschrift, Sprünge h1→h3, zwei unbenannte Seitenleisten | `h1` (sr-only) in der Top-Bar, `h2` „Kacheln“ im Canvas, Überschriften in Bibliothek/Inspector eine Ebene höher, `aria-label` an der Bibliothek, Vorschau-Banner als Region |

Ergebnis nach 172: **0 critical/serious** in allen V2-Ansichten, auf 1440/768/375. `e2e/a11y-baseline.json` enthält keine V2-Einträge mehr; ein Wächtertest in `e2e/a11y.spec.ts` lässt neue V2-Einträge fehlschlagen.

Verbleibend (moderate, begründet):

- `heading-order` am Dialogtitel der gemeinsamen `Modal`-Komponente (`src/components/ui/Modal.tsx`, `h3`): geteilte Komponente auch von V1, nicht Ziel-Datei dieses Auftrags. Vorschlag: `h2` in einem eigenen kleinen Auftrag.
- Alarmliste in der Vorschau: `landmark-one-main`/`region`. Nur der Test-Harness rendert die Liste außerhalb von `main`; in der App liegt sie im Seitenlayout.

## 3. Tastatur

| Prüfung | Ergebnis |
| --- | --- |
| Reihenfolge | Top-Bar → Bibliothek → Canvas (Sektionen, Kacheln) → Inspector → Statusleiste |
| Raster | Pfeiltasten/Enter/Escape über `useGridKeyboard` (P06) unverändert, Ansagen über Live-Region |
| Listenmodus | jede Aktion als Schaltfläche, Randpositionen gesperrt (`disabled`) |
| Inspector-Blatt (Telefon) | `role="dialog"`, `aria-modal`, Escape schließt, Schließen oben |
| Kiosk | Leertaste pausiert, Pfeile blättern (P15a); Strg/Cmd+P gesperrt |
| Fallen | keine gefunden (Dialoge nutzen `useModalA11y`/`Modal` mit Fokusrückgabe) |

## 4. Kontrast hell/dunkel, Zoom, Bewegung

- Kontrast: axe-Lauf dunkel (Standard) ohne Befund; Sichtprüfung hell über die Screenshot-Matrix (`docs/screenshots/auftrag-172/README.md`, alle Ansichten hell/dunkel). Die Grundwerte aus `editorScope.css` nutzen Theme-Tokens und gelten in beiden Modi.
- Zoom 200 %: entspricht bei 1440 px einer CSS-Breite von 720 px (Tablet-Bedienung). Matrix 768/375 ohne horizontalen Überlauf (0 px).
- `prefers-reduced-motion`: E2E und Screenshots laufen mit `reducedMotion: reduce`; die neue „aufgenommen“-Hervorhebung ist eine statische Umrandung ohne Animation.

## 5. Screenreader-Stichprobe

Automatisch geprüft: Namen aller Schaltflächen der Listenleiste („ARR nach oben“, „Größe von ARR: Mittel. Ändern zu Groß“, „ARR bearbeiten“), Dialogname des Inspector-Blatts, Live-Ansage „Kachel aufgenommen …“ beim langen Drücken.

**Offen für Marc (manuelle VoiceOver-Stichprobe, ca. 5 Minuten):** iPhone oder macOS-VoiceOver auf der Vorschau `dashboard-vorschau.html?bereich=editor_v2` – eine Kachel per Liste nach unten verschieben, „Bearbeiten“ öffnen, mit Zurück schließen. Ein Agent kann VoiceOver nicht bedienen; das Ergebnis gehört als Nachtrag hierher.

## 6. Touch-Ziele

Bei Fingerbedienung (`pointer: coarse`) sind alle Bedienelemente in Editor, Inspector, Alarmliste und Versionen ≥ 44 × 44 px (`editorScope.css`). Gemessen per `e2e/helpers/touchTargets.ts`: vorher 7 zu kleine Elemente allein in der Top-Bar (375 und 768 px), nachher 0. Rand-Griffe zum Skalieren sind per Finger ausgeblendet; Größe per Eck-Griff nach langem Drücken, Inspector oder Listenmodus.
