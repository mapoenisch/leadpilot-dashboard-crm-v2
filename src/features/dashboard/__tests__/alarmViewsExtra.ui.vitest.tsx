import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { AlarmList } from '../components/alarms/AlarmList';
import { AdminAlarmsPage } from '@/features/admin/pages/AdminAlarmsPage';
import type {
  DashboardAlarmEventItem,
  OrganizationAlarmRuleItem,
} from '../services/dashboardAlarmService';

let mockSessionRole = 'admin';
let mockEvents: DashboardAlarmEventItem[] = [];
let mockIsEventsLoading = false;
let mockIsEventsError = false;
let mockEventsError: Error | null = null;
let mockOrgRules: OrganizationAlarmRuleItem[] = [];
const mockRefetchEvents = vi.fn();
const mockDeleteRule = vi.fn();
const mockRefetchOrgRules = vi.fn();
const mockFetchDashboardAlarmEventsV2 = vi.fn().mockResolvedValue({ ok: true, data: [] });

vi.mock('../services/dashboardAlarmService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/dashboardAlarmService')>();
  return {
    ...actual,
    fetchDashboardAlarmEventsV2: (...args: unknown[]) => mockFetchDashboardAlarmEventsV2(...args),
  };
});

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { role: mockSessionRole, organizationId: 'org-1', userId: 'user-1' },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: () => ({
    workerStatus: { status: 'ok', auswertungAktiv: true, ueberfaellig: false },
    events: mockEvents,
    isEventsLoading: mockIsEventsLoading,
    isEventsError: mockIsEventsError,
    eventsError: mockEventsError,
    refetchEvents: mockRefetchEvents,
    orgRules: mockOrgRules,
    isOrgRulesLoading: false,
    deleteRule: mockDeleteRule,
    refetchOrgRules: mockRefetchOrgRules,
    takeoverRule: vi.fn(),
    markRead: vi.fn().mockResolvedValue(1),
    markAllRead: vi.fn().mockResolvedValue(1),
    acknowledge: vi.fn().mockResolvedValue({ ok: true }),
  }),
  useSafeQueryClient: () => new QueryClient(),
}));

