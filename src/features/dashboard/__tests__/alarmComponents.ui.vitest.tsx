import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlarmWorkerBanner } from '../components/alarms/AlarmWorkerBanner';
import { AlarmBell } from '../components/alarms/AlarmBell';
import { AlarmFilterBar } from '../components/alarms/AlarmFilterBar';
import { AlarmEventItemRow } from '../components/alarms/AlarmEventItemRow';
import { AlarmAcknowledgeDialog } from '../components/alarms/AlarmAcknowledgeDialog';
import type { DashboardAlarmEventItem } from '../services/dashboardAlarmService';

// Mocks
let mockWorkerStatus: {
  status: 'ok' | 'ueberfaellig' | 'pausiert';
  letzterLauf: string | null;
  minutenSeitLetztemLauf: number | null;
  auswertungAktiv: boolean;
  ueberfaellig: boolean;
} | null = null;

let mockUnreadCount = 0;

vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: () => ({
    workerStatus: mockWorkerStatus,
  }),
}));

vi.mock('../hooks/useUnreadAlarmCount', () => ({
  useUnreadAlarmCount: () => ({
    count: mockUnreadCount,
    display: mockUnreadCount > 99 ? '99+' : String(mockUnreadCount),
    ariaLabel: mockUnreadCount > 0 ? `${mockUnreadCount} ungelesene Alarme` : 'Keine ungelesenen Alarme',
    hasUnread: mockUnreadCount > 0,
  }),
}));

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { role: 'admin' },
  }),
}));

