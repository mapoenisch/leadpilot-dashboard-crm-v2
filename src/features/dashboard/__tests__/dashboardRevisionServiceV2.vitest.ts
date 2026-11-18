import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDashboardV2,
  resetInMemoryDashboardV2Storage,
  saveDashboardV2,
} from '../services/dashboardStorageV2';
import {
  getDashboardV2RevisionDetail,
  getDashboardV2Revisions,
  listDashboardV2RevisionsPage,
  restoreDashboardV2Revision,
} from '../services/dashboardRevisionServiceV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('dashboardRevisionServiceV2', () => {
  beforeEach(() => {
    resetInMemoryDashboardV2Storage();
  });

  const makeConfig = (id = 'dash_rev_svc_1', title = 'Revision Test'): DashboardConfigV2 => ({
    version: 2,
    id,
    title,
    scope: 'personal',
    ownerUserId: 'usr_me',
    organizationId: 'org_main',
    globalTimeframe: 'letzte_30_tage',
    tiles: [
      {
        id: 'tile_arr',
        catalogId: 'baseline.arr',
        title: 'ARR',
        presentation: 'zahl',
        layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
      },
    ],
  });

  it('listDashboardV2RevisionsPage liefert Paging und Autoren-Informationen', async () => {
    const config = makeConfig();
    await createDashboardV2({ title: config.title, config });

    // Speichere 3 weitere Revisionen
    for (let i = 2; i <= 4; i++) {
      await saveDashboardV2({
        dashboardId: config.id,
        expectedRevision: i - 1,
        title: `Revision ${i}`,
        config: { ...config, title: `Revision ${i}` },
        changeSummary: `Änderung ${i}`,
      });
    }

    // 1. Erste Seite mit Limit 2
    const page1 = await listDashboardV2RevisionsPage({
      dashboardId: config.id,
      limit: 2,
    });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;

    expect(page1.value.length).toBe(2);
    expect(page1.value[0]?.revision).toBe(4);
    expect(page1.value[0]?.createdByIsSelf).toBe(true);
    expect(page1.value[0]?.createdByName).toBe('Du (Demo)');
    expect(page1.value[0]?.createdByActive).toBe(true);
    expect(page1.value[1]?.revision).toBe(3);

    // 2. Zweite Seite mit beforeRevision = 3
    const page2 = await listDashboardV2RevisionsPage({
      dashboardId: config.id,
      beforeRevision: 3,
      limit: 2,
    });
    expect(page2.ok).toBe(true);
    if (!page2.ok) return;

    expect(page2.value.length).toBe(2);
    expect(page2.value[0]?.revision).toBe(2);
    expect(page2.value[1]?.revision).toBe(1);

    // 3. Ungültiges Limit
    const invalidLimit = await listDashboardV2RevisionsPage({
      dashboardId: config.id,
      limit: 0,
    });
    expect(invalidLimit.ok).toBe(false);
    if (!invalidLimit.ok) expect(invalidLimit.error.kind).toBe('ungueltig');
  });

  it('getDashboardV2RevisionDetail liefert die vollständige Konfiguration der Revision', async () => {
    const config = makeConfig();
    await createDashboardV2({ title: config.title, config });

    const updatedConfig: DashboardConfigV2 = {
      ...config,
      title: 'Zweiter Stand mit Umsatz',
      tiles: [
        ...config.tiles,
        {
          id: 'tile_umsatz',
          catalogId: 'baseline.umsatz',
          title: 'Umsatz',
          presentation: 'zahl',
          layouts: { desktop: { x: 3, y: 0, w: 3, h: 3 } },
        },
      ],
    };
    await saveDashboardV2({
      dashboardId: config.id,
      expectedRevision: 1,
      title: updatedConfig.title,
      config: updatedConfig,
      changeSummary: 'Umsatz ergänzt',
    });

    // Detail Revision 1
    const detailRev1 = await getDashboardV2RevisionDetail({
      dashboardId: config.id,
      revision: 1,
    });
    expect(detailRev1.ok).toBe(true);
    if (!detailRev1.ok) return;
    expect(detailRev1.value.revision).toBe(1);
    expect(detailRev1.value.title).toBe('Revision Test');
    expect(detailRev1.value.config.tiles.length).toBe(1);

    // Detail Revision 2
    const detailRev2 = await getDashboardV2RevisionDetail({
      dashboardId: config.id,
      revision: 2,
    });
    expect(detailRev2.ok).toBe(true);
    if (!detailRev2.ok) return;
    expect(detailRev2.value.revision).toBe(2);
    expect(detailRev2.value.title).toBe('Zweiter Stand mit Umsatz');
    expect(detailRev2.value.config.tiles.length).toBe(2);

    // Unbekannte Revision
    const notFoundRev = await getDashboardV2RevisionDetail({
      dashboardId: config.id,
      revision: 99,
    });
    expect(notFoundRev.ok).toBe(false);
    if (!notFoundRev.ok) expect(notFoundRev.error.kind).toBe('nicht_gefunden');
  });

  it('restoreDashboardV2Revision stellt Konfiguration der Zielrevision als neue Revision her', async () => {
    const config = makeConfig();
    await createDashboardV2({ title: config.title, config });

    const updatedConfig: DashboardConfigV2 = {
      ...config,
      title: 'Revision 2',
      tiles: [
        ...config.tiles,
        {
          id: 'tile_umsatz',
          catalogId: 'baseline.umsatz',
          title: 'Umsatz',
          presentation: 'zahl',
          layouts: { desktop: { x: 3, y: 0, w: 3, h: 3 } },
        },
      ],
    };
    await saveDashboardV2({
      dashboardId: config.id,
      expectedRevision: 1,
      title: updatedConfig.title,
      config: updatedConfig,
    });

    const restoreRes = await restoreDashboardV2Revision({
      dashboardId: config.id,
      targetRevision: 1,
      expectedRevision: 2,
    });
    expect(restoreRes.ok).toBe(true);
    if (!restoreRes.ok) return;
    expect(restoreRes.value.revision).toBe(3);

    const revs = await getDashboardV2Revisions(config.id);
    expect(revs.ok).toBe(true);
    if (!revs.ok) return;
    expect(revs.value[0]?.changeSummary).toBe('Wiederherstellung von Revision 1');
  });
});
