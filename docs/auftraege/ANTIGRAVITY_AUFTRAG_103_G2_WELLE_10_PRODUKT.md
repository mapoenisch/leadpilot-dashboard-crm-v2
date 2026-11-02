# ANTIGRAVITY_AUFTRAG_103 — Paket G2, Welle 10: Preismodell und Produkt-Performance als echte Seiten

> **Builder:** Claude Code · **Prüfer:** Codex
> Dateiname mit Präfix `ANTIGRAVITY_AUFTRAG_` nur für die Kontinuität der Auftragsreihe.
> Plan Abschnitt 12 (Arbeitspaket G), Teil G2, zehnte und letzte Welle: restliche Produktseiten.
> Vorgehen wie Auftrag 093–102: Das Original-WebP ist die Vorlage, kein Inhalt geht verloren,
> „ruhig“ dämpft nur. Ohne Sichtfreigabe (Ergänzung Marc vom 19.10.2026), Codex-Gate bleibt.

## Baseline

- Branch `claude/auftrag-103-g2-welle-10` von `main` `1d63bb6` (nach Merge PR #89).
- Schutzbereichs-Baseline: `1d63bb6`.

## Welle

| Schlüssel             | Route                  | Original-WebP                                                 |
| --------------------- | ---------------------- | ------------------------------------------------------------- |
| `product-pricing`     | `/product/pricing`     | `public/assets/auftrag-037g/08-preismodell.webp`              |
| `product-performance` | `/product/performance` | `public/assets/auftrag-037g/09-produkt-performance-2025.webp` |

Damit sind alle 32 Bildseiten freigegeben. Der globale Schalter `PAGE_PRESENTATION` bleibt `'bild'`;
die Rückschaltung einer Gruppe ist weiterhin „Einträge aus `HTML_PAGES` entfernen“ und wird durch
`g67ImagePages.ui` (Seitenfreigabe dort leer) für alle 32 Seiten geprüft.

## Ziel-Dateien

| Datei                                                                                                                                             | Änderung                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `src/config/pagePresentation.ts`                                                                                                                  | `HTML_PAGES` um die zwei Schlüssel ergänzt                  |
| `src/features/produkt/pages/PricingPage.tsx`, `PerformancePage.tsx`, `src/features/produkt/produktSeiten.css`                                     | Gestaltung nach Original-WebP, `data-ruhig`                 |
| Tests `g93FunnelPage.ui`, `g94UnternehmenSeiten.ui`, `g95UebersichtProdukt.ui`, `g96VertriebSeiten.ui`, `g97FinanzSeiten.ui`, `g98MarktSeiten.ui` | Gegenprobe „Preismodell bleibt Bild“ entfernt (siehe unten) |
| `e2e/semantic-routes.spec.ts`                                                                                                                     | `HTML_PAGE_ROUTES` um die zwei Routen ergänzt               |
| neu `src/app/__tests__/g103ProduktSeiten.ui.vitest.tsx`, `scripts/captureAuftrag103Produkt.mjs`, `docs/screenshots/auftrag-103/README.md`         | Tests und Nachweis                                          |
| Doku: `docs/BUILD_LOG.md`, Plan Abschnitt 12, dieser Auftrag                                                                                      | Nachweis                                                    |

## Globale Grenzen

- Schutzbereiche unverändert. Zahlen gegen Faktenblatt v1.2 §2, §4 und §9 geprüft – keine Datenänderung nötig.
- Keine neuen Abhängigkeiten. Bilddateien bleiben erhalten; nur die zwei Routen zeigen kein Bild mehr.
- 3D-Fläche wiederverwendet (`DepthFlaechen` aus Welle 4), keine neue Diagrammkomponente.

## Inhaltsinventar und Abweichungen zum Original

- **Preismodell:** Eyebrow, Titel, Untertitel „Transparente SaaS-Pakete für den B2B-Mittelstand.“, zwei Pills,
  drei Tarifkarten mit Name, Preis, Abrechnungszeile, Zielgruppe, vier Häkchen-Merkmalen, 3D-Illustration
  (dekorativ, `aria-hidden`) und „Paket wählen“; Growth hervorgehoben mit Chip „Bestseller“ oben rechts und
  gefüllter Schaltfläche; Pro mit „Individuelles Angebot“ in Orange und „Referenz 80 € / Nutzer / Monat
  (50+ Nutzer)“ – vollständig. Abweichung: „Paket wählen“ ist ein Link zur Deal Pipeline (dort wird das Paket
  eines Deals festgelegt) statt eines toten Bild-Buttons – wie „Mehr erfahren“ in Welle 2. Unter 640 px
  entfällt die dekorative Illustration.
- **Produkt-Performance:** Eyebrow, Titel, Untertitel „System-Performance & Verarbeitungsmetriken.“, zwei Pills,
  sechs Kennzahlkacheln mit Icon, Wert, Ziel und farbigem Status („erreicht“ türkis, „verfehlt“ orange) sowie
  Statussymbol oben rechts (Haken / Ausrufezeichen); Panel „Produkt-Aktivierung & KI-Nutzung (2025)“ mit Badge,
  Untertitel, Quartalsverlauf als 3D-Fläche, Legende und Stand Q4; Panel „Kündigungsgründe & Churn-Ursachen
  (2025)“ mit Badge, Untertitel, Ring „Gesamt 17“ mit Tiefenkante, Balkenliste mit Anzahl und Anteil, Hinweis –
  vollständig. Abweichungen:
  - Pille „6 Kernmetriken“ statt „4 Kernmetriken“ (das Original zeigt selbst sechs Kacheln).
  - Stand Q4 25: 58 % Aktivierungsrate statt 72 % im Tooltip des Originals (Faktenblatt §9; die Kachel des
    Originals zeigt ebenfalls 58 %). Die Kurve folgt den Quartalswerten 49/53/56/58 % und 38/41/44/47 %,
    die Achse endet daher bei 60 % statt 100 %.
  - Keine Mini-Verläufe in den Kacheln: Dazu gibt es keine Daten (Befundregister 2026-10-06, G2 „Keine Daten,
    keine Übernahme“).
  - „Quartalsansicht“ und „Absolute Zahlen“ als statische Chips statt Auswahlfeldern ohne Funktion (es gibt
    jeweils nur diese eine Ansicht).
  - Hinweis: „Fokus auf ICP-konforme Kunden empfohlen: Kleinstkunden mit 2–3 Nutzern sind Negative-Fit.“ statt
    „Fokus auf Enterprise-Go-to-Market empfohlen.“ – Faktenblatt §4 (Churn ist ein ICP-Problem) und §13
    (Negative-Fit, Entscheidung Marc 13.10.2026); LeadPilot zielt auf den Mittelstand, nicht auf Enterprise.

## Testanpassung

Die Gegenproben „andere Seiten bleiben Bild“ in g93–g98 zeigten zuletzt auf das Preismodell. Nach dieser Welle
gibt es keine Seite mehr außerhalb von `HTML_PAGES`; die Gegenproben sind entfernt. Ersatz: `g103ProduktSeiten.ui`
prüft, dass `HTML_PAGES` genau alle 32 Schlüssel aus `IMAGE_PAGES` ohne Doppelung enthält; der Bildweg aller
32 Seiten bleibt über `g67ImagePages.ui` geprüft.

## Tasks

- [x] Inhaltsinventar je WebP und Abgleich mit Faktenblatt v1.2.
- [x] Seitenfreigabe um die zwei Seiten erweitert; Rückschaltung = Einträge entfernen.
- [x] Zwei Seiten nach Original-WebP gebaut, „ruhig“, hell und dunkel.
- [x] Tests angepasst und ergänzt, e2e-Routen ergänzt.
- [x] Nachweis 2 Seiten × 1440/768/375/320/250 px × dunkel/hell plus 375 px mit 150 %/200 % Textgröße: 28/28.
