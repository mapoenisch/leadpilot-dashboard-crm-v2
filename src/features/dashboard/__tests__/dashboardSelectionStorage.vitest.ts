import { beforeEach, describe, expect, it } from 'vitest';
import {
  classifyDashboardV2Error,
  type DashboardV2StorageError,
} from '../services/dashboardStorageV2Types';
import {
  inMemoryStore,
  resetInMemoryDashboardV2Storage,
} from '../services/dashboardInMemoryStoreV2';
import { createDashboardV2 } from '../services/dashboardStorageV2';
import {
  deletePersonalDashboardV2,
  duplicatePersonalDashboardV2,
  listPersonalDashboardsV2,
} from '../services/dashboardSelectionV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('Auftrag 158: dashboardSelectionStorage (In-Memory & Adapter)', () => {
  const sampleConfig: DashboardConfigV2 = {
    version: 2,
    id: 'dash_1',
    title: 'Test Dashboard 1',
    scope: 'personal',
    ownerUserId: 'usr_1',
    organizationId: 'org_1',
    globalTimeframe: 'aktuell',
    tiles: [
      {
        id: 't1',
        catalogId: 'baseline.arr',
        title: 'ARR',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 0, y: 0, w: 3, h: 3 },
        },
      },
      {
        id: 't2',
        catalogId: 'crm.pipeline_deals',
        title: 'Deals',
        presentation: 'zahl',
        layouts: {
          desktop: { x: 3, y: 0, w: 3, h: 3 },
        },
      },
    ],
    sections: [
      {
        id: 's1',
        title: 'Finanzen',
        collapsed: false,
        tileIds: ['t1', 't2'],
      },
    ],
  };

  beforeEach(() => {
    resetInMemoryDashboardV2Storage();
  });

  describe('Fehlerklassifizierung (classifyDashboardV2Error)', () => {
    const errorCases: Array<{
      input: { message?: string; code?: string; details?: string };
      status?: number;
      expectedKind: DashboardV2StorageError['kind'];
    }> = [
      { input: { message: 'LP_LAST_DASHBOARD: cannot delete last' }, expectedKind: 'letztes_dashboard' },
      { input: { message: 'LP_DASHBOARD_LIMIT: maximum 20' }, expectedKind: 'obergrenze_erreicht' },
      { input: { message: 'LP_DASHBOARD_CONFLICT: revision mismatch' }, expectedKind: 'konflikt' },
      { input: { message: 'LP_DASHBOARD_INVALID: bad schema' }, expectedKind: 'ungueltig' },
      { input: { message: 'LP_DASHBOARD_NOT_FOUND' }, expectedKind: 'nicht_gefunden' },
      { input: { message: 'LP_REVISION_NOT_FOUND' }, expectedKind: 'nicht_gefunden' },
      { input: { message: 'LP_FORBIDDEN' }, expectedKind: 'nicht_berechtigt' },
      { input: { message: 'LP_AUTH_REQUIRED' }, expectedKind: 'keine_mitgliedschaft' },
      { input: { message: 'JWT expired' }, expectedKind: 'sitzung_abgelaufen' },
      { input: { code: 'PGRST301' }, expectedKind: 'sitzung_abgelaufen' },
      { input: {}, status: 401, expectedKind: 'sitzung_abgelaufen' },
      { input: { message: 'Connection refused' }, expectedKind: 'technisch' },
    ];

    it.each(errorCases)(
      'klassifiziert $input.message / code $input.code als $expectedKind',
      ({ input, status, expectedKind }) => {
        const classified = classifyDashboardV2Error(input, status);
        expect(classified.kind).toBe(expectedKind);
      },
    );
  });

  describe('listPersonalDashboardsV2 (In-Memory)', () => {
    it('liefert leere Liste wenn keine Dashboards existieren', async () => {
      const res = await listPersonalDashboardsV2();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toEqual([]);
      }
    });

    it('listet persönliche Dashboards mit Kachel- und Sektionszählern sortiert auf', async () => {
      await createDashboardV2({
        title: 'Dashboard A',
        config: sampleConfig,
      });

      // Zweites Dashboard anlegen
      const configB: DashboardConfigV2 = {
        ...sampleConfig,
        id: 'dash_2',
        title: 'Dashboard B',
        tiles: [],
        sections: undefined,
      };
      await createDashboardV2({
        title: 'Dashboard B',
        config: configB,
      });

      const res = await listPersonalDashboardsV2();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toHaveLength(2);
        // Neuestes zuerst (Dashboard B)
        expect(res.value[0]?.title).toBe('Dashboard B');
        expect(res.value[0]?.tileCount).toBe(0);
        expect(res.value[0]?.sectionCount).toBe(0);

        expect(res.value[1]?.title).toBe('Dashboard A');
        expect(res.value[1]?.tileCount).toBe(2);
        expect(res.value[1]?.sectionCount).toBe(1);
      }
    });
  });

  describe('deletePersonalDashboardV2 (In-Memory)', () => {
    it('verhindert das Löschen des letzten verbleibenden Dashboards', async () => {
      const created = await createDashboardV2({
        title: 'Einziges Dashboard',
        config: sampleConfig,
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const del = await deletePersonalDashboardV2({
        dashboardId: created.value.dashboardId,
        expectedRevision: 1,
      });

      expect(del.ok).toBe(false);
      if (!del.ok) {
        expect(del.error.kind).toBe('letztes_dashboard');
      }
    });

    it('erkennt Revisionskonflikte beim Löschen', async () => {
      const d1 = await createDashboardV2({ title: 'D1', config: sampleConfig });
      const d2 = await createDashboardV2({ title: 'D2', config: sampleConfig });
      if (!d1.ok || !d2.ok) return;

      const del = await deletePersonalDashboardV2({
        dashboardId: d2.value.dashboardId,
        expectedRevision: 99,
      });

      expect(del.ok).toBe(false);
      if (!del.ok) {
        expect(del.error.kind).toBe('konflikt');
      }
    });

    it('löscht Dashboard bei passender Revision und liefert nextDashboardId', async () => {
      const d1 = await createDashboardV2({ title: 'D1', config: sampleConfig });
      const d2 = await createDashboardV2({ title: 'D2', config: sampleConfig });
      if (!d1.ok || !d2.ok) return;

      const del = await deletePersonalDashboardV2({
        dashboardId: d2.value.dashboardId,
        expectedRevision: 1,
      });

      expect(del.ok).toBe(true);
      if (del.ok) {
        expect(del.value.deletedId).toBe(d2.value.dashboardId);
        expect(del.value.nextDashboardId).toBe(d1.value.dashboardId);
      }

      expect(inMemoryStore.has(d2.value.dashboardId)).toBe(false);
    });
  });

  describe('duplicatePersonalDashboardV2 (In-Memory)', () => {
    it('validiert Titellänge auf 1-80 Zeichen', async () => {
      const created = await createDashboardV2({ title: 'D1', config: sampleConfig });
      if (!created.ok) return;

      const tooLong = await duplicatePersonalDashboardV2({
        dashboardId: created.value.dashboardId,
        title: 'A'.repeat(81),
      });
      expect(tooLong.ok).toBe(false);
      if (!tooLong.ok) {
        expect(tooLong.error.kind).toBe('ungueltig');
      }

      const empty = await duplicatePersonalDashboardV2({
        dashboardId: created.value.dashboardId,
        title: '   ',
      });
      expect(empty.ok).toBe(false);
      if (!empty.ok) {
        expect(empty.error.kind).toBe('ungueltig');
      }
    });

    it('dupliziert Dashboard mit Revision 1 und Revisionshistorie', async () => {
      const created = await createDashboardV2({ title: 'Original', config: sampleConfig });
      if (!created.ok) return;

      const dup = await duplicatePersonalDashboardV2({
        dashboardId: created.value.dashboardId,
        title: 'Original Kopie',
      });

      expect(dup.ok).toBe(true);
      if (dup.ok) {
        expect(dup.value.revision).toBe(1);
        const stored = inMemoryStore.get(dup.value.dashboardId);
        expect(stored).toBeDefined();
        expect(stored?.row.title).toBe('Original Kopie');
        expect(stored?.row.config.tiles.map((t) => t.id)).toEqual(
          sampleConfig.tiles.map((t) => t.id),
        );
        expect(stored?.row.config.sections).toEqual(sampleConfig.sections);
        expect(stored?.revisions[0]?.changeSummary).toBe('Dupliziert aus „Original“');
      }
    });

    it('wirft obergrenze_erreicht bei 20 Dashboards', async () => {
      // 1 initial anlegen
      const first = await createDashboardV2({ title: 'D1', config: sampleConfig });
      if (!first.ok) return;

      // 19 weitere duplizieren bis 20 voll
      for (let i = 2; i <= 20; i++) {
        const d = await duplicatePersonalDashboardV2({
          dashboardId: first.value.dashboardId,
          title: `D ${i}`,
        });
        expect(d.ok).toBe(true);
      }

      expect(inMemoryStore.size).toBe(20);

      // 21. Duplizieren scheitert
      const dup21 = await duplicatePersonalDashboardV2({
        dashboardId: first.value.dashboardId,
        title: 'D 21',
      });
      expect(dup21.ok).toBe(false);
      if (!dup21.ok) {
        expect(dup21.error.kind).toBe('obergrenze_erreicht');
      }

      // 21. Anlegen scheitert ebenfalls
      const create21 = await createDashboardV2({
        title: 'D 21 New',
        config: sampleConfig,
      });
      expect(create21.ok).toBe(false);
      if (!create21.ok) {
        expect(create21.error.kind).toBe('obergrenze_erreicht');
      }
    });
  });
});
