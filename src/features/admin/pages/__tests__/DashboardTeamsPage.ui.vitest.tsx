// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  listDashboardTeamMembersV2: vi.fn().mockResolvedValue({ ok: true, value: [] }),
}));

vi.mock('@/services/admin/memberService', () => ({
  memberService: {
    listMembersAndInvitations: vi.fn().mockResolvedValue({ members: [], invitations: [] }),
  },
}));

import { useOrganization, type OrganizationContextValue } from '@/auth/organizationContext';
import {
  listDashboardTeamsV2,
  deleteDashboardTeamV2,
} from '@/features/dashboard/services/dashboardTeamsV2';

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

  it('öffnet Create-Dialog und Edit-Dialog bei Klick auf die Buttons', async () => {
    vi.mocked(useOrganization).mockReturnValue(mockOrgValue('admin'));
    vi.mocked(listDashboardTeamsV2).mockResolvedValue({
      ok: true,
      value: [
        {
          id: 'team-1',
          name: 'Vertrieb Nord',
          description: 'Nord-Region',
          memberCount: 4,
          dashboardCount: 0,
          canWrite: true,
          isMember: true,
        },
      ],
    });

    render(<DashboardTeamsPage />);

    await screen.findByTestId('team-row-team-1');

    // Create dialog
    fireEvent.click(screen.getByTestId('create-team-button'));
    expect(screen.getByRole('heading', { name: 'Neues Team anlegen' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Abbrechen'));

    // Edit dialog
    fireEvent.click(screen.getByTestId('edit-team-button-team-1'));
    expect(screen.getByRole('heading', { name: 'Team bearbeiten' })).toBeInTheDocument();
  });

  it('öffnet Mitglieder-Panel und löscht Team mit Bestätigung', async () => {
    vi.mocked(useOrganization).mockReturnValue(mockOrgValue('admin'));
    vi.mocked(deleteDashboardTeamV2).mockResolvedValue({
      ok: true,
      value: { deletedTeamId: 'team-2' },
    });
    vi.mocked(listDashboardTeamsV2).mockResolvedValue({
      ok: true,
      value: [
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

    await screen.findByTestId('team-row-team-2');

    // Open members panel
    fireEvent.click(screen.getByTestId('manage-members-button-team-2'));
    expect(screen.getByTestId('team-members-panel')).toBeInTheDocument();

    // Delete team flow
    await waitFor(() => {
      expect(screen.getByTestId('delete-team-button-team-2')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('delete-team-button-team-2'));
    expect(screen.getByRole('heading', { name: 'Team löschen?' })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-delete-team-button'));
    await waitFor(() => {
      expect(deleteDashboardTeamV2).toHaveBeenCalledWith('team-2');
    });
  });
});
