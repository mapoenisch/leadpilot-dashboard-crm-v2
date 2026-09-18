# Auftrag 067I Welle G54 — Semantik-Nachweis (kein Pixel-Vergleich)

G54 rekonstruiert 9 Ganzseiten-WebP-Ansichten (Unternehmen, Übersicht, Produkt)
als echte React-Seiten. Ein Vorher/Nachher-Pixelvergleich ist hier kein
Regressionsmaß — die visuelle Änderung ist beabsichtigt. Nachweis stattdessen
über Struktur-Assertions je Route und Viewport (1440/768/375), ausgeführt per
`e2e/semantic-routes.spec.ts` (lokal, Seed-Benutzer, G52+G53+G54 zusammen 29
Routen × 4 Prüfungen × 3 Viewports = 348 Tests) plus jsdom-Spiegel
`src/app/__tests__/g54SemanticPages.ui.vitest.tsx`.

## Ergebnis je Route und Viewport (348/348 grün in 29,3 s, unabhängiger Lauf)

| Route | 1440 | 768 | 375 | Befund |
|---|---|---|---|---|
| `/company/profile` | 4/4 | 4/4 | 4/4 | Steckbrief-dl + Strukturnotiz, kein WebP, 1 Content-h1, 0px Overflow |
| `/company/highlights` | 4/4 | 4/4 | 4/4 | Erfolge/Baustellen-dl + Fazit, 0px Overflow |
| `/company/idea` | 4/4 | 4/4 | 4/4 | Thesen-Absätze + USP-Liste, 0px Overflow |
| `/company/value-proposition` | 4/4 | 4/4 | 4/4 | Kernbotschaft + Nutzen-Sections, 0px Overflow |
| `/company/history` | 4/4 | 4/4 | 4/4 | Meilensteine als geordnete Liste, 0px Overflow |
| `/product/features` | 4/4 | 4/4 | 4/4 | Modul-Sections, 0px Overflow |
| `/product/pricing` | 4/4 | 4/4 | 4/4 | Tarif-Sections mit Merkmalslisten, 0px Overflow |
| `/product/performance` | 4/4 | 4/4 | 4/4 | Metriken-dl + Verlaufs/Churn-Balken mit Summary, 0px Overflow |
| `/product/roadmap` | 4/4 | 4/4 | 4/4 | Release-Sections mit Status, 0px Overflow |

Prüfpunkte je Zelle: kein `.webp`-Bild, genau eine Content-h1 (Header-h1 ist
App-Chrome), >200 Zeichen auswählbarer Text, semantische Struktur
(Tabelle/dl/ul/ol/section), 0px horizontaler Overflow (375px explizit). Der
Login-Redirect-Guard (`not.toHaveURL(/\/login/)` + Hauptinhalt-Landmarke) gilt
für alle 29 Routen.

## Bewusste Abweichungen

- Header-h1 (Routentitel, App-Chrome) plus Content-h1 je Route: Die E2E-Assertion
  zählt `main h1` (exakt 1); eine routeweite h1-Bereinigung gehört zu G55.
- Seiten rendern `<div>` statt eigenem `<main>` (keine verschachtelten
  Landmarks); `<main aria-label="Hauptinhalt">` stellt das Layout.
- Statische Domänendaten: `DataState` mit ready/empty aus Datenvorhandensein
  (kein simuliertes Loading bei statischen Imports).
- Alle Summaries und Einleitungen sind aus Domändaten abgeleitet (G52-P1-Lehre);
  keine Beträge als Literale.
- `/company/location` (bereits semantisch, dekoratives Backdrop-Bild) und
  `/product/integration` sowie `/company/data-basis` (bereits semantisch) sind
  nicht Teil dieser Welle.
