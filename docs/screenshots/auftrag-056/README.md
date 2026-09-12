# Auftrag 056 — Screenshot-Matrix (G39 Welle 3)

Baseline: `583e932` (isolierter `git worktree`, identische Deps per
Symlink, eigener Build) vs. Nachher (Block-E-Stand inkl. Banner-Fix).
Harness `scripts/captureGateScreenshots.mjs` (`vite preview`,
reducedMotion + fonts.ready + 1000 ms Settle). Vergleich per
`shasum -a 256`; Abweichungen per PIL-Pixel-Diff (Strong-Pixel >
8/255 + max. Kanal-Delta). Kein Bild inhaltlich geöffnet.
Simulation in beiden Läufen Tick #0 (DOM-verifiziert, kein Drift).

## Blöcke A–D: keine live Routen

Per Suche belegt (wie Welle 2): **kein** Konsument außerhalb der
eigenen Verzeichnisse (`organisation/*`, `overview/components/*`,
`produkt/components/*` — unverdrahtete Facelift-Ansichten).
`ExecutiveDashboardPage`/`IntegrationPage`/`ProjectTasksPage`/
`SourcesPage`/`LeaseContractPage`/`ManagingDirectorContractPage`
sind live, aber je nur 1 triviale Zeile (Verifikations-Hinweis:
Playwright-Suite 153/153 grün, s. u.). Kein sichtbarer Effekt
durch A–D möglich.

## Block E: `/crm/live-simulation` (1440/768/375, Entscheidung 1)

| Shot | SHA-256 | Pixel-Diff |
|---|---|---|
| crm-live-simulation-1440 | abweichend | maxDelta **2/255**, 0 starke Pixel (AA-Teppich) |
| crm-live-simulation-768 | **GLEICH** | — |
| crm-live-simulation-375 | **GLEICH** | — |

**2/3 byte-identisch**, 1× reines Sub-Pixel-AA. Keine visuelle
Regression trotz 9 migrierter Dateien mit hoher Style-Dichte.

### Gefundener und behobener Zwischenbefund (im Bericht)

Erste After-Messung: 17–45 % Strong-Pixel bei maxDelta 22/255,
meanDelta (+3/+8/+8, systematisch heller) in y 200–600 —
`background:`-Shorthand (setzt Color auf transparent) war als
`bg-[linear-gradient(...)]` (nur Image) migriert worden, das
Card-`bg-surface` schien durch. Fix: `bg-transparent` dazu
(Tailwind-merge: Aufrufer gewinnt). Danach die Zahlen oben.

## Playwright

`npx playwright test` → **153/153**. `/crm/live-simulation`
ist nicht in der Suite (Entscheidung 1 — deshalb diese Matrix).
`git status e2e/` sauber, kein `--update-snapshots`.
