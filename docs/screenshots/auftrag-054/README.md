# Auftrag 054 — Screenshot-Matrix (G39 Welle 1)

Baseline: `401c9f7` (isolierter `git worktree`, identische Deps per
Symlink, eigener Build) vs. Nachher (Fix-Stand der Nacharbeit).
Harness `scripts/captureGateScreenshots.mjs` (5 `visual.spec.ts`-
Routen × 3 Viewports, `vite preview`, reducedMotion + fonts.ready +
1000 ms Settle). Vergleich per `shasum -a 256`; Regionen per
PIL-Pixel-Diff (Strong-Pixel > 30/255). Kein Bild inhaltlich geöffnet.

**Korrekturvermerk (Nacharbeit):** Die erste Fassung dieser Matrix
(14/15 identisch) wurde mit veralteten After-Captures gemessen
(Preview-Race, Toggle-Button fehlte darin) und war ungültig — sie
ist durch die Neumessung unten ersetzt. Lehre: After-Captures immer
mit frischem `dist` + Toggle-Sichtbarkeitsprobe.

## Routen: Baseline vs. Nachher (dunkles Theme, Default)

Neues UI in allen Captures: Theme-Toggle-Button im Header (Block A,
beauftragt, Entscheidung 1) — kein Paar kann byte-identisch sein.
Der Nachweis trennt daher: **Sidebar-Region (x < 260)** separat
ausgewiesen (dort liegt die gefundene Regression), Rest = Toggle +
AA-Teppich.

| Shot | Sidebar x<260 (strong>30) | Rest / Bewertung |
|---|---|---|
| dashboard-1440 | **0,0 %** | Toggle-Box + AA-Teppich (gesamt 0,01 %) |
| dashboard-768 | **0,0 %** | Toggle-Box 32px (501–533) + Teppich (0,02 %) |
| dashboard-375 | Content (Drawer zu) | **Header-Wrap-Shift 56→79 px** (Toggle bricht um, Seite rutscht, 20,6 %) |
| crm-leads-1440 | **0,0 %** | Toggle-Box + Teppich (0,01 %) |
| crm-leads-768 | **0,0 %** (maxD 2/255) | Toggle-Box + Teppich (0,02 %) |
| crm-leads-375 | Content (Drawer zu) | **Header-Wrap-Shift 56→79 px** (13,7 %) |
| finance-p-and-l-1440 | **0,0 %** | Toggle-Box 32px (1173–1205, 0,01 %) |
| finance-p-and-l-768 | **0,0 %** (maxD 1/255) | Toggle-Box + Teppich (0,02 %) |
| finance-p-and-l-375 | **1,0 %** | Nur Toggle-Box (Header schon Baseline 79 px, kein Shift, 0,68 %) |
| market-overview-1440 | **0,0 %** | Toggle-Box 32px (0,01 %) |
| market-overview-768 | **0,0 %** | Toggle-Box 32px (0,02 %) |
| market-overview-375 | **0,1 %** | Nur Toggle-Box (0,05 %) |
| resources-materials-1440 | **0,0 %** | Toggle-Box 32px (0,01 %) |
| resources-materials-768 | **0,0 %** | Toggle-Box 32px (0,02 %) |
| resources-materials-375 | **1,0 %** | Nur Toggle-Box (0,68 %) |

**Sidebar-Ghosting behoben (Nacharbeit): 0,0 % auf allen Desktop-/
Tablet-Routen.** Verbleibende Diffs sind beauftragtes neues UI
(Toggle-Button, auf Mobile mit Wrap-Shift auf 2 Routen) plus
AA-Teppich. Keine Migrations-Regression.

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

## Playwright (nach Snapshot-Aktualisierung, genehmigt)

`npx playwright test` → **153/153**. Die 15 alten
`toHaveScreenshot`-Snapshots waren stale ( committed Snapshots vs.
frische Baseline-Captures: z. B. finance-1440 237900 starke Pixel)
und wurden nach dem Sidebar-Fix mit `--update-snapshots` neu
geschrieben (`git status e2e/` zeigt nur Snapshot-PNGs, kein
Spec-Change). Vorher: 138/153.
