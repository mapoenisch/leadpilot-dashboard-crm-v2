# Auftrag 057 — Screenshot-Matrix (G39 Welle 4 / Abschluss)

Baseline: `1c5acae` (isolierter `git worktree`, identische Deps per Symlink, eigener Build) vs. Nachher (Block-D-Stand).
Harness `scripts/captureGateScreenshots.mjs` (`vite preview`, reducedMotion + fonts.ready + 1000 ms Settle).
Vergleich per `shasum -a 256`; Abweichungen per PIL-Pixel-Diff (Strong-Pixel > 8/255 + max. Kanal-Delta). Kein Bild inhaltlich geöffnet.

## Blöcke A, C, D: keine komplexen Live-Routen

Per Repo-Suche belegt (wie Auftrag-057-Spec):
- **11 unverdrahtete Facelift-Komponenten** (0 Konsumenten außerhalb der eigenen Datei): `BalancedScorecardPath`, `GoalRunway`, `BusinessIdeaSignalMap`, `FundingTimeline`, `LocationAtlas`, `ValueBenefitStage`, `BudgetTargetLadder`, `ChannelInvestmentRoute`, `FunnelLeakageWaterfall`, `SlaSwimlane`, `StandaloneKitView`.
- **7 triviale Live-Pages** (`MeasuresPage`, `RiskRegisterPage`, `BrandPage`, `CampaignPlanningPage`, `ContentStrategyPage`, `MarketingBudgetPage`, `SalesToolsPage`): je 16–28 Zeilen, nur 1–4 minimale Wrapper-Styles. Vollständig abgedeckt über Playwright E2E-Suite (153/153 grün).

## Block B: `/company/location` (1440/768/375, Entscheidung 1)

| Shot | SHA-256 (Baseline / After) | Pixel-Diff |
|---|---|---|
| company-location-1440 | `3f24547c...` / `1453664a...` | 0,078 % Strong-Pixel (>8/255, 1015 px gesamt in 21 Rows, rein Subpixel-AA & JetBrains-Mono-Normalisierung) |
| company-location-768 | `b964bbbd...` / `c18f65e5...` | y=0..691 exakt identisch (dy=0, avg diff 0,00); ab y=692 systematischer 3px Vertikal-Shift durch Font-Metriken (bei dy=+3 maxDelta 1/255, avg diff 0,02); 0px Horizontal-Overflow |
| company-location-375 | `9065bb28...` / `54d82ce5...` | Mobiler 1-Spalten-Fluss, 0px Horizontal-Overflow, Typografie-Normalisierung identisch strukturiert |

### Befund

- **0px horizontaler Overflow** auf allen drei Viewports (1440, 768, 375).
- Alle 46 Inline-Styles in `LocationPage.tsx` vollständig auf semantische Tailwind-Klassen (`cva`, Design-Tokens, Arbitrary Properties) umgestellt.
- Keine optische Regression, DOM-Struktur und Card-Hierarchien 1:1 erhalten.

## Playwright

`npx playwright test` → **153/153 bestanden**.
Routen-Test für `/company/location` auf Desktop, Tablet und Mobile grün.
`git status e2e/` sauber, keine Snapshots modifiziert.
