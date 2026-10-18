# ANTIGRAVITY_AUFTRAG_099 — Paket G2, Welle 6: Kundenseiten als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, sechste Welle: Gruppe Kunden/Markt, zweiter Teil (Kunden).
> Vorgehen wie Auftrag 093–098: Das Original-WebP ist die Vorlage, kein Inhalt geht verloren, 3D bleibt,
> „ruhig“ dämpft nur.

## Baseline

- Branch `claude/auftrag-099-g2-welle-6` von `main` `c9b649b` (nach Merge PR #85).
- Schutzbereichs-Baseline: `c9b649b`.

## Welle

| Schlüssel            | Route                      | Original-WebP                                               |
| -------------------- | -------------------------- | ----------------------------------------------------------- |
| `customers-icp`      | `/customers/icp`           | `public/assets/auftrag-037d/04-ideal-customer-profile.webp` |
| `customers-persona`  | `/customers/persona`       | `public/assets/auftrag-037d/05-buyer-persona-volker.webp`   |
| `customers-segments` | `/customers/segments`      | `public/assets/auftrag-037d/06-kundensegmente.webp`         |
| `customers-top10`    | `/customers/top-customers` | `public/assets/auftrag-037d/07-top-10-kunden.webp`          |

Damit sind 21 von 32 Bildseiten freigegeben. Es bleiben Produkt (Preise, Performance), Organisation,
Strategie und Recht.

## Ziel-Dateien

| Datei                                                                                                                                              | Änderung                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                                                                   | `HTML_PAGES` um die vier Schlüssel ergänzt                                                        |
| `src/features/kunden/pages/IcpPage.tsx`, `PersonaPage.tsx`, `SegmentsPage.tsx`, `TopCustomersPage.tsx`, neu `src/features/kunden/kundenSeiten.css` | Gestaltung nach Original-WebP, `data-ruhig`; ARR je Segment als 3D-Säulen (`GroupedDepthColumns`) |
| `src/components/pageKit/PageHero.tsx`                                                                                                              | additive Option `pillIcons` (Symbole in den Kopf-Pills wie im Top-10-Original)                    |
| `src/domain/icpData.ts`                                                                                                                            | D8: vierter Negative-Fit-Punkt „Kleinstkunden …“                                                  |
| `src/domain/kundenData.ts`                                                                                                                         | D3: ARR der drei Pro-Kunden 17.520 / 18.780 / 20.040 €                                            |
| `src/domain/personaData.ts`                                                                                                                        | typografisches Schlusszeichen im Zitat (“ statt ")                                                |
| Tests `g93FunnelPage.ui`, `g98MarktSeiten.ui`                                                                                                      | Gegenprobe „bleibt Bild“ von ICP- auf Headcount-Seite umgestellt                                  |
| `e2e/semantic-routes.spec.ts`                                                                                                                      | `HTML_PAGE_ROUTES` um die vier Routen ergänzt                                                     |
| neu `src/app/__tests__/g99KundenSeiten.ui.vitest.tsx`, `scripts/captureAuftrag099Kunden.mjs`, `docs/screenshots/auftrag-099/README.md`             | Tests und Nachweis                                                                                |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                                       | Nachweis                                                                                          |

## Globale Grenzen

- Schutzbereiche unverändert. Zahlen gegen Faktenblatt v1.2 §3 (Kunden, Branchen, Regionen), §13 (ICP,
  Persona), §14 (ARR nach Segment, Top 10), §15 (Persona ergänzt) und Abschnitt D (D3, D8) geprüft.
- Keine neuen Abhängigkeiten. Bilddateien bleiben erhalten; nur die vier Routen zeigen kein Bild mehr.

## Inhaltsinventar und Abweichungen zum Original

- **ICP:** Titel, Untertitel, zwei Pills, Firmografie mit fünf Zeilen (Merkmal mit Doppelpunkt links,
  Ausprägung rechtsbündig), Trigger (cyan) und Ausschlusskriterien (rot) mit Punktlisten – vollständig.
  Abweichung: vierter Negative-Fit-Punkt „Kleinstkunden mit Ein-Personen-Vertrieb bzw. nur 2–3 Nutzern“
  (D8). Symbole: Häkchen- bzw. X-Kreis in umrandeter Kachel statt gefülltem Häkchen-Quadrat und rotem Punkt.
- **Persona:** Titel, Untertitel, zwei Pills, Panel „Vertriebsleiter Volker“ mit Chip „47 Jahre - Head of
  Sales“, Zitat, „Ziele:“ und „Schmerzpunkte (Pain Points):“ mit Punktlisten – vollständig. Zusätzlich
  darunter (nicht im WebP, aber im Faktenblatt §13/§15 und bisher in der Anwendung): Stammdaten
  (Rolle, Unternehmen, Paket-Fit) und Kanäle. Symbole: Zielscheibe und Blitz als Linien-Symbol statt Emoji.
- **Segmente:** ARR nach Kundensegment als vier 3D-Säulen (Maschinenbau cyan, IT/Software hellcyan,
  Großhandel orange, Agenturen hellorange), Branchenverteilung und regionale Verteilung als Tabellen –
  vollständig. Ergänzt: Wertbeschriftung an den Säulen und Euro-Achse, da das Diagramm sonst keine Werte
  zeigt (Plan G2: klare Labels und Einheit).
- **Top 10:** Tabelle ohne eigene Panel-Überschrift, Mitarbeiter cyan, Paket- und Nutzer-Chips, Pills mit
  Filter- und Ebenen-Symbol. Abweichungen nach Faktenblatt v1.2 §14 (verbindlich): Kundennamen, Branchen,
  Mitarbeiter- und Nutzerzahlen der Anwendung statt der abweichenden Angaben im WebP (z. B. „Northwind
  GmbH“ statt „Nordstahl GmbH“, „Großhandel“ statt „Elektrotechnik“); ARR-Spalte gefüllt (im WebP leer),
  Pro-Kunden nach D3. Pill „Branchenzusammensetzung“ ausgeschrieben (im WebP abgeschnitten).
- Die ARR-Änderung der drei Pro-Kunden wirkt auch auf das Kundenportfolio im Dashboard (liest `TOP10`).

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2 (D3, D8).
- [x] Seitenfreigabe um die vier Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Vier Seiten nach Original-WebP gebaut, 3D-Säulen, „ruhig“, hell und dunkel.
- [x] Tests angepasst und ergänzt, e2e-Routen ergänzt.
- [x] Nachweis 4 Seiten × 1440/768/375/320/250 px × dunkel/hell: 40/40.
- [ ] Sichtabnahme der vier Seiten durch Marc.
