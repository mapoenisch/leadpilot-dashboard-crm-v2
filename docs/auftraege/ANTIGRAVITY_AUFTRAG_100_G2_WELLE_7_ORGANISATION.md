# ANTIGRAVITY_AUFTRAG_100 — Paket G2, Welle 7: Organisationsseiten als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, siebte Welle: Gruppe Organisation.
> Vorgehen wie Auftrag 093–099: Das Original-WebP ist die Vorlage, kein Inhalt geht verloren, 3D bleibt,
> „ruhig“ dämpft nur. Ohne Sichtfreigabe (Ergänzung Marc vom 19.10.2026), Codex-Gate bleibt.

## Baseline

- Branch `claude/auftrag-100-g2-welle-7` von `main` `838e9fc` (nach Merge PR #86).
- Schutzbereichs-Baseline: `838e9fc`.

## Welle

| Schlüssel                | Route                     | Original-WebP                                               |
| ------------------------ | ------------------------- | ----------------------------------------------------------- |
| `organisation-headcount` | `/organisation/headcount` | `public/assets/auftrag-037f/01-headcount-entwicklung.webp`  |
| `organisation-hr`        | `/organisation/hr`        | `public/assets/auftrag-037f/02-hr-kennzahlen.webp`          |
| `organisation-team`      | `/organisation/team`      | `public/assets/auftrag-037f/03-teamstruktur-engpaesse.webp` |

Damit sind 24 von 32 Bildseiten freigegeben. Es bleiben Produkt (Preise, Performance), Strategie und Recht.

## Ziel-Dateien

| Datei                                                                                                                                               | Änderung                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                                                                    | `HTML_PAGES` um die drei Schlüssel ergänzt                                                          |
| `src/features/organisation/pages/HeadcountPage.tsx`, `HrPage.tsx`, `TeamStructurePage.tsx`, neu `src/features/organisation/organisationSeiten.css`  | Gestaltung nach Original-WebP, `data-ruhig`; FTE-Verlauf mit 3D-Tiefe (`DepthFlaechen` aus Welle 4) |
| Tests `g55SemanticPages.ui` (sichtbare Seite statt Textschicht), `g93FunnelPage.ui`, `g98MarktSeiten.ui` (Gegenprobe „bleibt Bild“ auf OKR-Seite)   | angepasst                                                                                           |
| `e2e/semantic-routes.spec.ts`                                                                                                                       | `HTML_PAGE_ROUTES` um die drei Routen ergänzt                                                       |
| neu `src/app/__tests__/g100OrganisationSeiten.ui.vitest.tsx`, `scripts/captureAuftrag100Organisation.mjs`, `docs/screenshots/auftrag-100/README.md` | Tests und Nachweis                                                                                  |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                                        | Nachweis                                                                                            |

| Nacharbeit Codex: `src/components/pageKit/pageKit.css`, `src/features/*/*Seiten.css` | Schriftgrößen px → rem (pixelgleich bei 16 px), damit Browser-Textvergrößerung wirkt |

## Globale Grenzen

- Schutzbereiche unverändert. Zahlen gegen Faktenblatt v1.2 §10 (Personal & Organisation) geprüft –
  keine Abweichung, keine Domänenänderung nötig.
- Keine neuen Abhängigkeiten. Bilddateien bleiben erhalten; nur die drei Routen zeigen kein Bild mehr.

## Inhaltsinventar und Abweichungen zum Original

- **Headcount:** Titel, Untertitel „Entwicklung der Mitarbeiterkapazität und Teamstärke (Stand: 31.12.2025).“,
  zwei Pills, Panel „Headcount-Verlauf (Gesamt-FTE)“ mit Badge und Untertitel (Q1 2024 bis Q4 2025),
  FTE-Verlauf als 3D-Fläche, „Kapazitätsübersicht & Rollenverteilung“ mit „Stand 31.12.2025“ rechts,
  fünf Bereichszeilen, Markierung „Kapazitätsfokus“ bei Engineering, Sales, Customer Success,
  Gesamtbestand mit „Ziel 2026: 12,0 FTE“ und „Geplant: +2,0 FTE“ – vollständig.
  Ergänzt: Y-Achse mit FTE-Werten und Legende (klare Labels, Plan G2).
- **HR:** Titel, Untertitel, zwei Pills, sechs Kacheln mit rundem Symbol, Werte vollständig;
  Fluktuation orange mit „Benchmark-Fokus“, Personalaufwand mit „Kostenblock“ – vollständig.
  Abweichung: fünf Kacheln je Reihe erst ab 1600 px Fensterbreite, darunter vier bzw. weniger,
  weil die Werte sonst abgeschnitten würden.
- **Teamstruktur:** Titel „Teamstruktur & Engpässe (31.12.2025)“, Untertitel, zwei Pills, Panel mit
  Eyebrow „Organigramm · Ebene A“, Titel „Funktionale Organisation & Führungsspanne“ und Chip „Stand:
  31.12.2025“, CEO mit Verbindungslinien zu vier Einheiten, „Kapazitätsfokus“ bei drei Einheiten,
  Gesamtbestand mit Ziel; Panel „Operative Engpässe & Risikofelder“ mit Chip „4 Analysefelder“ und
  Feldmarkierungen Kritischer Engpass, Kapazitätsgrenze, Schlüsselrisiko, Geplante Maßnahme – vollständig.
- Die Markierung „Kapazitätsfokus“ folgt dem Original (Engineering, Sales, Customer Success) statt der
  bisherigen Ableitung aus den Engpasstexten, die Customer Success nicht erfasste.

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2 §10.
- [x] Seitenfreigabe um die drei Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Drei Seiten nach Original-WebP gebaut, 3D-Fläche, „ruhig“, hell und dunkel.
- [x] Tests angepasst und ergänzt, e2e-Routen ergänzt.
- [x] Nachweis 3 Seiten × 1440/768/375/320/250 px × dunkel/hell: 42/42 (inkl. 375 px mit 150 %/200 % Textgröße).
