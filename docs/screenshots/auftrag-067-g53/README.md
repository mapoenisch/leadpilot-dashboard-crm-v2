# Auftrag 067I Welle G53 — Semantik-Nachweis (kein Pixel-Vergleich)

G53 rekonstruiert 11 Ganzseiten-WebP-Ansichten (Markt, Kunden, Vertrieb) als
echte React-Seiten. Ein Vorher/Nachher-Pixelvergleich ist hier kein
Regressionsmaß — die visuelle Änderung ist beabsichtigt. Nachweis stattdessen
über Struktur-Assertions je Route und Viewport (1440/768/375), ausgeführt per
`e2e/semantic-routes.spec.ts` (lokal, Seed-Benutzer, G52+G53 zusammen 20 Routen
× 4 Prüfungen × 3 Viewports = 240 Tests) plus jsdom-Spiegel
`src/app/__tests__/g53SemanticPages.ui.vitest.tsx`.

## Ergebnis je Route und Viewport (240/240 grün in 22,2 s, unabhängiger Lauf)

| Route | 1440 | 768 | 375 | Befund |
|---|---|---|---|---|
| `/market/overview` | 4/4 | 4/4 | 4/4 | Marktlage-dl, kein WebP, 1 Content-h1, 0px Overflow |
| `/market/competition` | 4/4 | 4/4 | 4/4 | Anbietervergleich-Tabelle + Anteils-Balken mit Summary, 0px Overflow |
| `/market/swot` | 4/4 | 4/4 | 4/4 | Vier Quadranten-Sections mit Listen, 0px Overflow |
| `/customers/icp` | 4/4 | 4/4 | 4/4 | Firmografie-dl + Trigger/Ausschluss-Listen, 0px Overflow |
| `/customers/persona` | 4/4 | 4/4 | 4/4 | Stammdaten-dl + Ziele/Hürden/Kanäle-Listen, 0px Overflow |
| `/customers/segments` | 4/4 | 4/4 | 4/4 | Branchen/Regionen-Tabellen + ARR-Balken mit Summary, 0px Overflow |
| `/customers/top-customers` | 4/4 | 4/4 | 4/4 | Top-10-Tabelle mit Paket und ARR, 0px Overflow |
| `/sales/funnel` | 4/4 | 4/4 | 4/4 | Trichtertabelle + Quartalsreihen je Stufe mit Summary, 0px Overflow |
| `/sales/sla` | 4/4 | 4/4 | 4/4 | Übergabe-Tabelle + Pflichten-Listen, 0px Overflow |
| `/sales/channels` | 4/4 | 4/4 | 4/4 | Kanalvergleich-Tabelle + CAC-Balken mit Summary, 0px Overflow |
| `/sales/planning` | 4/4 | 4/4 | 4/4 | Initiativen-Liste + Budget/Basis/Ziel-Balken mit Summary, 0px Overflow |

Prüfpunkte je Zelle: kein `.webp`-Bild, genau eine Content-h1 (Header-h1 ist
App-Chrome), >200 Zeichen auswählbarer Text, semantische Struktur
(Tabelle/dl/ul/section), 0px horizontaler Overflow (375px explizit). Der
Login-Redirect-Guard (`not.toHaveURL(/\/login/)` + Hauptinhalt-Landmarke) gilt
für alle 20 Routen.

## Bewusste Abweichungen

- Header-h1 (Routentitel, App-Chrome) plus Content-h1 je Route: Die E2E-Assertion
  zählt `main h1` (exakt 1); eine routeweite h1-Bereinigung gehört zu G55.
- Seiten rendern `<div>` statt eigenem `<main>` (keine verschachtelten
  Landmarks); `<main aria-label="Hauptinhalt">` stellt das Layout.
- Statische Domänendaten: `DataState` mit ready/empty aus Datenvorhandensein
  (kein simuliertes Loading bei statischen Imports).
- Alle Summaries und Einleitungen sind aus Domändaten abgeleitet (G52-P1-Lehre);
  keine Beträge als Literale.
