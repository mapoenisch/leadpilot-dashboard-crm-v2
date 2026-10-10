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

**Auftragserweiterung – freigegeben durch Marc Poenisch am 10.10.2026 (Anlass Codex PR #75, Runde 3):**

- `src/features/dashboard/__tests__/PersonalExecutiveDashboard.ui.vitest.tsx` – Test, dass die per Programm fokussierte Überschrift den Fokusring auch nach Mausnavigation zeigt (Nacharbeit Codex PR #75, Runde 2).
- `e2e/visual.spec.ts-snapshots/visual-dashboard-1-{desktop-1440,tablet-768,mobile-375}-linux.png` sowie `visual-{crm-leads,finance-p-and-l,market-overview,resources-materials}-1-mobile-375-linux.png` – von `update-visual-baselines.yml` erzeugte Baselines. Grund: Der kompakte Kopf ändert `/dashboard`; die mobile Simulationsleiste liegt im gemeinsamen Layout und ist auf allen mobilen Seiten sichtbar, deshalb ändern sich die vier weiteren mobilen Aufnahmen. Keine Änderung an diesen Seiten selbst.
- Doku: `docs/BUILD_LOG.md`, Plan, `ANTIGRAVITY_AUFTRAG_088_KOMPAKTE_KACHELN.md` (Begründung `Button.tsx`, Codex PR #75, Runde 1).

## Tasks

- [x] Seitenkopf: Bereichszeile entfällt (steht in der Kopfzeile), Überschrift 18 px mit einem Satz daneben; Fokusziel für die Rückkehr bleibt (`dashboard-heading`, jetzt mit sichtbarem Fokusring).
- [x] Simulationsleiste mobil: „Details“ (aria-expanded/-controls) klappt Ereignis und Kennzahlen auf; ab 768 px unverändert. Engine und Tick-Verhalten unberührt.
- [x] Standardpriorität ARR, Umsatz, EBITDA, aktive Kunden: bereits so in `defaultDashboard.ts` – keine Änderung.
- [x] 375 × 812: erste Zahl vollständig ohne Scrollen sichtbar (Unterkante 684 → 573 px).

## Offen in Paket E (nicht Teil dieses Auftrags)

- Kürzere Kennzahlnamen/Definitionen, Vorjahres-/Zielvergleich, Übersichtskacheln, Richtwert Zahlkachel 160–220 px.
  Werden als eigener Auftrag geschnitten, sobald Marc die Reihenfolge bestätigt.
