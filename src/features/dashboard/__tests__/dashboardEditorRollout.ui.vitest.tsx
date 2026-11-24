// Auftrag 174 / P16b: gestufte Umstellung – Reihenfolge der Schalter, offene Bearbeitung,
// Nutzer ohne Entscheidung, Rückweg-Hinweis.
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrganization } from '@/auth/organizationContext';
import {
  isDashboardEditorV2Enabled,
  latchDashboardEditorServerChoice,
  resolveDashboardEditorV2,
  setDashboardEditorV2Override,
  type DashboardEditorServerChoice,
} from '../model/dashboardRollout';
import { EDITOR_SWITCH_NOTICE, useDashboardEditorChoice } from '../hooks/useDashboardEditorChoice';
import {
  DashboardEditorRolloutNotices,
  rueckwegNoticeText,
} from '../components/DashboardEditorRolloutNotices';
import {
  mapEditorStatusRow,
  type DashboardEditorRolloutService,
} from '../services/dashboardEditorRolloutService';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
const mockedOrg = vi.mocked(useOrganization);

function choice(partial: Partial<DashboardEditorServerChoice>): DashboardEditorServerChoice {
  return {
    editor: 'v1',
    grund: 'stufe_0',
    stufe: 0,
    aktiviertAt: null,
    umgestelltAt: null,
    v1UpdatedAt: null,
    ...partial,
  };
}

function fakeService(initial: DashboardEditorServerChoice) {
  let current = initial;
  const calls: boolean[] = [];
  const service: DashboardEditorRolloutService = {
    status: vi.fn(async (vollziehen: boolean) => {
      calls.push(vollziehen);
      return { ok: true as const, value: current };
    }),
    overview: vi.fn(),
  };
  return {
    service,
    calls,
    set(next: DashboardEditorServerChoice) {
      current = next;
    },
  };
}

beforeEach(() => {
  setDashboardEditorV2Override(null);
  latchDashboardEditorServerChoice('', null);
  mockedOrg.mockReturnValue({
    session: { userId: 'u1', organizationId: 'org-a', role: 'viewer' },
    isLoading: false,
  });
});

afterEach(() => {
  setDashboardEditorV2Override(null);
  latchDashboardEditorServerChoice('', null);
});

describe('Reihenfolge der Schalter (Override > Server > Build-Variable)', () => {
  const v2 = choice({ editor: 'v2', grund: 'umgestellt', stufe: 1 });
  const v1 = choice({});

  it('Override gewinnt immer', () => {
    expect(resolveDashboardEditorV2({ override: false, server: v2, buildFlag: true })).toBe(false);
    expect(resolveDashboardEditorV2({ override: true, server: v1, buildFlag: false })).toBe(true);
    expect(resolveDashboardEditorV2({ override: true, server: 'laden', buildFlag: false })).toBe(
      true,
    );
  });

  it('Server-Schalter vor Build-Variable', () => {
    expect(resolveDashboardEditorV2({ override: null, server: v2, buildFlag: false })).toBe(true);
    expect(resolveDashboardEditorV2({ override: null, server: v1, buildFlag: true })).toBe(false);
  });

  it('bis zum Laden keine Wahl, ohne Server die Build-Variable', () => {
    expect(resolveDashboardEditorV2({ override: null, server: 'laden', buildFlag: true })).toBe(
      'laden',
    );
    expect(
      resolveDashboardEditorV2({ override: null, server: 'nicht_verfuegbar', buildFlag: false }),
    ).toBe(false);
    expect(
      resolveDashboardEditorV2({ override: null, server: 'nicht_verfuegbar', buildFlag: true }),
    ).toBe(true);
  });

  it('isDashboardEditorV2Enabled nutzt den festgehaltenen Serverstand, Override davor', () => {
    expect(isDashboardEditorV2Enabled()).toBe(false);
    latchDashboardEditorServerChoice('org-a:u1', v2);
    expect(isDashboardEditorV2Enabled()).toBe(true);
    setDashboardEditorV2Override(false);
    expect(isDashboardEditorV2Enabled()).toBe(false);
  });

  it('unbekannte Serverantwort gilt als alter Editor', () => {
    expect(mapEditorStatusRow(undefined)).toMatchObject({ editor: 'v1', grund: 'stufe_0' });
    expect(
      mapEditorStatusRow({
        stufe: 1,
        aktiviert_at: null,
        editor: 'v3',
        grund: 'unbekannt',
        umgestellt_at: null,
        v1_updated_at: null,
      }),
    ).toMatchObject({ editor: 'v1', grund: 'stufe_0', stufe: 1 });
  });
});

