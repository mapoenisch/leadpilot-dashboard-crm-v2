# Dashboard-Editor: Rasterengine-Spezifikation (P06)

**Stand:** 11.11.2026  
**Status:** Technische Spezifikation und Baugrundlage für Paket P06  
**Bezug:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), [UX-Konzept Auftrag 145](./EDITOR_UX_FACHVERTRAEGE_145.md), [Grid-Vergleich Auftrag 146](./GRID_VERGLEICH_ZIELMODELL_146.md), [Editor-Kern Auftrag 147](./EDITOR_KERN_P04.md) und [Vier-Zonen-Shell Auftrag 148](./EDITOR_SHELL_P05.md)  
**Autor:** Antigravity (Builder) · **Prüfung:** Unabhängiges Review durch Codex

---

## 1. Einleitung & Zielsetzung

Paket **P06** implementiert die in Auftrag 146 (§2) verbindlich beschlossene **maßgeschneiderte native 12-Spalten-CSS-Grid-Engine (Kandidat C)**. Diese Lösung verzichtet vollständig auf externe Bibliotheken wie `react-grid-layout` und spart damit ~48 KiB Initial-Bundle-Kosten ein, garantiert strikte React-18-Strict-Mode-Kompatibilität und erfüllt alle WAI-ARIA-Kriterien für Barrierefreiheit.

Die Rasterengine verbindet:
1. **Mathematische 2D-Kollisions- und Reflow-Mathematik:** Kollisionsfreie Kachelplatzierung, deterministischer Reflow bei Überschneidungen und vertikale Kompaktierung.
2. **Pointer-basiertes Drag & Drop:** Direktes Verschieben von Kacheln auf dem Canvas mit virtueller Geistervorschau (`Ghost`) und Auto-Placement aus der Widget-Bibliothek.
3. **Flüssiges Resizing:** Interaktive Resize-Handles an Kanten und Ecken unter Einhaltung kachelspezifischer Mindest- und Maximaldimensionen.
4. **Auto-Scroll:** Sanftes Scrollen bei Annäherung an den oberen/unteren Rand des sichtbaren Arbeitsbereichs.
5. **WAI-ARIA `grid`-Tastatursteuerung:** Vollständige Tastatur-Bedienung mit `Alt+Pfeiltasten` (Verschieben) und `Alt+Shift+Pfeiltasten` (Skalieren).
6. **Breakpoint-Isolation:** Strikte Trennung von Desktop (12 Spalten), Tablet (6 Spalten) und Mobile (1 Spalte).

---

## 2. Mathematisches Modell & Koordinatensystem

### 2.1 Koordinatendefinition

Jede Kachel besitzt für jeden Breakpoint eine diskrete Position:
```typescript
export interface GridPosition {
  x: number; // Spaltenindex (0-basiert, 0 <= x < Spaltenanzahl)
  y: number; // Zeilenindex (0-basiert, y >= 0)
  w: number; // Breite in Spalten (minW <= w <= Spaltenanzahl)
  h: number; // Höhe in Zeileneinheiten (minH <= h <= maxH)
}
```

- **Desktop:** `cols = 12`, Standard-Zeilenhöhe `rowHeight = 80px`, Spaltenabstand `gap = 16px`.
- **Tablet:** `cols = 6`, Standard-Zeilenhöhe `rowHeight = 72px`, Spaltenabstand `gap = 12px`.
- **Mobile:** `cols = 1`, `w = 1`, `x = 0`, Standard-Zeilenhöhe `rowHeight = auto`, Kacheln füllen 100 % der Rasterbreite.

### 2.2 Kollisionserkennung

Zwei Rechtecke $A$ und $B$ im diskreten Raster kollidieren genau dann, wenn sie sich sowohl horizontal als auch vertikal überschneiden:
$$\text{collides}(A, B) \iff (A.x < B.x + B.w) \land (A.x + A.w > B.x) \land (A.y < B.y + B.h) \land (A.y + A.h > B.y)$$

### 2.3 Deterministischer Reflow- & Kompaktierungs-Algorithmus

