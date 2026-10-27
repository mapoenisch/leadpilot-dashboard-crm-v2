# Auftrag 122 – Überlauf auf „Live-Simulation“ bei 375 px

**Plan:** Abschnitt 15 (Paket I), Restpunkt der Abnahmematrix; Befund bestand schon in der Baseline aus Auftrag 081 (`s-live-simulation`, 184 px). Baseline `639ebb9` (main nach PR #112).

## Ziel-Dateien

| Datei                                                                               | Änderung                                                                                                                        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/simulation/liveSimulationSeite.css` (neu)                             | Nur bei ≤ 480 px: Zeile „Vergleichsansicht zur Baseline“ und ihre Knopfgruppe dürfen umbrechen                                  |
| `src/features/simulation/LiveDashboardView.tsx`                                     | Nur Kennung `data-page-key="live-simulation"` am Wurzelelement und Import der CSS-Datei (die Seite hatte noch kein eigenes CSS) |
| `scripts/captureAuftrag122Gate.mjs` (neu), `docs/screenshots/auftrag-122/README.md` | Vorher/Nachher-Nachweis, 3 Breiten × 2 Themes                                                                                   |
| `docs/reviews/2026-10-06-frontend-befundregister.md`, `docs/BUILD_LOG.md`           | Befund geschlossen, Protokoll                                                                                                   |

## Globale Grenzen

Schutzbereiche unverändert. Keine neue Abhängigkeit. Keine Änderung an gemeinsam genutzten Komponenten (`ManagementTierView`, `Button`).

## Tasks

- [x] Ursache messen: `div.flex` mit Beschriftung und drei Knöpfen 518 px breit in 375-px-Spalte, bricht nicht um; `<main>` läuft 184 px über (dunkel und hell)
- [x] Korrektur nur im Seiten-CSS (Umbruch erlauben, `max-width: 100%`)
- [x] Vorher/Nachher-Matrix: nur 375 px verändert (Überlauf 184 → 0, Inhaltshöhe 2651 → 2724 px durch den Umbruch), 1440 und 768 px Bild-Hash identisch
- [x] Tests, BUILD_LOG
