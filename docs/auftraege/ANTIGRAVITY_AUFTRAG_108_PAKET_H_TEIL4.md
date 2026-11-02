# ANTIGRAVITY_AUFTRAG_108 — Paket H Teil 4: Restbegriffe in den Fachdaten

> **Builder:** Claude Code · **Prüfer:** unabhängig (`/<agent> review`)
> Plan Abschnitt 13 (Sprachliste). Baseline `720caf5` (main nach PR #98).

## Sprachliste (Fortsetzung von Auftrag 107)

| Bisher                              | Neu                         |
| ----------------------------------- | --------------------------- |
| Fully-Loaded CAC (Kennzahl-Label)   | Gesamtkosten pro Neukunde   |
| CAC-Payback (Fully Loaded)          | CAC-Payback (Gesamtkosten)  |
| Amortisation (Fully Loaded)         | Amortisation (Gesamtkosten) |
| Headcount-Entwicklung (Menüeintrag) | Entwicklung der Teamgröße   |

## Ziel-Dateien

| Datei                                                       | Änderung                                            |
| ----------------------------------------------------------- | --------------------------------------------------- |
| `src/domain/execData.ts`                                    | Label, Problemtext CAC-Payback                      |
| `src/domain/finanzenData.ts`                                | Labels Unit Economics                               |
| `src/domain/strategieData.ts`                               | KPI-Zeile Strategie                                 |
| `src/domain/navData.ts`                                     | Menüeintrag `s-headcount` (ID unverändert)          |
| `src/features/finanzen/components/SaasMotor.tsx`            | Suche nach neuem Label, Untertitel                  |
| `src/features/overview/pages/ExecutiveDashboardPage.tsx`    | Restfund „Ebene-C-Echtzeitfeed“ → „Live-Daten“      |
| `src/features/simulation/components/ManagementTierView.tsx` | Restfund „Ebene-A-Basis“ → „Unternehmensdaten 2025“ |
| `scripts/captureAuftrag108Screenshots.mjs`                  | Screenshot-Gate                                     |
| Tests/Skripte, die die Texte prüfen                         | Erwartung nachziehen                                |

## Tasks

- [x] Kennzahl-Labels und Texte in `src/domain/*Data.ts` ersetzen; Werte unverändert.
- [x] `SaasMotor` liest den Wert über das neue Label (exakter Vergleich statt `includes`).
- [x] Menüeintrag `s-headcount` an Routentitel aus Auftrag 107 angleichen.
- [x] Bindestrich-Restfunde aus Auftrag 107 („Ebene-A-Basis“, „Ebene-C-Echtzeitfeed“) ersetzen.
- [ ] Offen, eigene Aufträge: Herkunftslabel in `src/services/data/sourceFreshness.ts` (Schutzbereich), Kennzahl „Headcount“ → „Teamgröße“ (Fachdaten und Katalognamen), Leer-/Fehlertexte, Gruppierung der Navigation, Fokusprüfung Menü.

## Grenzen

Nur Beschriftungen. Schutzbereiche, Kennzahlwerte, Routen-/Katalog-IDs unverändert.

## Rückweg

`git revert`; keine Datenbankänderung.
