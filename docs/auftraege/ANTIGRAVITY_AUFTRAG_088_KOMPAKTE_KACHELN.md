# ANTIGRAVITY_AUFTRAG_088 — Paket E, Teil 1: Kompakte Kacheln nach den Mustern

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 10 (Arbeitspaket E), Gestaltungsregeln aus Auftrag 087 (Paket D, freigegeben).
> Gestartet von Marc Poenisch im Chat am 09.10.2026 („mach dann gleich den ersten Auftrag“).

## Aufteilung von Paket E

- **088 (dieser Auftrag):** Kachelkopf, Metazeile, Zahlkachel, Wertfarbe in Diagrammen, Fehlerrot.
- **089 (folgt):** Header/Einleitung, Simulationsleiste mobil, Standardpriorität, kürzere Bezeichnungen
  (Ziel 160–220 px), Vergleichswerte, 375 × 812-Nachweis.
- **Revision (Entscheidung Marc 09.10.2026):** Der Plan-Punkt „Chart-Komponenten flach gestalten“
  entfällt – die 3D-Tiefe bleibt; umgesetzt wird nur die Lesbarkeit.

## Baseline

- Branch `claude/auftrag-088-kompakte-kacheln` von `main` `e007ff0`. Schutzbereichs-Baseline `e007ff0`.

## Ziel-Dateien

| Datei                                                                                   | Änderung                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/features/dashboard/components/DashboardTile.tsx`                                   | Titel 15 px, Stand/Quelle in der Zeitbezug-Zeile, Mindesthöhe Zahl 56 px        |
| `src/features/dashboard/components/TileStatus.tsx`                                      | `leading` für die gemeinsame Zeile; Festwert-Hinweis nur bei gewähltem Zeitraum |
| `src/features/dashboard/components/TileValue.tsx`                                       | Zahl 32 px, Mindesthöhe 56 px                                                   |
| `src/features/dashboard/components/charts/Depth3dBarChart.tsx`, `Depth3dDonutChart.tsx` | Werte im Textton statt fest Weiß                                                |
| `src/styles/global.css`                                                                 | `--color-error` dunkel `#FF7A7E`, hell unverändert `#FF5A5F`                    |
| Tests: `DashboardTile.ui`, `DashboardTileStates.ui`, `chartValueColor.ui` (neu)         | Regeln abgesichert                                                              |
| `scripts/captureAuftrag088Tiles.mjs`, `docs/screenshots/auftrag-088/README.md`          | Nachweis                                                                        |

## Tasks

- [x] Titel 15 px, Zahl 32 px (Muster 1).
- [x] Stand und Quelle laufen mit dem Zeitbezug in einer Zeile.
- [x] „Historischer Stand ist fest“ nur noch, wenn tatsächlich ein Zeitraum gewählt wurde.
- [x] Werte in Säulen, Balken und Ring folgen `--color-text-primary` (im hellen Modus lesbar).
- [x] Fehlerrot im dunklen Modus ≥ 4,5:1.
- [x] Zahlkachel-Reservierung 96 → 56 px (Laden und fertige Darstellung weiter gleich hoch).
