// Auftrag 072 (Dashboard Teilauftrag 3): Hook für Laden, Speichern, Konflikt und Cachebereinigung.
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOrganization } from '@/auth/organizationContext';
import { loadPreferences, savePreferences } from '../data/dashboardPreferencesRepository';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import {
  DASHBOARD_PREFERENCES_KEY,
  dashboardPreferencesKey,
  useDashboardPreferences,
} from '../hooks/useDashboardPreferences';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
vi.mock('../data/dashboardPreferencesRepository', () => ({
  loadPreferences: vi.fn(),
  savePreferences: vi.fn(),
}));

const mockedOrg = vi.mocked(useOrganization);
const mockedLoad = vi.mocked(loadPreferences);
const mockedSave = vi.mocked(savePreferences);

const TILE = {
  tileId: 't1',
  catalogId: 'baseline.arr',
  view: 'zahl' as const,
  size: 'klein' as const,
  filterMode: 'fester_stand' as const,
};

const STORED = {
  version: 1 as const,
  tiles: [
    {
      tileId: 't1',
      catalogId: 'baseline.arr',
      view: 'zahl' as const,
      size: 'klein' as const,
      filterMode: 'fester_stand' as const,
    },
  ],
};

function signIn(userId: string, organizationId = 'org-a') {
  mockedOrg.mockReturnValue({
    session: { userId, organizationId, role: 'viewer' },
    isLoading: false,
  });
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...renderHook(() => useDashboardPreferences(), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  signIn('user-a');
});

