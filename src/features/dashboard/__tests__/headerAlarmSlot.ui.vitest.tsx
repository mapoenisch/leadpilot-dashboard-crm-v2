import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeaderAlarmSlot } from '../components/alarms/HeaderAlarmSlot';

let mockSessionRole = 'admin';
let mockWorkerStatus: {
  status: string;
  auswertungAktiv: boolean;
  ueberfaellig: boolean;
  minutenSeitLetztemLauf?: number;
} | null = null;

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { role: mockSessionRole, organizationId: 'org-1', userId: 'user-1' },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: () => ({
    workerStatus: mockWorkerStatus,
    rules: [],
  }),
}));

vi.mock('../hooks/useUnreadAlarmCount', () => ({
  useUnreadAlarmCount: () => ({
    count: 0,
    display: '0',
    ariaLabel: 'Keine ungelesenen Alarme',
    hasUnread: false,
  }),
}));

describe('HeaderAlarmSlot (Auftrag 168 / P13c)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionRole = 'admin';
    mockWorkerStatus = null;
  });

  it('rendert nur Alarmglocke, wenn Worker gesund ist', () => {
    mockWorkerStatus = {
      status: 'ok',
      auswertungAktiv: true,
      ueberfaellig: false,
    };

    render(
      <MemoryRouter>
        <HeaderAlarmSlot />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('header-alarm-bell')).toBeInTheDocument();
    expect(screen.queryByTestId('alarm-worker-banner')).toBeNull();
  });

  it('rendert AlarmWorkerBanner für Admins, wenn die Alarmprüfung überfällig ist', () => {
    mockSessionRole = 'admin';
    mockWorkerStatus = {
      status: 'ueberfaellig',
      auswertungAktiv: true,
      ueberfaellig: true,
      minutenSeitLetztemLauf: 25,
    };

    render(
      <MemoryRouter>
        <HeaderAlarmSlot />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('header-alarm-bell')).toBeInTheDocument();
    const banner = screen.getByTestId('alarm-worker-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent('Die Alarmprüfung ist seit 25 Minuten nicht gelaufen.');
  });

  it('rendert AlarmWorkerBanner für Admins, wenn die Alarmprüfung pausiert ist', () => {
    mockSessionRole = 'admin';
    mockWorkerStatus = {
      status: 'pausiert',
      auswertungAktiv: false,
      ueberfaellig: false,
    };

    render(
      <MemoryRouter>
        <HeaderAlarmSlot />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('header-alarm-bell')).toBeInTheDocument();
    const banner = screen.getByTestId('alarm-worker-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent('Die Alarmprüfung ist pausiert.');
  });

  it('versteckt AlarmWorkerBanner für reguläre Mitglieder (viewer/manager)', () => {
    mockSessionRole = 'viewer';
    mockWorkerStatus = {
      status: 'ueberfaellig',
      auswertungAktiv: true,
      ueberfaellig: true,
      minutenSeitLetztemLauf: 25,
    };

    render(
      <MemoryRouter>
        <HeaderAlarmSlot />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('header-alarm-bell')).toBeInTheDocument();
    expect(screen.queryByTestId('alarm-worker-banner')).toBeNull();
  });
});
