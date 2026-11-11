# Spezifikation: Entkoppelter Dashboard-Editor-Kern (P04)

**Status:** Verbindlich für Paket P04 und Folgepakete (P05–P07)  
**Bezug:** [DASHBOARD_EDITOR_MASTERPLAN.md](./DASHBOARD_EDITOR_MASTERPLAN.md) §3.1, §4.A, §7, §8 | [GRID_VERGLEICH_ZIELMODELL_146.md](./GRID_VERGLEICH_ZIELMODELL_146.md) §6.1 | [EDITOR_UX_FACHVERTRAEGE_145.md](./EDITOR_UX_FACHVERTRAEGE_145.md) §4

---

## 1. Übersicht & Zielsetzung

Bisher speicherte der V1-Editor (`useDashboardEditorHistory.ts`) vollständige Snapshots der Konfiguration in einem Array, das bei Erreichen von 50 Schritten ältere Zustände stillschweigend abschnitt (`slice(-50)`). Zudem führte jede einzelne Wertänderung sofort zu einem Eintrag im Verlauf, was bei längeren Sitzungen und schnellem Tippen den Speicher belastete und das Undo unbrauchbar machte.

Paket P04 entkoppelt den Editor-Kern vollständig von der Persistenzebene und führt eine moderne, zustandsisolierte Architektur ein:

```
+-----------------------------------------------------------------------------------+
|                            useDashboardEditorV2 (Hook)                            |
|  - Entwurf (draft)                                                                |
|  - Änderungsstatus (isDirty)                                                      |
|  - Navigationsschutz (useInAppLinkGuard + beforeunload)                           |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             DashboardEditorCore (Engine)                          |
|  - Aktiver Entwurf (DashboardDraftState)                                          |
|  - Reversible Command Stack (Undo/Redo ohne 50er-Limit)                           |
|  - Checkpoints & 15 MiB Soft-Limit-Speichermonitoring                             |
|  - Drag-/Resize-Transaktionsbündelung                                             |
|  - Textfeld-Debouncing (600 ms / onBlur)                                          |
|  - Strikt isolierte Datenupdates (kein Undo, kein isDirty)                        |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                              Editor Commands (Delta-Patches)                      |
|  MoveTile, ResizeTile, BatchMoveTiles, AddTile, RemoveTile, UpdateTileConfig, ...  |
|  Typischer Speicherbedarf: < 1 KiB pro Schritt (statt 20–60 KiB Vollsnapshot)     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Das Reversible-Command-Pattern

Jede Änderung am Dashboard-Entwurf wird durch ein `EditorCommand` beschrieben. Anstelle eines kompletten Snapshots des `DashboardConfigV2`-Objekts speichert das Command nur das minimale Vorher-Nachher-Delta (Inverse-Patching).

### 2.1 Schnittstelle `EditorCommand`

```typescript
export interface EditorCommand {
  readonly id: string;
  readonly type: string;
  readonly description: string;
  readonly timestamp: number;

  /** Führt die Vorwärtsänderung auf dem Entwurfszustand aus */
  execute(state: DashboardDraftState): DashboardDraftState;

  /** Führt die exakte Rückabwicklung auf dem Entwurfszustand aus */
  undo(state: DashboardDraftState): DashboardDraftState;

