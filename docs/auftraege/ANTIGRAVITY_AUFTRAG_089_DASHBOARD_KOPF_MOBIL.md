# ANTIGRAVITY_AUFTRAG_089 — Paket E, Teil 2: Seitenkopf und mobile Hülle

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 10 (Arbeitspaket E), Fortsetzung von Auftrag 088. Gestartet von Marc Poenisch im
> Chat am 09.10.2026.

## Baseline

- Branch `claude/auftrag-089-dashboard-kopf-mobil` vom Stand Auftrag 088 (`claude/auftrag-088-kompakte-kacheln`),
  weil beide dieselben Kacheldateien betreffen. PR-Basis `main`; enthält bis zum Merge von PR #74 dessen Commits.
- Schutzbereichs-Baseline: `e007ff0`.

## Ziel-Dateien

| Datei                                                                          | Änderung                                                                         |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `src/features/dashboard/pages/PersonalExecutiveDashboard.tsx`                  | Kopf als eine kompakte Zeile (18 px), keine Bereichszeile                        |
| `src/components/layout/SimulationBar.tsx`                                      | mobil Ereignis/Kennzahlen hinter „Details“, Start/Pause und Tempo immer sichtbar |
| `src/components/layout/__tests__/SimulationBar.mobile.ui.vitest.tsx` (neu)     | Test                                                                             |
| `scripts/captureAuftrag089Shell.mjs`, `docs/screenshots/auftrag-089/README.md` | Nachweis                                                                         |

## Tasks

- [x] Seitenkopf: Bereichszeile entfällt (steht in der Kopfzeile), Überschrift 18 px mit einem Satz daneben; Fokusziel für die Rückkehr bleibt (`dashboard-heading`, jetzt mit sichtbarem Fokusring).
- [x] Simulationsleiste mobil: „Details“ (aria-expanded/-controls) klappt Ereignis und Kennzahlen auf; ab 768 px unverändert. Engine und Tick-Verhalten unberührt.
- [x] Standardpriorität ARR, Umsatz, EBITDA, aktive Kunden: bereits so in `defaultDashboard.ts` – keine Änderung.
- [x] 375 × 812: erste Zahl vollständig ohne Scrollen sichtbar (Unterkante 684 → 573 px).

## Offen in Paket E (nicht Teil dieses Auftrags)

- Kürzere Kennzahlnamen/Definitionen, Vorjahres-/Zielvergleich, Übersichtskacheln, Richtwert Zahlkachel 160–220 px.
  Werden als eigener Auftrag geschnitten, sobald Marc die Reihenfolge bestätigt.
