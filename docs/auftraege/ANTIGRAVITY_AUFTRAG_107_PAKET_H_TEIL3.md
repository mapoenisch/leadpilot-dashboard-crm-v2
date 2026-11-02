# ANTIGRAVITY_AUFTRAG_107 — Paket H Teil 3: Datenquellen-Namen und Gesamtkosten pro Neukunde

> **Builder:** Claude Code · **Prüfer:** unabhängig (`@codex review`)
> Plan Abschnitt 13 (Sprachliste, fachliche Ebenen). Baseline `081e131` (main nach PR #97).

## Sprachliste (Fortsetzung von Auftrag 106)

| Bisher                                                            | Neu                                          |
| ----------------------------------------------------------------- | -------------------------------------------- |
| Ebene A Baseline / Basis / Review                                 | Unternehmensdaten 2025                       |
| Ebene A CRM / Import / Pipeline / CRM Accounts / CRM Funnel Deals | CRM-Daten                                    |
| Ebene B                                                           | Simulation (bzw. entfällt als Klammerzusatz) |
| Ebene C, Streaming-Ebene C, Ebene C Realtime/Live-Feed            | Live-Daten                                   |
| Fully-Loaded CAC (Katalogname, Kombination, SaaS-Motor)           | Gesamtkosten pro Neukunde                    |
| Headcount-Entwicklung (Routentitel, Seite)                        | Entwicklung der Teamgröße                    |

## Tasks

- [x] Sichtbare „Ebene A/B/C“-Texte in `src/features`, `src/components`, `src/app/routes.tsx` ersetzen; Kommentare bleiben.
- [x] „Gesamtkosten pro Neukunde“ in Katalogname und Kombinationslabel; Katalog-ID `baseline.fully_loaded_cac` unverändert.
- [x] Menülabel Live-Simulation in `src/domain/navData.ts` ohne „(Ebene B)“ (reine Beschriftung).
- [ ] Teil 4: Kennzahl-Labels in `src/domain/*Data.ts` (Fully-Loaded CAC), Herkunftslabel in `src/services/data/sourceFreshness.ts` (Schutzbereich, eigener Auftrag), Leer-/Fehlertexte, Gruppierung der Navigation, Fokusprüfung Menü.

## Grenzen

Nur Beschriftungen; Schutzbereiche, Kennzahldaten, Routen, Katalog-IDs unverändert.

## Rückweg

`git revert`; keine Datenbankänderung.