Wird eine Kachel $T$ an Position $(x, y)$ bewegt oder vergrößert:
1. **Kollisionsauflösung (Push-Down):**
   - Finde alle Kacheln, die mit $T$ kollidieren.
   - Verschiebe jede kollidierende Kachel $K$ deterministisch nach unten:
     $$K.y = T.y + T.h$$
   - Prüfe rekursiv, ob die verschobene Kachel $K$ mit weiteren Kacheln kollidiert, und verdränge diese kaskadierend nach unten.
2. **Vertikale Kompaktierung (`compactLayout`):**
   - Sortiere alle Kacheln aufsteigend nach $y$, danach nach $x$.
   - Für jede Kachel (außer der aktiv gezogenen Kachel): Reduziere $y$ schrittweise um 1, solange keine Kollision mit einer bereits fixierten Kachel oder dem oberen Rand ($y = 0$) auftritt.
   - Ergebnis: Ein lückenloses, kompaktes Raster ohne Überlappungen und ohne Kachelverlust.

---

## 3. Interaktionskonzept: Drag, Resize & Auto-Scroll

### 3.1 Pointer-basiertes Verschieben (Drag & Drop)

- **Aktivierung:** PointerDown auf Kachel-Kopfbereich (`[data-drag-handle="true"]`) mit einem Mindestbewegungs-Schwellenwert (`dragThreshold = 4px`), um versehentliches Verschieben bei Klicks zu verhindern.
- **Geistervorschau (`Ghost`):** Während des Drags zeigt ein halbtransparenter Geisterrahmen (`border-2 border-primary border-dashed bg-primary/10`) im Raster die gerundete Zielposition an.
- **Transaktions-Bündelung:** Während der Pointer-Bewegung (`pointermove`) laufen kontinuierliche Reflow-Berechnungen. Erst beim Loslassen (`pointerup`) wird genau **ein** atomarer Undo-Befehl (`MoveTileCommand` bzw. `BatchMoveTilesCommand`) im `DashboardEditorCore` registriert.

### 3.2 Interaktives Resizing

- **Handles:** An der unteren rechten Ecke (`handle-se`), an der rechten Kante (`handle-e`) und an der unteren Kante (`handle-s`).
- **Grenzwerte:**
  - `minW = 2` (Desktop / Tablet) bzw. `1` (Mobile).
  - `minH = 2`.
  - `maxW = cols`.
  - `maxH = 12`.
- Auch hier gilt: Genau ein Undo-Befehl (`ResizeTileCommand`) beim Beenden der Geste.

### 3.3 Auto-Scroll

Befindet sich der Zeiger während eines Drags weniger als **60 px** vom oberen oder unteren Rand des scrollbaren Canvas-Elements entfernt:
$$v_{\text{scroll}} = \text{sign} \cdot \left(1 - \frac{\text{dist}}{60}\right) \cdot v_{\max}$$
Ein `requestAnimationFrame`-Loop scrollt den Container flüssig weiter, bis der Zeiger den Randbereich verlässt oder der Drag beendet wird.

---

## 4. WAI-ARIA `grid`-Barrierefreiheit & Tastatursteuerung

Das Raster implementiert das vollständige WAI-ARIA `grid`-Muster:
- **Raster-Container:** `role="grid"`, `aria-label="Dashboard-Editor Arbeitsfläche"`, `aria-colcount={cols}`.
- **Kacheln:** `role="gridcell"`, `aria-selected={isSelected}`, `aria-colindex={x + 1}`, `aria-rowindex={y + 1}`.
- **Tastatur-Befehle:**
  - `Pfeiltasten`: Fokus im 2D-Raster zwischen Kacheln wechseln.
  - `Enter` / `Leertaste`: Kachel selektieren.
  - `Alt + PfeilLinks / PfeilRechts`: Kachel um 1 Spalte nach links/rechts verschieben (Reflow ausgelöst).
  - `Alt + PfeilOben / PfeilUnten`: Kachel um 1 Zeile nach oben/unten verschieben.
  - `Alt + Shift + Pfeiltasten`: Kachelgröße um 1 Spalte/Zeile anpassen.
  - `Escape`: Selektion aufheben.
