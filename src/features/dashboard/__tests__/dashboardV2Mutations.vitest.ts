import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeCreateFromTemplate,
  executeDuplicateCurrent,
  executeShareWithTeam,
  executeDeleteDashboard,
  executeSaveAsNewPersonalCopy,
} from '../hooks/dashboardV2Mutations';
import type {
  AccessibleDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';

vi.mock('../services/dashboardStorageV2', () => ({
  createDashboardV2: vi.fn(),
  setActiveDashboardV2Id: vi.fn(),
}));

vi.mock('../services/dashboardSharingV2', () => ({
  copyDashboardV2: vi.fn(),
  deleteTeamDashboardV2: vi.fn(),
}));

vi.mock('../services/dashboardSelectionV2', () => ({
  deletePersonalDashboardV2: vi.fn(),
  duplicatePersonalDashboardV2: vi.fn(),
}));

vi.mock('../hooks/dashboardV2Access', () => ({
  loadAndActivateAnyDashboardV2: vi.fn(),
}));

import { createDashboardV2 } from '../services/dashboardStorageV2';
import { copyDashboardV2, deleteTeamDashboardV2 } from '../services/dashboardSharingV2';
import {
  deletePersonalDashboardV2,
  duplicatePersonalDashboardV2,
} from '../services/dashboardSelectionV2';
import { loadAndActivateAnyDashboardV2 } from '../hooks/dashboardV2Access';

describe('dashboardV2Mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeCreateFromTemplate', () => {
    it('returns error if template unknown', async () => {
      const res = await executeCreateFromTemplate(
        'unknown_tpl',
        'Titel',
        undefined,
        'org-1',
        'u-1',
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );
      expect(res.ok).toBe(false);
    });

    it('creates and activates personal dashboard from valid template', async () => {
      vi.mocked(createDashboardV2).mockResolvedValue({
        ok: true,
        value: { dashboardId: 'd-new', revision: 1, updatedAt: '2026-11-20T10:00:00Z' },
      });
      vi.mocked(loadAndActivateAnyDashboardV2).mockResolvedValue({
        ok: true,
      });

      const refreshList = vi.fn().mockResolvedValue(undefined);
      const setDashboard = vi.fn();

      const res = await executeCreateFromTemplate(
        'blank',
        'Mein Neues',
        { scope: 'personal' },
        'org-1',
        'u-1',
        setDashboard,
        refreshList,
      );

      expect(res.ok).toBe(true);
      expect(createDashboardV2).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Mein Neues', scope: 'personal' }),
      );
      expect(refreshList).toHaveBeenCalled();
    });

    it('creates team dashboard from valid template', async () => {
      vi.mocked(createDashboardV2).mockResolvedValue({
        ok: true,
        value: { dashboardId: 'd-new-team', revision: 1, updatedAt: '2026-11-20T10:00:00Z' },
      });
      vi.mocked(loadAndActivateAnyDashboardV2).mockResolvedValue({
        ok: true,
      });

      const res = await executeCreateFromTemplate(
        'blank',
        '',
        { scope: 'team', teamId: 'team-42' },
        'org-1',
        'u-1',
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(res.ok).toBe(true);
      expect(createDashboardV2).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'team', teamId: 'team-42' }),
      );
    });
  });

  describe('executeDuplicateCurrent', () => {
    it('returns error if dashboard is null', async () => {
      const res = await executeDuplicateCurrent(
        null,
        'Kopie',
        undefined,
        'org-1',
        'u-1',
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );
      expect(res.ok).toBe(false);
    });

    it('duplicates personal dashboard via duplicatePersonalDashboardV2', async () => {
      const mockDash: StoredDashboardV2Row = {
        id: 'd-1',
        title: 'Original',
        scope: 'personal',
        revision: 2,
        config: {
          id: 'd-1',
          title: 'Original',
          version: 2,
          scope: 'personal',
          ownerUserId: 'u-1',
          organizationId: 'org-1',
          globalTimeframe: 'monat',
          tiles: [],
        },
        updatedAt: '2026-11-20T10:00:00Z',
      };

      vi.mocked(duplicatePersonalDashboardV2).mockResolvedValue({
        ok: true,
        value: { dashboardId: 'd-copy', revision: 1, createdAt: '2026-11-20T11:00:00Z' },
      });
      vi.mocked(loadAndActivateAnyDashboardV2).mockResolvedValue({ ok: true });

      const res = await executeDuplicateCurrent(
        mockDash,
        'Mein Duplicate',
        { scope: 'personal' },
        'org-1',
        'u-1',
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(res.ok).toBe(true);
      expect(duplicatePersonalDashboardV2).toHaveBeenCalledWith({
        dashboardId: 'd-1',
        title: 'Mein Duplicate',
      });
    });

    it('duplicates team dashboard via copyDashboardV2', async () => {
      const mockDash: StoredDashboardV2Row = {
        id: 'd-team-1',
        title: 'Team Dash',
        scope: 'team',
        teamId: 'team-1',
        revision: 1,
        config: {
          id: 'd-team-1',
          title: 'Team Dash',
          version: 2,
          scope: 'team',
          teamId: 'team-1',
          ownerUserId: 'u-1',
          organizationId: 'org-1',
          globalTimeframe: 'monat',
          tiles: [],
        },
        updatedAt: '2026-11-20T10:00:00Z',
      };

      vi.mocked(copyDashboardV2).mockResolvedValue({
        ok: true,
        value: { dashboardId: 'd-team-copy', revision: 1, createdAt: '2026-11-20T11:00:00Z' },
      });
      vi.mocked(loadAndActivateAnyDashboardV2).mockResolvedValue({ ok: true });

      const res = await executeDuplicateCurrent(
        mockDash,
        undefined,
        { scope: 'team', teamId: 'team-2' },
        'org-1',
        'u-1',
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(res.ok).toBe(true);
      expect(copyDashboardV2).toHaveBeenCalledWith(
        expect.objectContaining({ targetScope: 'team', targetTeamId: 'team-2' }),
      );
    });
  });

  describe('executeShareWithTeam', () => {
    it('returns error when dashboard is null', async () => {
      const res = await executeShareWithTeam(
        null,
        'team-1',
        'Titel',
        vi.fn().mockResolvedValue(undefined),
      );
      expect(res.ok).toBe(false);
    });

    it('shares dashboard with team via copyDashboardV2', async () => {
      const mockDash: StoredDashboardV2Row = {
        id: 'd-1',
        title: 'Vertrieb',
        scope: 'personal',
        revision: 1,
        config: {
          id: 'd-1',
          title: 'Vertrieb',
          version: 2,
          scope: 'personal',
          ownerUserId: 'u-1',
          organizationId: 'org-1',
          globalTimeframe: 'monat',
          tiles: [],
        },
        updatedAt: '2026-11-20T10:00:00Z',
      };

      vi.mocked(copyDashboardV2).mockResolvedValue({
        ok: true,
        value: { dashboardId: 'd-team-new', revision: 1, createdAt: '2026-11-20T12:00:00Z' },
      });

      const refreshList = vi.fn().mockResolvedValue(undefined);
      const res = await executeShareWithTeam(mockDash, 'team-1', 'Vertrieb Team', refreshList);

      expect(res.ok).toBe(true);
      expect(copyDashboardV2).toHaveBeenCalledWith({
        sourceId: 'd-1',
        targetScope: 'team',
        targetTeamId: 'team-1',
        title: 'Vertrieb Team',
      });
      expect(refreshList).toHaveBeenCalled();
    });
  });

  describe('executeDeleteDashboard', () => {
    it('deletes personal dashboard via deletePersonalDashboardV2', async () => {
      vi.mocked(deletePersonalDashboardV2).mockResolvedValue({
        ok: true,
        value: { deletedId: 'd-del', nextDashboardId: 'd-fallback' },
      });
      vi.mocked(loadAndActivateAnyDashboardV2).mockResolvedValue({ ok: true });

      const dashboards: AccessibleDashboardListItemV2[] = [
        {
          id: 'd-del',
          title: 'Zu löschen',
          scope: 'personal',
          revision: 1,
          tileCount: 0,
          sectionCount: 0,
          updatedAt: '',
          canWrite: true,
          teamId: null,
          teamName: null,
        },
      ];

      const res = await executeDeleteDashboard(
        'd-del',
        {
          id: 'd-del',
          title: 'Zu löschen',
          revision: 1,
          scope: 'personal',
          config: {} as unknown as StoredDashboardV2Row['config'],
          updatedAt: '',
        } as unknown as StoredDashboardV2Row,
        dashboards,
        'org-1',
        'u-1',
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(res.ok).toBe(true);
      expect(deletePersonalDashboardV2).toHaveBeenCalledWith({
        dashboardId: 'd-del',
        expectedRevision: 1,
      });
    });

    it('deletes team dashboard via deleteTeamDashboardV2', async () => {
      vi.mocked(deleteTeamDashboardV2).mockResolvedValue({
        ok: true,
        value: { deletedId: 'd-team-del' },
      });
      vi.mocked(loadAndActivateAnyDashboardV2).mockResolvedValue({ ok: true });

      const dashboards: AccessibleDashboardListItemV2[] = [
        {
          id: 'd-team-del',
          title: 'Team Dash',
          scope: 'team',
          revision: 1,
          tileCount: 0,
          sectionCount: 0,
          updatedAt: '',
          canWrite: true,
          teamId: 't1',
          teamName: 'Team 1',
        },
        {
          id: 'd-pers',
          title: 'Persönlich',
          scope: 'personal',
          revision: 1,
          tileCount: 0,
          sectionCount: 0,
          updatedAt: '',
          canWrite: true,
          teamId: null,
          teamName: null,
        },
      ];

      const res = await executeDeleteDashboard(
        'd-team-del',
        {
          id: 'd-team-del',
          title: 'Team Dash',
          revision: 1,
          scope: 'team',
          config: {} as unknown as StoredDashboardV2Row['config'],
          updatedAt: '',
        } as unknown as StoredDashboardV2Row,
        dashboards,
        'org-1',
        'u-1',
        vi.fn(),
        vi.fn().mockResolvedValue(undefined),
      );

      expect(res.ok).toBe(true);
      expect(deleteTeamDashboardV2).toHaveBeenCalledWith('d-team-del', 1);
    });
  });

  describe('executeSaveAsNewPersonalCopy', () => {
    it('creates personal copy and saves it', async () => {
      vi.mocked(createDashboardV2).mockResolvedValue({
        ok: true,
        value: { dashboardId: 'd-copy-pers', revision: 1, updatedAt: '2026-11-20T10:00:00Z' },
      });

      const config = {
        version: 2 as const,
        id: 'd-orig',
        title: 'Original Dashboard',
        scope: 'personal' as const,
        ownerUserId: 'u-1',
        organizationId: 'org-1',
        globalTimeframe: 'monat' as const,
        tiles: [],
      };

      const setDashboard = vi.fn();
      const refreshList = vi.fn().mockResolvedValue(undefined);

      const res = await executeSaveAsNewPersonalCopy(
        config,
        'Meine Kopie',
        'org-1',
        'u-1',
        setDashboard,
        refreshList,
      );

      expect(res.ok).toBe(true);
      expect(createDashboardV2).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Meine Kopie', scope: 'personal' }),
      );
      expect(setDashboard).toHaveBeenCalled();
      expect(refreshList).toHaveBeenCalled();
    });
  });
});
