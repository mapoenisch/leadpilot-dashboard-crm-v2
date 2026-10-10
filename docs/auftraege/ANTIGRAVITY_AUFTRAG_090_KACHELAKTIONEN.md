# ANTIGRAVITY_AUFTRAG_090 — Paket F, Teil 1: Kachelaktionen und Bearbeitungsleiste

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 11 (Arbeitspaket F), Gestaltung nach dem freigegebenen Muster 5 (Auftrag 087,
> vereinfachter Editor). Gestartet von Marc Poenisch im Chat am 10.10.2026 („selbstständig mergen
> und weiter machen“). Paket F wird geteilt: 090 Kachelaktionen/Leiste, 091 Konfigurator.

## Baseline

- Branch `claude/auftrag-090-editor-vereinfachen` von `main` `6e3854a` (nach Merge PR #75).
- Schutzbereichs-Baseline: `6e3854a`.

## Ziel-Dateien

| Datei                                                                                                                                                                                    | Änderung                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/features/dashboard/components/DashboardGrid.tsx`                                                                                                                                    | ruhige Aktionsleiste je Kachel: Ziehhinweis + Position, „Kachel-Aktionen“ klappt Aktionen auf |
| `src/features/dashboard/components/EditorToolbar.tsx`                                                                                                                                    | im Bearbeitungsmodus beim Scrollen oben haftend; Hinweis Arbeitskopie ↔ Speichern             |
| `src/features/dashboard/__tests__/DashboardGrid.ui.vitest.tsx`, `DashboardWorkspace.ui.vitest.tsx`, `DashboardWorkspace.codex.ui.vitest.tsx`, `PersonalExecutiveDashboard.ui.vitest.tsx` | Aktionen erst aufklappen; neue Fälle für Leiste und Fokus                                     |
| `e2e/personal-dashboard-acceptance.spec.ts`, `e2e/personal-dashboard.spec.ts` (beide Dashboard-E2E-Dateien laut Plan §11)                                                                | Aktionen erst aufklappen                                                                      |
| `scripts/captureAuftrag090Editor.mjs`, `docs/screenshots/auftrag-090/README.md`                                                                                                          | Nachweis                                                                                      |
| Visual-Baselines `e2e/visual.spec.ts-snapshots/*` (nur falls die CI sie als geändert meldet)                                                                                             | über `update-visual-baselines.yml`                                                            |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 11, dieser Auftrag                                                                                                                             | Nachweis                                                                                      |

## Globale Grenzen

- Schutzbereiche unverändert (`src/simulation`, `src/types`, `src/context`, `src/services/data`, `src/features/resources`).
- Editor-Logik (`dashboardEditorReducer.ts`, `useDashboardEditor.ts`), Speichern, Konflikt- und Verlassen-Schutz aus Auftrag 079 unverändert. Kein Auto-Save.
- Keine neuen Abhängigkeiten. Bestehende `Button`-Komponente und Tokens.

## Tasks

- [x] Kachelleiste nach Muster 5: gestrichelter Rahmen in Primärfarbe, links „⠿ Ziehen zum Verschieben“ (nur ab 768 px, wo Ziehen funktioniert) und „Position n von m“, rechts „Kachel-Aktionen ▾“ (`aria-expanded`/`aria-controls`, 44 px).
- [x] Aufgeklappt im Fluss (nicht schwebend): Nach oben, Nach unten, Bearbeiten, Entfernen – je 44 px hoch, gleiche Beschriftungen und `aria-label` wie bisher; Entfernen in Fehlerfarbe.
- [x] Verschieben ohne Ziehen bleibt per Tastatur/Touch möglich. Nach dem Verschieben bleibt das Menü der Kachel offen, der Fokus auf derselben Aktion (bzw. der Gegenrichtung am Rand); die neue Position wird angesagt (vorhanden).
- [x] Fehlt eine angeforderte Aktion, weil das Menü zu ist, geht der Fokus auf „Kachel-Aktionen“ der Kachel statt ins Leere.
- [x] Werkzeugleiste: im Bearbeitungsmodus oben haftend (sticky) mit Hintergrund, damit Speichern/Verwerfen beim Scrollen erreichbar bleiben, ohne Inhalte unten oder die Bildschirmtastatur zu verdecken. Nur Speichern, Verwerfen und Status haften (mobil eine Zeile); „Kachel hinzufügen“, Zurücksetzen und Hinweise folgen im normalen Fluss.
- [x] Hinweis in der Leiste: „Änderungen liegen in der Arbeitskopie, gespeichert wird erst mit „Speichern“.“
- [x] Tests anpassen und ergänzen; vorhandene Konflikt-/Verlassen-Tests bleiben grün.
- [x] Nachweis 1440/768/375/320 × dunkel/hell im Bearbeitungsmodus, Vorher/Nachher, Überlauf 0, axe 0, Leiste haftet nach Scrollen.

## Reihenfolge (Entscheidung Marc 10.10.2026)

Vor Paket F Teil 2 kommt der offene Rest von Paket E (kürzere Kennzahlnamen/Definitionen, Vorjahres-/Zielvergleich, Übersichtskacheln, Zahlkachel 160–220 px) als Auftrag 091; der Konfigurator wird Auftrag 092.

## Offen für Auftrag 092

- Konfigurator in „Kennzahl“, „Darstellung“, „Vorschau“, „Erweitert“ gliedern; Kombinationen und besondere Filter unter „Erweitert“; Begründung bei gescheiterter Auswahl direkt an der Auswahl; „Hinzufügen“ als Hinzufügen zur Arbeitskopie kennzeichnen.
