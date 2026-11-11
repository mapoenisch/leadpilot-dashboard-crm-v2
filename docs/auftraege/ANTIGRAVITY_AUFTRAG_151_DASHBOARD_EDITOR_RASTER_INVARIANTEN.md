# Auftrag 151 – Dashboard-Editor: Nacharbeit Raster-Invarianten (P06b)

**Ziel:** Der Editor erzeugt, zeigt und speichert in keinem Breakpoint überlappende Kacheln mehr. Hinzufügen, Duplizieren und Drop laufen über einen gemeinsamen, kollisionssicheren Platzierungspfad; Reflow reiht verdrängte Kacheln wieder ein; der Tablet- und Mobil-Fallback wird überlappungsfrei abgeleitet; Pointer-Drag berücksichtigt Auto-Scroll; Drop und Speichern akzeptieren nur bekannte Katalog-IDs.

**Masterplan:** [Dashboard-Editor-Masterplan](../dashboard/DASHBOARD_EDITOR_MASTERPLAN.md), Zeile P06b (Plananpassung 11.11.2026).
**Anlass:** [Triage des externen Audits](../reviews/2026-11-11-externes-audit-triage.md), Befunde N-1 bis N-5 und Zusatzfund „Speichervalidierung“.
**Vorgelagert:** Auftrag 149 (P06, PR #174), Auftrag 150 (P07, PR #175).
**Baseline:** `main`, Commit `ad812c4` (nach Merge PR #176).
**Builder:** Claude Code. **Prüfer:** Codex (GitHub) gemäß `CLAUDE.md` §4.1. **Merge:** Marc.
**Status:** GEBAUT, wartet auf unabhängiges Review.

---

## 1. Befunde und Soll

| ID  | Ist (Baseline)                                                                                                                             | Soll                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| N-1 | `computeNextAvailablePosition` setzt `y = maxY - h` ohne Kollisionsprüfung; Drop gibt Nicht-Ziel-Breakpoints dieselbe ungeprüfte Position. | Erste freie Position (Zeile, dann Spalte) im abgeleiteten Layout jedes Breakpoints. Ein Pfad (`buildNewTile`) für Hinzufügen, Duplizieren, Drop. |
| N-2 | Fallback klemmt nur `x`/`w`; Hinzufügen schreibt fest `tablet.x = 0`.                                                                      | `getBreakpointLayout` leitet Tablet/Mobil aus Desktop ab und schiebt kollidierende Kacheln deterministisch nach unten.                           |
| N-3 | `resolveCollisions` reiht bereits verarbeitete Kacheln nicht wieder ein; Kollision mit der aktiven Kachel bleibt.                          | Wiedereinreihung jeder verschobenen Kachel; nicht-aktive Kachel weicht der aktiven aus; Iterationsgrenze mit deterministischem Rückfall.         |
| N-4 | Pointer-Drag rechnet nur `clientX/Y - startX/Y`.                                                                                           | Scroll-Delta des Containers fließt in Drag und Resize ein; Auto-Scroll aktualisiert die Vorschau auch ohne Mausbewegung.                         |
| N-5 | Drop fällt auf beliebiges `text/plain` zurück; unbekannte ID erzeugt Kachel.                                                               | Nur aktive Katalog-IDs erzeugen Kacheln (`text/leadpilot-kpi` bevorzugt, `text/plain` nur nach Katalogprüfung).                                  |
| S-1 | Speicherpfad prüft weder Überlappung noch Katalogzugehörigkeit.                                                                            | Vor `create_dashboard_v2`/`save_dashboard_v2`: Layouts deterministisch normalisieren, unbekannte `catalogId` ablehnen (`ungueltig`).             |

Weitere Korrektur im selben Pfad: Mobile-Umsortierung (`reorderMobileTiles`) tauscht nicht mehr nur `y`, sondern stapelt beide Kacheln lückenlos (sonst Überlappung bei ungleichen Höhen).

## 2. Verbindliche Grenzen

1. Schutzbereiche nach `CLAUDE.md` §6 bleiben unberührt (Diff leer).
2. Keine SQL-Migration: Die Servervalidierung (`dashboard_config_v2_invalid_reason`) bleibt unverändert. Serverparität für Überlappung und Katalog ist als offener Punkt dokumentiert (Ausnutzung nur am eigenen persönlichen Dashboard möglich).
3. Keine neuen Abhängigkeiten; eigenschaftsbasierte Tests mit eigenem, deterministischem Zufallsgenerator.
4. `max-lines` 400 je Datei.
5. Committende Operationen materialisieren das abgeleitete Layout des betroffenen Breakpoints (alle Kacheln erhalten eine explizite Position), damit nach dem Speichern keine Kachel springt.

## 3. Ziel-Dateien

| Pfad                                                                            | Änderung                                                                           |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `docs/auftraege/ANTIGRAVITY_AUFTRAG_151_DASHBOARD_EDITOR_RASTER_INVARIANTEN.md` | Dieser Auftrag                                                                     |
| `src/features/dashboard/components/editor/grid/gridEngine.ts`                   | `getBreakpointLayout`, `findFirstFreePosition`, `findOverlap`, `resolveCollisions` |
| `src/features/dashboard/components/editor/editorPlacement.ts`                   | `buildNewTile`, `buildDuplicateTile`, `planLayoutChange`, Drop, Mobil-Tausch       |
| `src/features/dashboard/components/editor/grid/useGridDragAndDrop.ts`           | Scroll-Delta, Vorschau über `planLayoutChange`                                     |
| `src/features/dashboard/components/editor/grid/useGridKeyboard.ts`              | Abgeleitetes Layout, `planLayoutChange`                                            |
| `src/features/dashboard/components/editor/EditorCanvasV2.tsx`                   | Render aus abgeleitetem Layout, Drop nur mit Katalog-ID                            |
| `src/features/dashboard/components/editor/DashboardEditorShellV2.tsx`           | Hinzufügen/Duplizieren über gemeinsamen Pfad                                       |
| `src/features/dashboard/services/dashboardLayoutIntegrity.ts`                   | Neu: Normalisierung und Katalogprüfung vor dem Speichern                           |
| `src/features/dashboard/services/dashboardStorageV2.ts`                         | Integritätsprüfung vor Create/Save                                                 |
| `src/features/dashboard/hooks/useDashboardV2Storage.ts`                         | Normalisierte Konfiguration speichern und übernehmen                               |
| `src/features/dashboard/__tests__/gridInvariants.vitest.ts`                     | Neu: Regressionsfälle und eigenschaftsbasierte Schleife                            |
| `src/features/dashboard/__tests__/dashboardLayoutIntegrity.vitest.ts`           | Neu: Speicherprüfung                                                               |
| `src/features/dashboard/__tests__/*` (bestehende Raster-/Editor-Tests)          | Nur anpassen, wo sie das alte Fehlverhalten festschreiben                          |
| `docs/dashboard/RASTERENGINE_P06.md`                                            | Nachtrag P06b                                                                      |
| `BUILD_PLAN.md`, `docs/BUILD_LOG.md`                                            | Status und Builder-Eintrag                                                         |

## 4. Tasks

- [x] T1 Tests zuerst: Audit-Regressionsfall `(1,9,2×3)`, `(6,4,3×2)`, `(3,9,4×2)` + neue Kachel; Tablet-Fallback; Wiedereinreihung; Drop mit unbekannter ID; Mobil-Tausch ungleicher Höhen; eigenschaftsbasierte Schleife (Add/Duplicate/Drop/Move/Resize/Mobil-Tausch/Entfernen, je Breakpoint). Rot-Lauf protokollieren.
- [x] T2 Rasterengine: abgeleitetes Layout, freie Position, Überlappungssuche, `resolveCollisions` mit Wiedereinreihung.
- [x] T3 Gemeinsamer Platzierungspfad (`buildNewTile`) für Hinzufügen, Duplizieren und Drop; `planLayoutChange` für Drag, Resize und Tastatur.
- [x] T4 Pointer-Drag mit Scroll-Delta und Vorschau-Aktualisierung bei Auto-Scroll.
- [x] T5 Drop nur mit aktiver Katalog-ID.
- [x] T6 Speicherprüfung (Normalisierung + Katalog) in Hook und Speicheradapter.
- [x] T7 Pflicht-Verifikation (`tsc`, `lint`, `format:check`, `test`, `verify`, `build`, Qualitätsbudget, size-limit), Schutzbereichs-Diff, BUILD_LOG, PR.

## 5. Abnahme

- Eigenschaftsbasierter Test: nach jeder Operation keine Überlappung in desktop/tablet/mobile, weder im abgeleiteten noch unter den explizit gespeicherten Positionen.
- Audit-Regressionsfall grün.
- Überlappende Layouts werden vor dem Speichern deterministisch normalisiert; unbekannte Katalog-IDs werden abgelehnt und nicht als Revision gespeichert.
- Keine UI-Gestaltungsänderung (keine Screenshot-Matrix nötig; Verhalten über Tests belegt).
