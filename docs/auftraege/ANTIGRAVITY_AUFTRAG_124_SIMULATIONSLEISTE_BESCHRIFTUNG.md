# Auftrag 124 – Beschriftung der Simulationsleiste

**Builder:** Claude Code · **Prüfer:** Codex (GitHub) · **Baseline:** `1c890bb` (main nach PR #118) · **Branch:** `claude/fix-live-run-leer`

## Anlass

Marc meldete am 30.10.2026: Ein neuer Run auf `/crm/live-simulation` (manager-a@e2e.local, Quelle `simulated-crm`, 50 Ticks) zeigt ARR +0 €, 0 Deals, Leads 0.

Diagnose (ohne Codeänderung):

- Der Run (Seed 723666) rechnet in der Engine korrekt: 41 Leads, 13 Opportunities, 0 Won Deals, 3 Lost Deals. Die Sales-Queue ist zu 100 % ausgelastet (35 Leads warten, im Schnitt 23 Ticks), deshalb schließt in 50 Ticks kein Deal ab und der ARR bleibt auf der Baseline (411.840 €). Ein anderer Seed (653819) ergibt 4 Won Deals und 431.340 €.
- „Leads 0“ stammt aus der Simulationsleiste (`SimulationBar`). Sie zeigt die separate Live-Simulation (Starten/Pausieren, Tick #0), nicht den Run.

## Ziel

Die Kennzahlen der Leiste sichtbar als Live-Simulation kennzeichnen, damit sie nicht für Run-Ergebnisse gehalten werden. Keine Änderung an Engine, Modell oder Datenpfad.

## Ziel-Dateien

| Datei                                                                         | Änderung                                                       |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/components/layout/SimulationBar.tsx`                                     | Label „Live-Simulation“, `role="group"`, `aria-label`, Tooltip |
| `src/components/layout/__tests__/SimulationBar.ui.vitest.tsx`                 | Test für die Kennzeichnung                                     |
| `scripts/captureAuftrag124Gate.mjs`, `docs/screenshots/auftrag-124/README.md` | Screenshot-Nachweis                                            |
| `docs/BUILD_LOG.md`, dieser Auftrag                                           | Doku                                                           |

## Globale Grenzen

Schutzbereiche (CLAUDE.md Abschnitt 6) unverändert; keine neuen Abhängigkeiten. Seltener 0-Deal-Runs wäre eine Modelländerung in `src/simulation/` und braucht einen eigenen Auftrag.

## Tasks

- [x] T1 Ursache diagnostizieren (Engine-Nachrechnung je Seed, Browser-Nachstellung)
- [x] T2 Test schreiben (rot)
- [x] T3 Beschriftung umsetzen (grün)
- [x] T4 Pflicht-Verifikation (`tsc`, `verify`, `build`, Lint)
- [x] T5 Screenshot-Gate 1440/768/375, beide Themes
- [x] T6 BUILD_LOG-Eintrag, PR
- [ ] T7 Codex-Review, Merge durch Marc
