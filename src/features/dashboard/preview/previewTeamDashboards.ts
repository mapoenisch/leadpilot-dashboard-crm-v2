// Executive Dashboard V2 (Auftrag 163 / P11b):
// Beispieldaten für die Team-Vorschau (§2.6 Nr. 29).

import type {
  AccessibleDashboardListItemV2,
  DashboardTeamV2,
} from '../services/dashboardStorageV2Types';

export const INITIAL_PREVIEW_DASHBOARDS: AccessibleDashboardListItemV2[] = [
  {
    id: 'preview_v2_dashboard',
    title: 'Executive Dashboard (V2 Beta)',
    scope: 'personal',
    revision: 3,
    tileCount: 9,
    sectionCount: 0,
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    teamId: null,
    teamName: null,
    canWrite: true,
  },
  {
    id: 'preview_sales_dashboard',
    title: 'Vertrieb & Pipeline',
    scope: 'personal',
    revision: 1,
    tileCount: 9,
    sectionCount: 2,
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    teamId: null,
    teamName: null,
    canWrite: true,
  },
  {
    id: 'preview_finance_dashboard',
    title: 'Finanzen & Unit Economics',
    scope: 'personal',
    revision: 2,
    tileCount: 10,
    sectionCount: 2,
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    teamId: null,
    teamName: null,
    canWrite: true,
  },
];

export const INITIAL_TEAM_DASHBOARDS: AccessibleDashboardListItemV2[] = [
  {
    id: 'preview_team_dash_write',
    title: 'Team Nord Vertrieb',
    scope: 'team',
    teamId: 'team_nord',
    teamName: 'Vertrieb Nord',
    canWrite: true,
    revision: 1,
    tileCount: 9,
    sectionCount: 0,
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: 'preview_team_dash_read',
    title: 'Management Übersicht',
    scope: 'team',
    teamId: 'team_mgmt',
    teamName: 'Management',
    canWrite: false,
    revision: 2,
    tileCount: 10,
    sectionCount: 2,
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

export const PREVIEW_TEAMS: DashboardTeamV2[] = [
  {
    id: 'team_nord',
    name: 'Vertrieb Nord',
    description: 'Norddeutschland',
    memberCount: 5,
    dashboardCount: 1,
    canWrite: true,
    isMember: true,
  },
  {
    id: 'team_mgmt',
    name: 'Management',
    description: 'Führungskräfte',
    memberCount: 3,
    dashboardCount: 1,
    canWrite: false,
    isMember: true,
  },
];
