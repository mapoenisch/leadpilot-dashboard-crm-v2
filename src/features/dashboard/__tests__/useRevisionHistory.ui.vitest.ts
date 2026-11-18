import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  formatRevisionAuthor,
  formatRevisionDate,
  useRevisionHistory,
} from '../components/editor/versions/useRevisionHistory';
import { inMemoryStore } from '../services/dashboardInMemoryStoreV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

describe('useRevisionHistory', () => {
  describe('formatRevisionAuthor', () => {
    it('formatiert gelöschtes Konto', () => {
      expect(formatRevisionAuthor({ createdByName: null })).toBe('Gelöschtes Konto');
    });

    it('formatiert eigenen Account', () => {
      expect(formatRevisionAuthor({ createdByIsSelf: true, createdByName: 'Alice' })).toBe(
        'Du (Alice)',
      );
      expect(
        formatRevisionAuthor({
          createdByIsSelf: true,
          createdByName: 'Alice',
          createdByActive: false,
        }),
      ).toBe('Du (Alice) (ehemalig)');
    });

    it('formatiert fremden Account', () => {
      expect(formatRevisionAuthor({ createdByIsSelf: false, createdByName: 'Bob' })).toBe('Bob');
      expect(
        formatRevisionAuthor({
          createdByIsSelf: false,
          createdByName: 'Bob',
          createdByActive: false,
        }),
      ).toBe('Bob (ehemalig)');
    });

    it('fällt auf Du oder Anderes Mitglied zurück wenn kein Name übergeben', () => {
      expect(formatRevisionAuthor({ createdByIsSelf: true, createdByName: undefined })).toBe(
        'Du (Du)',
      );
      expect(formatRevisionAuthor({ createdByIsSelf: false, createdByName: undefined })).toBe(
        'Anderes Mitglied',
      );
    });
  });

  describe('formatRevisionDate', () => {
    it('formatiert relative Zeitangaben', () => {
      const now = new Date();
      expect(formatRevisionDate(now.toISOString()).relative).toBe('gerade eben');

      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRevisionDate(fiveMinAgo.toISOString()).relative).toBe('vor 5 Minuten');

      const oneMinAgo = new Date(Date.now() - 60 * 1000);
      expect(formatRevisionDate(oneMinAgo.toISOString()).relative).toBe('vor 1 Minute');

      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
      expect(formatRevisionDate(twoHoursAgo.toISOString()).relative).toBe('vor 2 Stunden');

      const oneHourAgo = new Date(Date.now() - 3600 * 1000);
      expect(formatRevisionDate(oneHourAgo.toISOString()).relative).toBe('vor 1 Stunde');

      const threeDaysAgo = new Date(Date.now() - 3 * 86400 * 1000);
      expect(formatRevisionDate(threeDaysAgo.toISOString()).relative).toBe('vor 3 Tagen');

      const oneDayAgo = new Date(Date.now() - 86400 * 1000);
      expect(formatRevisionDate(oneDayAgo.toISOString()).relative).toBe('vor 1 Tag');
    });

    it('fängt ungültige Datumsangaben sicher ab', () => {
      const bad = formatRevisionDate('invalid-date');
      expect(bad.absolute).toBeDefined();
    });
  });

  describe('useRevisionHistory Hook', () => {
    const dummyConfig: DashboardConfigV2 = {
      version: 2,
      id: 'dash_hook_rev',
      title: 'Revision Dashboard',
      scope: 'personal',
      ownerUserId: 'usr_me',
      organizationId: 'org_1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [],
    };

    beforeEach(() => {
      inMemoryStore.clear();
      inMemoryStore.set(dummyConfig.id, {
        row: {
          id: dummyConfig.id,
          title: dummyConfig.title,
          scope: 'personal',
          teamId: null,
          teamName: null,
          revision: 3,
          config: dummyConfig,
          updatedAt: new Date().toISOString(),
        },
        revisions: [
          {
            revision: 3,
            title: 'Rev 3',
            createdByUserId: 'usr_me',
            createdAt: new Date().toISOString(),
            changeSummary: 'Dritte',
            config: { ...dummyConfig, title: 'Rev 3' },
          },
          {
            revision: 2,
            title: 'Rev 2',
            createdByUserId: 'usr_me',
            createdAt: new Date().toISOString(),
            changeSummary: 'Zweite',
            config: { ...dummyConfig, title: 'Rev 2' },
          },
          {
            revision: 1,
            title: 'Rev 1',
            createdByUserId: 'usr_me',
            createdAt: new Date().toISOString(),
            changeSummary: 'Erste',
            config: { ...dummyConfig, title: 'Rev 1' },
          },
        ],
      });
    });

    it('lädt Revisionen wenn isOpen true ist und cached Detailkonfigurationen', async () => {
      const { result } = renderHook(() =>
        useRevisionHistory({
          dashboardId: dummyConfig.id,
          currentRevision: 3,
          currentUserId: 'usr_me',
          isOpen: true,
          pageSize: 2,
        }),
      );

      await waitFor(() => {
        expect(result.current.revisions.length).toBe(2);
        expect(result.current.hasMore).toBe(true);
      });

      // Weitere Revisionen nachladen
      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.revisions.length).toBe(3);
      expect(result.current.hasMore).toBe(false);

      // fetchRevisionConfig
      let fetchedConfig: DashboardConfigV2 | null = null;
      await act(async () => {
        fetchedConfig = await result.current.fetchRevisionConfig(2);
      });
      expect((fetchedConfig as DashboardConfigV2 | null)?.title).toBe('Rev 2');
    });
  });
});
