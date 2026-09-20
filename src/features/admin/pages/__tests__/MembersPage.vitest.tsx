// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MembersPage } from '../MembersPage';
import { memberService } from '@/services/admin/memberService';

// Mock useOrganization
vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

import { useOrganization } from '@/auth/organizationContext';

// Mock memberService
vi.mock('@/services/admin/memberService', () => ({
  memberService: {
    listMembersAndInvitations: vi.fn(),
    inviteMember: vi.fn(),
    revokeInvitation: vi.fn(),
    changeMemberRole: vi.fn(),
    deactivateMember: vi.fn(),
  },
  MemberServiceError: class MemberServiceError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = 'MemberServiceError';
    }
  },
}));

describe('MembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt 403-Zustand wenn der angemeldete Nutzer kein Admin ist', () => {
    vi.mocked(useOrganization).mockReturnValue({
      session: { userId: 'user-viewer', organizationId: 'org-1', role: 'viewer' },
      isLoading: false,
    });

    render(<MembersPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Zugriff verweigert/i);
    expect(
      screen.getByText(/Dieser Bereich ist ausschließlich für Administratoren zugänglich/i),
    ).toBeInTheDocument();
  });

  it('zeigt Ladezustand wenn die Organisation noch lädt', () => {
    vi.mocked(useOrganization).mockReturnValue({
      session: null,
      isLoading: true,
    });

    render(<MembersPage />);
    expect(screen.getByText(/Lade/i)).toBeInTheDocument();
  });

  it('rendert Mitgliederliste, Einladungen und Rollenmatrix für Admin', async () => {
    vi.mocked(useOrganization).mockReturnValue({
      session: { userId: 'admin-1', organizationId: 'org-1', role: 'admin' },
      isLoading: false,
    });

    vi.mocked(memberService.listMembersAndInvitations).mockResolvedValue({
      members: [
        {
          userId: 'admin-1',
          email: 'admin@test.local',
          role: 'admin',
          status: 'active',
          createdAt: '2026-09-01T10:00:00Z',
        },
        {
          userId: 'user-2',
          email: 'colleague@test.local',
          role: 'manager',
          status: 'active',
          createdAt: '2026-09-05T10:00:00Z',
        },
      ],
      invitations: [
        {
          id: 'inv-1',
          organizationId: 'org-1',
          email: 'pending@test.local',
          role: 'viewer',
          invitedBy: 'admin-1',
          status: 'pending',
          createdAt: '2026-09-10T10:00:00Z',
          expiresAt: '2026-09-17T10:00:00Z',
        },
      ],
    });

    render(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Mitgliederverwaltung/i);
    });

    expect(screen.getByText('admin@test.local')).toBeInTheDocument();
    expect(screen.getByText('colleague@test.local')).toBeInTheDocument();
    expect(screen.getByText('pending@test.local')).toBeInTheDocument();

    // Rollenmatrix prüfen
    expect(screen.getByText(/Rollen und Berechtigungen/i)).toBeInTheDocument();
  });

  it('zeigt Fehler bei LAST_ACTIVE_ADMIN Schutz', async () => {
    vi.mocked(useOrganization).mockReturnValue({
      session: { userId: 'admin-1', organizationId: 'org-1', role: 'admin' },
      isLoading: false,
    });

    vi.mocked(memberService.listMembersAndInvitations).mockResolvedValue({
      members: [
        {
          userId: 'admin-1',
          email: 'admin@test.local',
          role: 'admin',
          status: 'active',
          createdAt: '2026-09-01T10:00:00Z',
        },
      ],
      invitations: [],
    });

    const { MemberServiceError } = await import('@/services/admin/memberService');
    vi.mocked(memberService.deactivateMember).mockRejectedValueOnce(
      new MemberServiceError(
        'LAST_ACTIVE_ADMIN',
        'Der letzte aktive Administrator kann nicht deaktiviert werden.',
      ),
    );

    render(<MembersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin@test.local')).toBeInTheDocument();
    });

    const deactivateButton = screen.getByRole('button', { name: /deaktivieren/i });
    fireEvent.click(deactivateButton);

    // Bestätigungsdialog: Bestätigen
    const confirmButton = screen.getByRole('button', { name: /Ja, deaktivieren/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Der letzte aktive Administrator kann nicht deaktiviert werden/i),
      ).toBeInTheDocument();
    });
  });
});
