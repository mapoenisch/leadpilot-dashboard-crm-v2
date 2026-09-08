# V2.1.0 Live Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the verified, responsive Live-Performance surface on `/dashboard` from real Ebene-C events without mixing them with baseline or simulation data.

**Architecture:** The existing generic `live-kpi-event/v1` contract and secure public projection remain the transport boundary. A central catalog defines the twelve UI-supported KPI IDs; a ref-counted stream store exposes snapshot, bounded history and safe activity selectors, which isolated cards and charts consume independently.

**Tech Stack:** React 18, TypeScript, Supabase Realtime, n8n, Framer Motion, Recharts, existing LeadPilot tokens and `MANAGEMENT_CHART_THEME`.

**Spec:** `docs/superpowers/specs/2026-09-08-v2-1-live-performance-design.md`

## Global Constraints

- Ebene A remains historical and read-only; Ebene B remains deterministic; only accepted Ebene-C events are displayed here.
- No browser writes, raw-event reads, raw-context exposure, HubSpot runtime access, fake UI values, global Context/Redux store or new npm dependency.
- Keep `src/simulation/**`, `src/types/**`, `src/context/**`, `src/services/data/**`, `src/features/resources/**`, RNG/run/version behavior and CRM write paths unchanged.
- `live_kpi_public_feed` remains the sole browser-visible table and `live-kpi-event/v1` remains backward compatible and generic.
- Count-up and chart transition take at most 220 ms; the cyan data pulse takes 1.2 s; all three are disabled by `prefers-reduced-motion: reduce`.
- Every visible task proves `/dashboard` Deep-Link and Reload at 1440, 768 and 375 px, has 0 px horizontal overflow, and records a screenshot hash matrix.

---

### Task 1: Auftrag 040 – Live-KPI-Katalog und Multi-KPI-Eventpfad (G24)

**Files:**
- Create: `src/services/liveKpi/liveKpiDefinitions.ts`
- Create: `scripts/verifyLiveKpiCatalog.ts`
- Modify: `tools/n8n/live-kpi-replay.fixture.json`
- Modify: `tools/n8n/README.md`
- Create: `docs/auftraege/ANTIGRAVITY_AUFTRAG_040_LIVE_KPI_KATALOG_MULTI_KPI_PIPELINE.md`
- Modify: `docs/BUILD_LOG.md` (only the final builder report)

**Interfaces:**
- Consumes: `live-kpi-event/v1`, `validateLiveKpiEvent()`, existing generic n8n ingest workflow and `live_kpi_public_feed`.
- Produces: `LiveKpiDefinition`, `LiveKpiId`, `LIVE_KPI_DEFINITIONS`, `LIVE_KPI_IDS`, `isSupportedLiveKpiId()` and `getLiveKpiDefinition()` for later hooks/UI.

- [ ] **Step 1: Write the failing catalog verifier**

Create `scripts/verifyLiveKpiCatalog.ts`. It must import `LIVE_KPI_DEFINITIONS`, load the replay fixture, and assert exactly these ID/unit pairs:

```ts
const expected = [
  ['arr', 'EUR'], ['mrr', 'EUR'], ['pipeline_coverage', 'x'],
  ['arr_direct', 'EUR'], ['arr_partner', 'EUR'], ['arr_outbound', 'EUR'], ['arr_other', 'EUR'],
  ['pipeline_leads', 'count'], ['pipeline_mql', 'count'], ['pipeline_sql', 'count'],
  ['pipeline_offers', 'count'], ['pipeline_won', 'count'],
] as const;
```

Also assert: no duplicate ID, each fixture validates with `validateLiveKpiEvent`, each fixture is marked synthetic in `context`, and the catalog does not expose `sourceReference`, `correlationId` or arbitrary event context.

- [ ] **Step 2: Run the verifier and confirm the red state**

Run: `npx tsx scripts/verifyLiveKpiCatalog.ts`
Expected: TypeScript module-resolution failure because `liveKpiDefinitions.ts` does not yet exist.

- [ ] **Step 3: Implement the immutable display catalog**

Create `src/services/liveKpi/liveKpiDefinitions.ts` with only display-safe fields and the exact groups `core`, `arr_mix`, `funnel`:

