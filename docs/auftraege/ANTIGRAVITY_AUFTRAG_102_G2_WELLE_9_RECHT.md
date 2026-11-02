# ANTIGRAVITY_AUFTRAG_102 — Paket G2, Welle 9: Rechtsseiten als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, neunte Welle: Gruppe Recht.
> Vorgehen wie Auftrag 093–101: Das Original-WebP ist die Vorlage, kein Inhalt geht verloren,
> „ruhig“ dämpft nur. Ohne Sichtfreigabe (Ergänzung Marc vom 19.10.2026), Codex-Gate bleibt.

## Baseline

- Branch `claude/auftrag-102-g2-welle-9` von `main` `36de335` (nach Merge PR #88).
- Schutzbereichs-Baseline: `36de335`.

## Welle

| Schlüssel            | Route                        | Original-WebP                                            |
| -------------------- | ---------------------------- | -------------------------------------------------------- |
| `legal-articles`     | `/legal/articles`            | `public/assets/auftrag-037f/07-satzung-leadpilot.webp`   |
| `legal-shareholders` | `/legal/shareholders`        | `public/assets/auftrag-037f/08-gesellschafterliste.webp` |
| `legal-register`     | `/legal/commercial-register` | `public/assets/auftrag-037f/09-handelsregister.webp`     |

Damit sind 30 von 32 Bildseiten freigegeben. Es bleiben Produkt (Preismodell, Produkt-Performance).

## Ziel-Dateien

| Datei                                                                                                                                        | Änderung                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                                                             | `HTML_PAGES` um die drei Schlüssel ergänzt      |
| `src/features/recht/pages/ArticlesPage.tsx`, `ShareholdersPage.tsx`, `CommercialRegisterPage.tsx`, neu `src/features/recht/rechtSeiten.css`  | Gestaltung nach Original-WebP, `data-ruhig`     |
| `src/domain/rechtData.ts`                                                                                                                    | Faktenblatt-Angleichung Vertretung (§1, §17 D4) |
| Tests `g93FunnelPage.ui`, `g96VertriebSeiten.ui`, `g97FinanzSeiten.ui`, `g98MarktSeiten.ui` (Gegenprobe „bleibt Bild“ jetzt auf Preismodell) | angepasst                                       |
| `e2e/semantic-routes.spec.ts`                                                                                                                | `HTML_PAGE_ROUTES` um die drei Routen ergänzt   |
| neu `src/app/__tests__/g102RechtSeiten.ui.vitest.tsx`, `scripts/captureAuftrag102Recht.mjs`, `docs/screenshots/auftrag-102/README.md`        | Tests und Nachweis                              |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                                 | Nachweis                                        |

## Globale Grenzen

- Schutzbereiche unverändert. Zahlen gegen Faktenblatt v1.2 §1, §7 und §17 geprüft.
- Keine neuen Abhängigkeiten. Bilddateien bleiben erhalten; nur die drei Routen zeigen kein Bild mehr.
- `GESELLSCHAFTER` und `SATZUNG` unverändert (Dashboard-Katalog und Katalogtest nutzen sie).

## Inhaltsinventar und Abweichungen zum Original

- **Satzung:** Eyebrow, Titel, Untertitel „Gesellschaftsvertrag Auszug.“, zwei Pills, Leucht-Tabelle
  „Paragraph / Inhalt & Regelung“ ohne Panel-Überschrift, drei Paragraphen mit vollem Text – vollständig.
- **Gesellschafterliste:** Titel, Untertitel „Beteiligungsverhältnisse der LeadPilot GmbH.“, zwei Pills,
  Leucht-Tabelle mit fünf Gesellschaftern und Gesamtzeile, Nennbeträge in Festbreitenschrift, Stimmrechts-Chip
  mit Leuchtbalken – vollständig. Abweichung: Pille „Stammkapital 31.250,00 €“ statt „25.000 €“ (Faktenblatt
  §1/§7: 25.000 € war das Gründungskapital, nach Kapitalerhöhung Q1 2024 31.250 €; passt zur Gesamtzeile).
- **Handelsregister:** Titel, Untertitel „Handelsregisterbekanntmachung.“, zwei Pills, Leucht-Tabelle
  „Merkmal / Details“ (vorher Definitionsliste mit Panel-Titel) mit vier Zeilen – vollständig. Abweichung nach
  Faktenblatt §1/§17 D4: Bei mehreren Geschäftsführern vertritt jeder einzeln (WebP: „gemeinsam“).

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2.
- [x] Seitenfreigabe um die drei Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Drei Seiten nach Original-WebP gebaut, „ruhig“, hell und dunkel.
- [x] Tests angepasst und ergänzt, e2e-Routen ergänzt.
- [x] Nachweis 3 Seiten × 1440/768/375/320/250 px × dunkel/hell plus 375 px mit 150 %/200 % Textgröße: 42/42.
