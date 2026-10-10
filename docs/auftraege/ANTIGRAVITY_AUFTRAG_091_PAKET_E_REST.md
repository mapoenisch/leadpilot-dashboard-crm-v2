# ANTIGRAVITY_AUFTRAG_091 — Paket E, Teil 3: Kennzahlnamen, Vorjahresvergleich, kompakte Zahlkachel

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 10 (Arbeitspaket E), offene Punkte nach Auftrag 088/089. Reihenfolge laut
> Entscheidung Marc 10.10.2026: vor Paket F Teil 2 (Konfigurator, dann Auftrag 092).

## Entscheidung Marc (10.10.2026)

- **Kennzahlnamen:** Das Kürzel bleibt Titel (z. B. „ARR“), darunter steht klein der Klartext
  („Jährlich wiederkehrender Umsatz“). Ein eigener Titel der Kachel ersetzt beides.

## Baseline

- Branch `claude/auftrag-091-paket-e-rest` von `main` `f6810b5` (nach Merge PR #76).
- Schutzbereichs-Baseline: `f6810b5`.

## Ziel-Dateien

| Datei                                                                                                                                                     | Änderung                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/features/dashboard/model/dashboardCatalog.ts`                                                                                                        | optionale Felder `plainName` (Klartext) und `comparison` (Vorjahr) am aktiven Eintrag                                         |
| `src/features/dashboard/model/catalog/activeEntries.ts`                                                                                                   | Klartexte; Vorjahr für Umsatz, EBITDA, Headcount; technische ID aus der ARR-Definition entfernt                               |
| `src/features/dashboard/components/DashboardTile.tsx`                                                                                                     | Klartext unter dem Titel; kürzere Metazeile; Innenabstand 16 px, Abstände 8 px (Muster 1); leerer Hinweisbereich ohne Abstand |
| `src/features/dashboard/components/TileStatus.tsx`                                                                                                        | Zeitbezug „fester Stand“ kurz, Quelle ohne Vorsilbe                                                                           |
| `src/features/dashboard/components/TileValue.tsx`, `DashboardChart.tsx`                                                                                   | neutrale Vorjahreszeile unter der Zahl; Zahlhöhe 48 px                                                                        |
| `src/features/dashboard/model/defaultDashboard.ts`                                                                                                        | letzte Standardkachel volle Breite (keine halbleere Zeile); gespeicherte Ansichten unverändert                                |
| Tests: `DashboardTile.ui`, `DashboardTileStates.ui`, `defaultDashboard.vitest.ts`, neu `DashboardTile091.ui.vitest.tsx` und `catalogComparison.vitest.ts` | Regeln abgesichert, Vorjahr gegen GuV/Organisation geprüft                                                                    |
| `scripts/captureAuftrag091Tiles.mjs`, `docs/screenshots/auftrag-091/README.md`                                                                            | Nachweis                                                                                                                      |
| Visual-Baselines `e2e/visual.spec.ts-snapshots/*` (nur falls die CI sie als geändert meldet)                                                              | über `update-visual-baselines.yml`                                                                                            |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 10, dieser Auftrag                                                                                              | Nachweis                                                                                                                      |

## Globale Grenzen

- Schutzbereiche unverändert. Katalog-IDs, gespeicherte Präferenzen und Reihenfolgen unverändert.
- Vergleich nur mit belegten, kompatiblen Werten (gleiche Einheit, Vorperiode gleicher Art). Fehlt ein
  Vergleich, keine Anzeige – kein Pfeil, keine Farbe, keine Bewertung. Negative Werte lösen keine Warnung aus.
- Keine neuen Abhängigkeiten.

## Tasks

- [x] Klartext für ARR, EBITDA, ARPA, Marketing-CAC, Fully-Loaded CAC, Headcount, ARR-Verlauf, MRR nach Paket.
- [x] Technische Katalog-ID aus der ARR-Definition (Detailseite) entfernen.
- [x] Vorjahr neutral: Umsatzerlöse (FY 2024: 164.000 €), EBITDA (FY 2024: −288.000 €), Headcount (31.12.2024: 8 FTE) mit Veränderung als Zahl, ohne Pfeil oder Farbe. Test gleicht die Werte mit `GUV` und `organisationData` ab.
- [x] Metazeile einzeilig nach Muster 1: „Stand 31.12.2025 · Stammdaten“ (der feste Stand steckt in „Stand …“); andere Zeitbezüge behalten „Zeitbezug: …“.
- [x] Zahlkachel Richtwert 160–220 px bei 1440 px; lange Titel, Warnungen und große Schrift bleiben vollständig lesbar.
- [x] Übersichtskacheln und leere Rasterflächen prüfen: Zusammenfassung plus Weg zu den Details vorhanden, keine verschachtelten Scrollbereiche ohne Grund.
- [x] Nachweis 1440/768/375/320 × dunkel/hell, Vorher/Nachher, Überlauf 0, axe 0, Median-Höhe Zahlkachel.

## Ergebnis der Prüfungen

- Metazeile: „Stand 31.12.2025 · Stammdaten“. „fester Stand“ entfällt neben „Stand …“ (wie der Grund in Auftrag 088) und bleibt bei gewähltem Zeitraum oder ohne Standzeile sichtbar. Live nennt „Live“ nur einmal.
- Zahlkachel 1440 px: gewöhnliche Inhalte (Klartext, Metazeile, Zahl je einzeilig, ohne Vorjahr) höchstens 218 px; Median aller Zahlkacheln 286 → 240 px. Längere Klartexte und die Vorjahreszeile bleiben vollständig sichtbar und dürfen höher sein.
- Übersichtskacheln: Zusammenfassung mit fester Höhe 240 px und „Details“ als Weg zum vollständigen Inhalt (bestehend, Codex PR #57). Ihre Scrollbereiche sind bewusst und per Tastatur erreichbar; keine weiteren verschachtelten Scrollbereiche.
- Leere Rasterflächen: Standardansicht bei 12 Spalten bisher mit halbleerer letzter Zeile („Produkt-Roadmap“ mittel) → volle Breite; Test prüft volle Zeilen.