describe('useDashboardPreferences', () => {
  it('lädt ohne Sitzung nichts', () => {
    mockedOrg.mockReturnValue({ session: null, isLoading: false });
    const { result } = setup();
    expect(result.current.status).toBe('keine_sitzung');
    expect(mockedLoad).not.toHaveBeenCalled();
  });

  it('zeigt ohne gespeicherte Zeile den Standard und legt beim Öffnen nichts an', async () => {
    mockedLoad.mockResolvedValue({ ok: true, value: null });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe('bereit'));
    expect(result.current.state).toMatchObject({ kind: 'standard', revision: 0 });
    expect(result.current.state?.config).toBe(DEFAULT_DASHBOARD_CONFIG);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('speichert erst nach Serverbestätigung und liefert beim erneuten Laden die gespeicherte Konfiguration', async () => {
    mockedLoad.mockResolvedValue({ ok: true, value: null });
    mockedSave.mockResolvedValue({ ok: true, value: { revision: 1, updatedAt: 'T1' } });
    const { result, client } = setup();
    await waitFor(() => expect(result.current.status).toBe('bereit'));

    let outcome: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      outcome = await result.current.save(STORED);
    });
    expect(outcome).toEqual({ ok: true, revision: 1 });
    expect(mockedSave).toHaveBeenCalledWith(STORED, 0);
    expect(result.current.state).toMatchObject({
      kind: 'gespeichert',
      config: STORED,
      revision: 1,
    });

    // Erneutes Laden (z. B. nach neuem Login) liefert die Serverfassung.
    mockedLoad.mockResolvedValue({
      ok: true,
      value: { config: STORED, schemaVersion: 1, revision: 1, updatedAt: 'T1' },
    });
    client.clear();
    const second = setup();
    await waitFor(() => expect(second.result.current.status).toBe('bereit'));
    expect(second.result.current.state).toMatchObject({
      kind: 'gespeichert',
      config: STORED,
      revision: 1,
    });
  });

  it('meldet bei konkurrierendem Speichern einen Konflikt und lässt den Entwurf unangetastet', async () => {
    mockedLoad.mockResolvedValue({
      ok: true,
      value: { config: STORED, schemaVersion: 1, revision: 2, updatedAt: 'T' },
    });
    mockedSave
      .mockResolvedValueOnce({ ok: true, value: { revision: 3, updatedAt: 'T3' } })
      .mockResolvedValueOnce({ ok: false, error: { kind: 'konflikt' } });
    const first = setup();
    const second = setup();
    await waitFor(() => expect(first.result.current.status).toBe('bereit'));
    await waitFor(() => expect(second.result.current.status).toBe('bereit'));

    const draft = { ...STORED, tiles: [{ ...TILE, tileId: 'entwurf' }] };
    const before = structuredClone(draft);
    let a: unknown;
    let b: unknown;
    await act(async () => {
      [a, b] = await Promise.all([
        first.result.current.save(STORED),
        second.result.current.save(draft),
      ]);
    });
    expect(a).toEqual({ ok: true, revision: 3 });
    expect(b).toEqual({ ok: false, error: { kind: 'konflikt' } });
    expect(mockedSave).toHaveBeenNthCalledWith(1, STORED, 2);
    expect(mockedSave).toHaveBeenNthCalledWith(2, draft, 2);
    expect(draft).toEqual(before);
    expect(second.result.current.state).toMatchObject({ revision: 2 });

    mockedLoad.mockResolvedValue({
      ok: true,
      value: { config: STORED, schemaVersion: 1, revision: 3, updatedAt: 'T3' },
    });
    await act(async () => {
      await second.result.current.reloadServerVersion();
    });
    await waitFor(() => expect(second.result.current.state).toMatchObject({ revision: 3 }));
  });

  it('meldet eine abgelaufene Sitzung beim Laden und beim Speichern', async () => {
    mockedLoad.mockResolvedValueOnce({ ok: false, error: { kind: 'sitzung_abgelaufen' } });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe('fehler'));
    expect(result.current.error).toEqual({ kind: 'sitzung_abgelaufen' });

    mockedLoad.mockResolvedValue({ ok: true, value: null });
    mockedSave.mockResolvedValue({ ok: false, error: { kind: 'sitzung_abgelaufen' } });
    const other = setup();
    await waitFor(() => expect(other.result.current.status).toBe('bereit'));
    let outcome: unknown;
    await act(async () => {
      outcome = await other.result.current.save(STORED);
    });
    expect(outcome).toEqual({ ok: false, error: { kind: 'sitzung_abgelaufen' } });
  });

  it('sperrt das Speichern bei einer zukünftigen Formatversion', async () => {
    mockedLoad.mockResolvedValue({
      ok: true,
      value: { config: { version: 2, tiles: [] }, schemaVersion: 2, revision: 7, updatedAt: 'T' },
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe('bereit'));
    expect(result.current.state).toMatchObject({ kind: 'zukuenftige_version', canSave: false });
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.save(STORED);
    });
    expect(outcome).toEqual({ ok: false, error: { kind: 'gesperrt' } });
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('prüft den Entwurf vor dem Speichern', async () => {
    mockedLoad.mockResolvedValue({ ok: true, value: null });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe('bereit'));
    const invalid = { ...STORED, tiles: [{ ...TILE, view: 'linie' as const }] };
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.save(invalid);
    });
    expect(outcome).toMatchObject({ ok: false, error: { kind: 'ungueltig' } });
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('entfernt beim Benutzerwechsel und bei der Abmeldung fremde Konfigurationen aus dem Cache', async () => {
    mockedLoad.mockResolvedValue({ ok: true, value: null });
    const { client, rerender, result } = setup();
    await waitFor(() => expect(result.current.status).toBe('bereit'));
    expect(client.getQueryData(dashboardPreferencesKey('org-a', 'user-a'))).toBeDefined();

    signIn('user-b');
    rerender();
    await waitFor(() => expect(result.current.status).toBe('bereit'));
    expect(client.getQueryData(dashboardPreferencesKey('org-a', 'user-a'))).toBeUndefined();
    expect(client.getQueryData(dashboardPreferencesKey('org-a', 'user-b'))).toBeDefined();

    mockedOrg.mockReturnValue({ session: null, isLoading: false });
    rerender();
    await waitFor(() => expect(result.current.status).toBe('keine_sitzung'));
    expect(client.getQueryCache().findAll({ queryKey: DASHBOARD_PREFERENCES_KEY })).toHaveLength(0);
  });

  it('schreibt die Antwort eines laufenden Speicherns nach einem Benutzerwechsel nicht in den Cache', async () => {
    mockedLoad.mockResolvedValue({ ok: true, value: null });
    let finishSave: (value: Awaited<ReturnType<typeof savePreferences>>) => void = () => undefined;
    mockedSave.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    const { client, rerender, result } = setup();
    await waitFor(() => expect(result.current.status).toBe('bereit'));

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.save(STORED);
    });
    signIn('user-b');
    rerender();
    await waitFor(() =>
      expect(client.getQueryData(dashboardPreferencesKey('org-a', 'user-a'))).toBeUndefined(),
    );

    let outcome: unknown;
    await act(async () => {
      finishSave({ ok: true, value: { revision: 1, updatedAt: 'T1' } });
      outcome = await pending;
    });
    expect(outcome).toEqual({ ok: false, error: { kind: 'sitzung_gewechselt' } });
    expect(client.getQueryData(dashboardPreferencesKey('org-a', 'user-a'))).toBeUndefined();
  });

  it('räumt beim Aushängen (echter Logout) den Cache und verwirft spätere Speicherantworten', async () => {
    mockedLoad.mockResolvedValue({ ok: true, value: null });
    let finishSave: (value: Awaited<ReturnType<typeof savePreferences>>) => void = () => undefined;
    mockedSave.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    const { client, unmount, result } = setup();
    await waitFor(() => expect(result.current.status).toBe('bereit'));

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.save(STORED);
    });
    unmount();
    await waitFor(() =>
      expect(client.getQueryData(dashboardPreferencesKey('org-a', 'user-a'))).toBeUndefined(),
    );

    finishSave({ ok: true, value: { revision: 1, updatedAt: 'T1' } });
    await expect(pending).resolves.toEqual({ ok: false, error: { kind: 'sitzung_gewechselt' } });
    expect(client.getQueryData(dashboardPreferencesKey('org-a', 'user-a'))).toBeUndefined();
  });
});
