# Auftrag 147 – Dashboard-Editor: Entkopplung des Editor-Kerns (P04)

**Ziel:** Entkopplung des Dashboard-Editor-Kerns durch Implementierung des Reversible-Command-Patterns (Delta-Patches statt schwerer Vollkopien), unbegrenztem Undo/Redo mit Meilenstein-Checkpoints und Speichermonitoring (Soft-Limit 15 MiB), Transaktionsbündelung für Drag/Resize, Eingabebündelung für Textfelder (600 ms Debounce / Blur), strikter Entkopplung von Datenupdates, Navigationsschutz für ungespeicherte Entwürfe sowie Einführung des neuen Feature-Rollout-Schalters `VITE_DASHBOARD_EDITOR_V2` (Standard: `false` = alter V1-Editor aktiv).

**Masterplan:** [Dashboard-Editor-Masterplan, Revision 2](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), insbesondere P04 sowie Abschnitte 3.1, 4.A, 7 und 8.

**Vorgelagert:**
- [Auftrag 144 (Bestandsprüfung, PR #168)](./ANTIGRAVITY_AUFTRAG_144_DASHBOARD_EDITOR_BESTANDSPRUEFUNG.md)
- [Auftrag 145 (UX-Konzept & Fachverträge, PR #169)](./ANTIGRAVITY_AUFTRAG_145_DASHBOARD_EDITOR_UX_FACHVERTRAEGE.md) mit [EDITOR_UX_FACHVERTRAEGE_145.md](../dashboard/EDITOR_UX_FACHVERTRAEGE_145.md)
- [Auftrag 146 (Grid-Vergleich & Ziel-Speichermodell, PR #170)](./ANTIGRAVITY_AUFTRAG_146_DASHBOARD_EDITOR_GRID_ZIEL_SPEICHERMODELL.md) mit [GRID_VERGLEICH_ZIELMODELL_146.md](../dashboard/GRID_VERGLEICH_ZIELMODELL_146.md)

**Baseline:** `main`, Commit `679e70e5b9dd1d735071192e21245789fcf270be` (nach Merge von PR #170).

**Builder:** Antigravity. **Prüfer:** Codex (chatgpt-codex-connector auf GitHub) gemäß `CLAUDE.md` §4.1. **Merge und Release:** Marc.

**Status:** IN BEARBEITUNG (Branch: `auftrag-147-dashboard-editor-kern-entkoppeln`).

---

## 1. Ergebnis dieses Auftrags

Dieser Auftrag setzt Paket P04 aus dem Dashboard-Editor-Masterplan um. Er implementiert das Fundament der Zustands- und Aktionsverwaltung für den neuen Dashboard-Editor (V2) und entkoppelt den Editor-Kern vollständig von bestehender V1-Logik und von Backend-Persistenz.

Am Ende liegen vor:

1. **V2-Datenmodell & Schema-Validierung (`src/features/dashboard/model/dashboardConfigV2.ts`):**
   - Vollständige TypeScript-Typdefinitionen gemäß P02 §9.1 und P03 §3: `DashboardConfigV2`, `DashboardTileConfigV2`, `BreakpointGridPositions`, `GridPosition`, `TileDisplayOptions`, `TileQueryConfig`, `TileThresholdRule`, `DashboardScope`, `DashboardDraftState`.
   - Clientseitiger Schema-Validator `validateDashboardConfigV2()` mit Parität zur PostgreSQL-Funktion `dashboard_config_v2_invalid_reason` (max. 64 KiB, max. 24 Kacheln, eindeutige IDs, Rastergrenzen: Desktop 12 Spalten, Tablet 6 Spalten, Mobile 1 Spalte).
2. **Reversible-Command-Pattern mit Delta-Patches (`src/features/dashboard/core/editorCommands.ts`):**
   - Speichereffiziente Befehle (< 1 KiB pro Schritt) mit `execute()` und `undo()`: `MoveTileCommand`, `ResizeTileCommand`, `BatchMoveTilesCommand` (für Reflow/Kollision), `AddTileCommand`, `RemoveTileCommand`, `UpdateTileConfigCommand`, `UpdateDashboardMetaCommand`, `SetGlobalFilterCommand`, `CompoundCommand`.
   - Strikte Invertierbarkeit: Jeder Befehl kann den exakten vorherigen Zustand bitgenau wiederherstellen.
3. **Editor-Kern mit unbegrenztem Undo/Redo & Eingabebündelung (`src/features/dashboard/core/dashboardEditorCore.ts`):**
   - Unbegrenzter Undo/Redo-Stack: Keine künstliche Obergrenze (weder 50 noch 200 Aktionen); Beseitigung des bisherigen 50er-Slice-Abbruchs.
   - Meilenstein-Checkpoints und Speichermonitoring: Überwachung des Verlaufs-Speicherbedarfs (Soft-Limit: 15 MiB). Bei Erreichen sichtbare Warnung statt stiller Verwurfkürzung; geordnete Bereinigung vor dem ältesten Checkpoint.
   - Transaktionsbündelung: Kontinuierliche Layout-Aktualisierungen während Drag/Resize im Entwurf; exakt **ein** Undo-Schritt bei Transaktionsabschluss (`commitTransaction`).
   - Kollisions-Reflow: Gleichzeitige Anpassung mehrerer Kacheln wird atomar in denselben Undo-Schritt gebündelt.
   - Debounced Text-Eingabebündelung: Zusammenhängende Texteingaben in Inspector-Feldern werden über 600 ms Pause oder Fokuswechsel (`onBlur`) zu einem einzigen Undo-Schritt gebündelt.
   - Ausschluss von Daten-Updates: Hintergrund-Refetches, WebSocket-Ticks und CRM-Cache-Updates erzeugen **niemals** Undo-Schritte und berühren das `isDirty`-Flag nicht.
4. **Feature-Rollout-Schalter (`src/features/dashboard/model/dashboardRollout.ts`):**
   - Definition und Auswertung von `VITE_DASHBOARD_EDITOR_V2` (Standard: `false` = alter V1-Editor aktiv).
   - Saubere Rollout-Trennung: V1 bleibt für reguläre Nutzer 100 % unverändert und lauffähig.
   - Runtime-Override-Möglichkeit für Tests und Pilotbetrieb.
5. **Entkoppelter Editor-Hook & Navigationsschutz (`src/features/dashboard/hooks/useDashboardEditorV2.ts`):**
   - Reaktiver Hook für Komponenten zur Nutzung des Editor-Kerns.
   - In-App-Navigationsschutz über `useInAppLinkGuard` und `beforeunload`, wenn `isDirty = true`.
6. **Vollständige Vitest-Testsuite:**
   - Hohe Testabdeckung für alle Commands, Invertierbarkeit, 100+ Aktionen-Sitzungen, Transaktionsbündelung, Text-Debounce, Datenupdate-Ausschluss, Rollout-Schalter und Navigationsschutz.
7. **Architektur- und Spezifikationsdokument:**
   - `docs/dashboard/EDITOR_KERN_P04.md` zur Dokumentation der Verträge und Baugrundlagen für P05 (Shell) und P06 (Rasterengine).

---

## 2. Verbindliche Grenzen

1. `CLAUDE.md` strikt einhalten. Die Schutzbereiche (`src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`) bleiben unangetastet (Diff = 0 Bytes).
2. Der bestehende V1-Editor (`src/features/dashboard/hooks/useDashboardEditor.ts`, `DashboardWorkspace.tsx`, etc.) bleibt für reguläre Nutzer voll funktionsfähig und darf nicht gebrochen werden.
3. Keine neuen externen npm-Abhängigkeiten. Sämtliche Kernlogik (Commands, History, Debounce) wird maßgeschneidert und typsicher implementiert.
4. Keine direkten Datenbank-Zugriffe in diesem Paket (die Supabase-Migrationen und RPC-Aufrufe folgen in P07).

---

## 3. Ziel-Dateien

| Pfad | Erlaubte Änderung / Zweck |
| --- | --- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_147_DASHBOARD_EDITOR_KERN_ENTKOPPELN.md` | Dieser Auftrag |
| `docs/dashboard/EDITOR_KERN_P04.md` | Neu: Architektur- und Funktionsspezifikation des entkoppelten Editor-Kerns (P04) |
| `src/features/dashboard/model/dashboardConfigV2.ts` | Neu: V2-Datenmodell, Validierung und Draft-State |
| `src/features/dashboard/model/dashboardRollout.ts` | Erweitern: Feature-Flag `VITE_DASHBOARD_EDITOR_V2` & Runtime-Toggle |
| `src/features/dashboard/core/editorCommands.ts` | Neu: Reversible-Command-Pattern mit Delta-Patches |
| `src/features/dashboard/core/dashboardEditorCore.ts` | Neu: Entkoppelter Editor-Kern (History, Checkpoints, Bündelung) |
| `src/features/dashboard/hooks/useDashboardEditorV2.ts` | Neu: React-Hook mit Navigationsschutz |
| `src/features/dashboard/__tests__/dashboardConfigV2.vitest.ts` | Neu: Tests für V2-Typmodell und Validierung |
| `src/features/dashboard/__tests__/editorCommands.vitest.ts` | Neu: Tests für Command-Invertierbarkeit & Patches |
| `src/features/dashboard/__tests__/dashboardEditorCore.vitest.ts` | Neu: Tests für Undo/Redo, Checkpoints, Debounce, 100+ Aktionen |
| `src/features/dashboard/__tests__/dashboardRollout.vitest.ts` | Erweitern: Tests für V2-Rollout-Schalter |
| `src/features/dashboard/__tests__/useDashboardEditorV2.ui.vitest.tsx` | Neu: Tests für React-Hook und Navigationsschutz |
| `docs/BUILD_LOG.md` | Builder-Eintrag & Prüfnachweis |
| `BUILD_PLAN.md` | Statusaktualisierung |

---

## 4. Aufgaben in Reihenfolge

### T1 – Detailauftrag und Architekturdokumentation (P04)
- [x] Detailauftrag `ANTIGRAVITY_AUFTRAG_147_DASHBOARD_EDITOR_KERN_ENTKOPPELN.md` erstellen.
- [x] Dokument `docs/dashboard/EDITOR_KERN_P04.md` anlegen und Schnittstellen, Command-Katalog sowie Speicherverwaltung beschreiben.

### T2 – V2-Typmodell & Schema-Validierung umsetzen
- [x] `src/features/dashboard/model/dashboardConfigV2.ts` implementieren.
- [x] Schema-Validator `validateDashboardConfigV2()` mit 64 KiB Begrenzung, max. 24 Kacheln und Rastergrenzen ausstatten.
- [x] Vitest-Suite `src/features/dashboard/__tests__/dashboardConfigV2.vitest.ts` erstellen.

### T3 – Reversible-Command-Pattern implementieren
- [x] `src/features/dashboard/core/editorCommands.ts` anlegen.
- [x] Sämtliche atomaren Delta-Befehle (`Move`, `Resize`, `BatchMove`, `Add`, `Remove`, `UpdateConfig`, `Meta`, `Compound`) implementieren.
- [x] Vitest-Suite `src/features/dashboard/__tests__/editorCommands.vitest.ts` für vollständige Invertierbarkeit schreiben.

### T4 – Editor-Kern mit unbegrenztem Undo/Redo & Eingabebündelung
- [x] `src/features/dashboard/core/dashboardEditorCore.ts` implementieren.
- [x] Unbegrenzter Stack ohne 50er-Abbruch, Checkpoint-Verwaltung, 15 MiB Soft-Limit mit Warnung.
- [x] Transaktionsbündelung für Drag/Resize und Reflow.
- [x] Debounced Text-Eingabebündelung (600 ms / Blur).
- [x] Ausschluss von Datenupdates verifizieren (kein Undo, kein `dirty`).
- [x] Vitest-Suite `src/features/dashboard/__tests__/dashboardEditorCore.vitest.ts` erstellen.

### T5 – Feature-Rollout-Schalter integrieren
- [x] `src/features/dashboard/model/dashboardRollout.ts` um `isDashboardEditorV2Enabled` und Pilot-Toggle erweitern.
- [x] Vitest-Tests in `src/features/dashboard/__tests__/dashboardRollout.vitest.ts` ergänzen.

### T6 – React Hook `useDashboardEditorV2` & Navigationsschutz
- [x] `src/features/dashboard/hooks/useDashboardEditorV2.ts` implementieren.
- [x] Anbindung von `useInAppLinkGuard` und `beforeunload`.
- [x] Vitest-Komponententests in `src/features/dashboard/__tests__/useDashboardEditorV2.ui.vitest.tsx` erstellen.

### T7 – Verifikation, Doku & PR öffnen
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm test`, `npm run verify`, `npm run build` durchführen.
- [x] Schutzbereichs-Diff prüfen (strikt 0 Bytes gegen `679e70e`).
- [ ] `docs/BUILD_LOG.md` und `BUILD_PLAN.md` aktualisieren.
- [ ] Commit, Push, PR auf GitHub öffnen und Codex-Review anfordern.
