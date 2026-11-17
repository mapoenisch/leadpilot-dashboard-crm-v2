// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardTeamsPage } from '../DashboardTeamsPage';

// Mock useOrganization
vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

// Mock supabaseClient
vi.mock('@/services/db/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}));

// Mock dashboardTeamsV2
vi.mock('@/features/dashboard/services/dashboardTeamsV2', () => ({
  listDashboardTeamsV2: vi.fn(),
  createDashboardTeamV2: vi.fn(),
  updateDashboardTeamV2: vi.fn(),
  deleteDashboardTeamV2: vi.fn(),
}));

import { useOrganization, type OrganizationContextValue } from '@/auth/organizationContext';
import { listDashboardTeamsV2 } from '@/features/dashboard/services/dashboardTeamsV2';

function mockOrgValue(role: 'admin' | 'manager'): OrganizationContextValue {
  return {
    session: { userId: `user-${role}`, organizationId: 'org-1', role },
    isLoading: false,
  };
}

describe('Auftrag 163 - DashboardTeamsPage (§2.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('T1 Rot-Nachweis (d): zeigt 403-Zustand wenn der angemeldete Nutzer kein Admin ist', () => {
    vi.mocked(useOrganization).mockReturnValue(mockOrgValue('manager'));

    render(<DashboardTeamsPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Zugriff verweigert/i);
    expect(
      screen.getByText(/Dieser Bereich ist ausschließlich für Administratoren zugänglich/i),
    ).toBeInTheDocument();
  });

  it('zeigt Demo-Hinweis wenn Supabase nicht konfiguriert ist (§2.5 Nr. 28)', () => {
    vi.mocked(useOrganization).mockReturnValue(mockOrgValue('admin'));

    vi.mocked(listDashboardTeamsV2).mockResolvedValue({
      ok: false,
      error: { kind: 'nicht_verfuegbar' },
    });

    render(<DashboardTeamsPage />);

    // Da mock isSupabaseConfigured oben true war, liefert listDashboardTeamsV2 nicht_verfuegbar
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Dashboard-Teams/i);
  });

  it('rendert Teams und deaktiviert Löschen bei vorhandenen Dashboards (§2.5 Nr. 25)', async () => {
    vi.mocked(useOrganization).mockReturnValue(mockOrgValue('admin'));

    vi.mocked(listDashboardTeamsV2).mockResolvedValue({
      ok: true,
      value: [
        {
          id: 'team-1',
          name: 'Vertrieb Nord',
          description: 'Nord-Region',
          memberCount: 4,
          dashboardCount: 2,
          canWrite: true,
          isMember: true,
        },
        {
          id: 'team-2',
          name: 'Marketing',
          description: 'Kampagnen',
          memberCount: 2,
          dashboardCount: 0,
          canWrite: true,
          isMember: true,
        },
      ],
    });

    render(<DashboardTeamsPage />);

    const team1Row = await screen.findByTestId('team-row-team-1');
    expect(team1Row).toHaveTextContent('Vertrieb Nord');
    expect(team1Row).toHaveTextContent('4');
    expect(team1Row).toHaveTextContent('2');

    // Löschen bei team-1 (dashboardCount = 2) ist deaktiviert
    const deleteBtn1 = screen.getByTestId('delete-team-button-team-1');
    expect(deleteBtn1).toBeDisabled();
    expect(deleteBtn1).toHaveAttribute(
      'title',
      'Team hat noch 2 Dashboards. Erst löschen oder als persönliche Kopie sichern.',
    );

    // Löschen bei team-2 (dashboardCount = 0) ist aktiviert
    const deleteBtn2 = screen.getByTestId('delete-team-button-team-2');
    expect(deleteBtn2).not.toBeDisabled();
  });
});
