# Auftrag 054 — Screenshot-Matrix (G39 Welle 1)

Baseline: `401c9f7` (isolierter `git worktree`, identische Deps per
Symlink, eigener Build) vs. Nachher: `236c9b5`. Harness
`scripts/captureGateScreenshots.mjs` (5 `visual.spec.ts`-Routen × 3
Viewports, `vite preview`, reducedMotion + fonts.ready + 1000 ms
Settle). Vergleich per `shasum -a 256`; Abweichung per PIL-Pixel-Diff
(BBox + max. Kanal-Delta + Zählung starker Pixel > 8/255). Kein Bild
inhaltlich geöffnet.

## Routen: Baseline vs. Nachher (dunkles Theme, Default)

| Shot | SHA-256 | Pixel-Diff |
|---|---|---|
| dashboard-1440 | **GLEICH** | — |
| dashboard-768 | **GLEICH** | — |
| dashboard-375 | **GLEICH** | — |
| crm-leads-1440 | **GLEICH** | — |
| crm-leads-768 | abweichend | BBox 485×455 (AA-Teppich li. oben), maxDelta **21/255**, nur 2 starke Pixel |
| crm-leads-375 | **GLEICH** | — |
| finance-p-and-l-1440 | **GLEICH** | — |
| finance-p-and-l-768 | **GLEICH** | — |
| finance-p-and-l-375 | **GLEICH** | — |
| market-overview-1440 | **GLEICH** | — |
| market-overview-768 | **GLEICH** | — |
| market-overview-375 | **GLEICH** | — |
| resources-materials-1440 | **GLEICH** | — |
| resources-materials-768 | **GLEICH** | — |
| resources-materials-375 | **GLEICH** | — |

**14/15 byte-identisch**, 1× minimale Abweichung ohne sichtbaren
Unterschied (2 Pixel, max. 21/255 — kein Bild geöffnet, kein
Anschauen nötig). Keine visuelle Regression trotz 22 migrierter
Dateien + Container-Query-Umstellung.

## `/design-system` (DEV-only, via `vite dev`)

| Datei | Größe | Nachweis |
|---|---|---|
| `design-system-1440.png` | 1440×900 | Viewport |
| `design-system-768.png` | 768×1024 | Viewport |
| `design-system-375.png` | 375×812 | Viewport |
| `design-system-galerie-1440.png` | 1100×3913 | **volle Galerie** (Element-Shot) |
| `design-system-modal-1440.png` | 1440×900 | Interaktionszustand: Modal geöffnet |

DOM-verifiziert (Text, kein Bild geöffnet): 22 `h2`-Titel
(Theme + 19 G38-Primitives + Skeleton + „Nur Titel"-Demo),
`Skeleton`- und `Theme (Welle 1, vorläufig)`-Sektionen vorhanden.

## Theme-Umschalter (DOM-Funktionsnachweis, kein Bild)

Per Playwright-`evaluate` (Text-Assertions): Button
`aria-label="Zum hellen Design wechseln"` im DOM (498,13, 32×32,
`display:flex`, sichtbar); Element-Screenshot enthält 125 Farben
(248/1056 Pixel ≠ Hintergrund — rendert). Klick →
`documentElement.dataset.theme === "light"`,
`localStorage["leadpilot-theme"] === "light"` (Persistenz wirkt).
Hinweis: Im `fullPage`-Harness-Capture ist der Button nicht zu
sehen (Stitching-Artefakt bei `100vh`-Layout) — deshalb dieser
DOM-Nachweis statt Screenshot. Helles Theme selbst: Mechanismus
bewiesen, Werte vorläufig (Freigabe ausstehend, Entscheidung 1).

## Playwright-Einordnung

`npx playwright test` → **138/153** (15 `toHaveScreenshot`-
Failures, alle 5 Routen × 3 Viewports). Gegenprobe per Zahlen:
committete Snapshots vs. **frische** Baseline-Captures derselben
Maschine weichen massiv ab (finance-1440: 237900 starke Pixel,
maxDelta 253/255; market-1440: 152771; dashboard-1440: 222154;
crm-leads-768: 101346) — die Suite ist für diese Routen stale und
als Regressionsinstrument unbrauchbar; Snapshots wurden nicht
angefasst (`git status e2e/` sauber, kein `--update-snapshots`).
Der Harness-Vergleich oben (gleiche Maschine, gleiches Verfahren)
ist der belastbare Nachweis. (G38: 144/153 — Drift der stale-
Suite zwischen den Runs, keine 054-Regression.)
