# Auftrag 067A — Clipping-Nachweis (PR-CLIP-13, RED)

Textueller Nachweis ohne PNG-Commit (Screenshot-Policy: nur diese Matrix wird
committet). Reproduzierender Test: `e2e/element-clipping.acceptance.ts`
(`[PR-CLIP-13] beschneidet keine Inhalte im Scroll-Container`, Runner
`npm run test:v23:clipping`, Projekt `mobile-375`).

Messung: 375 × 812, lokale Kontrollmessung gegen frischen Produktions-Build
(`npm run build` aus diesem Branch) plus Gate-Lauf des Acceptance-Tests.
Der bestehende Dokument-Overflow-Test (`e2e/routes.spec.ts`) bleibt
unverändert und grün — die Seite meldet 0 px Dokument-Overflow, während
Inhalte innerhalb ihres Scroll-Containers abgeschnitten werden (kein
Widerspruch).

| Route | Viewport | Dokument-Overflow | Element | Messung (x / Breite / rechter Rand) | Scroll-Container (clientWidth / rechter Rand) | Status |
|---|---:|---:|---|---|---|---|
| `/resources/materials` | 375 × 812 | 0 px | `100% Verlustfrei integriert` (Badge) | x 305.33 / 105.91 / **411.23** | `MAIN` 375 / 375 | RED |
| `/resources/materials` | 375 × 812 | 0 px | `Operations & SLA` (Tab) | x 299.58 / 91.59 / **391.17** | `MAIN` 375 / 375 | RED |

Gate-Lauf des Acceptance-Tests bestätigt denselben Befund (Badge rechter Rand
412.59 > 375, Test rot mit `100% Verlustfrei integriert: rechter Rand`).
Beide Elemente sind sichtbar (`toBeVisible` grün), ragen aber rechts über den
375-px-Viewport und über ihren Scroll-Container hinaus — internes Clipping
reproduziert. Fix in 067J (G56).
