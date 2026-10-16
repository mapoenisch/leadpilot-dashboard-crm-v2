# ANTIGRAVITY_AUFTRAG_096 — Paket G2, Welle 3: Vertrieb & Marketing als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, dritte Welle: erste Gruppe nach Unternehmensübersicht/Produkt.
> Vorgehen wie Auftrag 093–095: Das Original-WebP ist die Vorlage, kein Inhalt geht verloren, 3D bleibt,
> „ruhig“ dämpft nur.

## Baseline

- Branch `claude/auftrag-096-g2-welle-3` von `main` nach Merge PR #82.
- Schutzbereichs-Baseline: `main` nach Merge PR #82 (`git merge-base HEAD main`).

## Welle

Drei Seiten aus Vertrieb & Marketing. Preismodell und Produkt-Performance bleiben vorerst Bild (Preismodell wartet auf die Angleichung an die nutzerbasierte Abrechnung des Faktenblatts v1.2).

| Schlüssel        | Route             | Original-WebP                                                 |
| ---------------- | ----------------- | ------------------------------------------------------------- |
| `sales-sla`      | `/sales/sla`      | `public/assets/auftrag-037e/02-sla-marketing-sales.webp`      |
| `sales-channels` | `/sales/channels` | `public/assets/auftrag-037e/03-kanalperformance-cac.webp`     |
| `sales-planning` | `/sales/planning` | `public/assets/auftrag-037e/04-marketingplanung-h2-2026.webp` |

## Ziel-Dateien

| Datei                                                                                                                                      | Änderung                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                                                           | `HTML_PAGES` um die drei Schlüssel ergänzt                                                                                                               |
| `src/features/vertrieb/pages/SlaPage.tsx`, `ChannelsPage.tsx`, `PlanningPage.tsx`, neu `vertriebSeiten.css`                                | Gestaltung nach Original-WebP, `data-ruhig`                                                                                                              |
| `src/features/vertrieb/components/GroupedDepthColumns.tsx`                                                                                 | additive Optionen (Höhe, Säulenbreite, Farbe je Säule, Achsenformat, Wertebeschriftung, Breite, schmale Fassung); ohne Angabe unverändert (Funnel-Seite) |
| `src/domain/vertriebData.ts`                                                                                                               | Tippfehler „automatisierten“; Initiative „Guided Onboarding Campaign“ auf ≥ 26 % (Faktenblatt v1.2 D1)                                                   |
| Test `g93FunnelPage.ui`                                                                                                                    | Gegenprobe „bleibt Bild“ auf Marktübersicht statt SLA                                                                                                    |
| `e2e/semantic-routes.spec.ts`                                                                                                              | `HTML_PAGE_ROUTES` um die drei Routen ergänzt                                                                                                            |
| neu `src/app/__tests__/g96VertriebSeiten.ui.vitest.tsx`, `scripts/captureAuftrag096Vertrieb.mjs`, `docs/screenshots/auftrag-096/README.md` | Tests und Nachweis                                                                                                                                       |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                               | Nachweis                                                                                                                                                 |

## Globale Grenzen

- Schutzbereiche unverändert. Zahlen gegen Faktenblatt v1.2 geprüft: SLA (Score ≥ 80, ~43 MQL/Monat, 24 h, 3 Kontaktversuche), Kanäle (38/22/18/12/10 %, 18/10/8/6/5 = 47 Neukunden, CAC 984/656/492/820/1.476 €, gesamt 862 €, Spend 40.500 €), Planung (Monatsreihe 2.500–4.250 € = 19.375 €, Initiativen 30.000 €, Ziel-KPIs Jan 2027 8/720 €/24 %/2,2 %/65 %).
- Keine neuen Abhängigkeiten. Bilddateien bleiben erhalten; nur die drei Routen zeigen kein Bild mehr.

## Inhaltsinventar und Abweichungen zum Original

- **SLA:** Kopf mit zwei Pills, Übergabetabelle (Merkmal/Angabe, drei Zeilen) ohne eigene Panel-Überschrift, zwei Pflichten-Karten mit runder 3D-Kugel (Ziel cyan, Balken orange) und Punktliste.
- **Kanalperformance:** Donut mit Balkenliste, CAC je Kanal als 3D-Säulen (teuerster Kanal orange) mit Wertebeschriftung, Kanaltabelle mit Chips. Abweichungen: Donut-Mitte zeigt „Neukunden 47“ statt „Webinare 12“, Balkenwerte zeigen Neukunden je Kanal (18/10/8/6/5) statt der Prozentzahl als Anzahl (Original „38 (38%)“) — beides nach Faktenblatt §5.
- **Marketingplanung:** Monatsbudget und Ziel-KPIs als 3D-Säulen (Basis hell, Ziel cyan, Ziel-CAC orange), Initiativen-Tabelle mit Budget-Chips. Abweichungen nach Faktenblatt v1.2: Untertitel nennt „Teilplan 19.375 € von 30.000 € H2-Budget“ (Register Z8, §15); Initiative „Trial-to-Paid auf ≥ 26 % steigern (Ziel 2026)“ statt 25 % (D1). Werte zusätzlich als Beschriftung an den Säulen, da die Monatsreihe keine Tabelle hat.
- Schmale Breiten: Diagramme scrollen innerhalb des Panels waagerecht (Bereich per Tastatur erreichbar), die Seite selbst hat keinen Überlauf.

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2 / Befundregister (Z8, Z9, D1).
- [x] Seitenfreigabe um die drei Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Drei Seiten nach Original-WebP gebaut, 3D-Säulen, „ruhig“ (`data-ruhig`), hell und dunkel.
- [x] Tests angepasst und ergänzt, e2e-Routen ergänzt.
- [x] Nachweis 3 Seiten × 1440/768/375/320/250 px × dunkel/hell: 30/30.
- [ ] Sichtabnahme der drei Seiten durch Marc.
