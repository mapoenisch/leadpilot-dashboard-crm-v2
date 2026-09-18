# Auftrag 067I Welle G55 — Semantik-Nachweis und Gesamtnachprüfung (kein Pixel-Vergleich)

G55 rekonstruiert die letzten 3 Ganzseiten-WebP-Ansichten (Organisation) als
echte React-Seiten und prüft routeweit alle aufgebauten Wellen nach. Ein
Vorher/Nachher-Pixelvergleich ist hier kein Regressionsmaß — die visuelle
Änderung ist beabsichtigt. Nachweis stattdessen über Struktur-Assertions je
Route und Viewport (1440/768/375), ausgeführt per `e2e/semantic-routes.spec.ts`
(lokal, Seed-Benutzer, G52+G53+G54+G55 zusammen 32 Routen × 4 Prüfungen × 3
Viewports = 384 Tests) plus jsdom-Spiegel
`src/app/__tests__/g55SemanticPages.ui.vitest.tsx`.

## Ergebnis je Route und Viewport (jsdom 4/4 grün, E2E offen bis 384er-Lauf)

| Route | 1440 | 768 | 375 | Befund |
|---|---|---|---|---|
| `/organisation/headcount` | offen | offen | offen | Kapazitätstabelle + FTE-Balken mit Summary, kein WebP, 1 Content-h1, 0px Overflow |
| `/organisation/hr` | offen | offen | offen | HR-Kennzahlen-dl, 0px Overflow |
| `/organisation/team` | offen | offen | offen | Organigramm-Liste + Engpässe, 0px Overflow |

Routeweite Gesamtnachprüfung: alle 32 Vertragsrouten (G52: 9, G53: 11, G54: 9,
G55: 3) laufen im selben 384er-Vertrag; die G52–G54-Matrizen bleiben
unverändert gültig.

Prüfpunkte je Zelle: kein `.webp`-Bild, genau eine Content-h1 (Header-h1 ist
App-Chrome), >200 Zeichen auswählbarer Text, semantische Struktur
(Tabelle/dl/ul/ol/section), 0px horizontaler Overflow (375px explizit). Der
Login-Redirect-Guard (`not.toHaveURL(/\/login/)` + Hauptinhalt-Landmarke) gilt
für alle 32 Routen.

## Bewusste Abweichungen

- Header-h1 (Routentitel, App-Chrome) plus Content-h1 je Route: Die E2E-Assertion
  zählt `main h1` (exakt 1); eine routeweite h1-Bereinigung bleibt G55-Sache
  der Gesamtnachprüfung bzw. Nachfolge.
- Seiten rendern `<div>` statt eigenem `<main>` (keine verschachtelten
  Landmarks); `<main aria-label="Hauptinhalt">` stellt das Layout.
- Statische Domänendaten: `DataState` mit ready/empty aus Datenvorhandensein
  (kein simuliertes Loading bei statischen Imports).
- Alle Summaries und Einleitungen sind aus Domändaten abgeleitet (G52-P1-Lehre);
  keine Beträge als Literale.
- Dekorative Backdrop-Bilder (`alt=""`, `aria-hidden`) in `LocationPage` und
  `OrganisationStructure` sind keine Ganzseiten-Ansichten und zählen nicht als
  WebP-Verstoß; sie liegen außerhalb des Routenvertrags.
- Zählung: 32 Vertragsrouten plus die bereits vorher semantische
  `/company/location` ergeben die 33 semantischen Seiten des Masterplans.
