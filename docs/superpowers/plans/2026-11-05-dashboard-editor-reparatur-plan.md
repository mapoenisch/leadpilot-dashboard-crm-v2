# LeadPilot – Plan zur Reparatur und Ergänzung des Dashboard-Editors

> **Für ausführende Agenten:** `superpowers:executing-plans` für die schrittweise Umsetzung verwenden. Die Rollen und Schutzregeln aus `CLAUDE.md` haben Vorrang. Claude Code baut, Codex prüft unabhängig über die GitHub-App. Ein Auftrag je PR, Schutzbereich `src/simulation/` bleibt 100 % unberührt.

**Ziel:** Vollständige Behebung aller im visuellen und interaktiven Review vom 05.11.2026 festgestellten Mängel am Dashboard-Editor:
1. Reordering mit dynamischem Live-Ghost-Platzhalter, verlässlichen Drop-Zonen und Schutz vor Event-Abbrüchen.
2. Direktes Kachel-Resizing an der Kachel mit aktiver Inhaltsprüfung (Content-Aware Size Constraints: automatische Sperre ungeeigneter Breiten für große Diagramme).
3. Kontrast- und Theme-Reparatur für alle Dropdowns, Vorlagen-Listen und Menüs in allen Themes.
4. Verschlankung des Slide-over Drawers auf 420 px bei voller Sichtbarkeit und Live-Aktualisierung des Dashboards links daneben.
5. Vollständige Verdrahtung der Kachel-Detailfunktion (`TileDetailModal.tsx`) im Arbeitsbereich und in der Vorschau.
6. Bereinigung der Vorschauseite (`dashboard-vorschau.html`) auf den echten, interaktiven Arbeitsbereich.

