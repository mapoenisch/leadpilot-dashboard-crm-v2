// Branch-Tests: OrganizationProvider mit gemocktem Supabase-Client und
// gemocktem useAuth (kein Netz, kein echter AuthContext).
// Mutable Holder (vi.hoisted) steuern pro Test: Konfiguration, User, DB-Antwort.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OrganizationProvider, useOrganization } from '../organizationContext';

const mockState = vi.hoisted(() => ({
  configured: true,
  user: null as { id: string } | null,
  data: null as unknown,
  error: null as { message: string } | null,
}));

vi.mock('../../services/db/supabaseClient', () => ({
  get isSupabaseConfigured() {
    return mockState.configured;
  },
  get supabase() {
    if (!mockState.configured) return null;
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: mockState.data, error: mockState.error }),
          }),
        }),
      }),
    };
  },
}));

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ user: mockState.user }),
}));

function Probe() {
  const { session, isLoading } = useOrganization();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="session">
        {session ? `${session.userId}|${session.organizationId}|${session.role}` : 'none'}
      </div>
    </div>
  );
}

function renderProvider() {
  return render(
    <OrganizationProvider>
      <Probe />
    </OrganizationProvider>,
  );
}

async function expectSession(text: string) {
  await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
  expect(screen.getByTestId('session').textContent).toBe(text);
}

describe('organizationContext.branch.ui', () => {
  beforeEach(() => {
    mockState.configured = true;
    mockState.user = null;
    mockState.data = null;
    mockState.error = null;
  });

  it('ohne User: session null, kein DB-Zugriff nötig', async () => {
    mockState.user = null;
    renderProvider();
    await expectSession('none');
  });

  it('ohne Supabase-Konfiguration: session null (kein Demo-Mandant)', async () => {
    mockState.configured = false;
    mockState.user = { id: 'u-1' };
    renderProvider();
    await expectSession('none');
  });

  it('aktive Mitgliedschaft in aktiver Organisation bildet Sitzung', async () => {
    mockState.user = { id: 'u-1' };
    mockState.data = {
      organization_id: 'org-1',
      role: 'admin',
      status: 'active',
      organizations: { status: 'active' },
    };
    renderProvider();
    await expectSession('u-1|org-1|admin');
  });

  it('DB-Fehler führt zu null statt zu raten', async () => {
    mockState.user = { id: 'u-1' };
    mockState.data = null;
    mockState.error = { message: 'rls denied' };
    renderProvider();
    await expectSession('none');
  });

  it('suspendierte Mitgliedschaft fällt auf null', async () => {
    mockState.user = { id: 'u-1' };
    mockState.data = {
      organization_id: 'org-1',
      role: 'manager',
      status: 'suspended',
      organizations: { status: 'active' },
    };
    renderProvider();
    await expectSession('none');
  });

  it('suspendierte Organisation fällt auf null', async () => {
    mockState.user = { id: 'u-1' };
    mockState.data = {
      organization_id: 'org-1',
      role: 'manager',
      status: 'active',
      organizations: { status: 'suspended' },
    };
    renderProvider();
    await expectSession('none');
  });

  it('ungültige Rolle fällt auf null', async () => {
    mockState.user = { id: 'u-1' };
    mockState.data = {
      organization_id: 'org-1',
      role: 'owner',
      status: 'active',
      organizations: { status: 'active' },
    };
    renderProvider();
    await expectSession('none');
  });

  it('fehlende Mitgliedschaft (null) fällt auf null', async () => {
    mockState.user = { id: 'u-1' };
    mockState.data = null;
    mockState.error = null;
    renderProvider();
    await expectSession('none');
  });

  it('Rollen manager/viewer werden übernommen', async () => {
    mockState.user = { id: 'u-2' };
    mockState.data = {
      organization_id: 'org-9',
      role: 'viewer',
      status: 'active',
      organizations: { status: 'active' },
    };
    renderProvider();
    await expectSession('u-2|org-9|viewer');
  });
});