```ts
export type LiveKpiFormat = 'currency' | 'ratio' | 'count';
export type LiveKpiGroup = 'core' | 'arr_mix' | 'funnel';
export interface LiveKpiDefinition { id: string; label: string; unit: 'EUR' | 'x' | 'count'; format: LiveKpiFormat; group: LiveKpiGroup; }
export const LIVE_KPI_DEFINITIONS = [
  { id: 'arr', label: 'Live ARR', unit: 'EUR', format: 'currency', group: 'core' },
  { id: 'mrr', label: 'Live MRR', unit: 'EUR', format: 'currency', group: 'core' },
  { id: 'pipeline_coverage', label: 'Pipeline Coverage', unit: 'x', format: 'ratio', group: 'core' },
  { id: 'arr_direct', label: 'ARR Direct', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'arr_partner', label: 'ARR Partner', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'arr_outbound', label: 'ARR Outbound', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'arr_other', label: 'ARR Sonstige', unit: 'EUR', format: 'currency', group: 'arr_mix' },
  { id: 'pipeline_leads', label: 'Pipeline Leads', unit: 'count', format: 'count', group: 'funnel' },
  { id: 'pipeline_mql', label: 'Pipeline MQL', unit: 'count', format: 'count', group: 'funnel' },
  { id: 'pipeline_sql', label: 'Pipeline SQL', unit: 'count', format: 'count', group: 'funnel' },
  { id: 'pipeline_offers', label: 'Pipeline Angebote', unit: 'count', format: 'count', group: 'funnel' },
  { id: 'pipeline_won', label: 'Pipeline Won', unit: 'count', format: 'count', group: 'funnel' },
] as const satisfies readonly LiveKpiDefinition[];
export type LiveKpiId = (typeof LIVE_KPI_DEFINITIONS)[number]['id'];
export const LIVE_KPI_IDS = new Set<string>(LIVE_KPI_DEFINITIONS.map(({ id }) => id));
export const isSupportedLiveKpiId = (id: string): id is LiveKpiId => LIVE_KPI_IDS.has(id);
export const getLiveKpiDefinition = (id: string) => LIVE_KPI_DEFINITIONS.find((definition) => definition.id === id);
```

The generic V1 contract must not gain an allowlist and `src/types/liveKpi.ts` must not change.

- [ ] **Step 4: Add deterministic multi-KPI replay fixtures and operator mapping**

Add `fixtures.v21_catalog_events` as an object with all twelve IDs. Every payload uses `contractVersion: '1.0'`, `provenance: 'live'`, a unique `eventId`, an ISO timestamp including timezone, its canonical unit, a finite numeric value, and `context.isSyntheticTest: true`. Preserve every existing G18 fixture unchanged.

In `tools/n8n/README.md`, add a v2.1 table mapping each ID to its canonical unit and UI consumer. State explicitly that the current ingest workflow remains generic by design; upstream n8n producers may emit these twelve IDs, while the browser renders only catalog IDs. Document that fixtures are offline test data, not production values or a claim of an external successful run.

- [ ] **Step 5: Run focused and regression verification**

Run:

```bash
npx tsx scripts/verifyLiveKpiCatalog.ts
npx tsx scripts/verifyLiveKpiContract.ts
npx tsx scripts/verifyLiveKpiReadLayer.ts
npx tsx scripts/verifyLiveKpiE2e.ts
npx tsc --noEmit
npm run verify
npm run build
```

Expected: all local checks pass; any external runner remains transparently `SKIPPED_NOT_CONFIGURED` and is not claimed as passed.

- [ ] **Step 6: Record protection proof and commit**

Run:

```bash
git diff --check e1cedb6..HEAD
git diff --exit-code e1cedb6..HEAD -- src/simulation src/types src/context src/services/data src/services/db/supabaseClient.ts src/features/resources src/components src/hooks src/features/overview
```

Expected: both succeed. Add the prescribed G24 builder report to `docs/BUILD_LOG.md`, then commit only the target files with `feat(live): define v2.1 multi-kpi catalog`.

### Task 2: Auftrag 041 – Realtime-Historie und Stream-Isolierung (G25)

**Files:**
- Create: `src/services/liveKpi/liveKpiStreamStore.ts`
- Create: `src/hooks/useLiveKpiHistory.ts`
- Create: `src/hooks/useLiveKpiActivity.ts`
- Modify: `src/services/liveKpi/liveKpiReadAdapter.ts`
- Modify: `src/hooks/useLiveKpi.ts`
- Create: `scripts/verifyLiveKpiStream.ts`
- Create: `docs/auftraege/ANTIGRAVITY_AUFTRAG_041_REALTIME_HISTORIE_STREAM_ISOLIERUNG.md`
- Modify: `docs/BUILD_LOG.md` (only the final builder report)

**Interfaces:**
- Consumes: Task-1 catalog functions and `LiveKpiSnapshot` / `LiveKpiReadStatus`.
- Produces: `fetchLiveKpiHistory(kpiId, sinceIso, limit)`, a ref-counted per-ID stream store, `useLiveKpiHistory()` and `useLiveKpiActivity()`.

- [ ] **Step 1: Write the failing stream verifier**

Use a fake adapter/subscription and prove all of: one shared channel for two subscribers to `arr`; oldest items removed beyond the 30-point limit; events with an older `(occurredAt, ingestedAt)` pair do not replace the latest snapshot; release removes a channel once ref-count reaches zero; activity returns no fields absent from `LiveKpiSnapshot`.

- [ ] **Step 2: Extend only the safe adapter read surface**

