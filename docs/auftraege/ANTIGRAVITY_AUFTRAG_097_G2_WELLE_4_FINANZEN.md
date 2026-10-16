# ANTIGRAVITY_AUFTRAG_097 — Paket G2, Welle 4: Finanzen als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, vierte Welle: Finanzen nach Vertrieb & Marketing.
> Vorgehen wie Auftrag 093–096: Das Original-WebP ist die Vorlage, kein Inhalt geht verloren, 3D bleibt,
> „ruhig“ dämpft nur.

## Baseline

- Branch `claude/auftrag-097-g2-welle-4` von `main` nach Merge PR #83.
- Schutzbereichs-Baseline: `main` nach Merge PR #83 (`git merge-base HEAD main`).

## Welle

| Schlüssel                | Route                     | Original-WebP                                               |
| ------------------------ | ------------------------- | ----------------------------------------------------------- |
| `finance-pnl`            | `/finance/p-and-l`        | `public/assets/auftrag-037e/05-gewinn-verlustrechnung.webp` |
| `finance-balance-sheet`  | `/finance/balance-sheet`  | `public/assets/auftrag-037e/06-bilanz-saas.webp`            |
| `finance-unit-economics` | `/finance/unit-economics` | `public/assets/auftrag-037e/07-unit-economics-2026.webp`    |

## Ziel-Dateien

| Datei                                                                                                                                      | Änderung                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                                                           | `HTML_PAGES` um die drei Schlüssel ergänzt                                   |
| `src/features/finanzen/pages/PnLPage.tsx`, `BalanceSheetPage.tsx`, `UnitEconomicsPage.tsx`, neu `src/features/finanzen/finanzenSeiten.css` | Gestaltung nach Original-WebP, `data-ruhig`                                  |
| neu `src/features/finanzen/components/DepthFlaechen.tsx`                                                                                   | Linien/Flächen mit 3D-Tiefe (Rückwand, Boden), versteckte Datentabelle       |
| `src/features/vertrieb/components/GroupedDepthColumns.tsx`                                                                                 | additiv: negative Werte unter der Nulllinie; ohne negative Werte unverändert |
| Tests `g52SemanticPages.ui`, `g96VertriebSeiten.ui`                                                                                        | h1-Prüfung für freigegebene Seiten; Gegenprobe „bleibt Bild“ auf Satzung     |
| `e2e/semantic-routes.spec.ts`                                                                                                              | `HTML_PAGE_ROUTES` um die drei Routen ergänzt                                |
| neu `src/app/__tests__/g97FinanzSeiten.ui.vitest.tsx`, `scripts/captureAuftrag097Finanzen.mjs`, `docs/screenshots/auftrag-097/README.md`   | Tests und Nachweis                                                           |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                               | Nachweis                                                                     |

## Globale Grenzen

- Schutzbereiche unverändert. Zahlen gegen Faktenblatt v1.2 geprüft: GuV 2024/2025 und Plan-GuV 2026 (§5, §14), Bilanz 31.12.2025 (§6, Summe 479.000 €), SaaS-Kernmetriken (§4, §8), Plan-MRR, Plan-Churn und Plan-Trial-to-Paid 2026 (§14). Keine Datenänderung nötig.
- Keine neuen Abhängigkeiten. Bilddateien bleiben erhalten; nur die drei Routen zeigen kein Bild mehr.

## Inhaltsinventar und Abweichungen zum Original

- **GuV:** Erlös-Donut mit Balkenliste, Kostenstruktur FY 2024/2025 als 3D-Säulen, GuV-Tabelle ohne eigene Kopfzeile. Abweichungen: EBITDA als Verlust unter der Nulllinie (Original: kleine positive Säule); Untertitel „Ist-Werte FY 2024 und FY 2025, Plan 2026“ statt „Geprüfte Finanzergebnisse 2024 – 2026“ (Plan ist nicht geprüft); Abo-Umsatz-Zeile als „Plan 2026: Ziel-ARR, vereinfacht“ gekennzeichnet, Hinweis unter der Tabelle (Faktenblatt D11).
- **Bilanz:** Titel „Bilanz 2025“, Untertitel wie Original, Aktiva cyan / Passiva orange mit Summenzeilen.
- **Unit Economics:** Titel wie Original, neun Kennzahlkacheln, MRR- und Churn-/Trial-Verlauf als 3D-Flächen. Abweichung: Plan-MRR 34.320–51.667 € nach Faktenblatt §14 (Original zeigt Illustrationswerte bis 200.000 €). Kostenstruktur GJ 2025 bleibt als Inhalt der bisherigen Seite erhalten.
- Navigation und Seitenkopf nennen noch die alten Titel („Bilanz & SaaS KPIs“, „Unit Economics 2026“); Angleichung in Paket H.

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2 (D11).
- [x] Seitenfreigabe um die drei Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Drei Seiten nach Original-WebP gebaut, 3D-Säulen und 3D-Flächen, „ruhig“, hell und dunkel.
- [x] Tests angepasst und ergänzt, e2e-Routen ergänzt.
- [x] Nachweis 3 Seiten × 1440/768/375/320/250 px × dunkel/hell: 30/30.
- [ ] Sichtabnahme der drei Seiten durch Marc.