**Status:** Freigegeben von Marc am 05.11.2026.  
**Auftrag:** `docs/auftraege/ANTIGRAVITY_AUFTRAG_128_DASHBOARD_EDITOR_REPARATUR.md`  
**Branch:** `claude/auftrag-128-dashboard-editor-reparatur`  
**Baseline:** `413e55f` (`main` nach PR #137)

---

## 1. Ausgangslage & Befunde

Das bisherige Review deckte folgende funktionale und visuelle Diskrepanzen auf:
- **Befund 1 (Größen-Buttons):** Auf der Vorschauseite waren die Größen-Buttons der alten Testkachel wirkungslos (starre Breakpoints). Im Editor waren sie tief im Menü versteckt.
- **Befund 2 (Fehlende Inhaltsprüfung für Größen):** Kacheln mit großen Diagrammen (z. B. Säulen, Linien, Flächen, Trichter, Tabellen) konnten theoretisch in 3 Spalten gequetscht werden, was unlesbare Darstellungen erzeugt.
- **Befund 3 (Verschieben / Drag & Drop):** Verschieben verhielt sich wie ein starres 1D-Array; beim Bewegen über Kachel-Kinder fingen diese die Events ab, der Browser brach den Drop ab und die Kachel sprang zurück. Es fehlte ein dynamischer Live-Ghost-Platzhalter.
- **Befund 4 (Kontraste & Theme):** Im Vorlagen-Dropdown erschien helle Schrift auf hellem Grund; der Vorschauseite fehlte der Theme-Kontext.
- **Befund 5 (Drawer-Dimension):** Der Drawer war mit 640 px viel zu breit und verdunkelte fast 70 % des Bildschirms mit einem schweren Weichzeichner-Backdrop.
- **Befund 6 (Details-Button):** Klicks auf „Details“ wurden in der Vorschau ignoriert.

---

## 2. Inhaltsabhängige Größen-Matrix (Content-Aware Constraints)

Nicht jedes Diagramm lässt sich sinnvoll in 3 oder 6 Spalten darstellen. Folgende Matrix wird im UI und Datenmodell verbindlich erzwungen:

| Diagrammtyp / Inhalt | Erlaubte Spalten | Ausgegraute / gesperrte Buttons | Begründung & Tooltip |
| :--- | :--- | :--- | :--- |
| **Zahl / Einzelwert (`zahl`)** | 3, 6, 9, 12 Spalten | *Keine (alle aktiv)* | Kompakte Kennzahl passt bereits in 3 Spalten (1/4 Breite). |
| **Sparkline / Mini-Trend (`sparkline`)** | 3, 6, 9, 12 Spalten | *Keine (alle aktiv)* | Speziell für kompakte Kacheln optimiert. |
| **Gauge / Tachometer (`gauge`)** | 3, 6, 9, 12 Spalten | *Keine (alle aktiv)* | Radialer Bogen skaliert bis auf 3 Spalten herunter. |
| **Balkendiagramm (`balken`)** | 6, 9, 12 Spalten | **3 Spalten gesperrt** | Balkenbeschriftungen benötigen mindestens 6 Spalten (1/2 Breite). |
| **Säulendiagramm (`saeulen`)** | 6, 9, 12 Spalten | **3 Spalten gesperrt** | Mehrere Säulenreihen und X-Achsentexte erfordern mind. 6 Spalten. |
| **Liniendiagramm (`linie`)** | 6, 9, 12 Spalten | **3 Spalten gesperrt** | Zeitreihen mit Achsenmarken benötigen mind. 6 Spalten. |
| **Flächendiagramm (`flaeche`)** | 6, 9, 12 Spalten | **3 Spalten gesperrt** | Farbflächenverläufe brauchen Breite zur Trenddarstellung. |
| **Donut / Kreis (`ring`, `kreis`)** | 6, 9, 12 Spalten | **3 Spalten gesperrt** | Diagramm + Legende nebeneinander benötigen mind. 6 Spalten. |
| **Tabelle (`tabelle`)** | 6, 9, 12 Spalten | **3 Spalten gesperrt** | Mehrspaltige Tabellen passen nicht in 3 Spalten. |
| **Funnel / Trichter (`trichter`)** | 6, 9, 12 Spalten | **3 Spalten gesperrt** | Pipeline-Stufen mit Beträgen und Rängen erfordern mind. 6 Spalten. |
| **Kombinationen / Übersicht (`uebersicht`)**| 9, 12 Spalten | **3 und 6 Spalten gesperrt** | Komplexe Doppel-Ansichten erfordern mind. 9 Spalten (3/4 Breite). |

> **UI-Verhalten der gesperrten Buttons:**  
> Gesperrte Buttons werden mit `opacity-35 cursor-not-allowed border-dashed` dargestellt, erhalten `disabled={true}`, `aria-disabled="true"` und einen erklärenden Tooltip (z. B. *„Dieses Diagramm benötigt mindestens 6 Spalten (1/2 Breite)“*). Sie können weder angeklickt noch per Drag-Handle unter diese Grenze gezogen werden.

---

## 3. Die 6 Umsetzungsschritte im Detail

### Schritt 1: Flexibles Verschieben (Drag & Drop mit Live-Ghost)
- **Dateien:** `src/features/dashboard/components/DashboardGrid.tsx`
- **Umsetzung:**
  - `pointer-events-none` auf Kachel-Kindern während des aktiven Drags (`dragId !== null`), um Event-Abbrüche zuverlässig zu verhindern.
  - Dynamischer Live-Ghost (`data-testid="drag-ghost"`): Beim Überfahren einer Kachel wird erkannt, ob sich der Zeiger vor oder hinter der Mitte befindet (`clientX > rect.left + rect.width / 2`).
  - Ein gestrichelter, pulsierender Rahmen zeigt die exakte Einfügeposition an.
  - Beim Loslassen (`onDrop`) wird die Kachel verlässlich an die Zielposition verschoben und gespeichert (`props.onMoveTo`).

### Schritt 2: Direktes Resizing & Content-Aware Min-Size-Sperre
- **Dateien:** `src/features/dashboard/components/DashboardGrid.tsx`, `src/features/dashboard/components/TileResizeHandle.tsx`
- **Umsetzung:**
  - Jede Kachel erhält im Bearbeitungsmodus direkt auf der Leiste sichtbare Spalten-Buttons: `3 Sp.`, `6 Sp.`, `9 Sp.`, `12 Sp.`.
  - Buttons, die unter der `minSize` der Kachel liegen, werden automatisch deaktiviert und visuell ausgegraut mit Tooltip.
  - Aktive Größe wird hervorgehoben (`bg-primary text-primary-foreground`).
  - Der Eck-Anfasser (`TileResizeHandle`) respektiert `minRank` und zeigt beim Ziehen an der Grenze `(Mindestgröße)` an.

### Schritt 3: Kontraste & Theme-Integration
- **Dateien:** `src/features/dashboard/components/EditorToolbar.tsx`, `dashboard-vorschau.html`, `src/features/dashboard/preview/DashboardPreviewPage.tsx`
- **Umsetzung:**
  - Vorlagen-Menü und alle Toolbar-Dropdowns erhalten feste, kontrastreiche Tokens: `bg-[var(--color-surface-raised,#0f2422)]`, `border-[var(--color-border,#1b3d39)]`, `text-[var(--color-text-primary,#ffffff)]` für Titel und `text-[var(--color-text-muted,#8faea9)]` für Untertitel.
  - `dashboard-vorschau.html` und `DashboardPreviewPage.tsx` binden die Root-Klasse `dark` und den Container-Stil ein, sodass keine CSS-Variablen mehr ins Leere laufen.

### Schritt 4: Schlanker Slide-over Drawer (420 px statt 640 px)
- **Dateien:** `src/components/ui/Drawer.tsx`, `src/features/dashboard/components/TileConfigurator.tsx`
- **Umsetzung:**
  - Breite des Drawers auf handliche `420px` anpassen.
  - Backdrop aufhellen (`bg-black/25 backdrop-blur-[1px]`), damit das Dashboard daneben gestochen scharf sichtbar bleibt.
  - `TileConfigurator.tsx` auf eine ergonomische, einspaltige Scroll-Struktur für 420 px optimieren.

### Schritt 5: Kachel-Details verdrahten
- **Dateien:** `src/features/dashboard/components/DashboardWorkspace.tsx`, `src/features/dashboard/preview/DashboardEditorPreview.tsx`
- **Umsetzung:**
  - Wenn `props.onShowDetails` nicht übergeben ist (z. B. in der Vorschau oder isolierten Umgebungen), öffnet `DashboardWorkspace` die Kachel-Details in einem zugänglichen modalen Dialog mit `TileDetailContent.tsx`.
  - Alle Metriken, Verläufe, Tabellen und Definitionen werden beim Klick auf „Details“ angezeigt.

### Schritt 6: Vorschauseite bereinigen & Abnahme
- **Dateien:** `src/features/dashboard/preview/DashboardPreviewPage.tsx`
- **Umsetzung:**
  - Die veraltete `DashboardDesignPreview` ganz oben auf `dashboard-vorschau.html` wird entfernt.
  - Die Seite zeigt direkt und bildschirmfüllend den modernen, interaktiven Dashboard-Arbeitsbereich mit allen Editor-Funktionen.
  - Ausführung aller Pflichtgates (`tsc`, `lint`, `format:check`, `verify`, `test`, `build`).

---

## 4. Definition of Done & Verifikation

- [ ] Verschieben von Kacheln funktioniert flüssig mit Live-Ghost und bleibt an der neuen Position stehen.
- [ ] Klick auf `3 Sp.`, `6 Sp.`, `9 Sp.`, `12 Sp.` ändert sofort die Kachelbreite.
- [ ] Bei Kacheln mit großen Diagrammen (Säulen, Linien, Trichter, etc.) ist `3 Sp.` ausgegraut und deaktiviert; Tooltip nennt die Mindestgröße.
- [ ] Vorlagen-Dropdown hat scharfe Kontraste (weiße/helle Schrift auf dunklem Menühintergrund).
- [ ] Drawer öffnet sich mit 420 px, Dashboard links daneben bleibt sichtbar.
- [ ] Klick auf „Details“ zeigt die Kacheldaten im Dialog.
- [ ] `npx tsc --noEmit` hat 0 Fehler; `npm run lint` hat 0 Warnungen; `npm run format:check` hat 0 Abweichungen; `npm run verify` und `npm run build` sind grün.
- [ ] Schutzbereichs-Diff gegen `origin/main` (`src/simulation/`, etc.) ist vollständig leer.
- [ ] PR auf GitHub geöffnet, sodass Codex prüfen kann.
