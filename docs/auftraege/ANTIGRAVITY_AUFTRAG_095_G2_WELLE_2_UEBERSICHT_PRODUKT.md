# ANTIGRAVITY_AUFTRAG_095 — Paket G2, Welle 2: Unternehmensübersicht und Produkt als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, zweite Welle. Vorgehen wie Auftrag 093/094:
> Das Original-WebP ist die Vorlage, kein Inhalt geht verloren, 3D bleibt, „ruhig“ dämpft nur.

## Baseline

- Branch `claude/auftrag-095-g2-welle-2` von `main` `6116b69` (nach Merge PR #81).
- Schutzbereichs-Baseline: `6116b69`.

## Welle

Vier Seiten aus Unternehmensübersicht und Produkt. Preismodell und Produkt-Performance folgen in Welle 3 (Preismodell wegen der Angleichung an die nutzerbasierte Abrechnung des Faktenblatts v1.2).

| Schlüssel             | Route                 | Original-WebP                                               |
| --------------------- | --------------------- | ----------------------------------------------------------- |
| `overview-profile`    | `/company/profile`    | `public/assets/auftrag-037g/01-unternehmenssteckbrief.webp` |
| `overview-highlights` | `/company/highlights` | `public/assets/auftrag-037g/02-jahres-highlights-2025.webp` |
| `product-features`    | `/product/features`   | `public/assets/auftrag-037g/07-produkt-funktionsweise.webp` |
| `product-roadmap`     | `/product/roadmap`    | `public/assets/auftrag-037g/10-releases-roadmap.webp`       |

## Ziel-Dateien

| Datei                                                                                                                                               | Änderung                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                                                                    | `HTML_PAGES` um die vier Schlüssel ergänzt                                          |
| `src/features/overview/pages/CompanyProfilePage.tsx`, `YearHighlightsPage.tsx`, neu `overviewSeiten.css`                                            | Gestaltung nach Original-WebP                                                       |
| `src/features/produkt/pages/FeaturesPage.tsx`, `RoadmapPage.tsx`, neu `components/ModulBild.tsx`, `components/RoadmapBerg.tsx`, `produktSeiten.css` | Gestaltung nach Original-WebP, 3D-Illustrationen                                    |
| `src/components/pageKit/PageHero.tsx`                                                                                                               | additive Option `asideActive` (Standard `last`, andere Seiten unverändert)          |
| Tests `g54`, `g66`, `g67`, `g94`                                                                                                                    | `MemoryRouter` (Link auf Funktionsseite), Freigabeliste, Gestaltungs-Selektor       |
| `e2e/semantic-routes.spec.ts`                                                                                                                       | `HTML_PAGE_ROUTES` um die vier Welle-2-Routen ergänzt (Prüfung auf HTML statt Bild) |
| neu `g95UebersichtProdukt.ui.vitest.tsx`, `scripts/captureAuftrag095Unternehmen.mjs`, `docs/screenshots/auftrag-095/README.md`                      | Tests und Nachweis                                                                  |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                                        | Nachweis                                                                            |

## Globale Grenzen

- Schutzbereiche unverändert. Werte aus `execData.ts`/`produktData.ts` unverändert; gegen Faktenblatt v1.2 geprüft (ARR 207.792 → 411.840 €, Burn Rate 25.750 €, Jahresfehlbetrag −334.000 €, EBITDA −309.000 €, Uptime 99,7 %, HRB 40912, Stammkapital 31.250 €, Churn 2,8 %, CAC-Payback 13 Monate, Runway 14 Monate).
- Keine neuen Abhängigkeiten. Bilddateien bleiben erhalten; nur die vier Routen zeigen kein Bild mehr.

## Inhaltsinventar und Abweichungen zum Original

- **Steckbrief:** Panel „Rechtliche Stammdaten“ (Chip „Erreicht“), Panel „Kapital & Organe“ (Chip „Fokus 2026“, Stammkapital mit Chip „Kapitalerhöhung Q1 2024“), Tabelle „Vollständige Register- und Stammdaten“ (9 Zeilen), Fokus-Karte, Kopf-Pills Register und „GmbH Leipzig“.
- **Jahres-Highlights:** Untertitel wie Original, „FY 2025“ leuchtet, Panels „Top Erfolge 2025“ / „Operative Herausforderungen“ mit Chips, je vier Einträge mit Icon-Kachel, Fazit-Karte.
- **Funktionsweise:** vier Modulkarten mit je 3D-Illustration (dekorativ, `aria-hidden`) und „Mehr erfahren“. Abweichung: Statt toter Bild-Buttons echte Links (Leads & Kontakte, Produkt-Performance, Aktivitäten, Deal Pipeline). Zahlen in den Illustrationen (Lead Score 87, Pipeline-Spalten) sind Beispielwerte; Hinweiszeile „Die Illustrationen zeigen beispielhafte Werte, keine Kennzahlen.“ ergänzt.
- **Roadmap:** Zeitleiste mit Punkt, Versions-Chip (geplante Releases zweizeilig, orange), Icon-Kachel, Status-Chip, Berg-Illustration mit Pfad, Markierungen und Flagge (SVG, dekorativ; entfällt unter 900 px). Kopf-Pill „Release-Historie & Planung 2026“ und „6 Meilensteine“ als zwei Pills statt einer Box.

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2.
- [x] Seitenfreigabe um die vier Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Vier Seiten nach Original-WebP gebaut, „ruhig“ (`data-ruhig`), hell und dunkel.
- [x] Tests angepasst und ergänzt.
- [x] Nachweis 4 Seiten × 1440/768/375/320/250 px × dunkel/hell: 40/40.
- [x] Sichtabnahme der vier Seiten durch Marc (16.10.2026).
