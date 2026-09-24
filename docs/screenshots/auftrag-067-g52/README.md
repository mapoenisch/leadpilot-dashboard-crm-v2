# Auftrag 067I Welle G52 — Semantik-Nachweis (kein Pixel-Vergleich)

G52 rekonstruiert 9 Ganzseiten-WebP-Ansichten (Finanzen, Recht, Strategie) als
echte React-Seiten. Ein Vorher/Nachher-Pixelvergleich ist hier kein
Regressionsmaß — die visuelle Änderung ist beabsichtigt. Nachweis stattdessen
über Struktur-Assertions je Route und Viewport (1440/768/375), ausgeführt per
`e2e/semantic-routes.spec.ts` (lokal, Seed-Benutzer) plus jsdom-Spiegel
`src/app/__tests__/g52SemanticPages.ui.vitest.tsx`.

## Ergebnis je Route und Viewport (108/108 grün)

| Route | 1440 | 768 | 375 | Befund |
|---|---|---|---|---|
| `/finance/p-and-l` | 4/4 | 4/4 | 4/4 | GuV-Tabelle + Erlös-Balken mit Summary, kein WebP, 1 Content-h1, 0px Overflow |
| `/finance/balance-sheet` | 4/4 | 4/4 | 4/4 | Aktiva/Passiva-Tabellen, Bilanzsumme beidseitig, 0px Overflow |
| `/finance/unit-economics` | 4/4 | 4/4 | 4/4 | Kennzahlen-dl + Kosten-Balken mit Summary, 0px Overflow |
| `/legal/articles` | 4/4 | 4/4 | 4/4 | Paragraphen-Sections mit h2, 0px Overflow |
| `/legal/shareholders` | 4/4 | 4/4 | 4/4 | Gesellschafter-Tabelle mit Summenzeile, 0px Overflow |
| `/legal/commercial-register` | 4/4 | 4/4 | 4/4 | Register-dl (HRB 40912), 0px Overflow |
| `/strategy/okrs` | 4/4 | 4/4 | 4/4 | Objectives + KR-Listen, Basis/Ziel-Balken mit Summary, 0px Overflow |
| `/strategy/balanced-scorecard` | 4/4 | 4/4 | 4/4 | Vier Perspektiven als dl, 0px Overflow |
| `/strategy/growth-drivers` | 4/4 | 4/4 | 4/4 | Hebel-Liste + Effekt-Balken mit Summary, 0px Overflow |

Prüfpunkte je Zelle: kein `.webp`-Bild, genau eine Content-h1 (Header-h1 ist
App-Chrome), >200 Zeichen auswählbarer Text, semantische Struktur
(Tabelle/dl/ul/section), 0px horizontaler Overflow (375px explizit).

## Bewusste Abweichungen

- Header-h1 (Routentitel, App-Chrome) plus Content-h1 je Route: Die E2E-Assertion
  zählt `main h1` (exakt 1); eine routeweite h1-Bereinigung gehört zu G55.
- Seiten rendern `<div>` statt eigenem `<main>` (keine verschachtelten
  Landmarks); `<main aria-label="Hauptinhalt">` stellt das Layout.
- Statische Domänendaten: `DataState` mit ready/empty aus Datenvorhandensein
  (kein simuliertes Loading bei statischen Imports).