Add `fetchLiveKpiHistory(kpiId, sinceIso, limit)` to query only the public projection, with `kpi_id` equality, `occurred_at >= sinceIso`, ordering `occurred_at ASC, ingested_at ASC` and an upper bound of 30. It returns `LiveKpiSnapshot[]`; it never selects `context`, `event_id` or `correlation_id`.

- [ ] **Step 3: Implement store and selector hooks**

`liveKpiStreamStore.ts` owns the channel and exposes subscribe/release selectors. `useLiveKpi` becomes a compatibility wrapper for the current snapshot/status; history and activity hooks select only their data. No page-level state or provider may subscribe to live data.

- [ ] **Step 4: Verify lifecycle and protected areas**

Run the new verifier plus G18–G20 preflights, TypeScript, integrity suite and build. Diff against the G25 baseline must prove unchanged simulation, types, context, data services, Supabase client, resources and CRM paths. Commit after a G25 builder report.

### Task 3: Auftrag 042 – Live Performance Surface (G26)

**Files:**
- Create: `src/components/liveKpi/LivePerformanceSection.tsx`
- Create: `src/components/liveKpi/StreamingAreaChart.tsx`
- Create: `src/components/liveKpi/LiveArrMixDonut.tsx`
- Create: `src/components/liveKpi/LiveFunnelBarChart.tsx`
- Create: `src/components/liveKpi/LiveActivityFeed.tsx`
- Modify: `src/components/liveKpi/LiveKpiCard.tsx`
- Modify: `src/components/liveKpi/AnimatedKpiValue.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/features/overview/pages/ExecutiveDashboardPage.tsx`
- Create: `scripts/verifyLivePerformanceSurface.ts`
- Create: `scripts/captureAuftrag042GateScreenshots.mjs`
- Create: `scripts/generateAuftrag042ScreenshotMatrix.mjs`
- Create: `docs/screenshots/auftrag-042/README.md`
- Create: `docs/auftraege/ANTIGRAVITY_AUFTRAG_042_LIVE_PERFORMANCE_SURFACE.md`
- Modify: `docs/BUILD_LOG.md` (only the final builder report)

**Interfaces:**
- Consumes: Task-1 catalog and Task-2 selector hooks.
- Produces: the confirmed 12-column desktop layout and responsive stacked layout on `/dashboard`.

- [ ] **Step 1: Write visual/a11y verifier before UI code**

Assert exact data test IDs for three cards, streaming chart, ring chart, bar chart and activity feed; one use each of `arr`, `mrr`, `pipeline_coverage`; no direct Supabase imports outside the adapter; no static numeric fallback; no motion node when reduced motion is active.

- [ ] **Step 2: Build isolated cards and motion**

Keep `LiveKpiCard` memoized. Add the CSS-only 1.2-second `live-kpi-pulse` class using `#00f2fe`; apply it only after a real accepted snapshot change. Preserve 220-ms count-up and screen-reader final-value semantics.

- [ ] **Step 3: Build the three chart components**

Use existing Recharts and `MANAGEMENT_CHART_THEME`: a 30-point/30-minute cyan gradient area, a four-source ARR ring with explicit incomplete status, and five funnel bars with a text alternative. All labels, units and values derive from catalog/hook data.

- [ ] **Step 4: Compose and verify responsive live surface**

Place the 12-column section under the Executive Cockpit. At 768 and 375 px stack in sketch order. Capture before/after `/dashboard` Deep-Link and Reload screenshots at 1440/768/375 and prove no horizontal overflow, readable chart alternatives and unchanged protected paths. Commit after a G26 builder report.

### Task 4: Auftrag 043 – V2.1 Regression und Release (G27)

**Files:**
- Create: `docs/auftraege/ANTIGRAVITY_AUFTRAG_043_V2_1_REGRESSION_ACCESSIBILITY_RELEASE.md`
- Create: `docs/releases/V2.1.0.md`
- Modify: `package.json`
- Modify: `docs/BUILD_LOG.md`
- Modify: `docs/BUILD_PLAN_V2.1.0.md` (created by G27 if it does not already exist)
- Create: `scripts/verifyV21ReleaseReadiness.ts`

**Interfaces:**
- Consumes: approved G24–G26 reports and all existing release checks.
- Produces: version-consistent `v2.1.0` release readiness; no tag or push until the explicit release authorization.

- [ ] **Step 1: Write release audit first**

The audit must reject a mismatching package/release/tag version, missing G24–G26 evidence, missing visual component test IDs, non-green preflights, protected-path diff, and incomplete dashboard screenshot hashes.

- [ ] **Step 2: Update only release metadata after all gates are green**

Set package and release documentation to `2.1.0`; document the optional external E2E runner honestly. Do not create a tag, switch `main`, push or force-push in this task.

- [ ] **Step 3: Run the complete release proof and commit**

Run G18–G26 audits, `npx tsc --noEmit`, `npm run verify`, `npm run build`, screenshot matrix and release audit. Record the result, commit release metadata, then present the evidence for explicit merge/tag/push authorization.
