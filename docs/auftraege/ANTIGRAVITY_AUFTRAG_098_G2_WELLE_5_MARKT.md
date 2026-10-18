# ANTIGRAVITY_AUFTRAG_098 — Paket G2, Welle 5: Markt & Wettbewerb als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, fünfte Welle: Gruppe Kunden/Markt, erster Teil (Markt).
> Vorgehen wie Auftrag 093–097: Das Original-WebP ist die Vorlage, kein Inhalt geht verloren, 3D bleibt,
> „ruhig“ dämpft nur.

## Baseline

- Branch `claude/auftrag-098-g2-welle-5` von `main` `1373259` (nach Merge PR #84).
- Schutzbereichs-Baseline: `1373259`.

## Welle

| Schlüssel            | Route                 | Original-WebP                                              |
| -------------------- | --------------------- | ---------------------------------------------------------- |
| `market-dach`        | `/market/overview`    | `public/assets/auftrag-037d/01-marktlage-dach.webp`        |
| `market-competition` | `/market/competition` | `public/assets/auftrag-037d/02-wettbewerbslandschaft.webp` |
| `market-swot`        | `/market/swot`        | `public/assets/auftrag-037d/03-swot-analyse.webp`          |

Die Kundenseiten (ICP, Persona, Segmente, Top 10) folgen als eigene Welle.

## Ziel-Dateien

| Datei                                                                                                                                | Änderung                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                                                     | `HTML_PAGES` um die drei Schlüssel ergänzt                                                           |
| `src/features/markt/pages/MarketOverviewPage.tsx`, `CompetitionPage.tsx`, `SwotPage.tsx`, neu `src/features/markt/marktSeiten.css`   | Gestaltung nach Original-WebP, `data-ruhig`; Marktanteile als 3D-Säulen (`GroupedDepthColumns`)      |
| `src/domain/marktData.ts`                                                                                                            | Faktenblatt D1 (Trial-to-Paid-Ziel 26 %) und D6 (Marktanteile „Europa“ statt „Europa/DACH“)          |
| `src/features/markt/components/SwotCompass.tsx`                                                                                      | D1: „18 % → 26 %“ in Handlungstext und Screenreader-Zusammenfassung                                  |
| `src/features/dashboard/model/catalog/inventoryEntries.ts`                                                                           | D6: Katalogtitel „Marktanteile Europa“                                                               |
| Test `g93FunnelPage.ui`                                                                                                              | Gegenprobe „bleibt Bild“ von Marktübersicht auf ICP-Seite umgestellt                                 |
| `e2e/semantic-routes.spec.ts`                                                                                                        | `HTML_PAGE_ROUTES` um die drei Routen ergänzt                                                        |
| `e2e/visual.spec.ts-snapshots/visual-market-overview-1-*-linux.png`                                                                  | Visual-Baselines Marktübersicht neu (Workflow `update-visual-baselines.yml`), nur falls CI scheitert |
| neu `src/app/__tests__/g98MarktSeiten.ui.vitest.tsx`, `scripts/captureAuftrag098Markt.mjs`, `docs/screenshots/auftrag-098/README.md` | Tests und Nachweis                                                                                   |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                         | Nachweis                                                                                             |

## Globale Grenzen

- Schutzbereiche unverändert. Zahlen gegen Faktenblatt v1.2 §11 (Markt & Wettbewerb), §4/§8 (Churn, ARPA, Burn Rate, Runway), §15 (Partner-CAC 492 €) und Abschnitt D geprüft.
- Keine neuen Abhängigkeiten. Bilddateien bleiben erhalten; nur die drei Routen zeigen kein Bild mehr.

## Inhaltsinventar und Abweichungen zum Original

- **Marktlage:** Titel, Untertitel, zwei Pills, Tabelle mit vier Zeilen, LeadPilot-Zeile orange – vollständig. Wie im Original keine eigene Panel-Überschrift. Titel bleibt „Marktlage & Cloud-CRM DACH“: Die Zeilen nennen Europa bzw. Deutschland bereits ausdrücklich, DACH ist das Zielgebiet (D6).
- **Wettbewerb:** Marktanteile als 3D-Säulen, LeadPilot orange mit „< 0,1 %“, Vergleichstabelle mit allen sechs Anbietern. Abweichungen: Titel „… Marktanteile Europa“, Diagrammtitel „Marktanteile Cloud-CRM Europa (%)“, Untertitel „im europäischen Cloud-CRM-Markt“ statt „im B2B-Mittelstand“ (D6: Anteile gelten für Europa). Die LeadPilot-Säule ist maßstabsgetreu nur eine dünne Platte (Original: sichtbarer Block).
- **SWOT:** Vier Quadranten mit allen 15 Punkten und Symbolen. Abweichungen: „18 % → 26 %“ statt „→ 25 %“ (D1); Stärken-Symbol Hantel statt Bizeps (kein Bizeps-Symbol in der vorhandenen lucide-Version, keine neue Abhängigkeit).
- Navigation nennt die Seite noch „Marktlage DACH“ bzw. „Wettbewerbslandschaft“; Angleichung in Paket H.

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2 (D1, D6).
- [x] Seitenfreigabe um die drei Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Drei Seiten nach Original-WebP gebaut, 3D-Säulen, „ruhig“, hell und dunkel.
- [x] Tests angepasst und ergänzt, e2e-Routen ergänzt.
- [x] Nachweis 3 Seiten × 1440/768/375/320/250 px × dunkel/hell: 30/30.
- [ ] Sichtabnahme der drei Seiten durch Marc.
