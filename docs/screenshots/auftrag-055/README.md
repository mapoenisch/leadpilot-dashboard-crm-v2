# Auftrag 055 — Screenshot-Matrix (G39 Welle 2)

Baseline: `238e313` (isolierter `git worktree`, identische Deps per
Symlink, eigener Build) vs. Nachher (Block-E-Stand). Harness
`scripts/captureGateScreenshots.mjs` (`vite preview`, reducedMotion
+ fonts.ready + 1000 ms Settle). Vergleich per `shasum -a 256`;
Abweichungen per PIL-Pixel-Diff (Strong-Pixel > 8/255 + max.
Kanal-Delta). Kein Bild inhaltlich geöffnet.

## CRM-Routen (Block B, live migriert): 12 Paare

| Shot | SHA-256 | Pixel-Diff |
|---|---|---|
| crm-activities-1440 | **GLEICH** | — |
| crm-activities-768 | **GLEICH** | — |
| crm-activities-375 | abweichend | maxDelta **1/255**, 0 starke Pixel (AA-Teppich) |
| crm-companies-1440/768/375 | **GLEICH** | — |
| crm-deals-1440/768/375 | **GLEICH** | — |
| crm-leads-1440 | **GLEICH** | — |
| crm-leads-768 | abweichend | maxDelta **2/255**, 0 starke Pixel (3-px-Teppich) |
| crm-leads-375 | **GLEICH** | — |

**9/12 byte-identisch**, 3× reines Sub-Pixel-AA (0 starke Pixel).
Keine visuelle Regression in Block B.

## Blöcke C/D/E: keine live Routen

Per Suche belegt: **kein** Konsument außerhalb der eigenen
Verzeichnisse (`CapitalCut`, `SaasMotor`, `RevenueCostShoreline`,
`SegmentFields`, `CustomerPortfolio`, `IcpFitMap`, `PersonaDossier`,
`RevenueStaircase`, `VolkerDayTimeline`, `DecisionTopology`,
`MarketOpportunityStack`, `SwotCompass`, `BudgetPage`,
`GenericDocView`, `BmcPage`, `BusinessLogicPage`,
`CustomerSuccessPage`, `EmpathyPage`) — ungenutzte
Facelift-Komponenten, analog zu den G38-Primitives vor deren
Migration. Keine sichtbare Änderung möglich; kein Screenshot nötig.

## `/dashboard`: Block-A-Folge (belegt, Snapshots NICHT angefasst)

Der beauftragte `Card`-Fix (className-Merge statt Überschreiben)
ändert 5 LiveKpi-Cards: vorher `class="live-performance-panel"`
(padding 0 px, cva verworfen), nachher cva-glass + Panel gemerged
(padding 20 px, DOM-gemessen). Hintergrund gleich (Panel
`!important`). Folge: kleinere Recharts-Plots → flächige Diffs
(1440: 98430 starke Pixel ab y=288 = Live-Sektion; 768: 55794;
375: 11524). Betroffen nur `/dashboard` (alle 3 Viewports);
übrige 4 `visual.spec.ts`-Routen grün. Playwright daher
**150/153**; Snapshots bewusst nicht aktualisiert
(Prüfer-Entscheidung nach 054-Lehre). Option für den Prüfer:
`padding="0"` an den 5 Cards (Card-API, keine 054-Datei nötig —
liegt aber außerhalb der Welle-2-Tabelle, daher nicht
eigenmächtig umgesetzt).

## `/design-system`-Galerie (Block-A-Kontrolle)

Byte-identisch Block-A-Stand vs. Block-E-Stand
(`8dcb1c96b617` beidseitig): Primitives-Konsumenten pixelgleich.
(Der Card-Titel-Artefakt gegen die Welle-1-Galerie — 3300 px,
max 15/255, nur Titelzeile — liegt vor Block A und ist kein
055-Effekt; A-vs-A2-Repro war byte-identisch.)
