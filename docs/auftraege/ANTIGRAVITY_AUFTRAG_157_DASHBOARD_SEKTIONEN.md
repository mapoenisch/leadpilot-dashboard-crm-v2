# Auftrag 157 – Dashboard-Editor: Sektionen und einklappbare Gruppen (P09a)

**Ziel:** Ein V2-Dashboard lässt sich in benannte Sektionen gliedern. Jede Sektion hat einen Titel, eine feste Reihenfolge, eigene Kacheln und ein eigenes Raster. Sektionen lassen sich anlegen, umbenennen, verschieben, einklappen und entfernen; Kacheln lassen sich zwischen Sektionen verschieben. Jede dieser Änderungen ist genau ein Undo-Schritt. Eingeklappte Sektionen rendern ihre Kacheln nicht und lösen keine Datenabrufe aus. Struktur und Inhalt von `sections` werden in Browser und Server gleich geprüft. Dashboards ohne Sektionen verhalten sich exakt wie heute.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), P09 sowie §4.A (Zeile „Gruppierung und einklappbare Zeilen“), §5 („eingeklappte Gruppen stoppen unnötiges Rendering“) und §5.1. Plananpassung vom 14.11.2026: P09 ist geteilt, dies ist P09a (siehe §8).
**Fachgrundlage:** [GRID_VERGLEICH_ZIELMODELL_146.md](../dashboard/GRID_VERGLEICH_ZIELMODELL_146.md) (Top-Level-Feld `sections` vorgesehen), [RASTERENGINE_P06.md](../dashboard/RASTERENGINE_P06.md), [EDITOR_KERN_P04.md](../dashboard/EDITOR_KERN_P04.md) (Befehle, Undo), [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md) §5 (`aria-expanded` für einklappbare Gruppen).
**Vorgelagert:** 155 (P08b Panel-Editor) und 156 (CRM-Repository-Paginierung). 157 startet erst, wenn beide gemergt sind.
**Nachgelagert:** 158 (P09b Vorlagen und Dashboard-Auswahl), danach P10.
**Baseline:** `60aa96b` (Merge von PR #184 / Auftrag 156 in `main`).
**Branch:** `auftrag-157-dashboard-sektionen` (auf aktuellen `main` rebased).
**Builder:** Antigravity. **Prüfer:** Codex auf GitHub (oder ein anderer Agent, der nicht gebaut hat) gemäß `CLAUDE.md` §4.1. **Merge:** Marc.
**Status:** IN ARBEIT.

---

## 1. Ist-Stand (geprüft auf `main` `3af5605`)

| Baustein                     | Ist                                                                                                                                                                                                  | Fundstelle                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Typ                          | `DashboardConfigV2.sections?: unknown[]`, kein Typ, keine Prüfung.                                                                                                                                   | `model/dashboardConfigV2.ts:103`                                |
| Browser-Prüfung              | `validateDashboardConfigV2` erlaubt den Schlüssel `sections`, prüft den Inhalt aber nicht.                                                                                                           | `model/dashboardConfigV2.ts:119–135, 145–304`                   |
| Server-Prüfung               | `dashboard_config_v2_invalid_reason` erlaubt `sections` als Top-Level-Schlüssel ohne Inhaltsprüfung. Beliebiges JSON bis 64 KiB wird gespeichert und als Revision abgelegt.                          | `supabase/migrations/20261116_dashboard_query_contract.sql:~50` |
| Bestand                      | Keine Stelle im Code schreibt oder liest `sections`. Gespeicherte V2-Dashboards und Revisionen enthalten das Feld nicht (Builder bestätigt das in T0 per SQL gegen die lokale Instanz und den Seed). | `grep -rn sections src/features/dashboard`                      |
| Raster                       | Ein einziges Raster je Breakpoint über alle Kacheln. `getBreakpointLayout` leitet Tablet/Mobil aus Desktop ab und löst Überlappungen durch Verschieben nach unten.                                   | `components/editor/grid/gridEngine.ts:114–150`                  |
| Integritätsprüfung           | `normalizeDashboardLayouts` und `findLayoutIntegrityError` prüfen Überlappung und Rastergrenzen über **alle** Kacheln eines Breakpoints.                                                             | `services/dashboardLayoutIntegrity.ts:34–86`                    |
| Befehle                      | `AddTileCommand`, `RemoveTileCommand`, `UpdateTileConfigCommand`, `UpdateDashboardMetaCommand`, `Move/Resize/BatchMoveTilesCommand`, `CompoundCommand`. Kein Befehl kennt Sektionen.                 | `core/editorCommands.ts`, `core/layoutCommands.ts`              |
| Canvas                       | `EditorCanvasV2` rendert ein Raster mit Drag-and-Drop (`useGridDragAndDrop`) und Tastatursteuerung (`useGridKeyboard`) über `config.tiles`.                                                          | `components/editor/EditorCanvasV2.tsx` (234 Zeilen)             |
| Datenabruf                   | `LazyDashboardTile` fragt erst ab, wenn die Kachel im sichtbaren Bereich war (`useTileActivation`). Eine nicht gerenderte Kachel fragt nichts ab.                                                    | `components/LazyDashboardTile.tsx`                              |
| Textänderung als ein Schritt | `textInputDebouncer.ts` fasst zusammenhängende Eingaben zu einer Undo-Aktion zusammen (Muster für Dashboard-Titel).                                                                                  | `core/textInputDebouncer.ts`                                    |
| Dateigrößen                  | `DashboardEditorShellV2.tsx` 394 Zeilen vor 155 (155 bindet dort nur einen Host ein), `EditorTopBarV2.tsx` 424 Zeilen (Ausnahme bestand bereits), `max-lines` 400.                                   | —                                                               |

## 2. Soll

### 2.1 Datenvertrag `sections`

1. Neuer Typ in `model/dashboardConfigV2.ts`:

   ```ts
   export interface DashboardSectionV2 {
     id: string; // stabil, eindeutig im Dashboard, 1–64 Zeichen
     title: string; // getrimmt 1–80 Zeichen
     collapsed: boolean; // Zustand beim Öffnen des Dashboards
     tileIds: string[]; // Kacheln dieser Sektion
   }
   ```

   `DashboardConfigV2.sections?: DashboardSectionV2[]`. Keine neuen Felder in `DashboardTileConfigV2`, keine neue Schema-Version (Begründung §2.1 Nr. 6).

2. **Reihenfolge der Sektionen** = Reihenfolge im Array. **Kacheln ohne Sektion** bilden den Bereich „Ohne Sektion“; er steht immer oben, hat keinen Titel und lässt sich nicht einklappen. Fehlt `sections` oder ist es leer, gibt es nur diesen Bereich.
3. **Regeln** (identisch in Browser und Server, eigene Fehlertexte je Regel):
   - `sections` ist ein Array mit höchstens **12** Einträgen; jeder Eintrag ist ein Objekt mit genau den vier Schlüsseln aus Nr. 1.
   - `id` eindeutig; `title` nach Trimmen nicht leer und höchstens 80 Zeichen; `collapsed` ist boolesch.
   - Jede `tileId` existiert in `tiles` und kommt über alle Sektionen höchstens einmal vor.
   - Leere Sektionen sind erlaubt.
4. **Raster je Bereich:** Die `layouts` einer Kachel beziehen sich auf das Raster ihres Bereichs. `y = 0` ist die erste Zeile des Bereichs. Kollisionsprüfung, Ableitung Tablet/Mobil und Normalisierung laufen **je Bereich und Breakpoint**. Kacheln verschiedener Bereiche dürfen dieselben Koordinaten haben.
5. **Ohne Sektionen bytegleich:** Für ein Dashboard ohne `sections` liefern `getBreakpointLayout`, `normalizeDashboardLayouts`, `findLayoutIntegrityError` und `prepareConfigForStorage` exakt dasselbe Ergebnis wie heute (Tabellentest mit den bestehenden Fixtures aus `gridInvariants.vitest.ts` und `dashboardLayoutIntegrity`).
6. **Keine neue Schema-Version.** `sections` ist seit P03 als Top-Level-Feld vorgesehen und wird bisher nirgends geschrieben (§1). Der V1-Editor liest V2 nicht. Neue Revisionen mit Sektionen entstehen erst mit diesem Auftrag. Ältere Revisionen ohne `sections` bleiben gültig und lassen sich wiederherstellen (pgTAP-Test). Diese Begründung steht in der Spezifikation (§2.8).
7. `prepareConfigForStorage` entfernt keine Sektionen. Es normalisiert nur: Sektions-Titel getrimmt; `tileIds` in der Reihenfolge, in der die Kacheln im Bereich stehen (`y`, dann `x` im Desktop-Layout, dann Array-Index). Die Normalisierung ist idempotent (Test).

### 2.2 Server

8. Genau eine neue Migration `supabase/migrations/<datum>_dashboard_sections.sql` (Datum nach der letzten bestehenden Migration), idempotent (`CREATE OR REPLACE`). Sie erweitert `dashboard_config_v2_invalid_reason` um die Regeln aus Nr. 3 und lässt alle übrigen Prüfungen unverändert (insbesondere die `query`-Prüfung aus 154). Bestehende Migrationen werden nicht verändert.
9. Die Rastergrenzen je Kachel prüft der Server weiter wie bisher. Eine **serverseitige Überlappungsprüfung** bleibt wie seit 151 offen (keine Ausweitung in diesem Auftrag); die Browser-Integritätsprüfung bleibt die verbindliche Schranke des Editors.
10. pgTAP-Test `supabase/tests/dashboard_sections.sql`: gültige Sektionen; jede Regel aus Nr. 3 einzeln verletzt; Revision ohne `sections` wiederherstellen; `save_dashboard_v2` mit ungültigen Sektionen schlägt fehl, ohne Revision anzulegen. Gemeinsame Fixtures (JSON) unter `supabase/tests/fixtures/dashboard_sections/` nutzen Browser- und Servertest gleichermaßen (Paritätsnachweis, Muster aus 154).
11. `scripts/verifyMigrationUpgrade.mjs` bleibt grün.

### 2.3 Befehle (je Aktion genau ein Undo-Schritt)

12. Neue Datei `core/sectionCommands.ts`, Export über `core/editorCommands.ts`:
    - `AddSectionCommand(section, index)` – neue leere Sektion, Standardtitel „Neue Sektion“, bei Dopplung „Neue Sektion 2“ usw.; `collapsed: false`.
    - `RenameSectionCommand(sectionId, from, to)` – zusammenhängende Eingabe = ein Schritt über `textInputDebouncer.ts` (gleiches Verhalten wie beim Dashboard-Titel).
    - `MoveSectionCommand(sectionId, fromIndex, toIndex)`.
    - `SetSectionCollapsedCommand(sectionId, collapsed)`.
    - `RemoveSectionCommand(sectionId)` – die Kacheln der Sektion wandern in den Bereich „Ohne Sektion“ und werden dort unterhalb der vorhandenen Kacheln platziert (alle drei Breakpoints, `findFirstFreePosition` bzw. Ableitung). Es wird nie eine Kachel gelöscht. Undo stellt Sektion, Zugehörigkeit und alle Positionen exakt wieder her.
    - `MoveTileToSectionCommand(tileId, targetSectionId | null)` – Kachel an die erste freie Position des Zielbereichs (alle Breakpoints); Undo stellt Bereich und Positionen exakt wieder her.
13. Bestehende Befehle bleiben gültig: `RemoveTileCommand` entfernt die Kachel-ID auch aus ihrer Sektion und stellt sie beim Undo an derselben Stelle wieder her. `AddTileCommand` legt die Kachel in den **Zielbereich** (Nr. 18). `BatchMoveTilesCommand` wirkt nur innerhalb eines Bereichs.
14. Alle neuen Befehle implementieren `estimateByteSize` wie die bestehenden. Datenupdates erzeugen weiterhin keinen Undo-Eintrag und keinen Änderungsstern.
15. Tabellentest `sectionCommands.vitest.ts`: für jeden Befehl `undo(execute(s))` deep-equal `s` und `execute(undo(execute(s)))` deep-equal `execute(s)`; nach jedem Befehl gilt `validateDashboardConfigV2` und `findLayoutIntegrityError === null`.

### 2.4 Oberfläche im Editor

16. Neue Komponente `components/editor/sections/SectionedCanvasV2.tsx`: rendert zuerst den Bereich „Ohne Sektion“, dann die Sektionen in Reihenfolge. Jeder Bereich nutzt **dieselben** Bausteine wie heute (`EditorCanvasV2` bzw. dessen Raster mit `useGridDragAndDrop` und `useGridKeyboard`) mit den Kacheln des Bereichs. Ohne Sektionen ist das DOM des Canvas gleich wie heute (bestehende Canvas-Tests und Screenshots bleiben gleich).
17. **Sektionskopf** (`SectionHeaderV2.tsx`): Einklapp-Schalter als `<button aria-expanded aria-controls>` mit Titel und Kachelanzahl („Pipeline · 4 Kacheln“); im Bearbeitungsmodus zusätzlich Titel bearbeiten (Inline-Feld, Enter/Escape), nach oben/unten verschieben, entfernen (Bestätigung, sobald die Sektion Kacheln enthält: „Die 4 Kacheln bleiben erhalten und wandern nach ‚Ohne Sektion‘.“). Im Vorschau-Modus nur der Einklapp-Schalter.
18. **Zielbereich für neue Kacheln:** Ein Klick in den Kopf oder die leere Fläche einer Sektion macht sie zum aktiven Bereich (sichtbar markiert, Text plus Rahmen, nicht nur Farbe). Bibliothek „Hinzufügen“ und Drop aus der Bibliothek legen die Kachel im aktiven Bereich an; ohne aktive Auswahl im Bereich der ausgewählten Kachel, sonst in „Ohne Sektion“. Ein Drop auf eine bestimmte Sektion legt die Kachel dort an.
19. **Kachel verschieben zwischen Bereichen:** über das Kachel-Aktionsmenü „In Sektion verschieben …“ und im Inspector (Feld „Sektion“, Auswahl der Bereiche). Drag-and-Drop über Bereichsgrenzen ist **nicht** Teil von 157; Drag bleibt innerhalb eines Bereichs (Begründung in der Spezifikation: Tastatur- und Schaltflächenweg ist Pflicht, bereichsübergreifendes Ziehen kann in P15 ergänzt werden).
20. **„Sektion hinzufügen“** in der Top-Bar bzw. am Ende des Canvas. Bei 12 Sektionen deaktiviert mit Grund.
21. **Einklappen:** Im Bearbeitungsmodus ist Ein-/Ausklappen `SetSectionCollapsedCommand` (Undo, Änderungsstern), denn `collapsed` ist gespeicherte Konfiguration. Im Vorschau-Modus des Editors ist Ein-/Ausklappen flüchtig: kein Befehl, kein Änderungsstern; beim Verlassen der Vorschau gilt wieder der Entwurfsstand.
22. **Entlastung:** Eine eingeklappte Sektion rendert ihre Kacheln nicht (kein `LazyDashboardTile`, kein Diagramm-Chunk, kein `useData`-Aufruf). Test über einen zählenden `useData`-Mock: Einklappen beendet keine laufenden Daten anderer Bereiche; Ausklappen ruft für bereits geladene Abfragen wegen des geteilten Caches aus 154 keinen weiteren RPC auf.
23. **Auswahl und Inspector:** Wird die ausgewählte Kachel eingeklappt, bleibt sie ausgewählt; der Inspector zeigt den Hinweis „Kachel liegt in eingeklappter Sektion ‚…‘“ und einen Knopf „Sektion ausklappen“. Der Panel-Editor aus 155 lässt sich für solche Kacheln weiter öffnen.
24. **Statusleiste:** „Aktive/gesamte Widgets“ zählt eingeklappte Kacheln als nicht aktiv (Masterplan §3.1, Statusleiste).
25. **Mobil (375):** Sektionen untereinander, Kopf mit Touch-Zielen mindestens 44 × 44 px; Verschieben von Sektionen und Kacheln über Schaltflächen. Keine eigenen Sektionen je Breakpoint: die Gliederung gilt für alle Breakpoints, nur das Raster innerhalb des Bereichs ist breakpointabhängig.

### 2.5 Tastatur und Barrierefreiheit

26. Tab wechselt zwischen Sektionsköpfen und Rastern; Pfeiltasten bewegen sich wie bisher nur innerhalb eines Rasters. Ansagen über die bestehende Live-Region: „Sektion ‚Pipeline‘ eingeklappt, 4 Kacheln ausgeblendet“, „Kachel ‚Pipeline-Volumen‘ nach ‚Finanzen‘ verschoben“.
27. Fokus nach Aktionen: nach Entfernen einer Sektion auf den Kopf der vorherigen Sektion bzw. den Canvas-Anfang; nach Verschieben einer Kachel auf die Kachel an ihrer neuen Stelle. Kein Fokusverlust auf `body` (Test).
28. `e2e/a11y.spec.ts` um einen Zustand mit zwei Sektionen (eine eingeklappt) ergänzen; keine neuen Verstöße gegenüber `a11y-baseline.json`. `prefers-reduced-motion` gilt für die Einklapp-Animation.

### 2.6 Leistung

29. Messung im BUILD_LOG: Dashboard mit 24 Kacheln in 4 Sektionen, davon 2 eingeklappt, gegen dieselben 24 Kacheln ohne Sektionen: Anzahl gerenderter Kacheln, Anzahl `useData`-Aufrufe, Anzahl RPC-Aufrufe beim Öffnen. Erwartung: eingeklappte Kacheln tauchen in keiner der drei Zahlen auf.
30. `size-limit` bleibt grün; Sektionslogik liegt im Editor-Chunk, nicht im Initial-Bundle. Größe vor/nach im BUILD_LOG.

### 2.7 Panel-Editor-Vorschau (155)

31. Die Breakpoint-Vorschau im Panel-Editor berechnet die Kachelbreite weiter aus dem Breakpoint-Layout der Kachel. Weil Positionen jetzt bereichsbezogen sind, ändert sich daran nichts; der bestehende Panel-Test bleibt grün (Nachweis).

### 2.8 Dokumentation

32. Neue Spezifikation `docs/dashboard/SEKTIONEN_P09A.md`: Datenvertrag mit Regeln und Fehlertexten, Raster je Bereich, Normalisierung, Begründung „keine neue Schema-Version“ (Nr. 6), Befehle und ihr Undo-Vertrag, Verhalten beim Einklappen in Bearbeitung und Vorschau, Entlastungsnachweis, bewusste Grenzen (kein bereichsübergreifendes Ziehen; keine Sektionen je Breakpoint; Alarmauswertung existiert noch nicht und wird erst mit P13 serverseitig unabhängig vom Einklappzustand laufen).
33. Datierte Nachträge (nichts umschreiben): `DASHBOARD_EDITOR_MASTERPLAN.md` §6 (Plananpassung 14.11.2026: P09 geteilt in 157/158; nach dem Bau: Umsetzungsstand P09a), `GRID_VERGLEICH_ZIELMODELL_146.md` (Inhalt von `sections` festgelegt), `RASTERENGINE_P06.md` (Raster je Bereich).

## 3. Verbindliche Grenzen

1. **Schutzbereiche:** `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**` bleiben unberührt (Diff leer). Keine Typ-Generierung nötig, weil keine neue RPC entsteht.
2. **Genau eine Migration**, nur `dashboard_config_v2_invalid_reason` wird ersetzt. Keine Tabellen-, RLS- oder Grant-Änderung. `save_dashboard_v2`, `restore_dashboard_revision_v2` und die Lade-RPCs bleiben unverändert.
3. **Keine Datenmigration.** Bestehende Dashboards und Revisionen werden nicht umgeschrieben.
4. **Keine neuen Felder in `DashboardTileConfigV2`**, keine neue Schema-Version, die Kachelgrenze von 24 bleibt.
5. **V1-Editor unverändert**, Rollout-Schalter (`dashboardRollout.ts`) unverändert.
6. **Keine neuen Abhängigkeiten.** Vorhandene Komponenten (`Button`, `UnsavedChangesDialog` bzw. Bestätigungsdialog, Design-Tokens, Lucide-Symbole) wiederverwenden.
7. **`max-lines` 400.** `DashboardEditorShellV2.tsx` bekommt nur die Einbindung von `SectionedCanvasV2` und die Weitergabe der neuen Handler; reicht der Platz nicht, zuerst bestehende Shell-Logik ohne Verhaltensänderung in einen Hook auslagern (mit Test). `EditorTopBarV2.tsx` (424) darf nicht länger werden: der Knopf „Sektion hinzufügen“ kommt entweder in eine eigene kleine Komponente oder ans Canvas-Ende.
8. **Tests zuerst** (rot vor grün), Rot-Läufe im BUILD_LOG: (a) `validateDashboardConfigV2` akzeptiert heute `sections: [{"foo":1}]`; (b) der Server akzeptiert heute dasselbe; (c) zwei Kacheln mit gleichen Koordinaten in verschiedenen Sektionen gelten heute als Überlappung.
9. **Kein Eingriff in Hosted-Supabase.** Die Migration läuft lokal und in CI; die Anwendung auf die Hosted-Instanz entscheidet Marc. Betriebsregel aus 153 gilt weiter.
10. `crmRepository.ts`, `src/domain/executiveCockpitData.ts` und die Datenauflösung (`data/**`) bleiben unverändert.

## 4. Ziel-Dateien

| Pfad                                                                                                                                                  | Änderung                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_157_DASHBOARD_SEKTIONEN.md`                                                                                       | Dieser Auftrag (Checkboxen abhaken, Status)                                                              |
| `docs/dashboard/SEKTIONEN_P09A.md`                                                                                                                    | Neu: Spezifikation (2.8 Nr. 32)                                                                          |
| `src/features/dashboard/model/dashboardConfigV2.ts`                                                                                                   | Typ `DashboardSectionV2`, Prüfregeln aus 2.1 Nr. 3                                                       |
| `src/features/dashboard/model/dashboardSections.ts`                                                                                                   | Neu: reine Funktionen (Bereich einer Kachel, Kacheln je Bereich, Normalisierung, Standardtitel)          |
| `src/features/dashboard/components/editor/grid/gridEngine.ts`                                                                                         | Nur falls die Bereichsaufteilung eine Hilfsfunktion braucht; Verhalten ohne Sektionen unverändert        |
| `src/features/dashboard/services/dashboardLayoutIntegrity.ts`                                                                                         | Prüfung und Normalisierung je Bereich (2.1 Nr. 4, 5, 7)                                                  |
| `src/features/dashboard/core/sectionCommands.ts`                                                                                                      | Neu: Befehle aus 2.3 Nr. 12                                                                              |
| `src/features/dashboard/core/editorCommands.ts`, `core/layoutCommands.ts`                                                                             | Export; Anpassung `AddTileCommand`/`RemoveTileCommand`/`BatchMoveTilesCommand` an Bereiche (2.3 Nr. 13)  |
| `src/features/dashboard/components/editor/editorPlacement.ts`                                                                                         | Platzierung im Zielbereich                                                                               |
| `src/features/dashboard/components/editor/sections/SectionedCanvasV2.tsx`                                                                             | Neu                                                                                                      |
| `src/features/dashboard/components/editor/sections/SectionHeaderV2.tsx`                                                                               | Neu                                                                                                      |
| `src/features/dashboard/components/editor/sections/useSectionActions.ts`                                                                              | Neu: Handler, aktiver Bereich, flüchtiger Einklappzustand im Vorschau-Modus, Fokus und Ansagen           |
| `src/features/dashboard/components/editor/EditorCanvasV2.tsx`                                                                                         | Nur Aufruf je Bereich ermöglichen (Kachel-Teilmenge, Bereichskennung für Ansagen)                        |
| `src/features/dashboard/components/editor/canvas/CanvasTileCard.tsx`                                                                                  | Aktion „In Sektion verschieben …“                                                                        |
| `src/features/dashboard/components/editor/EditorInspectorV2.tsx`, `inspector/InspectorTabs.tsx`                                                       | Feld „Sektion“, Hinweis eingeklappte Sektion (InspectorTabs darf nicht über 400 Zeilen wachsen)          |
| `src/features/dashboard/components/editor/EditorStatusBarV2.tsx`                                                                                      | Zählung aktive/gesamte Widgets (2.4 Nr. 24)                                                              |
| `src/features/dashboard/components/editor/DashboardEditorShellV2.tsx`                                                                                 | Einbindung (§3 Nr. 7)                                                                                    |
| `src/features/dashboard/preview/DashboardEditorPreviewV2.tsx`                                                                                         | Beispiel mit Sektionen für den Screenshot-Harness                                                        |
| `supabase/migrations/<datum>_dashboard_sections.sql`                                                                                                  | Neu (2.2)                                                                                                |
| `supabase/tests/dashboard_sections.sql`, `supabase/tests/fixtures/dashboard_sections/**`                                                              | Neu (2.2 Nr. 10)                                                                                         |
| `src/features/dashboard/__tests__/dashboardSections.vitest.ts`                                                                                        | Neu: Regeln, Parität mit den Fixtures, Normalisierung idempotent, ohne Sektionen bytegleich              |
| `src/features/dashboard/__tests__/sectionCommands.vitest.ts`                                                                                          | Neu (2.3 Nr. 15)                                                                                         |
| `src/features/dashboard/__tests__/SectionedCanvasV2.ui.vitest.tsx`                                                                                    | Neu: Rendern, Einklappen (Bearbeitung/Vorschau), keine `useData`-Aufrufe bei eingeklappt, Fokus, Ansagen |
| bestehende Tests (`gridInvariants`, `gridEngine`, `dashboardConfigV2`, `editorCommands`, `DashboardEditorShellV2`, `EditorInspectorV2`, Panel-Editor) | Erwartungen ergänzen; nicht löschen                                                                      |
| `e2e/personal-dashboard-sections.spec.ts`                                                                                                             | Neu: Sektion anlegen, umbenennen, Kachel verschieben, einklappen, speichern, neu laden, Undo             |
| `e2e/a11y.spec.ts`, `e2e/a11y-baseline.json`                                                                                                          | Zustand mit Sektionen (Baseline nur erweitern)                                                           |
| `scripts/captureAuftrag157GateScreenshots.mjs`, `docs/screenshots/auftrag-157/README.md`                                                              | Neu: Harness und Ergebnis-Matrix (nur README committen)                                                  |
| `docs/dashboard/DASHBOARD_EDITOR_MASTERPLAN.md`, `docs/dashboard/GRID_VERGLEICH_ZIELMODELL_146.md`, `docs/dashboard/RASTERENGINE_P06.md`              | Datierte Nachträge (2.8 Nr. 33)                                                                          |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                                                                                                  | Status, Builder-Eintrag, Prüfnachweis                                                                    |

Bei Bedarf außerhalb dieser Liste: stoppen und im PR begründen (`CLAUDE.md` §5.3).

## 5. Tasks

Reihenfolge je Block: Tests zuerst, dann Umsetzung.

- [x] **T0 Einstieg:** Branch auf aktuellen `main` rebasen, `<BASELINE>` notieren (`60aa96b`). Masterplan P09/§4.A/§5.1, `RASTERENGINE_P06.md`, `EDITOR_KERN_P04.md`, `PANEL_EDITOR_P08B.md` und diesen Auftrag lesen. Per SQL bestätigt: 0 Dashboards und 0 Revisionen enthalten `sections` (Seed 0). Schutzbereichs-Diff leer.
- [x] **T1 Rot-Nachweise:** §3 Nr. 8 (a)–(c). Ergebnisse im BUILD_LOG.
- [x] **T2 Datenvertrag:** Typ, Prüfregeln, `dashboardSections.ts`, gemeinsame Fixtures; Test „ohne Sektionen bytegleich“.
- [x] **T3 Server:** Migration, pgTAP-Test, Paritätslauf mit denselben Fixtures, `verifyMigrationUpgrade` grün.
- [x] **T4 Raster und Integrität je Bereich:** `dashboardLayoutIntegrity.ts`, Platzierung, Anpassung der bestehenden Befehle. T1 (c) grün.
- [x] **T5 Sektionsbefehle:** `sectionCommands.ts` mit Tabellentest (2.3 Nr. 15).
- [x] **T6 Canvas und Kopf:** `SectionedCanvasV2`, `SectionHeaderV2`, `useSectionActions`; aktiver Bereich; Einklappen in Bearbeitung und Vorschau; Entlastungstest mit zählendem `useData`.
- [x] **T7 Kachel verschieben, Inspector, Statusleiste:** Aktionsmenü, Inspector-Feld und Hinweis, Zählung.
- [x] **T8 Tastatur, Fokus, Ansagen, Mobil.**
- [x] **T9 E2E, a11y, Screenshots:** Playwright-Ablauf; a11y-Ergänzung; Harness (Editor ohne Sektionen = Vorher; mit zwei Sektionen, eine eingeklappt; Entfernen-Bestätigung; jeweils 1440/768/375), SHA-256 unterschiedlich, 0 px Overflow. Zusätzlich Nachweis, dass der Editor ohne Sektionen gegenüber `<BASELINE>` gleiche Hashes liefert.
- [x] **T10 Leistung:** Messung aus 2.6 im BUILD_LOG.
- [x] **T11 Doku:** Spezifikation und Nachträge (2.8).
- [x] **T12 Abschluss:** Pflicht-Verifikation (§7), Bundle-Größen, Schutzbereichs-Diff, BUILD_LOG-Builder-Eintrag, PR öffnen, Review anfordern.

## 6. Abnahme

- Sektionen lassen sich anlegen, umbenennen, verschieben, einklappen und entfernen; Kacheln lassen sich zwischen Bereichen verschieben. Jede Aktion ist genau ein Undo-Schritt, Redo stellt sie exakt wieder her.
- Entfernen einer Sektion löscht nie eine Kachel.
- Eingeklappte Sektionen rendern keine Kacheln und lösen keine Datenabrufe aus (Zähltest und Messung).
- Browser und Server lehnen dieselben ungültigen `sections` ab (gemeinsame Fixtures); ältere Revisionen ohne Sektionen bleiben speicher- und wiederherstellbar.
- Ein Dashboard ohne Sektionen verhält sich und sieht aus wie vorher (Tests und Screenshot-Hashes).
- Gespeicherte Sektionen überstehen Neuladen und Revisionswiederherstellung.
- 1440/768/375 ohne horizontalen Overflow, Tastaturbedienung vollständig, keine neuen a11y-Verstöße.
- Schutzbereichs-Diff leer, eine Migration ohne Tabellen-/RLS-Änderung, keine neuen Abhängigkeiten, `size-limit` grün, V1-Editor unverändert.

## 7. Pflicht-Verifikation

```
npx tsc --noEmit
npm run lint
npm run format:check
npm test
npm run verify
npm run build
npm run build:production      # mit gültiger Beispielkonfiguration
npm run size-limit
git diff <BASELINE> -- src/simulation src/types src/context src/services/data src/features/resources   # muss leer sein
git diff <BASELINE> -- src/services/db/crmRepository.ts src/domain/executiveCockpitData.ts src/features/dashboard/data   # muss leer sein
git diff <BASELINE> --stat -- supabase/migrations   # genau eine neue Datei, keine geänderte
```

Zusätzlich: SQL-Tests unter `supabase/tests/` gegen die lokale Supabase-Instanz (wie in 150–154), Playwright `e2e/personal-dashboard-sections.spec.ts` und `e2e/a11y.spec.ts` lokal, CI-Checks `lint`, `typecheck`, `test`, `build`, `livekpi-verifiers`, `size-limit`, `e2e` grün.

## 8. Plananpassung, offene Punkte und Risiken

- **Teilung P09 (Entscheidung Builder-Planung 14.11.2026, Marc kann umentscheiden):** P09 umfasst Sektionen, einklappbare Gruppen, Vorlagen und Dashboard-Auswahl. 157 = P09a (Sektionen, Einklappen; eine Migration ohne neue RPC). 158 = P09b (V2-Vorlagen einschließlich Sektionen auf Basis von `dashboardPresets.ts`, Dashboard-Auswahl in der Top-Bar: Liste, neu anlegen, umbenennen, löschen persönlicher V2-Dashboards; braucht eine neue Listen-RPC, weil heute nur `load_personal_dashboard_v2` und `get_or_create_personal_dashboard_v2` existieren). Grund: Umfang und getrennte Prüfbarkeit, wie bei P08. Die P09-Abnahme gilt erst mit 158 als erfüllt.
- **Positionen bereichsbezogen:** Ein älterer Editorstand (vor 157) würde Sektionen ignorieren und gleiche Koordinaten verschiedener Bereiche als Überlappung „reparieren“. Weil der V2-Editor nur als Pilot hinter dem Rollout-Schalter läuft und Browser und Server gemeinsam ausgeliefert werden, ist das hinnehmbar; die Spezifikation hält es fest.
- **Serverseitige Überlappungsprüfung** bleibt offen (seit 151), siehe 2.2 Nr. 9.
- **Konflikt beim Speichern:** unverändert über den Konfliktdialog aus P07.
- **Nicht Teil dieses Auftrags:** Vorlagen und Dashboard-Auswahl (158), Ziehen über Bereichsgrenzen, Sektionen je Breakpoint, verschachtelte Sektionen, sektionsbezogene Filter oder Zeiträume, Team-Freigaben (P11), Alarmauswertung (P13).
