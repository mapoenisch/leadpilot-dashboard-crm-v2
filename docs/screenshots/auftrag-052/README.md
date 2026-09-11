# Auftrag 052 — Screenshot-Matrix + Profiler-Nachweis (G37)

## Erfolgsfall: Baseline (29cbcd1) vs. nachher — SHA-256

12 Routen-/Tier-Paare + 4 Modal-Shots (1440), `scripts/tmp-052-shots.mjs`
(temporär, nach Gebrauch gelöscht).

| Shot | Ergebnis |
|---|---|
| activities-1440/375, live-sim-1440/375, live-sim-audit-1440/375, live-sim-detail-1440/375, modal-compare/measure-1440 | **GLEICH** (11/16) |
| live-sim-768, live-sim-audit-768, live-sim-detail-768, modal-run-1440, modal-scenario-1440 | max. Kanal-Delta ≤ 8/255, 0 starke Pixel (reines Kanten-AA) |

Analyse der 5: BBoxen minimal (z. B. 3×12px), Crops bei 4x visuell identisch,
Modal-Run Seite-an-Seite geprüft (gleiche Version, gleiche Buttons/Texte).
Gegenproben: `npx playwright test` **153/153** (u. a. `visual` Toleranz 0),
`routes.spec` (kein Overflow/404) grün.

## Profiler: console.count-Ground-Truth (kein Fiber-Flag-Walk!)

Methode: temporäre `console.count` in allen 10 Konsumenten + SimulationBar
(nach Messung revertiert, Tree verifiziert sauber), unminified Builds
(`--minify=false`, minified Builds verlieren Funktionsnamen), identische
Interaktion: Modal öffnen → Draft-Add → Draft-Remove (nur
`draftMeasures`-Slice, store-lokal, reversibel) → Modal zu → Start 10x →
3 Ticks → Pause. Baseline-Build aus Worktree (29cbcd1).

**Warnung aus der Arbeit:** ein erster Messansatz per React-DevTools-Hook
(`PerformedWork`-Flags) zählte stabil, aber falsch (stale Flags → +2 statt
+1 pro Tick auch bei unveränderten Selektoren, per console.count widerlegt).
Alle Zahlen unten sind console.count.

| Phase | LDV | MTV | ScenMan | RAM | MeasMan | Multi | SimBar |
|---|---|---|---|---|---|---|---|
| ADD (kumuliert) base → nachher | 2 → 1 | 2 → 2 | 2 → 1 | 2 → 2 | 3 → 3 | 2 → 1 | 0 → 0 |
| REMOVE (kumuliert) base → nachher | 3 → 1 | 3 → 3 | 3 → 1 | 3 → 3 | 4 → 4 | 3 → 1 | — |
| TICKS (kumuliert) base → nachher | 9 → 7 | 9 → 9 | 9 → 7 | 9 → 9 | 10 → 10 | 9 → 7 | 5 → 5 |

Lesart: Draft-Aktionen rendern nachher nur noch echte draftMeasures-Leser
(MTV-Badge, RAM — liest drafts für runVersion, MeasMan selbst); LDV/
ScenarioManager/MultiCompare (tick-stabile Selektoren, stabile Parents)
schweigen (je −2 kumuliert aus Add+Remove). Tick-Inkremente sind identisch
(je 6 für Close+Start+3 Ticks+Pause) — Parität, kein Live-Verhalten geändert.
SimBar (direktes Service-Abo, unverändert) identisch.

## HMR-Befund (Entscheidung 3)

Ohne `import.meta.hot.dispose()` würde ein Vite-Modul-Reload die alte
Store-Subscription stehen lassen (doppelte setStates pro Tick, nur Dev).
`dispose()` räumt auf — implementiert in `simulationStore.ts`. Prod
unbetroffen (kein HMR). Nicht live getestet, per Code-Analyse sicher.

## Chunking-Befund (nicht im Auftrag, musste gelöst werden)

`zustand/react/shallow` fällt per `manualChunks` (`/react/` im Pfad) in den
react-vendor-Chunk, vanilla in vendor — zyklischer Chunk-Edge, App-Boot
starb (`T.createContext` auf uninitialisiertem Namespace). Lösung ohne
Config-Änderung: lokaler `useShallowSelector` aus `useStore`
(`zustand/react`, vendor-sicher) + `shallow` (`zustand/vanilla/shallow`) +
`useRef`-Cache. `zustand/traditional` scheidet aus (braucht das nicht
installierte `use-sync-external-store`-Shim — keine neue Dep erlaubt).
Verifiziert: kein react-vendor→vendor-Edge mehr, Boot ok.
