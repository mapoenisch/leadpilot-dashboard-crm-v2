# Auftrag 053 — Screenshot-Matrix (G38)

Baseline: `6e8d4cf` (isolierter `git worktree`, identische Deps per Symlink,
eigener Build) vs. Nachher: `38fc4b8`. Harness
`scripts/captureGateScreenshots.mjs` (5 `visual.spec.ts`-Routen × 3 Viewports,
`vite preview`, reducedMotion + fonts.ready + 1000 ms Settle).
Vergleich per `shasum -a 256`; nur Abweichungen per PIL-Pixel-Diff
(BBox + max. Kanal-Delta + Zählung starker Pixel > 8/255). Kein Bild
inhaltlich geöffnet — bei den Kennzahlen unten gibt es nichts Auffälliges.

## Routen: Baseline vs. Nachher

| Shot | SHA-256 | Pixel-Diff |
|---|---|---|
| dashboard-1440 | abweichend | BBox 1124×146px, maxDelta **1/255**, 0 starke Pixel (Kanten-AA) |
| dashboard-768 | **GLEICH** | — |
| dashboard-375 | **GLEICH** | — |
| crm-leads-1440 | **GLEICH** | — |
| crm-leads-768 | abweichend | BBox 2×178px (linke Kante), maxDelta **1/255**, 0 starke Pixel |
| crm-leads-375 | **GLEICH** | — |
| finance-p-and-l-1440 | **GLEICH** | — |
| finance-p-and-l-768 | abweichend | BBox 2×10px (linke Kante), maxDelta **1/255**, 0 starke Pixel |
| finance-p-and-l-375 | **GLEICH** | — |
| market-overview-1440 | **GLEICH** | — |
| market-overview-768 | abweichend | BBox 2×10px (linke Kante), maxDelta **1/255**, 0 starke Pixel |
| market-overview-375 | **GLEICH** | — |
| resources-materials-1440 | **GLEICH** | — |
| resources-materials-768 | **GLEICH** | — |
| resources-materials-375 | **GLEICH** | — |

**11/15 byte-identisch**, 4/15 reines Sub-Pixel-AA (maxDelta 1/255, 0 starke
Pixel). Keine visuelle Regression — trotz 19 migrierter Primitives auf
praktisch jeder Route.

## `/design-system` (neu, DEV-only — keine Baseline möglich)

Route existiert nur bei `import.meta.env.DEV` (conditional in `App.tsx`),
kein Navi-Eintrag, kein Produktions-Build-Anteil. Captures via `vite dev`:

| Datei | Größe | Nachweis |
|---|---|---|
| `design-system-1440.png` | 1440×900 | Viewport |
| `design-system-768.png` | 768×1024 | Viewport |
| `design-system-375.png` | 375×812 | Viewport |
| `design-system-galerie-1440.png` | 1100×3445 | **volle Galerie** (Element-Shot, alle 19 Sections) |
| `design-system-modal-1440.png` | 1440×900 | Interaktionszustand: Modal geöffnet |

DOM-verifiziert (Text, kein Bild geöffnet): 19 `<section>`, alle h2-Titel
(Alert … Toolbar) vorhanden, `<main>` enthält die Galerie.
Bekannte Kosmetik (kein Fix, bewusst): der App-Header zeigt den
404-Fallback-Titel, weil `/design-system` keinen `APP_ROUTES`-Eintrag hat —
ein Eintrag bräche den DEV-Guard `APP_ROUTES.length === NAV_CATEGORIES`
(41) bzw. brächte einen verbotenen Navi-Link (Entscheidung 7). Reine
DEV-Werkzeugseite, kein Prod-Einfluss.

## Playwright-Einordnung

`visual.spec.ts` läuft mit Toleranz 0 (`maxDiffPixelRatio: 0`): schon das
hier gemessene 1/255-Kanten-AA lässt einzelne Snapshots rot werden. Der
Harness-Vergleich auf derselben Maschine ist der belastbare Nachweis
(siehe Tabelle oben); Snapshots wurden nicht angefasst (`git status e2e/`
sauber, kein `--update-snapshots`).