  /** Ungefähre Speichergröße in Bytes für das Speichermonitoring */
  estimateByteSize(): number;
}
```

### 2.2 Standardbefehle

1. **`MoveTileCommand`**: Verschiebt eine Kachel an neue Rasterkoordinaten (`x`, `y`) auf einem Breakpoint (`desktop`, `tablet`, `mobile`).
2. **`ResizeTileCommand`**: Passt Dimensionen (`w`, `h`) und ggf. Koordinaten (`x`, `y`) einer Kachel an.
3. **`BatchMoveTilesCommand`**: Atomare Verschiebung mehrerer Kacheln, z. B. bei Kollisionen und Auto-Reflow.
4. **`AddTileCommand`**: Fügt eine Kachel an einer bestimmten Position ein. Rückabwicklung entfernt sie.
5. **`RemoveTileCommand`**: Entfernt eine Kachel samt Position und Konfiguration. Rückabwicklung fügt sie an exakt derselben Position wieder ein.
6. **`UpdateTileConfigCommand`**: Aktualisiert Optionen, Filter-Overrides, Titel oder Präsentationsform einer Kachel (Delta-Patch).
7. **`UpdateDashboardMetaCommand`**: Ändert Dashboard-Titel oder Metadaten.
8. **`SetGlobalFilterCommand`**: Passt globalen Zeitraum (`globalTimeframe`) oder globale Pipeline (`globalPipeline`) an.
9. **`CompoundCommand`**: Fasst mehrere Einzelbefehle zusammen (z. B. Resize einer Kachel + daraus resultierender Reflow zweier Nachbarkacheln), sodass im Undo-Verlauf genau ein logischer Schritt entsteht.

---

## 3. Transaktionsbündelung & Eingabebündelung

### 3.1 Drag- & Resize-Transaktionen
Beim Ziehen oder Vergrößern/Verkleinern im visuellen Raster (P06) entstehen pro Frame kontinuierliche Pointer-Events (z. B. 60 Updates pro Sekunde). 
- Während der Bewegung (`beginTransaction('drag' | 'resize')`) wird der Entwurf über `updateDraftInterim()` direkt aktualisiert, ohne dass Undo-Schritte erzeugt werden.
- Erst beim Loslassen des Pointers (`commitTransaction()`) wird die Gesamtdifferenz zwischen Start- und Endzustand ermittelt und als genau **ein** atomarer Befehl (`MoveTileCommand`, `ResizeTileCommand` oder `CompoundCommand`) in den Undo-Stack gepusht.
- Bei Abbruch (`Escape` oder `cancelTransaction()`) wird der Entwurf auf den Zustand vor Transaktionsbeginn zurückgesetzt.

### 3.2 Eingabebündelung für Textfelder (Debouncing)
Reine Texteingaben (z. B. Kacheltitel im Inspector oder Dashboard-Titel) erzeugen nicht pro Tastendruck einen Historienschritt.
- Der Editor-Kern bündelt kontinuierliche Tastatureingaben.
- Ein Undo-Schritt wird erst abgeschlossen, wenn:
  1. Eine Tipp-Pause von mindestens **600 ms** eintritt, ODER
  2. Der Fokus das Textfeld verlässt (`onBlur` / `flushTextInput()`).

### 3.3 Strikt isolierte Daten-Updates
Hintergrund-Refetches von CRM-Daten, WebSocket-Events oder Live-KPI-Stream-Ticks aktualisieren ausschließlich Render- und Kennzahlen-Caches:
- Sie erzeugen **niemals** Undo- oder Redo-Schritte.
- Sie setzen den Entwurf **niemals** auf ungespeichert (`isDirty = false`).
- Das Layout und die Konfiguration bleiben während Datenaktualisierungen absolut stabil.

---

## 4. Speichermonitoring & Checkpoints (Kein 50er-Abbruch)

Gemäß Masterplan §4.A darf es keinen starren 50er-Abbruch geben:
- Der Verlauf speichert unbegrenzt viele Schritte. Da ein Command typischerweise 200–800 Bytes belegt, können hunderte Aktionen mit weniger als 500 KiB RAM gehalten werden.
- **Meilenstein-Checkpoints:** Alle 50 Aktionen wird ein Meilenstein-Checkpoint angelegt.
- **15 MiB Soft-Limit:** Sollte der Verlauf 15 MiB (`MAX_HISTORY_BYTES`) überschreiten, wird in der Statusleiste eine Benachrichtigung aktiv (`Verlauf wird ab Checkpoint X konsolidiert`). Ältere Schritte vor dem letzten stabilen Checkpoint werden kontrolliert freigegeben, anstatt die Anwendung abstürzen zu lassen oder Daten stillschweigend zu verwerfen.

---

## 5. Rollout-Schalter & Paralleler Betrieb

In `src/features/dashboard/model/dashboardRollout.ts`:
- Feature-Schalter: `isDashboardEditorV2Enabled()` prüft `import.meta.env.VITE_DASHBOARD_EDITOR_V2 === 'true'`.
- Standardwert ist **strikt `false`**: Der bestehende V1-Editor bleibt für reguläre Nutzer unverändert aktiv.
- Der Pilotmodus kann in Tests oder Entwickler-Sitzungen gezielt aktiviert werden (z. B. via Session-Storage oder URL-Parameter `?editor=v2`).

---

## 6. Navigationsschutz

Solange `isDirty === true` ist:
1. `useInAppLinkGuard` fängt interne Klicks auf Seitenleiste, Kopfzeile und andere CRM-Module ab und fordert den Anwender auf, zu speichern, zu verwerfen oder auf der Seite zu bleiben.
2. Der `beforeunload`-Listener schützt vor versehentlichem Tab-Schließen oder Browser-Neuladen.
