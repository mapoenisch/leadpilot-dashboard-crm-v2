// @vitest-environment jsdom
// G62 (Auftrag 067P): UI-Tests fuer SystemHealthPage.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SystemHealthPage } from '../SystemHealthPage';

// ---------------------------------------------------------------- Mocks
vi.mock('@/auth/organizationContext', () => ({
  useOrganization: vi.fn(),
}));

vi.mock('@/services/health/systemHealthService', () => ({
  systemHealthService: {
    getSystemHealth: vi.fn(),
  },
  HealthServiceError: class HealthServiceError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = 'HealthServiceError';
    }
  },
}));

import { useOrganization } from '@/auth/organizationContext';
import { systemHealthService } from '@/services/health/systemHealthService';

function makeAdminSession() {
  return {
    session: { userId: 'user-admin', organizationId: 'org-1', role: 'admin' as const },
    isLoading: false,
  };
}

function makeSnapshot(overallStatus: 'ok' | 'degraded' | 'error' | 'unknown' = 'ok') {
  const sub = (name: string, status: 'ok' | 'degraded' | 'error' | 'unknown' = 'ok') => ({
    name,
    status,
    latencyMs: 42,
    message: `${name} ist in Ordnung.`,
    checkedAt: '2026-09-22T10:00:00Z',
  });

  return {
    overallStatus,
    subsystems: {
      auth: sub('auth'),
      database: sub('database'),
      ingress: sub('ingress'),
      sync: sub('sync'),
      worker: sub('worker'),
    },
    snapshotAt: '2026-09-22T10:00:00Z',
  };
}

describe('SystemHealthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('zeigt ForbiddenView wenn Nutzer kein Admin ist', () => {
    vi.mocked(useOrganization).mockReturnValue({
      session: { userId: 'u1', organizationId: 'org-1', role: 'viewer' },
      isLoading: false,
    });

    render(<SystemHealthPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Zugriff verweigert/i);
  });

  it('zeigt ForbiddenView fuer Manager', () => {
    vi.mocked(useOrganization).mockReturnValue({
      session: { userId: 'u2', organizationId: 'org-1', role: 'manager' },
      isLoading: false,
    });

    render(<SystemHealthPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Zugriff verweigert/i);
  });

  it('zeigt Aufforderungs-Text vor erster Diagnose', () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());

    render(<SystemHealthPage />);
    // Der Button ist vorhanden
    expect(screen.getByTestId('run-diagnosis-btn')).toBeInTheDocument();
    // Der Hinweistext ist vorhanden (enthält Anführungszeichen, daher Substring-Prüfung)
    expect(screen.getByTestId('run-diagnosis-btn').textContent).toMatch(/Diagnose starten/i);
    // Der Aufforderungs-Hinweis ist vorhanden
    const hint = screen.queryByText(/Klicke auf/i);
    expect(hint).toBeInTheDocument();
  });

  it('zeigt Diagnose-Button', () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());

    render(<SystemHealthPage />);
    expect(screen.getByRole('button', { name: /Diagnose starten/i })).toBeInTheDocument();
  });

  it('fuehrt Diagnose aus und zeigt Subsystem-Karten', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(systemHealthService.getSystemHealth).mockResolvedValue(makeSnapshot());

    render(<SystemHealthPage />);
    fireEvent.click(screen.getByRole('button', { name: /Diagnose starten/i }));

    await waitFor(() => {
      expect(screen.getByTestId('subsystem-grid')).toBeInTheDocument();
    });

    expect(screen.getByTestId('subsystem-card-auth')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-card-database')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-card-ingress')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-card-sync')).toBeInTheDocument();
    expect(screen.getByTestId('subsystem-card-worker')).toBeInTheDocument();
  });

  it('zeigt overall-status Banner nach Diagnose', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(systemHealthService.getSystemHealth).mockResolvedValue(makeSnapshot('ok'));

    render(<SystemHealthPage />);
    fireEvent.click(screen.getByRole('button', { name: /Diagnose starten/i }));

    await waitFor(() => {
      expect(screen.getByTestId('overall-status-banner')).toBeInTheDocument();
    });
    // Multiple ok-badges possible (one per subsystem), at least one should exist
    expect(screen.getAllByTestId('status-badge-ok').length).toBeGreaterThan(0);
  });

  it('zeigt Fehlerstatus korrekt', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(systemHealthService.getSystemHealth).mockResolvedValue(makeSnapshot('error'));

    render(<SystemHealthPage />);
    fireEvent.click(screen.getByRole('button', { name: /Diagnose starten/i }));

    await waitFor(() => {
      expect(screen.getByTestId('overall-status-banner')).toBeInTheDocument();
    });
    expect(screen.getByTestId('status-badge-error')).toBeInTheDocument();
  });

  it('zeigt Fehlermeldung wenn Service wirft', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(systemHealthService.getSystemHealth).mockRejectedValue(new Error('Netzwerkfehler'));

    render(<SystemHealthPage />);
    fireEvent.click(screen.getByRole('button', { name: /Diagnose starten/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Netzwerkfehler/i);
    });
  });

  it('zeigt keine sensiblen Inhalte in der Darstellung', async () => {
    vi.mocked(useOrganization).mockReturnValue(makeAdminSession());
    vi.mocked(systemHealthService.getSystemHealth).mockResolvedValue(makeSnapshot());

    const { container } = render(<SystemHealthPage />);
    fireEvent.click(screen.getByRole('button', { name: /Diagnose starten/i }));

    await waitFor(() => {
      expect(screen.getByTestId('subsystem-grid')).toBeInTheDocument();
    });

    const text = container.textContent?.toLowerCase() ?? '';
    // Prüfe auf tatsächliche Credential-Muster (keine deutschen Wörter die zufällig matchen)
    const forbidden = ['api_key', 'jwt', 'bearer', 'service_role', 'eyj', 'anon_key'];
    for (const word of forbidden) {
      expect(text, `Seite enthält verbotenes Muster: "${word}"`).not.toContain(word);
    }
  });
});