describe('Editor-Wahl beim Öffnen', () => {
  it('lädt erst und stellt dann beim Öffnen um (vollziehen = true)', async () => {
    const fake = fakeService(choice({ editor: 'v2', grund: 'umgestellt', stufe: 1 }));
    const { result } = renderHook(() =>
      useDashboardEditorChoice({ service: fake.service, configured: true }),
    );
    expect(result.current.v2).toBe('laden');
    await waitFor(() => expect(result.current.v2).toBe(true));
    expect(fake.calls).toEqual([true]);
  });

  it('Nutzer ohne Entscheidung bleibt im alten Editor', async () => {
    const fake = fakeService(choice({ editor: 'v1', grund: 'entscheidung_fehlt', stufe: 1 }));
    const { result } = renderHook(() =>
      useDashboardEditorChoice({ service: fake.service, configured: true }),
    );
    await waitFor(() => expect(result.current.v2).toBe(false));
    expect(result.current.server?.grund).toBe('entscheidung_fehlt');
  });

  it('Override fragt den Server nicht', () => {
    setDashboardEditorV2Override(true);
    const fake = fakeService(choice({}));
    const { result } = renderHook(() =>
      useDashboardEditorChoice({ service: fake.service, configured: true }),
    );
    expect(result.current.v2).toBe(true);
    expect(fake.service.status).not.toHaveBeenCalled();
  });

  it('Serverfehler: Build-Variable (Standard alter Editor)', async () => {
    const service: DashboardEditorRolloutService = {
      status: vi.fn(async () => ({ ok: false as const, error: 'technisch' as const })),
      overview: vi.fn(),
    };
    const { result } = renderHook(() => useDashboardEditorChoice({ service, configured: true }));
    await waitFor(() => expect(result.current.v2).toBe(false));
  });

  it('wartet auf den Organisationskontext statt kurz den alten Editor zu zeigen', () => {
    mockedOrg.mockReturnValue({ session: null, isLoading: true });
    const fake = fakeService(choice({}));
    const { result } = renderHook(() =>
      useDashboardEditorChoice({ service: fake.service, configured: true }),
    );
    expect(result.current.v2).toBe('laden');
    expect(fake.service.status).not.toHaveBeenCalled();
  });

  it('Detailseite übernimmt den festgehaltenen Stand ohne neue Umstellung', () => {
    latchDashboardEditorServerChoice('org-a:u1', choice({ editor: 'v2', grund: 'umgestellt' }));
    const fake = fakeService(choice({}));
    const { result } = renderHook(() =>
      useDashboardEditorChoice({ service: fake.service, configured: true, reuseLatched: true }),
    );
    expect(result.current.v2).toBe(true);
    expect(fake.service.status).not.toHaveBeenCalled();
  });
});

describe('Schalterwechsel bei offener Bearbeitung', () => {
  it('wechselt nicht, zeigt nur den Hinweis; Beobachtung stellt niemanden um', async () => {
    const fake = fakeService(choice({ editor: 'v1', grund: 'stufe_0' }));
    const { result } = renderHook(() =>
      useDashboardEditorChoice({ service: fake.service, configured: true, pollMs: 1_000_000 }),
    );
    await waitFor(() => expect(result.current.v2).toBe(false));

    // Marc schaltet die Organisation auf Stufe 1, während die Ansicht offen ist.
    fake.set(choice({ editor: 'v2', grund: 'umstellbar', stufe: 1 }));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(result.current.pendingEditor).toBe('v2'));
    expect(result.current.v2).toBe(false);
    expect(fake.calls).toEqual([true, false]);

    // Zurück auf den Ausgangsstand: Hinweis verschwindet.
    fake.set(choice({ editor: 'v1', grund: 'stufe_0' }));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(result.current.pendingEditor).toBeNull());
  });

  it('zeigt den Hinweis zum nächsten Öffnen', () => {
    render(<DashboardEditorRolloutNotices server={null} pendingEditor="v2" showRueckweg={false} />);
    expect(screen.getByTestId('dashboard-editor-switch-notice')).toHaveTextContent(
      EDITOR_SWITCH_NOTICE.v2,
    );
    expect(EDITOR_SWITCH_NOTICE.v2).toContain('ab dem nächsten Öffnen aktiv');
  });
});

describe('Rückweg-Hinweis im alten Editor', () => {
  it('nennt den gesicherten Stand mit Datum', () => {
    render(
      <DashboardEditorRolloutNotices
        server={choice({ grund: 'rueckweg', v1UpdatedAt: '2026-11-20T10:00:00Z' })}
        pendingEditor={null}
        showRueckweg
      />,
    );
    expect(screen.getByTestId('dashboard-rueckweg-notice')).toHaveTextContent(
      'Stand vom 20.11.2026; Änderungen im neuen Editor sind hier nicht enthalten.',
    );
  });

  it('ohne gesicherten Stand nur der Satz ohne Datum', () => {
    expect(rueckwegNoticeText(null)).toBe('Änderungen im neuen Editor sind hier nicht enthalten.');
  });

  it('kein Hinweis für Nutzer, die nie umgestellt waren', () => {
    const { container } = render(
      <DashboardEditorRolloutNotices
        server={choice({ grund: 'stufe_0', v1UpdatedAt: '2026-11-20T10:00:00Z' })}
        pendingEditor={null}
        showRueckweg
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
