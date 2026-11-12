// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvitationForm } from '../InvitationForm';
import { memberService } from '@/services/admin/memberService';

vi.mock('@/services/admin/memberService', () => ({
  memberService: {
    inviteMember: vi.fn(),
  },
}));

describe('InvitationForm', () => {
  const onInvitationCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt Erfolgsmeldung für E-Mail-Versand wenn delivery = email', async () => {
    vi.mocked(memberService.inviteMember).mockResolvedValueOnce({
      id: 'inv-1',
      organizationId: 'org-1',
      email: 'colleague@test.local',
      role: 'viewer',
      invitedBy: 'admin-1',
      status: 'pending',
      createdAt: '2026-11-14T10:00:00Z',
      expiresAt: '2026-11-21T10:00:00Z',
      delivery: 'email',
    });

    render(<InvitationForm onInvitationCreated={onInvitationCreated} />);

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'colleague@test.local' } });

    const submitBtn = screen.getByRole('button', { name: /Einladung senden/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Einladung an colleague@test.local erfolgreich versendet.'),
      ).toBeInTheDocument();
    });

    expect(onInvitationCreated).toHaveBeenCalledTimes(1);
    expect(emailInput).toHaveValue('');
  });

  it('zeigt Hinweis auf Link-Generierung wenn delivery = link_only (E-4)', async () => {
    vi.mocked(memberService.inviteMember).mockResolvedValueOnce({
      id: 'inv-2',
      organizationId: 'org-1',
      email: 'offline@test.local',
      role: 'manager',
      invitedBy: 'admin-1',
      status: 'pending',
      createdAt: '2026-11-14T10:00:00Z',
      expiresAt: '2026-11-21T10:00:00Z',
      delivery: 'link_only',
    });

    render(<InvitationForm onInvitationCreated={onInvitationCreated} />);

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'offline@test.local' } });

    const submitBtn = screen.getByRole('button', { name: /Einladung senden/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Einladung für offline@test.local angelegt (Link erzeugt, nicht versendet).',
        ),
      ).toBeInTheDocument();
    });

    expect(onInvitationCreated).toHaveBeenCalledTimes(1);
  });

  it('zeigt Validierungsfehler bei leerer E-Mail-Adresse', async () => {
    render(<InvitationForm onInvitationCreated={onInvitationCreated} />);

    const form = screen.getByRole('form', { name: /Neues Mitglied einladen/i });
    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: '   ' } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText('Bitte geben Sie eine gültige E-Mail-Adresse ein.'),
      ).toBeInTheDocument();
    });

    expect(memberService.inviteMember).not.toHaveBeenCalled();
  });

  it('zeigt Fehlermeldung wenn inviteMember fehlschlägt', async () => {
    vi.mocked(memberService.inviteMember).mockRejectedValueOnce(
      new Error('Einladung konnte nicht erstellt werden.'),
    );

    render(<InvitationForm onInvitationCreated={onInvitationCreated} />);

    const emailInput = screen.getByLabelText(/E-Mail-Adresse/i);
    fireEvent.change(emailInput, { target: { value: 'fail@test.local' } });

    const submitBtn = screen.getByRole('button', { name: /Einladung senden/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Einladung konnte nicht erstellt werden.')).toBeInTheDocument();
    });
  });
});
