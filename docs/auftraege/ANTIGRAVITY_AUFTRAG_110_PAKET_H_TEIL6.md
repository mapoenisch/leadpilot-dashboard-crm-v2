# ANTIGRAVITY_AUFTRAG_110 — Paket H Teil 6: Letzte Headcount-Überschriften der Simulationsdetails

> **Builder:** Claude Code · **Prüfer:** unabhängig (`/<agent> review`)
> Plan Abschnitt 13 (Sprachliste). Baseline `ad0d433` (main nach PR #100).

## Sprachliste (Fortsetzung von Auftrag 109)

| Bisher                                                                                | Neu                                                                                                |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Financial Analysis & P&L Model (Gross/Net Revenue, Headcount OPEX, EBITDA, Cash Flow) | Finanzanalyse und GuV-Modell (Brutto-/Nettoumsatz, Personal- und Betriebskosten, EBITDA, Cashflow) |
| Headcount & Operational OPEX                                                          | Personal- und Betriebskosten (OPEX)                                                                |

## Ziel-Dateien

| Datei                                                                              | Änderung                    |
| ---------------------------------------------------------------------------------- | --------------------------- |
| `src/features/simulation/components/DetailTierView.tsx`                            | Abschnitts- und Kartentitel |
| `src/features/simulation/components/__tests__/DetailTierView.branch.ui.vitest.tsx` | Erwartung nachziehen        |
| `scripts/captureAuftrag110Screenshots.mjs`                                         | Screenshot-Gate             |
| `docs/screenshots/auftrag-110/README.md`                                           | Ergebnis-Matrix             |

## Tasks

- [x] Abschnittstitel der Finanzkarte in Klartext; „OPEX“ bleibt als Fachkürzel neben der Erklärung.
- [x] Kartentitel „Headcount & Operational OPEX“ ersetzen.
- [x] Test-Erwartung anpassen.
- [ ] Offen, eigene Aufträge: Herkunftslabel in `src/services/data/sourceFreshness.ts` (Schutzbereich, braucht Freigabe), Leer-/Fehlertexte, Gruppierung der Navigation, Fokusprüfung Menü.

## Grenzen

Nur Beschriftungen. Schutzbereiche, Werte und Feldnamen (`salesHeadcountCost` usw.) unverändert. Übrige englische Kartentitel der Finanzkarte („EBITDA & Operating Margin“ u. a.) bleiben, sie enthalten keinen Begriff der Sprachliste.

## Rückweg

`git revert`; keine Datenbankänderung.
