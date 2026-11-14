import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardV2Storage } from '../hooks/useDashboardV2Storage';
import { resetInMemoryDashboardV2Storage } from '../services/dashboardInMemoryStoreV2';
import * as dashboardSelectionV2 from '../services/dashboardSelectionV2';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { organizationId: 'test-org', userId: 'test-user' },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useDashboardPreferences', () => ({
  useDashboardPreferences: () => ({
    state: null,
    isLoading: false,
  }),
}));

beforeEach(() => {
  resetInMemoryDashboardV2Storage();
});

describe('useDashboardV2Storage Hook Tests', () => {
  it('lädt initial das Standard-Dashboard und initialisiert dashboards-Liste', async () => {
    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    expect(result.current.dashboard).not.toBeNull();
    expect(result.current.dashboards.length).toBeGreaterThanOrEqual(1);
  });

  it('erstellt ein Dashboard aus einer Vorlage und wechselt darauf', async () => {
    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    const initialId = result.current.dashboard?.id;

    let res: { ok: boolean; error?: unknown } = { ok: false };
    await act(async () => {
      res = await result.current.createFromTemplate('sales', 'Mein Vertrieb');
    });

    expect(res.ok).toBe(true);
    expect(result.current.dashboard?.title).toBe('Mein Vertrieb');
    expect(result.current.dashboard?.id).not.toBe(initialId);
    expect(result.current.dashboards).toHaveLength(2);
  });

  it('dupliziert das aktuelle Dashboard', async () => {
    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    const origId = result.current.dashboard?.id;

    let res: { ok: boolean; error?: unknown } = { ok: false };
    await act(async () => {
      res = await result.current.duplicateCurrent('Kopie von Dashboard');
    });

    expect(res.ok).toBe(true);
    expect(result.current.dashboard?.title).toBe('Kopie von Dashboard');
    expect(result.current.dashboard?.id).not.toBe(origId);
    expect(result.current.dashboards).toHaveLength(2);
  });

  it('wechselt zwischen vorhandenen Dashboards mit openDashboard', async () => {
    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    const firstId = result.current.dashboard!.id;

    // Zweites anlegen
    await act(async () => {
      await result.current.createFromTemplate('blank', 'Zweites Dashboard');
    });
    expect(result.current.dashboard?.title).toBe('Zweites Dashboard');

    // Zurück zum ersten wechseln
    let ok = false;
    await act(async () => {
      ok = await result.current.openDashboard(firstId);
    });

    expect(ok).toBe(true);
    expect(result.current.dashboard?.id).toBe(firstId);
  });

  it('löscht ein Dashboard und wechselt zum nächsten verbleibenden', async () => {
    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    const firstId = result.current.dashboard!.id;

    // Zweites anlegen
    await act(async () => {
      await result.current.createFromTemplate('finance', 'Finanz Dashboard');
    });
    const secondId = result.current.dashboard!.id;
    expect(result.current.dashboards).toHaveLength(2);

    // Zweites löschen
    await act(async () => {
      const delRes = await result.current.deleteDashboard(secondId);
      expect(delRes.ok).toBe(true);
    });

    // Erstes Dashboard ist nun wieder aktiv
    expect(result.current.dashboard?.id).toBe(firstId);
    expect(result.current.dashboards).toHaveLength(1);
  });

  it('speichert Änderungen und erhöht die Revision', async () => {
    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    const currentConfig = result.current.dashboard!.config;
    const revBefore = result.current.dashboard!.revision;

    await act(async () => {
      const saveRes = await result.current.save({
        ...currentConfig,
        title: 'Geänderter Titel',
      });
      expect(saveRes.ok).toBe(true);
    });

    expect(result.current.dashboard?.title).toBe('Geänderter Titel');
    expect(result.current.dashboard?.revision).toBe(revBefore + 1);
  });

  it('speichert Konflikt-Kopie mit saveAsNewPersonalCopy', async () => {
    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    const currentConfig = result.current.dashboard!.config;

    await act(async () => {
      const copyRes = await result.current.saveAsNewPersonalCopy({
        ...currentConfig,
        title: 'Konfliktentwurf',
      });
      expect(copyRes.ok).toBe(true);
    });

    expect(result.current.dashboard?.title).toBe('Konfliktentwurf (Kopie)');
    expect(result.current.dashboards).toHaveLength(2);
  });

  it('meldet Fehler wenn Laden nach erfolgreicher Löschung fehlschlägt (Codex P2)', async () => {
    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    // Zweites anlegen
    await act(async () => {
      await result.current.createFromTemplate('finance', 'Finanz Dashboard');
    });
    const secondId = result.current.dashboard!.id;

    const storageMod = await import('../services/dashboardStorageV2');
    const spy = vi.spyOn(storageMod, 'loadPersonalDashboardV2');
    spy.mockResolvedValueOnce({ ok: false, error: { kind: 'technisch' } });

    await act(async () => {
      const delRes = await result.current.deleteDashboard(secondId);
      expect(delRes.ok).toBe(false);
      if (!delRes.ok) {
        expect(delRes.error).toEqual({ kind: 'technisch' });
      }
    });

    expect(result.current.error).toEqual({ kind: 'technisch' });
    spy.mockRestore();
  });

  it('setzt listError wenn Laden der Dashboard-Liste fehlschlägt (Codex P2)', async () => {
    const listSpy = vi.spyOn(dashboardSelectionV2, 'listPersonalDashboardsV2');
    listSpy.mockResolvedValueOnce({ ok: false, error: { kind: 'technisch' } });

    const { result } = renderHook(() => useDashboardV2Storage());

    await waitFor(() => {
      expect(result.current.status).toBe('bereit');
    });

    expect(result.current.listError).toEqual({ kind: 'technisch' });
    listSpy.mockRestore();
  });
});
