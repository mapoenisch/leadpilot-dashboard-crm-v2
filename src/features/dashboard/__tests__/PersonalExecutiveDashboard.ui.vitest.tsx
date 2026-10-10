// Auftrag 077: persönliche Ansicht unter `/dashboard` mit Router (Details, Rückkehr, Editor-Schutz).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useOrganization } from '@/auth/organizationContext';
import { useDashboardPreferences } from '../hooks/useDashboardPreferences';
import { buildDashboardNavState, readDashboardNavState } from '../hooks/useDashboardNavigation';
import { DETAILS_BLOCKED_HINT } from '../components/DashboardTile';
import {
  RETURN_ANNOUNCEMENT,
  RETURN_MISSING_ANNOUNCEMENT,
} from '../pages/PersonalExecutiveDashboard';
import { IDENTITY, SESSION, lastSeen, preferencesFor, renderRoutes } from './detailRouterHarness';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
vi.mock('../hooks/useDashboardPreferences', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useDashboardPreferences')>()),
  useDashboardPreferences: vi.fn(),
}));

const mockedPrefs = vi.mocked(useDashboardPreferences);
const mockedOrg = vi.mocked(useOrganization);

beforeEach(() => {
  mockedOrg.mockReturnValue({ session: SESSION, isLoading: false } as never);
  mockedPrefs.mockReturnValue(preferencesFor());
});

const detailsButton = (name: RegExp) => screen.getByRole('button', { name });

describe('Persönliche Ansicht: Details öffnen und zurückkehren', () => {
  it('öffnet die Detailseite der Kachel', async () => {
    renderRoutes({ pathname: '/dashboard' });
    fireEvent.click(detailsButton(/Details zu Umsatz/));
    await waitFor(() => expect(lastSeen().pathname).toBe('/dashboard/tiles/umsatz'));
    expect(screen.getByTestId('tile-detail-heading')).toHaveFocus();
  });

  it('merkt sich vor dem Wechsel Kachel und Filter im Eintrag der Ansicht', async () => {
    const session = { value: { pipeline: 'p-1' } };
    renderRoutes({ pathname: '/dashboard', state: buildDashboardNavState(IDENTITY, session) });
    fireEvent.click(detailsButton(/Details zu Umsatz/));
    await waitFor(() => expect(lastSeen().pathname).toBe('/dashboard/tiles/umsatz'));
    expect(readDashboardNavState(lastSeen().state, IDENTITY)?.session).toEqual(session);
    // Der ersetzte Eintrag der Ansicht ist erst nach „Zurück“ sichtbar (gleicher Klick, ein Rendern).
    fireEvent.click(screen.getByRole('button', { name: 'Browser zurück' }));
    await waitFor(() => expect(lastSeen().pathname).toBe('/dashboard'));
    expect(readDashboardNavState(lastSeen().state, IDENTITY)).toEqual({
      session,
      returnFocus: 'umsatz',
      fromDashboard: false,
    });
  });

  it('kehrt per Verlauf zurück, ohne ein zweites Dashboard anzulegen (Codex PR #61)', async () => {
    renderRoutes([{ pathname: '/finance/p-and-l' }, { pathname: '/dashboard' }]);
    fireEvent.click(detailsButton(/Details zu Umsatz/));
    await screen.findByTestId('tile-detail-heading');
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zum Dashboard' }));
    await waitFor(() => expect(detailsButton(/Details zu Umsatz/)).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Browser zurück' }));
    await waitFor(() => expect(lastSeen().pathname).toBe('/finance/p-and-l'));
  });

  it('gibt bei „Zurück zum Dashboard“ den Fokus an „Details“ der Kachel zurück', async () => {
    renderRoutes({ pathname: '/dashboard' });
    fireEvent.click(detailsButton(/Details zu Umsatz/));
    await screen.findByTestId('tile-detail-heading');
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zum Dashboard' }));
    await waitFor(() => expect(detailsButton(/Details zu Umsatz/)).toHaveFocus());
    expect(screen.getByTestId('dashboard-nav-status')).toHaveTextContent(RETURN_ANNOUNCEMENT);
  });

  it('verhält sich bei der Zurück-Taste des Browsers genauso', async () => {
    renderRoutes({ pathname: '/dashboard' });
    fireEvent.click(detailsButton(/Details zu Umsatz/));
    await screen.findByTestId('tile-detail-heading');
    fireEvent.click(screen.getByRole('button', { name: 'Browser zurück' }));
    await waitFor(() => expect(detailsButton(/Details zu Umsatz/)).toHaveFocus());
    expect(lastSeen().pathname).toBe('/dashboard');
  });

  it('fokussiert die Überschrift, wenn die Kachel inzwischen fehlt', async () => {
    renderRoutes({
      pathname: '/dashboard',
      state: buildDashboardNavState(IDENTITY, null, 'entfernt'),
    });
    await waitFor(() => expect(screen.getByTestId('dashboard-heading')).toHaveFocus());
    // Codex PR #75: Ring auch nach Mausnavigation (programmatischer Fokus erfüllt :focus-visible nicht).
    expect(screen.getByTestId('dashboard-heading')).toHaveClass('focus:ring-2');
    expect(screen.getByTestId('dashboard-nav-status')).toHaveTextContent(
      RETURN_MISSING_ANNOUNCEMENT,
    );
  });

  it('übernimmt nichts aus einem früheren Seitenaufruf oder von einem anderen Benutzer', () => {
    renderRoutes({
      pathname: '/dashboard',
      state: buildDashboardNavState('org-1|anderer', null, 'umsatz'),
    });
    expect(detailsButton(/Details zu Umsatz/)).not.toHaveFocus();
    expect(screen.getByTestId('dashboard-nav-status')).toBeEmptyDOMElement();
  });
});

describe('Persönliche Ansicht: Bearbeitungsmodus (Entscheidung E3)', () => {
  const startEditing = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard bearbeiten' }));

  it('sperrt „Details“ mit sichtbarem Grund und bleibt im Editor', () => {
    renderRoutes({ pathname: '/dashboard' });
    startEditing();
    const button = detailsButton(/Details zu Umsatz/);
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription(DETAILS_BLOCKED_HINT);
    fireEvent.click(button);
    expect(lastSeen().pathname).toBe('/dashboard');
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
  });

  it('fragt bei offenen Änderungen vor einem internen Link nach und navigiert erst nach „Verwerfen“', async () => {
    renderRoutes({ pathname: '/dashboard' });
    startEditing();
    const item = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('Umsatz'))!;
    fireEvent.click(within(item).getByRole('button', { name: /Entfernen/ }));
    const link = document.createElement('a');
    link.href = '/finance/p-and-l';
    link.textContent = 'GuV';
    document.body.appendChild(link);
    act(() => {
      link.click();
    });
    expect(lastSeen().pathname).toBe('/dashboard');
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Verwerfen/ }));
    await waitFor(() => expect(lastSeen().pathname).toBe('/finance/p-and-l'));
    link.remove();
  });
});

