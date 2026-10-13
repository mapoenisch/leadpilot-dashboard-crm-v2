# ANTIGRAVITY_AUFTRAG_092 — Paket F, Teil 2: Konfigurator gliedern

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 11 (Arbeitspaket F), Rest nach Auftrag 090. Reihenfolge laut Marc vom 10.10.2026: 091 vor 092.

## Baseline

- Branch `claude/auftrag-092-konfigurator` von `main` `8d64019` (nach Merge PR #77).
- Schutzbereichs-Baseline: `8d64019`.

## Ziel-Dateien

| Datei                                                                                                              | Änderung                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/features/dashboard/components/TileConfigurator.tsx`                                                           | Abschnitte „1 · Kennzahl“, „2 · Darstellung“, „3 · Vorschau“, „Erweiterte Einstellungen“; Fußtext und Knöpfe |
| `src/features/dashboard/components/ConfiguratorAdvanced.tsx` (neu)                                                 | einklappbarer Bereich, Abschnittsüberschrift, Zeitbezug/Pipeline, Abweichungs-Kurzhinweis                    |
| `src/features/dashboard/components/CombinationPicker.tsx`                                                          | gesperrte Partner nur noch eingeklappt unter „Nicht kombinierbar (n)“                                        |
| Tests `TileConfigurator.ui`, `CombinationPicker.ui`, `DashboardWorkspace.codex.ui`, neu `TileConfiguratorSteps.ui` | angepasst bzw. ergänzt                                                                                       |
| `scripts/captureAuftrag092Konfigurator.mjs`, `docs/screenshots/auftrag-092/README.md`                              | Nachweis                                                                                                     |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 11, dieser Auftrag                                                       | Nachweis                                                                                                     |

## Globale Grenzen

- Schutzbereiche unverändert (`src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`).
- Validierung (`validateTileCandidate`, `allowedFilterModes`, Kombinations-Positivliste) und Editor-Logik (`dashboardEditorReducer.ts`, `useDashboardEditor.ts`), Konflikt- und Verlassen-Schutz aus Auftrag 079 unverändert. Kein Auto-Save.
- Keine neuen Abhängigkeiten.

## Tasks

- [x] Konfigurator gliedern: „1 · Kennzahl“ (Suche, Kategorie, Liste), „2 · Darstellung“ (Darstellung, Größe, eigener Titel), „3 · Vorschau“, „Erweiterte Einstellungen“.
- [x] „Erweiterte Einstellungen“ (Kombination, Zeitbezug, eigene Pipeline) eingeklappt (`aria-expanded`/`aria-controls`, 44 px); öffnet sich von selbst, wenn eine bearbeitete Kachel eigene Pipeline oder abweichenden Zeitbezug trägt; Kurzhinweis „n Abweichung(en)“.
- [x] Gesperrte Kombinationspartner nicht prominent: nur eingeklappt unter „Nicht kombinierbar (n)“ mit Grund. Gesperrte Größen und Zeitbezüge behalten ihren Grund direkt an der Auswahl; Validierungsmeldungen bleiben unverändert streng.
- [x] Titel, Größe, Kombination weiter bearbeitbar. Knöpfe „Zur Arbeitskopie hinzufügen“ / „In Arbeitskopie übernehmen“ mit Fußtext „Gespeichert wird erst mit „Speichern“ im Editor.“
- [x] Vorschau bleibt ohne Neuaufbau bei Texteingabe (Test `DashboardWorkspace.codex`, Runde 4, bleibt grün).
- [x] Tests anpassen und ergänzen.
- [x] Nachweis 1440/768/375/320 × dunkel/hell: 8/8 (`docs/screenshots/auftrag-092/README.md`).
