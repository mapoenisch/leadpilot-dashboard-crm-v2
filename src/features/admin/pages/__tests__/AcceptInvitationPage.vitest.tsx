// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AcceptInvitationPage } from '../AcceptInvitationPage';
import { memberService, MemberServiceError } from '@/services/admin/memberService';
import type { User } from '@/auth/authAdapter';

// Mock useAuth
vi.mock('@/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/auth/AuthContext';

// Mock memberService
vi.mock('@/services/admin/memberService', () => ({
  memberService: {
    acceptInvitation: vi.fn(),
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

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('AcceptInvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt Ladezustand solange Auth-Status nicht hydriert ist', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isHydrated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(<AcceptInvitationPage />);
    expect(screen.getByText(/Authentifizierung wird überprüft/i)).toBeInTheDocument();
  });

  it('zeigt Hinweis zur Anmeldung, wenn Nutzer nicht authentifiziert ist', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isHydrated: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(<AcceptInvitationPage />);
    expect(
      screen.getByText(/Um eine Einladung anzunehmen, müssen Sie angemeldet sein/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zur Anmeldung/i })).toBeInTheDocument();
  });

  it('zeigt Einladungsdetails und Annahme-Button für authentifizierte Nutzer', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isHydrated: true,
      user: { id: 'user-new', email: 'invited@test.local' } as User,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter(<AcceptInvitationPage />);
    expect(screen.getByText('invited@test.local')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Einladung annehmen/i })).toBeInTheDocument();
  });

  it('führt acceptInvitation erfolgreich aus und zeigt Erfolgszustand an', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isHydrated: true,
      user: { id: 'user-new', email: 'invited@test.local' } as User,
      login: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(memberService.acceptInvitation).mockResolvedValue({
      organizationId: 'org-test-123',
      role: 'manager',
    });

    renderWithRouter(<AcceptInvitationPage />);

    const acceptButton = screen.getByRole('button', { name: /Einladung annehmen/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(memberService.acceptInvitation).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Einladung erfolgreich angenommen!/i)).toBeInTheDocument();
      expect(screen.getByText(/Rolle: manager/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Weiter zum Dashboard/i })).toBeInTheDocument();
    });
  });

  it('zeigt verständliche Fehlermeldung wenn Einladung nicht gefunden wurde (NOT_FOUND)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isHydrated: true,
      user: { id: 'user-new', email: 'no-invite@test.local' } as User,
      login: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(memberService.acceptInvitation).mockRejectedValue(
      new MemberServiceError('NOT_FOUND', 'Keine offene Einladung gefunden.'),
    );

    renderWithRouter(<AcceptInvitationPage />);

    const acceptButton = screen.getByRole('button', { name: /Einladung annehmen/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Keine ausstehende Einladung für Ihre E-Mail-Adresse gefunden/i),
      ).toBeInTheDocument();
    });
  });

  it('zeigt verständliche Fehlermeldung wenn Einladung abgelaufen oder ungültig ist (INVITATION_NOT_PENDING)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isHydrated: true,
      user: { id: 'user-new', email: 'expired@test.local' } as User,
      login: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(memberService.acceptInvitation).mockRejectedValue(
      new MemberServiceError('INVITATION_NOT_PENDING', 'Einladung ungültig.'),
    );

    renderWithRouter(<AcceptInvitationPage />);

    const acceptButton = screen.getByRole('button', { name: /Einladung annehmen/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Diese Einladung ist nicht mehr gültig oder wurde bereits angenommen/i),
      ).toBeInTheDocument();
    });
  });
});
