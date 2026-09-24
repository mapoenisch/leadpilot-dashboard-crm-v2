// @vitest-environment jsdom
// G62 (Auftrag 067P): UI-Tests fuer AuditPage.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditPage } from '../AuditPage';

// ---------------------------------------------------------------- Mocks
vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/services/audit/auditService', () => ({
  auditService: {
    listAuditLogs: vi.fn(),
  },
  AuditServiceError: class AuditServiceError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = 'AuditServiceError';
    }
  },
}));

import { useOrganization } from '@/auth/organizationContext';
import { auditService, AuditServiceError } from '@/services/audit/auditService';

function makeAdminSession() {
  return {
    session: { userId: 'user-admin', organizationId: 'org-1', role: 'admin' as const },
    isLoading: false,
  };
}

describe('AuditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt ForbiddenView wenn Nutzer kein Admin ist', () => {
    vi.mocked(useOrganization).mockReturnValue({
      session: { userId: 'user-1', organizationId: 'org-1', role: 'viewer' },
      isLoading: false,
    });

    render(<AuditPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Zugriff verweigert/i);
  });

  it('zeigt ForbiddenView fuer Manager', () => {
    vi.mocked(useOrganization).mockReturnValue({
      session: { userId: 'user-2', organizationId: 'org-1', role: 'manager' },
      isLoading: false,
    });

    render(<AuditPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Zugriff verweigert/i);
  });

  it('zeigt Ladezustand wenn Organisation laedt', () => {
    vi.mocked(useOrganization).mockReturnValue({ session: null, isLoading: true });
    render(<AuditPage />);
    expect(screen.getByText(/Lade/i)).toBeInTheDocument();
  });

  it('rendert Audit-Log-Tabelle fuer Admin (leere Liste)', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(auditService.listAuditLogs).mockResolvedValue([]);

    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /Audit-Log Einträge/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Keine Einträge vorhanden/i)).toBeInTheDocument();
  });

  it('rendert Audit-Eintraege in der Tabelle', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(auditService.listAuditLogs).mockResolvedValue([
      {
        id: 'e1',
        organizationId: 'org-1',
        actorId: 'u1',
        action: 'auth.login',
        targetType: null,
        targetId: null,
        details: { source: 'web' },
        correlationId: 'corr-1',
        createdAt: '2026-09-22T10:00:00Z',
      },
    ]);

    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('audit-row')).toHaveLength(1);
    });
    expect(screen.getByText('auth.login')).toBeInTheDocument();
  });

  it('oeffnet Detail-Modal bei Klick auf Anzeigen', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(auditService.listAuditLogs).mockResolvedValue([
      {
        id: 'e2',
        organizationId: 'org-1',
        actorId: 'u1',
        action: 'data_source.switch',
        targetType: null,
        targetId: null,
        details: { from: 'synthetic', to: 'hubspot' },
        correlationId: null,
        createdAt: '2026-09-22T11:00:00Z',
      },
    ]);

    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('audit-row')).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /Details für Eintrag/i }));

    expect(screen.getByRole('dialog', { name: /Audit-Eintrag Details/i })).toBeInTheDocument();
    // Heading zeigt die Aktion
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('data_source.switch');
    // detail-json zeigt die details
    expect(screen.getByTestId('audit-detail-json')).toHaveTextContent('hubspot');
  });

  it('zeigt keinen echten Email-Wert im Detail-Modal', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(auditService.listAuditLogs).mockResolvedValue([
      {
        id: 'e3',
        organizationId: 'org-1',
        actorId: 'u1',
        action: 'auth.login',
        targetType: null,
        targetId: null,
        details: { email: 'REDACTED', source: 'web' },
        correlationId: null,
        createdAt: '2026-09-22T12:00:00Z',
      },
    ]);

    render(<AuditPage />);
    await waitFor(() => expect(screen.getAllByTestId('audit-row')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: /Details für Eintrag/i }));

    const json = screen.getByTestId('audit-detail-json').textContent ?? '';
    expect(json).not.toMatch(/admin-a@e2e\.local/);
    expect(json).toContain('REDACTED');
  });

  it('zeigt Fehlermeldung wenn Service wirft', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(auditService.listAuditLogs).mockRejectedValue(
      new AuditServiceError('FORBIDDEN', 'Keine Berechtigung.'),
    );

    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Keine Berechtigung/i);
    });
  });

  it('schliesst Detail-Modal bei Klick auf Schliessen-Button', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(auditService.listAuditLogs).mockResolvedValue([
      {
        id: 'e4',
        organizationId: 'org-1',
        actorId: 'u1',
        action: 'auth.logout',
        targetType: null,
        targetId: null,
        details: {},
        correlationId: null,
        createdAt: '2026-09-22T13:00:00Z',
      },
    ]);

    render(<AuditPage />);
    await waitFor(() => expect(screen.getAllByTestId('audit-row')).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: /Details für Eintrag/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dialog schließen/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
