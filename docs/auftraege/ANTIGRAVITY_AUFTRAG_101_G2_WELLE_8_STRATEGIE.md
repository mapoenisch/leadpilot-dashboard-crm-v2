# ANTIGRAVITY_AUFTRAG_101 — Paket G2, Welle 8: Strategieseiten als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, achte Welle: Gruppe Strategie.
> Vorgehen wie Auftrag 093–100: Das Original-WebP ist die Vorlage, kein Inhalt geht verloren, 3D bleibt,
> „ruhig“ dämpft nur. Ohne Sichtfreigabe (Ergänzung Marc vom 19.10.2026), Codex-Gate bleibt.

## Baseline

- Branch `claude/auftrag-101-g2-welle-8` von `main` `41149bc` (nach Merge PR #87).
- Schutzbereichs-Baseline: `41149bc`.

## Welle

| Schlüssel         | Route                          | Original-WebP                                           |
| ----------------- | ------------------------------ | ------------------------------------------------------- |
| `strategy-okrs`   | `/strategy/okrs`               | `public/assets/auftrag-037f/04-ziele-okrs.webp`         |
| `strategy-bsc`    | `/strategy/balanced-scorecard` | `public/assets/auftrag-037f/05-balanced-scorecard.webp` |
| `strategy-growth` | `/strategy/growth-drivers`     | `public/assets/auftrag-037f/06-wachstumstreiber.webp`   |

Damit sind 27 von 32 Bildseiten freigegeben. Es bleiben Produkt (Preise, Performance) und Recht (Satzung,
Gesellschafter, Handelsregister).

## Ziel-Dateien

| Datei                                                                                                                                               | Änderung                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/config/pagePresentation.ts`                                                                                                                    | `HTML_PAGES` um die drei Schlüssel ergänzt                                                       |
| `src/features/strategie/pages/OkrsPage.tsx`, `BalancedScorecardPage.tsx`, `GrowthDriversPage.tsx`, neu `src/features/strategie/strategieSeiten.css` | Gestaltung nach Original-WebP, `data-ruhig`; OKR-Vergleich mit 3D-Säulen (`GroupedDepthColumns`) |
| `src/domain/strategieData.ts`                                                                                                                       | Faktenblatt-Angleichung: „≤ 1,8 %“, Tippfehler „Kundensegment“                                   |
| `src/features/vertrieb/components/GroupedDepthColumns.tsx`                                                                                          | SVG-Beschriftung und Legende per Klasse in rem statt fester px (Textvergrößerung)                |
| Tests `g93FunnelPage.ui`, `g98MarktSeiten.ui` (Gegenprobe „bleibt Bild“ jetzt auf Satzung)                                                          | angepasst                                                                                        |
| `e2e/semantic-routes.spec.ts`                                                                                                                       | `HTML_PAGE_ROUTES` um die drei Routen ergänzt                                                    |
| neu `src/app/__tests__/g101StrategieSeiten.ui.vitest.tsx`, `scripts/captureAuftrag101Strategie.mjs`, `docs/screenshots/auftrag-101/README.md`       | Tests und Nachweis                                                                               |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                                        | Nachweis                                                                                         |

## Globale Grenzen

- Schutzbereiche unverändert. Zahlen gegen Faktenblatt v1.2 §4, §10, §12, §14 und §17 geprüft.
- Keine neuen Abhängigkeiten. Bilddateien bleiben erhalten; nur die drei Routen zeigen kein Bild mehr.
- `CHART_OKR`/`CHART_TREIBER` (Werte und Beschriftungen) unverändert, da Integritätstest und Katalog sie nutzen.

## Inhaltsinventar und Abweichungen zum Original

- **OKRs:** Titel, Untertitel „Ziele und Schlüsselergebnisse für 2026.“, zwei Pills, Panel mit Badge
  „OKR 2026“ und Untertitel, alle acht Steuerungsgrößen als 3D-Säulenpaare (Basis hell, Ziel cyan) ohne
  Achsenwerte, Legende; zwei Objectives mit Kante links, Chip „3/4 Key Results“ – vollständig.
  Abweichung nach Faktenblatt §12/§17 Nr. 10: KR 1 von O2 lautet „auf ≤ 1,8 %“ (WebP „< 1,8 %“).
  Tippfehler „Kundensegmet“ der Anwendung korrigiert (WebP schreibt bereits „Kundensegment“).
- **Balanced Scorecard:** Titel, Untertitel „Ausgewogene Steuerungskennzahlen.“, zwei Pills, vier
  leuchtende Karten mit rundem Symbol, Titel, Markierung „Steuerung“ und Kennzahlen – vollständig.
- **Wachstumstreiber:** Titel, Untertitel „Wachstumstreiber & Sensitivitäts-Effektbaum 2026+.“, zwei Pills,
  Panel mit Badge und Untertitel, fünf Zeilen mit Titel, kursivem Hinweis, Leuchtbalken, „Basis: 411.840 €“
  und Effekt; Panel „Strategische Kernhebel im Überblick“ orange mit Chip „3 Hebel definiert“ – vollständig.
  Abweichungen: „Upsell Starter → Growth“ statt „Professional“ (Faktenblatt §2: „Professional“ ungültig,
  §14: Starter → Growth); Hebelnummern der Hinweise folgen der Kernhebel-Liste (Trial-to-Paid = Hebel 2,
  Partner = Hebel 1), im WebP widersprüchlich doppelt „Hebel 1“.

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2.
- [x] Seitenfreigabe um die drei Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Drei Seiten nach Original-WebP gebaut, 3D-Säulen, „ruhig“, hell und dunkel.
- [x] Tests angepasst und ergänzt, e2e-Routen ergänzt.
- [x] Nachweis 3 Seiten × 1440/768/375/320/250 px × dunkel/hell plus 375 px mit 150 %/200 % Textgröße: 42/42.
