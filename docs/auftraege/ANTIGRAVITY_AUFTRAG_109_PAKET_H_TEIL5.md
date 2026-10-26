# ANTIGRAVITY_AUFTRAG_109 — Paket H Teil 5: Teamgröße statt Headcount

> **Builder:** Claude Code · **Prüfer:** Antigravity (PR #100)
> Plan Abschnitt 13 (Sprachliste). Baseline `34b3824` (main nach PR #99).

## Sprachliste (Fortsetzung von Auftrag 108)

| Bisher                                  | Neu                                       |
| --------------------------------------- | ----------------------------------------- |
| Headcount (Kennzahl, Katalogname)       | Teamgröße                                 |
| Headcount (31.12.2025)                  | Teamgröße (31.12.2025)                    |
| Headcount-Verlauf (Katalog, Diagramm)   | Verlauf der Teamgröße                     |
| Keine Headcount-Daten erfasst.          | Keine Daten zur Teamgröße erfasst.        |
| Sales Headcount / CS Headcount (Kosten) | Personalkosten Vertrieb / Kundenbetreuung |
| Feste Headcount-Kosten                  | Feste Personalkosten                      |

## Ziel-Dateien

| Datei                                                            | Änderung                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| `src/domain/execData.ts`                                         | KPI-Label                                            |
| `src/domain/organisationData.ts`                                 | HR-Kennzahl-Label                                    |
| `src/domain/strategieData.ts`                                    | Balanced-Scorecard-Zeile, OKR-Diagrammlabel          |
| `src/features/dashboard/model/catalog/activeEntries.ts`          | Katalogname `baseline.headcount` (ID bleibt)         |
| `src/features/dashboard/model/catalog/extendedEntries.ts`        | Katalogname `baseline.headcount_verlauf` (ID bleibt) |
| `src/features/organisation/pages/HeadcountPage.tsx`              | Diagrammtitel, Region-Label, Leertext                |
| `src/features/simulation/components/DetailTierView.tsx`          | Kostenzeile                                          |
| `src/features/simulation/components/KpiTimeSeriesDetailView.tsx` | Beschreibung                                         |
| `scripts/captureAuftrag100Organisation.mjs`                      | Erwarteter Diagrammtitel                             |
| `scripts/captureAuftrag109Screenshots.mjs`                       | Screenshot-Gate                                      |
| Tests, die die Texte prüfen                                      | Erwartung nachziehen                                 |

## Tasks

- [x] Kennzahl-Labels in `src/domain/*Data.ts` ersetzen; Werte unverändert.
- [x] Katalognamen umbenennen; Katalog-IDs, Routen-ID `s-headcount`, Komponenten- und Variablennamen unverändert (gespeicherte Dashboards referenzieren IDs, nicht Namen).
- [x] Seite „Entwicklung der Teamgröße“: Diagrammtitel, Region-Label, Leertext.
- [x] Simulationsdetails: Kostenzeilen in Klartext.
- [ ] Offen, eigene Aufträge: Herkunftslabel in `src/services/data/sourceFreshness.ts` (Schutzbereich), Leer-/Fehlertexte, Gruppierung der Navigation, Fokusprüfung Menü.

## Grenzen

Nur Beschriftungen. Schutzbereiche, Kennzahlwerte, Routen-/Katalog-IDs und Feldnamen (`salesHeadcountCost` usw.) unverändert.

## Rückweg

`git revert`; keine Datenbankänderung.
