import { beforeEach, describe, expect, it } from 'vitest';
import {
  classifyDashboardV2Error,
  createDashboardV2,
  getDashboardV2Revisions,
  loadPersonalDashboardV2,
  resetInMemoryDashboardV2Storage,
  restoreDashboardV2Revision,
  saveDashboardV2,
} from '../services/dashboardStorageV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('dashboardStorageV2', () => {
  beforeEach(() => {
    resetInMemoryDashboardV2Storage();
  });

  const makeConfig = (id = 'dash_test_1', title = 'Test Dashboard'): DashboardConfigV2 => {
    return {
      version: 2,
      id,
      title,
      scope: 'personal',
      ownerUserId: 'usr_abc',
      organizationId: 'org_xyz',
      globalTimeframe: 'letzte_30_tage',
      tiles: [
        {
          id: 'tile_1',
          catalogId: 'baseline.arr',
          title: 'ARR',
          presentation: 'zahl',
          layouts: {
            desktop: { x: 0, y: 0, w: 3, h: 3 },
          },
        },
      ],
      metadata: {
        user_edited: false,
      },
    };
  };

  it('erstellt ein Dashboard atomar mit Revision 1 und initialem Revisionsprotokoll', async () => {
    const config = makeConfig();
    const createRes = await createDashboardV2({
      title: config.title,
      config,
      scope: 'personal',
    });

    expect(createRes.ok).toBe(true);
    if (!createRes.ok) return;

    expect(createRes.value.revision).toBe(1);
    expect(createRes.value.dashboardId).toBe(config.id);

    // Laden
    const loadRes = await loadPersonalDashboardV2();
    expect(loadRes.ok).toBe(true);
    if (!loadRes.ok) return;

    expect(loadRes.value).not.toBeNull();
    expect(loadRes.value?.id).toBe(config.id);
    expect(loadRes.value?.revision).toBe(1);
    expect(loadRes.value?.title).toBe('Test Dashboard');

    // Revisionshistorie
    const revsRes = await getDashboardV2Revisions(config.id);
    expect(revsRes.ok).toBe(true);
    if (!revsRes.ok) return;

    expect(revsRes.value.length).toBe(1);
    expect(revsRes.value[0]?.revision).toBe(1);
    expect(revsRes.value[0]?.changeSummary).toBe('Dashboard initial erstellt');
  });

  it('erhöht bei jedem erfolgreichen Speichern die Revision atomar', async () => {
    const config = makeConfig();
    await createDashboardV2({ title: config.title, config });

    const updatedConfig: DashboardConfigV2 = {
      ...config,
      title: 'Neuer Titel V2',
    };

    const saveRes = await saveDashboardV2({
      dashboardId: config.id,
      expectedRevision: 1,
      title: 'Neuer Titel V2',
      config: updatedConfig,
      changeSummary: 'Kachel hinzugefügt',
    });

    expect(saveRes.ok).toBe(true);
    if (!saveRes.ok) return;

    expect(saveRes.value.revision).toBe(2);

    const loadRes = await loadPersonalDashboardV2();
    expect(loadRes.ok).toBe(true);
    if (!loadRes.ok) return;
    expect(loadRes.value?.revision).toBe(2);
    expect(loadRes.value?.title).toBe('Neuer Titel V2');

    const revsRes = await getDashboardV2Revisions(config.id);
    expect(revsRes.ok).toBe(true);
    if (!revsRes.ok) return;
    expect(revsRes.value.length).toBe(2);
    expect(revsRes.value[0]?.revision).toBe(2);
    expect(revsRes.value[0]?.changeSummary).toBe('Kachel hinzugefügt');
    expect(revsRes.value[1]?.revision).toBe(1);
  });

  it('erkennt Revisionskonflikte und verhindert Lost Updates', async () => {
    const config = makeConfig();
    await createDashboardV2({ title: config.title, config });

    // Tab 1 speichert erfolgreich
    await saveDashboardV2({
      dashboardId: config.id,
      expectedRevision: 1,
      title: 'Änderung Tab 1',
      config: { ...config, title: 'Änderung Tab 1' },
    });

    // Tab 2 hat noch Revision 1 im Cache und versucht zu speichern
    const conflictRes = await saveDashboardV2({
      dashboardId: config.id,
      expectedRevision: 1, // Veraltet! Aktuell ist 2
      title: 'Änderung Tab 2',
      config: { ...config, title: 'Änderung Tab 2' },
    });

    expect(conflictRes.ok).toBe(false);
    if (conflictRes.ok) return;
    expect(conflictRes.error.kind).toBe('konflikt');
  });

  it('stellt frühere Revisionen wieder her und erzeugt neue Revision an der Spitze', async () => {
    const config = makeConfig();
    await createDashboardV2({ title: config.title, config });

    await saveDashboardV2({
      dashboardId: config.id,
      expectedRevision: 1,
      title: 'Revision 2 Titel',
      config: { ...config, title: 'Revision 2 Titel' },
    });

    // Rollback zu Revision 1
    const rollbackRes = await restoreDashboardV2Revision({
      dashboardId: config.id,
      targetRevision: 1,
      expectedRevision: 2,
    });

    expect(rollbackRes.ok).toBe(true);
    if (!rollbackRes.ok) return;

    expect(rollbackRes.value.revision).toBe(3);

    const revsRes = await getDashboardV2Revisions(config.id);
    expect(revsRes.ok).toBe(true);
    if (!revsRes.ok) return;

    expect(revsRes.value.length).toBe(3);
    expect(revsRes.value[0]?.revision).toBe(3);
    expect(revsRes.value[0]?.changeSummary).toContain('Wiederhergestellt von Revision 1');
  });

  it('weist ungültige Konfigurationen mit strukturiertem Fehler ab', async () => {
    const invalidConfig = {
      version: 2,
      id: 'dash_bad',
      title: '', // ungültig: leerer Titel
      scope: 'personal',
      ownerUserId: 'usr_1',
      organizationId: 'org_1',
      globalTimeframe: '30d',
      tiles: [],
    } as unknown as DashboardConfigV2;

    const res = await createDashboardV2({
      title: '',
      config: invalidConfig,
    });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.kind).toBe('ungueltig');
  });

  it('klassifiziert Datenbank- und PostgREST-Fehler präzise', () => {
    expect(classifyDashboardV2Error({ message: 'LP_DASHBOARD_CONFLICT: mismatch' }).kind).toBe(
      'konflikt',
    );
    expect(classifyDashboardV2Error({ message: 'LP_DASHBOARD_INVALID: bad json' }).kind).toBe(
      'ungueltig',
    );
    expect(classifyDashboardV2Error({ message: 'LP_DASHBOARD_NOT_FOUND' }).kind).toBe(
      'nicht_gefunden',
    );
    expect(classifyDashboardV2Error({ message: 'LP_FORBIDDEN' }).kind).toBe('nicht_berechtigt');
    expect(classifyDashboardV2Error({ message: 'LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11' }).kind).toBe(
      'nicht_berechtigt',
    );
    expect(classifyDashboardV2Error({ message: 'LP_AUTH_REQUIRED' }).kind).toBe(
      'keine_mitgliedschaft',
    );
    expect(classifyDashboardV2Error({ code: 'PGRST301' }).kind).toBe('sitzung_abgelaufen');
    expect(classifyDashboardV2Error({ message: 'Network timeout' }).kind).toBe('technisch');
  });
});
