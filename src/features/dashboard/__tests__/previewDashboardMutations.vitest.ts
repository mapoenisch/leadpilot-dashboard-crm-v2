import { describe, it, expect, beforeEach } from 'vitest';
import {
  initPreviewDashboards,
  createPreviewFromTemplate,
  duplicatePreviewDashboard,
  sharePreviewWithTeam,
  initPreviewConfig,
  createPreviewImportDashboard,
} from '../preview/previewDashboardMutations';
import { initPreviewVersionsStore } from '../preview/previewRevisions';
import { inMemoryStore } from '../services/dashboardInMemoryStoreV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('previewDashboardMutations', () => {
  beforeEach(() => {
    inMemoryStore.clear();
  });

  it('initPreviewDashboards liefert Dashboards für verschiedene Szenarien', () => {
    const listVersions = initPreviewDashboards(true, null);
    expect(listVersions.length).toBeGreaterThan(0);
    expect(listVersions[0]?.revision).toBe(4);

    const listVersionsTeams = initPreviewDashboards(true, '1');
    expect(listVersionsTeams.length).toBeGreaterThan(listVersions.length);

    const listTeamsOnly = initPreviewDashboards(false, '1');
    expect(listTeamsOnly.length).toBeGreaterThan(0);

    const listDefault = initPreviewDashboards(false, null);
    expect(listDefault.length).toBeGreaterThan(0);
  });

  it('createPreviewFromTemplate legt neues Dashboard an', async () => {
    const res = await createPreviewFromTemplate('sales', 'Mein Vertrieb', {
      scope: 'personal',
    });
    expect(res.listItem.title).toBe('Mein Vertrieb');
    expect(res.config?.title).toBe('Mein Vertrieb');

    const resTeam = await createPreviewFromTemplate('sales', undefined, {
      scope: 'team',
      teamId: 'team_sales',
    });
    expect(resTeam.listItem.scope).toBe('team');
    expect(resTeam.listItem.teamId).toBe('team_sales');
  });

  it('duplicatePreviewDashboard dupliziert eine bestehende Konfiguration', () => {
    const baseConfig: DashboardConfigV2 = {
      version: 2,
      id: 'dash_orig',
      title: 'Original Dashboard',
      scope: 'personal',
      ownerUserId: 'usr_me',
      organizationId: 'org_1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [],
      sections: [{ id: 'sec_1', title: 'Sektion 1', collapsed: false, tileIds: [] }],
    };

    const dupPersonal = duplicatePreviewDashboard(baseConfig);
    expect(dupPersonal.listItem.title).toBe('Original Dashboard (Kopie)');
    expect(dupPersonal.config.scope).toBe('personal');

    const dupTeam = duplicatePreviewDashboard(baseConfig, 'Team Kopie', {
      scope: 'team',
      teamId: 'team_sales',
    });
    expect(dupTeam.listItem.title).toBe('Team Kopie');
    expect(dupTeam.config.scope).toBe('team');
    expect(dupTeam.config.teamId).toBe('team_sales');
  });

  it('sharePreviewWithTeam teilt ein Dashboard mit einem Team', () => {
    const baseConfig: DashboardConfigV2 = {
      version: 2,
      id: 'dash_pers',
      title: 'Mein Dashboard',
      scope: 'personal',
      ownerUserId: 'usr_me',
      organizationId: 'org_1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [],
    };

    const res = sharePreviewWithTeam(baseConfig, 'team_sales', 'Team Dashboard');
    expect(res.listItem.scope).toBe('team');
    expect(res.listItem.teamId).toBe('team_sales');
    expect(res.config.scope).toBe('team');
  });

  it('initPreviewConfig initialisiert Konfiguration mit Versionen oder Fallbacks', () => {
    initPreviewVersionsStore();
    const configWithVersions = initPreviewConfig(true, null);
    expect(configWithVersions.id).toBeDefined();

    const configEntzogen = initPreviewConfig(false, 'entzogen');
    expect(configEntzogen.id).toBe('preview_team_dash_write');

    const configDefault = initPreviewConfig(false, null);
    expect(configDefault.id).toBe('preview_v2_dashboard');
  });

  it('createPreviewImportDashboard speichert importiertes Dashboard im InMemoryStore', () => {
    const importedConfig: DashboardConfigV2 = {
      version: 2,
      id: 'dash_imp',
      title: 'Importiertes Dashboard',
      scope: 'personal',
      ownerUserId: 'usr_me',
      organizationId: 'org_1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [],
    };

    const res = createPreviewImportDashboard({
      title: 'Importiertes Dashboard',
      config: importedConfig,
      scope: 'team',
      teamId: 'team_sales',
    });

    expect(res.listItem.title).toBe('Importiertes Dashboard');
    expect(res.listItem.scope).toBe('team');
    expect(inMemoryStore.has(res.dashboardId)).toBe(true);
  });
});
