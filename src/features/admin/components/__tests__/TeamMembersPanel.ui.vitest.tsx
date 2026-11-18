// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamMembersPanel } from '../TeamMembersPanel';
import type { DashboardTeamV2 } from '@/features/dashboard/services/dashboardStorageV2Types';

vi.mock('@/features/dashboard/services/dashboardTeamsV2', () => ({
  listDashboardTeamMembersV2: vi.fn(),
  addDashboardTeamMemberV2: vi.fn(),
  removeDashboardTeamMemberV2: vi.fn(),
}));

vi.mock('@/services/admin/memberService', () => ({
  memberService: {
    listMembersAndInvitations: vi.fn(),
  },
}));

import {
  listDashboardTeamMembersV2,
  addDashboardTeamMemberV2,
  removeDashboardTeamMemberV2,
} from '@/features/dashboard/services/dashboardTeamsV2';
import { memberService } from '@/services/admin/memberService';

describe('TeamMembersPanel', () => {
  const mockTeam: DashboardTeamV2 = {
    id: 'team-1',
    name: 'Vertrieb Nord',
    description: 'Norddeutschland',
    memberCount: 2,
    dashboardCount: 1,
    canWrite: true,
    isMember: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders member list with active and suspended members and handles remove flow', async () => {
    vi.mocked(listDashboardTeamMembersV2).mockResolvedValue({
      ok: true,
      value: [
        {
          userId: 'u1',
          email: 'alice@test.de',
          teamRole: 'member',
          orgRole: 'member',
          orgStatus: 'active',
          createdAt: '2026-11-20T10:00:00Z',
        },
        {
          userId: 'u2',
          email: 'bob@test.de',
          teamRole: 'member',
          orgRole: 'viewer',
          orgStatus: 'suspended',
          createdAt: '2026-11-21T10:00:00Z',
        },
      ],
    });

    vi.mocked(memberService.listMembersAndInvitations).mockResolvedValue({
      members: [
        {
          userId: 'u1',
          email: 'alice@test.de',
          role: 'manager',
          status: 'active',
          createdAt: '2026-11-20T10:00:00Z',
        },
        {
          userId: 'u2',
          email: 'bob@test.de',
          role: 'viewer',
          status: 'suspended',
          createdAt: '2026-11-21T10:00:00Z',
        },
        {
          userId: 'u3',
          email: 'charlie@test.de',
          role: 'admin',
          status: 'active',
          createdAt: '2026-11-22T10:00:00Z',
        },
      ],
      invitations: [],
    });

    vi.mocked(removeDashboardTeamMemberV2).mockResolvedValue({
      ok: true,
      value: { removed: true },
    });

    const onClose = vi.fn();
    const onUpdated = vi.fn();

    render(<TeamMembersPanel team={mockTeam} onClose={onClose} onTeamUpdated={onUpdated} />);

    await waitFor(() => {
      expect(screen.getByText('alice@test.de')).toBeInTheDocument();
      expect(screen.getByText('bob@test.de')).toBeInTheDocument();
      expect(screen.getByText('gesperrt – ohne Zugriff')).toBeInTheDocument();
      expect(screen.getByText('(liest nur)')).toBeInTheDocument();
    });

    // Remove user 1
    const removeBtn = screen.getByTestId('remove-member-button-u1');
    fireEvent.click(removeBtn);

    expect(screen.getByText('Mitglied aus Team entfernen?')).toBeInTheDocument();
    const confirmBtn = screen.getByTestId('confirm-remove-member-button');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(removeDashboardTeamMemberV2).toHaveBeenCalledWith('team-1', 'u1');
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('allows adding an available organization member to the team', async () => {
    vi.mocked(listDashboardTeamMembersV2).mockResolvedValue({
      ok: true,
      value: [],
    });

    vi.mocked(memberService.listMembersAndInvitations).mockResolvedValue({
      members: [
        {
          userId: 'u3',
          email: 'charlie@test.de',
          role: 'admin',
          status: 'active',
          createdAt: '2026-11-22T10:00:00Z',
        },
      ],
      invitations: [],
    });

    vi.mocked(addDashboardTeamMemberV2).mockResolvedValue({
      ok: true,
      value: { teamId: 'team-1', userId: 'u3' },
    });

    render(<TeamMembersPanel team={mockTeam} onClose={vi.fn()} onTeamUpdated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Dieses Team hat noch keine Mitglieder.')).toBeInTheDocument();
    });

    const select = screen.getByTestId('add-team-member-select');
    fireEvent.change(select, { target: { value: 'u3' } });

    const addBtn = screen.getByTestId('add-member-button');
    expect(addBtn).not.toBeDisabled();
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(addDashboardTeamMemberV2).toHaveBeenCalledWith('team-1', 'u3');
    });
  });

  it('verwirft eine veraltete Mitgliederantwort nach einem Teamwechsel', async () => {
    const member = (userId: string, email: string) => ({
      userId,
      email,
      teamRole: 'member' as const,
      orgRole: 'member' as const,
      orgStatus: 'active' as const,
      createdAt: '2026-11-20T10:00:00Z',
    });
    type MembersResult = Awaited<ReturnType<typeof listDashboardTeamMembersV2>>;
    let resolveTeamA: (v: MembersResult) => void = () => {};
    vi.mocked(listDashboardTeamMembersV2).mockImplementation((teamId: string) =>
      teamId === 'team-1'
        ? new Promise<MembersResult>((resolve) => {
            resolveTeamA = resolve;
          })
        : Promise.resolve({ ok: true, value: [member('u-b', 'team-b@test.de')] }),
    );
    vi.mocked(memberService.listMembersAndInvitations).mockResolvedValue({
      members: [],
      invitations: [],
    } as unknown as Awaited<ReturnType<typeof memberService.listMembersAndInvitations>>);

    const { rerender } = render(
      <TeamMembersPanel team={mockTeam} onClose={vi.fn()} onTeamUpdated={vi.fn()} />,
    );
    rerender(
      <TeamMembersPanel
        team={{ ...mockTeam, id: 'team-2', name: 'Vertrieb Süd' }}
        onClose={vi.fn()}
        onTeamUpdated={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText('team-b@test.de')).toBeInTheDocument());

    resolveTeamA({ ok: true, value: [member('u-a', 'team-a@test.de')] });
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByText('team-a@test.de')).not.toBeInTheDocument();
    expect(screen.getByText('team-b@test.de')).toBeInTheDocument();
  });
});