describe('Alarm Views Extra Tests (Codex findings / P13c)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionRole = 'admin';
    mockEvents = [];
    mockIsEventsLoading = false;
    mockIsEventsError = false;
    mockEventsError = null;
    mockOrgRules = [];
  });

  describe('AlarmList Error- und Synchronisationsbehandlung', () => {
    it('rendert Fehlerzustand und ruft refetchEvents beim Wiederholen auf', () => {
      mockIsEventsError = true;
      mockEventsError = new Error('Netzwerk-Timeout beim Laden');

      render(
        <MemoryRouter>
          <AlarmList />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('alarms-error-state')).toBeDefined();
      expect(screen.getByText('Netzwerk-Timeout beim Laden')).toBeDefined();

      const retryBtn = screen.getByTestId('retry-alarms-btn');
      fireEvent.click(retryBtn);
      expect(mockRefetchEvents).toHaveBeenCalledTimes(1);
    });

    it('verwirft nachgeladene Seiten, wenn initialEvents nach Rechteentzug schrumpft', async () => {
      const makeEv = (id: string, dashId: string) => ({
        id,
        ruleId: 'r-1',
        dashboardId: dashId,
        dashboardTitle: `Dashboard ${dashId}`,
        tileId: 't-1',
        catalogId: 'crm.leads',
        alterZustand: 'normal',
        neuerZustand: 'warnung',
        messwert: 10,
        einheit: null,
        grenze: 5,
        meldung: `Event ${id}`,
        createdAt: '2026-11-19T10:00:00Z',
        gelesen: false,
        quittiertVon: [],
      });

      mockEvents = Array.from({ length: 50 }, (_, i) => makeEv(`ev-p1-${i}`, 'dash-1'));
      mockFetchDashboardAlarmEventsV2.mockResolvedValueOnce({
        ok: true,
        data: [makeEv('ev-p2-revoked', 'dash-revoked')],
      });

      const { rerender } = render(
        <MemoryRouter>
          <AlarmList />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId('load-more-alarms-btn'));
      await waitFor(() => {
        expect(screen.getByText(/Event ev-p2-revoked/)).toBeInTheDocument();
      });

      // Rechteentzug simuliert: nächster Abruf liefert nur noch 20 Events
      mockEvents = Array.from({ length: 20 }, (_, i) => makeEv(`ev-p1-${i}`, 'dash-1'));
      rerender(
        <MemoryRouter>
          <AlarmList />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/Event ev-p2-revoked/)).toBeNull();
      });
    });

    it('laedt mehr als 200 angehaengte Ereignisse in PAGE_SIZE-Seiten neu ohne serverseitiges Abschneiden', async () => {
      const makeEv = (id: string) => ({
        id,
        ruleId: 'r-1',
        dashboardId: 'dash-1',
        dashboardTitle: 'Dashboard 1',
        tileId: 't-1',
        catalogId: 'crm.leads',
        alterZustand: 'normal',
        neuerZustand: 'warnung',
        messwert: 10,
        einheit: null,
        grenze: 5,
        meldung: `Event ${id}`,
        createdAt: '2026-11-19T10:00:00Z',
        gelesen: false,
        quittiertVon: [],
      });

      mockEvents = Array.from({ length: 50 }, (_, i) => makeEv(`ev-init-${i}`));
      // Simuliere 5 nachgeladene Seiten a 50 = 250 angehaengte Events
      for (let p = 0; p < 5; p++) {
        mockFetchDashboardAlarmEventsV2.mockResolvedValueOnce({
          ok: true,
          data: Array.from({ length: 50 }, (_, i) => makeEv(`ev-app-${p}-${i}`)),
        });
      }

      const { rerender } = render(
        <MemoryRouter>
          <AlarmList />
        </MemoryRouter>,
      );

      for (let p = 0; p < 5; p++) {
        const loadMoreBtn = screen.getByTestId('load-more-alarms-btn');
        fireEvent.click(loadMoreBtn);
        await waitFor(() => {
          expect(screen.getByText(new RegExp(`Event ev-app-${p}-0`))).toBeInTheDocument();
        });
      }

      mockFetchDashboardAlarmEventsV2.mockClear();
      // Server liefert fuer alle 5 Seiten jeweils 50 Events zurueck
      mockFetchDashboardAlarmEventsV2.mockImplementation(async (params: { limit: number }) => {
        return {
          ok: true,
          data: Array.from({ length: params.limit }, (_, i) => makeEv(`ev-reloaded-${i}`)),
        };
      });

      // initialEvents aktualisiert sich (z. B. nach Lese- oder Quittierungs-Refetch)
      mockEvents = Array.from({ length: 50 }, (_, i) => makeEv(`ev-init-updated-${i}`));
      rerender(
        <MemoryRouter>
          <AlarmList />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(mockFetchDashboardAlarmEventsV2).toHaveBeenCalled();
      });

      // Alle Aufrufe muessen limit === PAGE_SIZE (50) einhalten (nie > 200)
      for (const call of mockFetchDashboardAlarmEventsV2.mock.calls) {
        const [params] = call as [{ limit: number }];
        expect(params.limit).toBeLessThanOrEqual(50);
      }
      expect(screen.getByTestId('load-more-alarms-btn')).toBeInTheDocument();
    });
  });

  describe('AdminAlarmsPage Delete Dialog Accessibility (useModalA11y)', () => {
    it('behandelt Schließen per Escape und schützt vor Doppel-Klicks beim Löschen', async () => {
      mockOrgRules = [
        {
          id: 'rule-test-del',
          dashboardId: 'd-1',
          dashboardTitle: 'Vertrieb V2',
          tileId: 't-test',
          catalogId: 'crm.leads',
          ruleConfig: {},
          mindestdauerLaeufe: 1,
          abklingzeitSekunden: 60,
          status: 'verwaist',
          responsibleUserId: 'user-old',
          responsibleEmail: 'old@example.com',
          beobachteteStufe: 'warnung',
          bestaetigteStufe: 'warnung',
          letzterMesswert: 42,
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

      const deleteBtn = screen.getByTestId('delete-org-alarm-rule-btn');
      fireEvent.click(deleteBtn);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('Alarmregel löschen?')).toBeInTheDocument();

      // Escape schließt Dialog
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });

      // Erneut öffnen und Bestätigen
      fireEvent.click(deleteBtn);
      const confirmBtn = screen.getByTestId('confirm-delete-org-alarm-btn');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockDeleteRule).toHaveBeenCalledWith('rule-test-del');
      });
    });
  });
});
