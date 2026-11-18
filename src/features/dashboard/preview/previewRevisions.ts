// Executive Dashboard V2 (Auftrag 165 / P12):
// Vorbereitete Revisionsdaten für das Vorschau-Szenario (?bereich=editor_v2&versionen=1).

import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { inMemoryStore, type InMemoryRevisionRecord } from '../services/dashboardInMemoryStoreV2';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';

export const PREVIEW_VERSIONS_DASHBOARD_ID = 'preview_versions_dashboard';

export function createPreviewRevisionsConfigs(): {
  configRev0: DashboardConfigV2;
  configRev1: DashboardConfigV2;
  configRev2: DashboardConfigV2;
  configRev3: DashboardConfigV2;
  configRev4: DashboardConfigV2;
} {
  const base = migrateV1ToV2(DEFAULT_DASHBOARD_CONFIG, {
    id: PREVIEW_VERSIONS_DASHBOARD_ID,
    title: 'Executive Dashboard Urfassung',
    ownerUserId: 'demo-user-preview',
    organizationId: 'demo-org-preview',
  });

  // Revision 0: Initialer Entwurf (4 Kacheln)
  const configRev0: DashboardConfigV2 = {
    ...base,
    title: 'System Vorlage',
    tiles: base.tiles.slice(0, 4),
    sections: [],
  };

  // Revision 1: Urfassung (6 Kacheln)
  const configRev1: DashboardConfigV2 = {
    ...base,
    title: 'Executive Dashboard Urfassung',
    tiles: base.tiles.slice(0, 6),
    sections: [],
  };

  // Revision 2: 2 Kacheln ergänzt (8 Kacheln)
  const configRev2: DashboardConfigV2 = {
    ...base,
    title: 'Executive Dashboard',
    tiles: base.tiles.slice(0, 8),
    sections: [],
  };

  // Revision 3: Titel geändert und 1 Sektion hinzugefügt (8 Kacheln, 1 Sektion)
  const configRev3: DashboardConfigV2 = {
    ...base,
    title: 'Executive Dashboard mit Sektionen',
    tiles: base.tiles.slice(0, 8),
    sections: [
      {
        id: 'sec_finanzen',
        title: 'Finanzen & Ertrag',
        collapsed: false,
        tileIds: base.tiles.slice(0, 3).map((t) => t.id),
      },
    ],
  };

  // Revision 4: Aktueller Stand (8 Kacheln, 2 Sektionen)
  const configRev4: DashboardConfigV2 = {
    ...base,
    title: 'Executive Dashboard V2',
    tiles: base.tiles.slice(0, 8),
    sections: [
      {
        id: 'sec_finanzen',
        title: 'Finanzen & Ertrag',
        collapsed: false,
        tileIds: base.tiles.slice(0, 3).map((t) => t.id),
      },
      {
        id: 'sec_pipeline',
        title: 'Pipeline & Vertrieb',
        collapsed: false,
        tileIds: base.tiles.slice(3, 6).map((t) => t.id),
      },
    ],
  };

  return { configRev0, configRev1, configRev2, configRev3, configRev4 };
}

export function initPreviewVersionsStore(): {
  currentConfig: DashboardConfigV2;
  dashboardId: string;
} {
  const { configRev0, configRev1, configRev2, configRev3, configRev4 } =
    createPreviewRevisionsConfigs();

  const now = Date.now();
  const revisions: InMemoryRevisionRecord[] = [
    {
      revision: 4,
      title: configRev4.title,
      changeSummary: 'Sektionen und Layout optimiert',
      createdByUserId: 'demo-user-preview',
      createdAt: new Date(now - 3600000).toISOString(),
      config: configRev4,
    },
    {
      revision: 3,
      title: configRev3.title,
      changeSummary: 'Titel geändert und 1 Sektion hinzugefügt',
      createdByUserId: 'demo-user-preview',
      createdAt: new Date(now - 7200000).toISOString(),
      config: configRev3,
    },
    {
      revision: 2,
      title: configRev2.title,
      changeSummary: '2 Kacheln ergänzt',
      createdByUserId: 'demo-user-preview',
      createdAt: new Date(now - 10800000).toISOString(),
      config: configRev2,
    },
    {
      revision: 1,
      title: configRev1.title,
      changeSummary: 'Urfassung angelegt',
      createdByUserId: 'demo-user-preview',
      createdAt: new Date(now - 14400000).toISOString(),
      config: configRev1,
    },
    {
      revision: 0,
      title: configRev0.title,
      changeSummary: 'Vorlage importiert',
      createdByUserId: 'demo-user-preview',
      createdAt: new Date(now - 18000000).toISOString(),
      config: configRev0,
    },
  ];

  inMemoryStore.set(PREVIEW_VERSIONS_DASHBOARD_ID, {
    row: {
      id: PREVIEW_VERSIONS_DASHBOARD_ID,
      title: configRev4.title,
      scope: 'personal',
      teamId: null,
      teamName: null,
      revision: 4,
      config: configRev4,
      updatedAt: new Date(now - 3600000).toISOString(),
      canWrite: true,
    },
    revisions,
  });

  return {
    currentConfig: configRev4,
    dashboardId: PREVIEW_VERSIONS_DASHBOARD_ID,
  };
}
