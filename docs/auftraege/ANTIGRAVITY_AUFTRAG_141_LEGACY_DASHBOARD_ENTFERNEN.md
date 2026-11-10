# ANTIGRAVITY_AUFTRAG_141 — Legacy-Dashboard entfernen

> Quelle: `docs/superpowers/plans/2026-11-09-crm-verbindlichkeit-v3-1-plan.md`, Teil-Auftrag 141.
> Plan in Kraft seit Auftrag 136; seriell nach 140, ein PR, aufbauend auf `main`.

## Ziel

Das alte Executive Dashboard (Executive Cockpit V2 mit `LivePerformanceSection`)
entfällt ersatzlos. Die persönliche Ansicht ist seit Auftrag 079 Standard; der
Build-Schalter `VITE_EXECUTIVE_DASHBOARD_V2` und die Rollback-Logik werden
e entfernt. Rückweg ist künftig der Tag `v3.0.0` (steht im PR und in den
Release Notes von v3.1.0).

## Dateien

- Löschen: `src/features/overview/pages/ExecutiveDashboardPage.tsx`,
  `src/components/executiveCockpit/**` (soweit nach `git grep` unbenutzt),
  `e2e/dashboard-rollback.spec.ts`, zugehörige Tests
- Ändern: `src/features/dashboard/model/dashboardRollout.ts`,
  `src/features/dashboard/pages/executiveDashboardEntry.ts`,
  `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/routePages.tsx`,
  `src/features/overview/OverviewView.tsx`, `src/vite-env.d.ts`,
  `.env.example`, `.github/workflows/ci.yml`, `docs/dashboard/` soweit dort
  der Schalter beschrieben ist

## Entscheidungen (aus dem Plan)

- `isPersonalDashboardEnabled` und `VITE_EXECUTIVE_DASHBOARD_V2` entfallen
  ersatzlos. `DASHBOARD_PATH`, `TILE_DETAIL_*`, `tileDetailPath`,
  `tileIdFromPath` bleiben.
- `src/domain/executiveCockpitData` bleibt, weil das neue Dashboard es nutzt.
- `ci.yml`: Rückschalt-Build, Rollback-Spec und der anschließende
  Lighthouse-Neubau entfallen; die Lighthouse-Prüfung läuft auf dem
  regulären Build.
- Rückweg ist ab jetzt der Tag `v3.0.0`.

## Abnahmekriterien

- `git grep -E 'EXECUTIVE_DASHBOARD_V2|isPersonalDashboardEnabled|ExecutiveCockpit\b'`
  ist in `src/`, `e2e/`, `.github/`, `.env.example` leer.
- `/dashboard` und `/dashboard/tiles/:tileId` laufen über die bestehenden
  E2E-Specs. `npx size-limit` grün.
- Verifikation CLAUDE.md §7, Screenshot-Matrix, PR. Kein Merge — das macht Marc.
