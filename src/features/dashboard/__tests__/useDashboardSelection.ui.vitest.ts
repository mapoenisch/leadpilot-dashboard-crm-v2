import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardSelection } from '../components/editor/selection/useDashboardSelection';
import type {
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';

const currentDash: StoredDashboardV2Row = {
  id: 'd-1',
  title: 'Dashboard 1',
  scope: 'personal',
  revision: 1,
  config: {
    version: 2,
    id: 'd-1',
    title: 'Dashboard 1',
    scope: 'personal',
    ownerUserId: 'u1',
    organizationId: 'org1',
    globalTimeframe: 'aktuell',
    sections: [],
    tiles: [],
    metadata: {},
  },
  updatedAt: '2026-11-18T10:00:00.000Z',
};

const mockDashboards: PersonalDashboardListItemV2[] = [
  {
    id: 'd-1',
    title: 'Dashboard 1',
    scope: 'personal',
    revision: 1,
    tileCount: 0,
    sectionCount: 0,
    updatedAt: '2026-11-18T10:00:00.000Z',
  },
  {
    id: 'd-2',
    title: 'Dashboard 2',
    scope: 'personal',
    revision: 1,
    tileCount: 2,
    sectionCount: 1,
    updatedAt: '2026-11-18T10:00:00.000Z',
  },
];

describe('useDashboardSelection Hook Tests', () => {
  it('steuert Menü und Escape-Handler', () => {
    const { result } = renderHook(() =>
      useDashboardSelection({
        currentDashboard: currentDash,
        dashboards: mockDashboards,
        isDirty: false,
        onOpenDashboard: vi.fn(),
        onCreateFromTemplate: vi.fn(),
        onDuplicateCurrent: vi.fn(),
        onDeleteDashboard: vi.fn(),
        onSaveCurrent: vi.fn(),
      }),
    );

    act(() => {
      result.current.setIsOpen(true);
    });
    expect(result.current.isOpen).toBe(true);

    // Escape-Taste schließt Menü
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('öffnet gleiches Dashboard ohne API-Aufruf', async () => {
    const onOpenDashboard = vi.fn();
    const { result } = renderHook(() =>
      useDashboardSelection({
        currentDashboard: currentDash,
        dashboards: mockDashboards,
        isDirty: false,
        onOpenDashboard,
        onCreateFromTemplate: vi.fn(),
        onDuplicateCurrent: vi.fn(),
        onDeleteDashboard: vi.fn(),
        onSaveCurrent: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.handleProtectedAction({ type: 'open', id: 'd-1', title: 'Dashboard 1' });
    });
    expect(onOpenDashboard).not.toHaveBeenCalled();
  });

  it('behandelt Fehler bei fehlgeschlagenem Öffnen', async () => {
    const onOpenDashboard = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useDashboardSelection({
        currentDashboard: currentDash,
        dashboards: mockDashboards,
        isDirty: false,
        onOpenDashboard,
        onCreateFromTemplate: vi.fn(),
        onDuplicateCurrent: vi.fn(),
        onDeleteDashboard: vi.fn(),
        onSaveCurrent: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.handleProtectedAction({ type: 'open', id: 'd-2', title: 'Dashboard 2' });
    });

    expect(onOpenDashboard).toHaveBeenCalledWith('d-2');
    expect(result.current.errorText).toBe('Dashboard konnte nicht geöffnet werden.');
  });

  it('bricht handleSaveAndProceed ab wenn Speichern fehlschlägt', async () => {
    const onSaveCurrent = vi.fn().mockResolvedValue(false);
    const onOpenDashboard = vi.fn();

    const { result } = renderHook(() =>
      useDashboardSelection({
        currentDashboard: currentDash,
        dashboards: mockDashboards,
        isDirty: true,
        onOpenDashboard,
        onCreateFromTemplate: vi.fn(),
        onDuplicateCurrent: vi.fn(),
        onDeleteDashboard: vi.fn(),
        onSaveCurrent,
      }),
    );

    act(() => {
      result.current.handleProtectedAction({ type: 'open', id: 'd-2', title: 'Dashboard 2' });
    });
    expect(result.current.showUnsavedConfirm).toBe(true);

    await act(async () => {
      await result.current.handleSaveAndProceed();
    });

    expect(onSaveCurrent).toHaveBeenCalledTimes(1);
    expect(onOpenDashboard).not.toHaveBeenCalled();
    expect(result.current.showUnsavedConfirm).toBe(false);
  });

  it('bricht handleDuplicate ab wenn saveFirst fehlschlägt', async () => {
    const onSaveCurrent = vi.fn().mockResolvedValue(false);
    const onDuplicateCurrent = vi.fn();

    const { result } = renderHook(() =>
      useDashboardSelection({
        currentDashboard: currentDash,
        dashboards: mockDashboards,
        isDirty: true,
        onOpenDashboard: vi.fn(),
        onCreateFromTemplate: vi.fn(),
        onDuplicateCurrent,
        onDeleteDashboard: vi.fn(),
        onSaveCurrent,
      }),
    );

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.handleDuplicate('Kopie', true);
    });

    expect(res?.ok).toBe(false);
    expect(onSaveCurrent).toHaveBeenCalledTimes(1);
    expect(onDuplicateCurrent).not.toHaveBeenCalled();
  });

  it('löscht Dashboard und kündigt nächstes Dashboard an', async () => {
    const onDeleteDashboard = vi.fn().mockResolvedValue({ ok: true, nextDashboardId: 'd-2' });
    const { result } = renderHook(() =>
      useDashboardSelection({
        currentDashboard: currentDash,
        dashboards: mockDashboards,
        isDirty: false,
        onOpenDashboard: vi.fn(),
        onCreateFromTemplate: vi.fn(),
        onDuplicateCurrent: vi.fn(),
        onDeleteDashboard,
        onSaveCurrent: vi.fn(),
      }),
    );

    let res: { ok: boolean } | undefined;
    await act(async () => {
      res = await result.current.handleDelete();
    });

    expect(res?.ok).toBe(true);
    expect(result.current.announcement).toContain(
      'Dashboard ‚Dashboard 1‘ gelöscht, ‚Dashboard 2‘ geöffnet',
    );
  });

  it('öffnet vorgemerkten Import nicht bei Re-Render während laufender Speicherung (Codex P2)', async () => {
    let resolveSave: (ok: boolean) => void = () => {};
    const onSaveCurrent = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const onOpenImportFirst = vi.fn();
    const baseParams = {
      currentDashboard: currentDash,
      dashboards: mockDashboards,
      isDirty: true,
      onOpenDashboard: vi.fn(),
      onCreateFromTemplate: vi.fn(),
      onDuplicateCurrent: vi.fn(),
      onDeleteDashboard: vi.fn(),
      onSaveCurrent,
    };

    const { result, rerender } = renderHook(
      ({ onOpenImport }: { onOpenImport: () => void }) =>
        useDashboardSelection({ ...baseParams, onOpenImport }),
      { initialProps: { onOpenImport: onOpenImportFirst } },
    );

    act(() => {
      result.current.handleProtectedAction({ type: 'import' });
    });

    let savePromise: Promise<void> = Promise.resolve();
    act(() => {
      savePromise = result.current.handleSaveAndProceed();
    });

    // Container rendert während der Speicherung neu (neuer openImport-Callback)
    const onOpenImportSecond = vi.fn();
    rerender({ onOpenImport: onOpenImportSecond });
    expect(onOpenImportFirst).not.toHaveBeenCalled();
    expect(onOpenImportSecond).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave(false);
      await savePromise;
    });
    expect(onOpenImportSecond).not.toHaveBeenCalled();
  });

  it('bewahrt Folgeaktion über Speicher-Remount hinweg auf (P2 Finding 1)', async () => {
    const onSaveCurrent = vi.fn().mockResolvedValue(true);

    const hookParams = {
      currentDashboard: currentDash,
      dashboards: mockDashboards,
      isDirty: true,
      onOpenDashboard: vi.fn(),
      onCreateFromTemplate: vi.fn(),
      onDuplicateCurrent: vi.fn(),
      onDeleteDashboard: vi.fn(),
      onSaveCurrent,
    };

    const { result, unmount } = renderHook(() => useDashboardSelection(hookParams));

    act(() => {
      result.current.handleProtectedAction({ type: 'new' });
    });
    expect(result.current.showUnsavedConfirm).toBe(true);

    await act(async () => {
      const savePromise = result.current.handleSaveAndProceed();
      unmount();
      await savePromise;
    });

    // Neue Instanz nach Remount
    const { result: newResult } = renderHook(() => useDashboardSelection(hookParams));
    expect(newResult.current.activeDialog).toBe('new');
  });

  it('reicht konkrete Speicherfehler an handleCreate, handleDuplicate und handleDelete weiter (Codex P2)', async () => {
    const onCreateFromTemplate = vi.fn().mockResolvedValue({
      ok: false,
      error: { kind: 'obergrenze_erreicht' },
    });
    const onDuplicateCurrent = vi.fn().mockResolvedValue({
      ok: false,
      error: { kind: 'konflikt', detail: 'Revisionskonflikt' },
    });
    const onDeleteDashboard = vi.fn().mockResolvedValue({
      ok: false,
      error: { kind: 'konflikt', detail: 'Externe Änderung' },
    });

    const { result } = renderHook(() =>
      useDashboardSelection({
        currentDashboard: currentDash,
        dashboards: mockDashboards,
        isDirty: false,
        onOpenDashboard: vi.fn(),
        onCreateFromTemplate,
        onDuplicateCurrent,
        onDeleteDashboard,
        onSaveCurrent: vi.fn(),
      }),
    );

    let createRes: { ok: boolean; error?: unknown } | undefined;
    await act(async () => {
      createRes = await result.current.handleCreate('sales', 'Vertrieb neu');
    });
    expect(createRes).toEqual({
      ok: false,
      error: { kind: 'obergrenze_erreicht' },
    });

    let dupRes: { ok: boolean; error?: unknown } | undefined;
    await act(async () => {
      dupRes = await result.current.handleDuplicate('Kopie');
    });
    expect(dupRes).toEqual({
      ok: false,
      error: { kind: 'konflikt', detail: 'Revisionskonflikt' },
    });

    let delRes: { ok: boolean; error?: unknown } | undefined;
    await act(async () => {
      delRes = await result.current.handleDelete();
    });
    expect(delRes).toEqual({
      ok: false,
      error: { kind: 'konflikt', detail: 'Externe Änderung' },
    });
  });

  it('bewahrt Ansage und Fokus über Shell-Remount nach Dashboard-Wechsel (Codex P2)', async () => {
    let resolveOpen: (val: boolean) => void = () => {};
    const onOpenDashboard = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveOpen = resolve;
        }),
    );

    const hookParams = {
      currentDashboard: currentDash,
      dashboards: mockDashboards,
      isDirty: false,
      onOpenDashboard,
      onCreateFromTemplate: vi.fn(),
      onDuplicateCurrent: vi.fn(),
      onDeleteDashboard: vi.fn(),
      onSaveCurrent: vi.fn(),
    };

    const { result, unmount } = renderHook(() => useDashboardSelection(hookParams));

    act(() => {
      void result.current.handleProtectedAction({
        type: 'open',
        id: 'd-2',
        title: 'Dashboard 2',
      });
    });

    // Während des Ladens unmounted die alte Shell (wie im Container bei status=laden)
    unmount();
    await act(async () => {
      resolveOpen(true);
    });

    // Neue Shell mountet nach erfolgreichem Laden
    const { result: newResult } = renderHook(() =>
      useDashboardSelection({
        ...hookParams,
        currentDashboard: { ...currentDash, id: 'd-2', title: 'Dashboard 2' },
      }),
    );

    expect(newResult.current.announcement).toContain('Dashboard ‚Dashboard 2‘ geöffnet');
  });

  it('uebertraegt bei fehlgeschlagenem Wechsel Fehlermeldung statt Erfolgsansage an neue Shell (Codex P2)', async () => {
    let resolveOpen!: (val: boolean) => void;
    const onOpenDashboard = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveOpen = resolve;
        }),
    );

    const hookParams = {
      currentDashboard: currentDash,
      dashboards: mockDashboards,
      isDirty: false,
      onOpenDashboard,
      onCreateFromTemplate: vi.fn(),
      onDuplicateCurrent: vi.fn(),
      onDeleteDashboard: vi.fn(),
      onSaveCurrent: vi.fn(),
    };

    const { result, unmount } = renderHook(() => useDashboardSelection(hookParams));

    act(() => {
      void result.current.handleProtectedAction({
        type: 'open',
        id: 'd-2',
        title: 'Dashboard 2',
      });
    });

    unmount();
    await act(async () => {
      resolveOpen(false);
    });

    const { result: newResult } = renderHook(() => useDashboardSelection(hookParams));
    expect(newResult.current.announcement).toBe('');
    expect(newResult.current.errorText).toBe('Dashboard konnte nicht geöffnet werden.');
  });
});
