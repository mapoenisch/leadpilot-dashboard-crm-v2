# ANTIGRAVITY_AUFTRAG_106 — Paket H Teil 2: Sprachliste, erste Anwendung

> **Builder:** Claude Code · **Prüfer:** unabhängig (`@codex review`)
> Plan Abschnitt 13. Gestapelt auf Auftrag 105 (PR #96, noch nicht gemergt); Baseline `ca34439`.

## Sprachliste (verbindlich für sichtbare Texte)

| Bisher                                   | Neu                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Stage, Deal Stage                        | Vertriebsphase                                                      |
| Alle Stages                              | Alle Vertriebsphasen                                                |
| Headcount (Eingabefelder der Simulation) | Teamgröße                                                           |
| Fully-Loaded CAC                         | Gesamtkosten pro Neukunde (Teil 3)                                  |
| Ebene A / B / C                          | Unternehmensdaten / CRM-Daten bzw. Simulation / Live-Daten (Teil 3) |

ARR, MRR, EBITDA bleiben mit Erklärung erhalten.

## Tasks

- [x] Vertriebsphase statt Stage in `DealsView`, `DealsPage`, `LeadsPage`.
- [x] Teamgröße statt Headcount in den Eingabefeldern von `ScenarioManageTab`.
- [ ] Teil 3: Gesamtkosten pro Neukunde (Katalog, Kennzahlnamen), Ebene A/B/C, Leer-/Fehlertexte, Gruppierung der Navigation, Fokusprüfung Menü, Routentitel Headcount.

## Grenzen

Nur Beschriftungen; Schutzbereiche, Daten (`src/domain/*`), Routen, Katalog-IDs unverändert.

## Rückweg

`git revert`; keine Datenbankänderung.
