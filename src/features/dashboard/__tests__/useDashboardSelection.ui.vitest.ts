import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDashboardSelection } from '../components/editor/selection/useDashboardSelection';
import type { PersonalDashboardListItemV2, StoredDashboardV2Row } from '../services/dashboardStorageV2Types';

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

    let ok = false;
    await act(async () => {
      ok = await result.current.handleDuplicate('Kopie', true);
    });

    expect(ok).toBe(false);
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

    let ok = false;
    await act(async () => {
      ok = await result.current.handleDelete();
    });

    expect(ok).toBe(true);
    expect(result.current.announcement).toContain('Dashboard ‚Dashboard 1‘ gelöscht, ‚Dashboard 2‘ geöffnet');
  });
});
