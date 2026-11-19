import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlarmList } from '../components/alarms/AlarmList';
import { AdminAlarmsPage } from '@/features/admin/pages/AdminAlarmsPage';
import { useUnreadAlarmCount } from '../hooks/useUnreadAlarmCount';
import type { DashboardAlarmEventItem, OrganizationAlarmRuleItem } from '../services/dashboardAlarmService';

let mockSessionRole = 'admin';
let mockEvents: DashboardAlarmEventItem[] = [];
let mockOrgRules: OrganizationAlarmRuleItem[] = [];
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();
const mockAcknowledge = vi.fn();
const mockTakeover = vi.fn();
const mockDeleteRule = vi.fn();
const mockRefetch = vi.fn();

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { role: mockSessionRole, organizationId: 'org-1', userId: 'user-1' },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: (_opts?: { loadEvents?: boolean; loadOrgRules?: boolean }) => ({
    workerStatus: { status: 'ok', auswertungAktiv: true, ueberfaellig: false },
    events: mockEvents,
    isEventsLoading: false,
    orgRules: mockOrgRules,
    isOrgRulesLoading: false,
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead,
    acknowledge: mockAcknowledge,
    takeoverRule: mockTakeover,
    deleteRule: mockDeleteRule,
    refetchOrgRules: mockRefetch,
  }),
  useSafeQueryClient: () => new QueryClient(),
}));

function UnreadCountConsumer() {
  const { count, display, ariaLabel, hasUnread } = useUnreadAlarmCount();
  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="display">{display}</span>
      <span data-testid="label">{ariaLabel}</span>
      <span data-testid="has-unread">{String(hasUnread)}</span>
    </div>
  );
}

describe('Alarm Views & useUnreadAlarmCount (Auftrag 168 / P13c)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionRole = 'admin';
    mockEvents = [];
    mockOrgRules = [];
  });

  describe('useUnreadAlarmCount hook', () => {
    it('rendert Zählerzustand und Formatierung über Provider', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <UnreadCountConsumer />
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('count')).toBeDefined();
      expect(screen.getByTestId('label')).toBeDefined();
    });
  });

  describe('AlarmList View', () => {
    it('rendert leeren Zustand wenn keine Ereignisse vorliegen', () => {
      mockEvents = [];
      render(
        <MemoryRouter>
          <AlarmList />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('alarms-empty-state')).toBeDefined();
      expect(screen.getByText('Keine Alarm-Meldungen')).toBeDefined();
    });

    it('rendert Alarmliste mit Ereignissen und Paging-Button', async () => {
      mockEvents = Array.from({ length: 50 }, (_, i) => ({
        id: `ev-${i}`,
        ruleId: `r-${i}`,
        dashboardId: 'd-1',
        dashboardTitle: 'Vertrieb',
        tileId: `t-${i}`,
        catalogId: 'crm.deals',
        alterZustand: 'normal',
        neuerZustand: 'warnung',
        messwert: 15,
        einheit: 'Stück',
        grenze: 10,
        meldung: `Alarm ${i}`,
        createdAt: '2026-11-19T10:00:00Z',
        gelesen: false,
        quittiertVon: [],
      }));

      render(
        <MemoryRouter>
          <AlarmList />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('alarm-events-list')).toBeDefined();
      const loadMoreBtn = screen.getByTestId('load-more-alarms-btn');
      expect(loadMoreBtn).toBeDefined();

      fireEvent.click(loadMoreBtn);

      const markAllBtn = screen.getByTestId('mark-all-read-btn');
      fireEvent.click(markAllBtn);
      await waitFor(() => {
        expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('AdminAlarmsPage View', () => {
    it('blockiert Zugriff für Nicht-Admins (ForbiddenView)', () => {
      mockSessionRole = 'viewer';
      render(
        <MemoryRouter>
          <AdminAlarmsPage />
        </MemoryRouter>,
      );

      expect(screen.queryByTestId('admin-alarms-table')).toBeNull();
    });

    it('rendert Admin-Tabelle mit verwaisten Regeln und Übernahme-Aktion', async () => {
      mockSessionRole = 'admin';
      mockOrgRules = [
        {
          id: 'rule-orphan-1',
          dashboardId: 'd-1',
          dashboardTitle: 'Vertrieb V2',
          tileId: 't-orphan',
          catalogId: 'crm.leads',
          ruleConfig: {},
          mindestdauerLaeufe: 2,
          abklingzeitSekunden: 3600,
          status: 'verantwortlicher_ohne_rechte',
          responsibleUserId: 'former-colleague',
          responsibleEmail: 'ex@firma.de',
          beobachteteStufe: 'kritisch',
          bestaetigteStufe: 'kritisch',
          letzterMesswert: 100,
          letzteAuswertung: '2026-11-19T10:00:00Z',
          createdAt: '2026-11-01T00:00:00Z',
          updatedAt: '2026-11-19T00:00:00Z',
        },
      ];

      render(
        <MemoryRouter>
          <AdminAlarmsPage />
        </MemoryRouter>,
      );

      expect(screen.getByText('Vertrieb V2')).toBeDefined();
      expect(screen.getByText('ex@firma.de')).toBeDefined();

      const takeoverBtn = screen.getByTestId('admin-alarm-takeover-btn-rule-orphan-1');
      fireEvent.click(takeoverBtn);

      await waitFor(() => {
        expect(mockTakeover).toHaveBeenCalledWith('rule-orphan-1');
      });

      const deleteBtn = screen.getByTestId('delete-org-alarm-rule-btn');
      fireEvent.click(deleteBtn);

      expect(screen.getByText('Alarmregel löschen?')).toBeDefined();
      const confirmDeleteBtn = screen.getByTestId('confirm-delete-org-alarm-btn');
      fireEvent.click(confirmDeleteBtn);

      await waitFor(() => {
        expect(mockDeleteRule).toHaveBeenCalledWith('rule-orphan-1');
      });
    });
  });
});