describe('Persönliche Ansicht: Zurück-Taste des Browsers im Editor', () => {
  const editAndChange = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard bearbeiten' }));
    const item = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('Umsatz'))!;
    fireEvent.click(within(item).getByRole('button', { name: /Entfernen/ }));
  };

  it('bleibt bei offenen Änderungen im Editor und fragt nach', async () => {
    renderRoutes([{ pathname: '/finance/p-and-l' }, { pathname: '/dashboard' }]);
    editAndChange();
    await waitFor(() => expect(lastSeen().state).toMatchObject({ editorGuard: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Browser zurück' }));
    const dialog = await screen.findByRole('dialog');
    expect(lastSeen().pathname).toBe('/dashboard');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hier bleiben' }));
    await waitFor(() => expect(lastSeen().state).toMatchObject({ editorGuard: true }));
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
  });

  it('geht nach „Verwerfen“ zur tatsächlich vorherigen Seite', async () => {
    renderRoutes([{ pathname: '/finance/p-and-l' }, { pathname: '/dashboard' }]);
    editAndChange();
    await waitFor(() => expect(lastSeen().state).toMatchObject({ editorGuard: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Browser zurück' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Verwerfen/ }));
    await waitFor(() => expect(lastSeen().pathname).toBe('/finance/p-and-l'));
  });

  it('nimmt den Schutzeintrag nach dem Speichern wieder aus dem Verlauf (Codex PR #61)', async () => {
    renderRoutes([{ pathname: '/finance/p-and-l' }, { pathname: '/dashboard' }]);
    editAndChange();
    await waitFor(() => expect(lastSeen().state).toMatchObject({ editorGuard: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(lastSeen().state).not.toMatchObject({ editorGuard: true }));
    expect(lastSeen().pathname).toBe('/dashboard');
    fireEvent.click(screen.getByRole('button', { name: 'Browser zurück' }));
    await waitFor(() => expect(lastSeen().pathname).toBe('/finance/p-and-l'));
  });

  it('legt ohne Änderungen keinen Schutzeintrag an', () => {
    renderRoutes([{ pathname: '/finance/p-and-l' }, { pathname: '/dashboard' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard bearbeiten' }));
    expect(lastSeen().state).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Browser zurück' }));
    expect(lastSeen().pathname).toBe('/finance/p-and-l');
  });
});