- **Screenreader-Meldungen:** Ein unsichtbarer `aria-live="polite"`-Container gibt Positions- und Größenänderungen verständlich auf Deutsch aus (z. B. *„Kachel ARR auf Spalte 4, Zeile 2 verschoben“*).

---

## 5. Strikte Breakpoint-Isolation

Jede Kachel speichert ihre Koordinaten getrennt je Breakpoint in `layouts`:
```typescript
tile.layouts = {
  desktop: { x: 0, y: 0, w: 6, h: 4 },
  tablet: { x: 0, y: 0, w: 6, h: 4 },
  mobile: { x: 0, y: 0, w: 1, h: 4 },
};
```
- Aktionen im Tablet-Modus verändern ausschließlich `tile.layouts.tablet`.
- Aktionen im Smartphone-Modus verändern ausschließlich `tile.layouts.mobile`.
- Das Desktop-Layout bleibt bei mobilen Anpassungen garantiert unberührt.
- Auf Mobile (1 Spalte) ist horizontales Verschieben deaktiviert.
- Überlauf-Gate: 0 px horizontaler Scrollbalken auf 1440 px, 768 px und 375 px.

## 6. Nachtrag P06b – Raster-Invarianten (Auftrag 151, 11.11.2026)

Anlass: externes Audit, Befunde N-1 bis N-5 (Triage `docs/reviews/2026-11-11-externes-audit-triage.md`). Verbindliche Invariante seit P06b: **Nach jeder Operation überlappt in keinem Breakpoint eine Kachel eine andere**, weder im angezeigten noch im gespeicherten Layout.

- **Abgeleitetes Layout (`getBreakpointLayout`):** Explizit gespeicherte Positionen werden zuerst gesetzt, danach die aus Desktop abgeleiteten Tablet-/Mobil-Fallbacks; jede kollidierende Kachel rückt deterministisch nach unten. Canvas, Drag, Resize und Tastatur arbeiten ausschließlich auf diesem Layout.
- **Ein Platzierungspfad:** `buildNewTile` (Hinzufügen und Drop) und `buildDuplicateTile` setzen neue Kacheln je Breakpoint an die erste freie Position (`findFirstFreePosition`, zeilenweise von oben). Drop setzt die Kachel im aktiven Breakpoint an die Zielposition und verdrängt die übrigen.
- **Reflow (`resolveCollisions`):** Jede verdrängte Kachel wird erneut eingereiht, auch wenn sie bereits verarbeitet war; eine Absicherung packt bei Restüberlappung deterministisch nach.
- **Materialisierung:** Committende Layoutänderungen (`planLayoutChange`, `collectLayoutMoves`) übernehmen alle Kacheln des Breakpoints ohne eigene Position mit ihrer abgeleiteten Position, damit nichts springt.
- **Mobil-Tausch:** Zwei benachbarte Kacheln werden lückenlos neu gestapelt statt nur ihre `y`-Werte zu tauschen.
- **Pointer-Drag:** Die Scroll-Änderung des Containers seit Interaktionsbeginn fließt in Drag und Resize ein; Auto-Scroll aktualisiert die Vorschau auch ohne Zeigerbewegung.
- **Drop:** nur aktive Katalog-IDs (`text/leadpilot-kpi` bevorzugt, `text/plain` nur nach Katalogprüfung).
- **Speichern:** `prepareConfigForStorage` normalisiert Layouts deterministisch und lehnt unbekannte Katalog-IDs ab (`ungueltig`), bevor `create_dashboard_v2`/`save_dashboard_v2` eine Revision anlegen. Serverparität (SQL) ist ein offener Punkt; eine Umgehung betrifft nur das eigene persönliche Dashboard.
- **Nachweis:** `gridInvariants.vitest.ts` (Audit-Regressionsfälle, 400 Reflow-Läufe auf dichten Layouts, 150 × 30 zufällige Operationen über alle Breakpoints), `gridDragScroll.ui.vitest.tsx`, `dashboardLayoutIntegrity.vitest.ts`.