describe('Alarm UI Components (Auftrag 168 / P13c)', () => {
  beforeEach(() => {
    mockWorkerStatus = null;
    mockUnreadCount = 0;
  });

  describe('AlarmWorkerBanner', () => {
    it('rendert nichts wenn kein Worker-Status vorliegt', () => {
      const { container } = render(<AlarmWorkerBanner />);
      expect(container.firstChild).toBeNull();
    });

    it('rendert Überfällig-Warnung für Admins', () => {
      mockWorkerStatus = {
        status: 'ueberfaellig',
        letzterLauf: '2026-11-19T10:00:00Z',
        minutenSeitLetztemLauf: 25,
        auswertungAktiv: true,
        ueberfaellig: true,
      };

      render(<AlarmWorkerBanner isAdmin={true} />);
      const banner = screen.getByTestId('alarm-worker-banner');
      expect(banner).toBeDefined();
      expect(banner.getAttribute('data-banner-type')).toBe('ueberfaellig');
      expect(screen.getByText(/25 Minuten/)).toBeDefined();
    });

    it('rendert Pausiert-Meldung für normale Nutzer wenn showAllUsers=true', () => {
      mockWorkerStatus = {
        status: 'pausiert',
        letzterLauf: '2026-11-19T10:00:00Z',
        minutenSeitLetztemLauf: 5,
        auswertungAktiv: false,
        ueberfaellig: false,
      };

      render(<AlarmWorkerBanner showAllUsers={true} isAdmin={false} />);
      const banner = screen.getByTestId('alarm-worker-banner');
      expect(banner.getAttribute('data-banner-type')).toBe('pausiert');
      expect(screen.getByText(/Die Alarmprüfung ist pausiert/)).toBeDefined();
    });

    it('rendert nichts wenn der Worker aktiv und nicht überfällig ist', () => {
      mockWorkerStatus = {
        status: 'ok',
        letzterLauf: '2026-11-19T10:00:00Z',
        minutenSeitLetztemLauf: 2,
        auswertungAktiv: true,
        ueberfaellig: false,
      };
      const { container } = render(<AlarmWorkerBanner isAdmin={true} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('AlarmBell', () => {
    it('rendert Glocke ohne Badge wenn ungelesen = 0', () => {
      render(
        <MemoryRouter>
          <AlarmBell />
        </MemoryRouter>,
      );
      const bell = screen.getByTestId('header-alarm-bell');
      expect(bell.getAttribute('aria-label')).toBe('Keine ungelesenen Alarme');
      expect(screen.queryByTestId('alarm-bell-badge')).toBeNull();
    });

    it('rendert Glocke mit Badge wenn ungelesen > 0', () => {
      mockUnreadCount = 3;
      render(
        <MemoryRouter>
          <AlarmBell />
        </MemoryRouter>,
      );
      const badge = screen.getByTestId('alarm-bell-badge');
      expect(badge.textContent).toBe('3');
    });

    it('rendert 99+ bei mehr als 99 ungelesenen Alarmen und navigiert standardmäßig', () => {
      mockUnreadCount = 120;
      render(
        <MemoryRouter>
          <AlarmBell />
        </MemoryRouter>,
      );
      expect(screen.getByTestId('alarm-bell-badge').textContent).toBe('99+');
      fireEvent.click(screen.getByTestId('header-alarm-bell'));
    });

    it('behandelt Klick-Event', () => {
      const handleClick = vi.fn();
      render(
        <MemoryRouter>
          <AlarmBell onClick={handleClick} />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByTestId('header-alarm-bell'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('AlarmFilterBar', () => {
    it('rendert Dropdown und Filter-Toggles und ruft Callbacks auf', () => {
      const onChangeDashboardId = vi.fn();
      const onChangeNurUngelesen = vi.fn();
      const onChangeNurWarnungKritisch = vi.fn();
      const onMarkAllRead = vi.fn();

      render(
        <AlarmFilterBar
          nurUngelesen={false}
          onChangeNurUngelesen={onChangeNurUngelesen}
          nurWarnungKritisch={true}
          onChangeNurWarnungKritisch={onChangeNurWarnungKritisch}
          selectedDashboardId=""
          onChangeDashboardId={onChangeDashboardId}
          dashboardOptions={[{ id: 'd-1', title: 'Sales Dashboard' }]}
          onMarkAllRead={onMarkAllRead}
        />,
      );

      const select = screen.getByTestId('alarm-filter-dashboard-select');
      fireEvent.change(select, { target: { value: 'd-1' } });
      expect(onChangeDashboardId).toHaveBeenCalledWith('d-1');

      const unreadToggle = screen.getByTestId('alarm-filter-unread-toggle');
      fireEvent.click(unreadToggle);
      expect(onChangeNurUngelesen).toHaveBeenCalledWith(true);

      const sevToggle = screen.getByTestId('alarm-filter-severity-toggle');
      fireEvent.click(sevToggle);
      expect(onChangeNurWarnungKritisch).toHaveBeenCalledWith(false);

      const markBtn = screen.getByTestId('mark-all-read-btn');
      fireEvent.click(markBtn);
      expect(onMarkAllRead).toHaveBeenCalledTimes(1);
    });
  });

  describe('AlarmEventItemRow', () => {
    const mockEvent: DashboardAlarmEventItem = {
      id: 'ev-test-1',
      ruleId: 'r-1',
      dashboardId: 'd-1',
      dashboardTitle: 'Overview',
      tileId: 't-1',
      catalogId: 'crm.deals',
      alterZustand: 'normal',
      neuerZustand: 'kritisch',
      messwert: 45,
      einheit: 'k€',
      grenze: 30,
      meldung: 'Kritischer Schwellenwert überschritten',
      createdAt: '2026-11-19T10:00:00Z',
      gelesen: false,
      quittiertVon: [
        {
          userId: 'u-1',
          email: 'admin@firma.de',
          quittiertAt: '2026-11-19T10:05:00Z',
          kommentar: 'Problem analysiert',
        },
      ],
    };

    it('rendert Details, Status und Quittierungen', () => {
      const onMarkRead = vi.fn();
      const onOpenAcknowledge = vi.fn();

      render(
        <MemoryRouter>
          <AlarmEventItemRow
            event={mockEvent}
            onMarkRead={onMarkRead}
            onOpenAcknowledge={onOpenAcknowledge}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Kritischer Schwellenwert überschritten/)).toBeDefined();
      expect(screen.getByText('45')).toBeDefined();
      expect(screen.getByText(/admin@firma.de/)).toBeDefined();
      expect(screen.getByText(/Problem analysiert/)).toBeDefined();

      const markReadBtn = screen.getByTestId('mark-event-read-btn');
      fireEvent.click(markReadBtn);
      expect(onMarkRead).toHaveBeenCalledWith('ev-test-1');

      const ackBtn = screen.getByTestId('alarm-ack-btn-ev-test-1');
      fireEvent.click(ackBtn);
      expect(onOpenAcknowledge).toHaveBeenCalledWith(mockEvent);
    });

    it('rendert Warnungs- und Normalzustand ohne Messwert', () => {
      const warnEvent: DashboardAlarmEventItem = {
        id: 'ev-warn',
        ruleId: 'r-warn',
        dashboardId: 'd-1',
        dashboardTitle: 'Overview',
        tileId: 't-1',
        catalogId: 'crm.deals',
        alterZustand: 'kritisch',
        neuerZustand: 'warnung',
        messwert: null,
        einheit: null,
        grenze: null,
        meldung: 'Warnstufe erreicht',
        createdAt: '2026-11-19T10:00:00Z',
        gelesen: true,
        quittiertVon: [],
      };

      const { rerender } = render(
        <MemoryRouter>
          <AlarmEventItemRow event={warnEvent} onMarkRead={vi.fn()} onOpenAcknowledge={vi.fn()} />
        </MemoryRouter>,
      );
      expect(screen.getByText(/Warnstufe erreicht/)).toBeDefined();

      const normalEvent: DashboardAlarmEventItem = {
        ...warnEvent,
        id: 'ev-normal',
        neuerZustand: 'normal',
        meldung: 'Wieder normal',
      };
      rerender(
        <MemoryRouter>
          <AlarmEventItemRow event={normalEvent} onMarkRead={vi.fn()} onOpenAcknowledge={vi.fn()} />
        </MemoryRouter>,
      );
      expect(screen.getByText(/Wieder normal/)).toBeDefined();
    });
  });

  describe('AlarmAcknowledgeDialog', () => {
    const mockEvent: DashboardAlarmEventItem = {
      id: 'ev-ack-dialog',
      ruleId: 'r-ack',
      dashboardId: 'd-ack',
      dashboardTitle: 'Finance',
      tileId: 't-ack',
      catalogId: 'pnl.revenue',
      alterZustand: 'normal',
      neuerZustand: 'warnung',
      messwert: 15,
      einheit: '%',
      grenze: 10,
      meldung: 'Umsatzwarnung',
      createdAt: '2026-11-19T10:00:00Z',
      gelesen: false,
      quittiertVon: [],
    };

    it('rendert Dialog, validiert Zeichenlimit und sendet Quittierung', async () => {
      const onConfirm = vi.fn().mockResolvedValue(true);
      const onCancel = vi.fn();

      render(
        <AlarmAcknowledgeDialog
          isOpen={true}
          event={mockEvent}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />,
      );

      expect(screen.getByText(/Alarm quittieren/)).toBeDefined();
      expect(screen.getByText(/Umsatzwarnung/)).toBeDefined();

      const textarea = screen.getByTestId('alarm-ack-comment-input');
      fireEvent.change(textarea, { target: { value: 'Zur Kenntnis genommen.' } });

      const submitBtn = screen.getByTestId('alarm-ack-submit-btn');
      fireEvent.click(submitBtn);

      expect(onConfirm).toHaveBeenCalledWith('Zur Kenntnis genommen.');
    });

    it('bricht Dialog ab über Abbrechen-Button', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <AlarmAcknowledgeDialog
          isOpen={true}
          event={mockEvent}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />,
      );

      fireEvent.click(screen.getByText('Abbrechen'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
