// Executive Dashboard V2 (Auftrag 173 / P16a §2.3):
// Vorschau `?bereich=umstellung`: Admin-Ansicht „Umstellung vorbereiten“ mit Beispieldaten
// für alle fünf Ergebnisklassen. Kein Server, In-Memory-Dienst mit denselben Regeln.

import { useMemo } from 'react';
import { RolloutPrepPage } from '@/features/admin/pages/RolloutPrepPage';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import type { DashboardConfig } from '../model/dashboardConfig';
import type { RolloutReconciliationRow } from '../model/dashboardRolloutReconciliation';
import { createInMemoryRolloutService } from '../services/dashboardRolloutService';

const ORG = 'preview-org';
const DAY = 86_400_000;

function iso(daysAgo: number): string {
  return new Date(Date.UTC(2026, 10, 20, 9, 30) - daysAgo * DAY).toISOString();
}

function v2From(config: DashboardConfig, userId: string, lastRev: number) {
  return migrateV1ToV2(config, {
    id: `dash-${userId}`,
    title: 'Executive Dashboard',
    ownerUserId: userId,
    organizationId: ORG,
    lastMigratedRevision: lastRev,
  });
}

/** V1-Stand mit einer zusätzlichen Kachel und getauschter Reihenfolge. */
function changedV1(): DashboardConfig {
  const tiles = [...DEFAULT_DASHBOARD_CONFIG.tiles];
  const first = tiles.shift();
  const extra = first ? { ...first, tileId: 'tile-extra-v1', size: 'voll' as const } : undefined;
  return {
    ...DEFAULT_DASHBOARD_CONFIG,
    tiles: [...tiles, ...(first ? [first] : []), ...(extra ? [extra] : [])].slice(0, 24),
  };
}

function baseRow(
  partial: Partial<RolloutReconciliationRow> & { userId: string },
): RolloutReconciliationRow {
  return {
    email: null,
    orgRole: 'viewer',
    orgStatus: 'active',
    v1Revision: null,
    v1UpdatedAt: null,
    v1Config: null,
    v2DashboardId: null,
    v2Revision: null,
    v2UpdatedAt: null,
    v2Config: null,
    lastMigratedRevision: null,
    v2BaseRevision: 1,
    klasse: 'gleich',
    entscheidung: null,
    entscheidungV1Revision: null,
    entscheidungV2Revision: null,
    entschiedenAt: null,
    entschiedenVonEmail: null,
    entscheidungGueltig: null,
    ...partial,
  };
}

export function buildRolloutPreviewRows(): RolloutReconciliationRow[] {
  const changed = changedV1();
  return [
    baseRow({
      userId: 'u-gleich',
      email: 'anna.gleich@leadpilot.example',
      orgRole: 'manager',
      v1Revision: 3,
      v1UpdatedAt: iso(9),
      v1Config: DEFAULT_DASHBOARD_CONFIG,
      v2DashboardId: 'dash-u-gleich',
      v2Revision: 4,
      v2UpdatedAt: iso(1),
      v2Config: v2From(DEFAULT_DASHBOARD_CONFIG, 'u-gleich', 3),
      lastMigratedRevision: 3,
      klasse: 'gleich',
    }),
    baseRow({
      userId: 'u-v1',
      email: 'ben.altereditor@leadpilot.example',
      v1Revision: 5,
      v1UpdatedAt: iso(2),
      v1Config: changed,
      v2DashboardId: 'dash-u-v1',
      v2Revision: 1,
      v2UpdatedAt: iso(8),
      v2Config: v2From(DEFAULT_DASHBOARD_CONFIG, 'u-v1', 2),
      lastMigratedRevision: 2,
      klasse: 'v1_geaendert',
    }),
    baseRow({
      userId: 'u-beide',
      email: 'carla.beide-mit-sehr-langem-namen@leadpilot.example',
      orgRole: 'manager',
      v1Revision: 4,
      v1UpdatedAt: iso(3),
      v1Config: changed,
      v2DashboardId: 'dash-u-beide',
      v2Revision: 3,
      v2UpdatedAt: iso(1),
      v2Config: v2From(DEFAULT_DASHBOARD_CONFIG, 'u-beide', 1),
      lastMigratedRevision: 1,
      klasse: 'beide_geaendert',
      entscheidung: 'v2_behalten',
      entscheidungV1Revision: 3,
      entscheidungV2Revision: 3,
      entschiedenAt: iso(4),
      entschiedenVonEmail: 'admin@leadpilot.example',
      entscheidungGueltig: false,
    }),
    baseRow({
      userId: 'u-ohne',
      email: 'dora.ohnekopie@leadpilot.example',
      v1Revision: 2,
      v1UpdatedAt: iso(20),
      v1Config: DEFAULT_DASHBOARD_CONFIG,
      klasse: 'keine_kopie',
    }),
    baseRow({
      userId: 'u-nurv2',
      email: 'emil.neu@leadpilot.example',
      v2DashboardId: 'dash-u-nurv2',
      v2Revision: 2,
      v2UpdatedAt: iso(1),
      v2Config: v2From(DEFAULT_DASHBOARD_CONFIG, 'u-nurv2', 0),
      lastMigratedRevision: 0,
      klasse: 'nur_v2',
    }),
  ];
}

export function RolloutPrepPreview() {
  const service = useMemo(() => createInMemoryRolloutService(buildRolloutPreviewRows()), []);
  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8 text-[var(--color-text)] sm:px-8">
      <h1 className="sr-only">Vorschau Umstellung vorbereiten</h1>
      <RolloutPrepPage service={service} previewAsAdmin />
    </main>
  );
}

export default RolloutPrepPreview;
