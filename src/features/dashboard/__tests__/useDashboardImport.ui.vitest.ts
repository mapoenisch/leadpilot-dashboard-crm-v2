import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardImport } from '../components/editor/selection/useDashboardImport';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { buildDashboardExportV2 } from '../model/dashboardExchangeV2';

describe('useDashboardImport', () => {
  const sampleConfig: DashboardConfigV2 = {
    version: 2,
    id: 'dash_sample',
    title: 'Mein Test Dashboard',
    scope: 'personal',
    ownerUserId: 'usr_me',
    organizationId: 'org_1',
    globalTimeframe: 'letzte_30_tage',
    tiles: [],
  };

  it('öffnet und schließt den Dialog und setzt Zustand zurück', async () => {
    const { result } = renderHook(() =>
      useDashboardImport({
        userId: 'usr_me',
        organizationId: 'org_1',
        teams: [
          {
            id: 'team_1',
            name: 'Team Nord',
            canWrite: true,
            description: null,
            memberCount: 1,
            dashboardCount: 1,
            isMember: true,
          },
        ],
      }),
    );

    expect(result.current.isOpen).toBe(false);

    await act(async () => {
      await result.current.openImport();
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.targetTeamId).toBe('team_1');

    act(() => {
      result.current.closeImport();
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.file).toBeNull();
  });

  it('parst ausgewählte Datei, passt Titel an und wechselt Zielbereich', async () => {
    const { result } = renderHook(() =>
      useDashboardImport({
        userId: 'usr_me',
        organizationId: 'org_1',
      }),
    );

    const validEnvelope = buildDashboardExportV2(sampleConfig, { sourceRevision: 1 });
    const content = JSON.stringify(validEnvelope);
    const file = new File([content], 'export.json', {
      type: 'application/json',
    });
    file.text = async () => content;

    await act(async () => {
      await result.current.handleFileSelect(file);
    });

    expect(result.current.parseResult?.ok).toBe(true);
    expect(result.current.title).toBe('Mein Test Dashboard');

    act(() => {
      result.current.setTargetScope('team', 'team_sales');
    });
    expect(result.current.targetScope).toBe('team');
    expect(result.current.targetTeamId).toBe('team_sales');
    if (result.current.parseResult?.ok) {
      expect(result.current.parseResult.config.scope).toBe('team');
      expect(result.current.parseResult.config.teamId).toBe('team_sales');
    }
  });

  it('führt executeImport erfolgreich aus und blockiert bei Obergrenze', async () => {
    const onOpen = vi.fn().mockResolvedValue(true);
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const mockCreate = vi.fn().mockResolvedValue({
      ok: true,
      value: { dashboardId: 'new_dash_123', revision: 1 },
    });

    const { result } = renderHook(() =>
      useDashboardImport({
        userId: 'usr_me',
        organizationId: 'org_1',
        personalCount: 19,
        onOpenDashboard: onOpen,
        onRefreshList: onRefresh,
        createDashboardFn: mockCreate,
      }),
    );

    const validEnvelope = buildDashboardExportV2(sampleConfig, { sourceRevision: 1 });
    const content = JSON.stringify(validEnvelope);
    const file = new File([content], 'export.json', {
      type: 'application/json',
    });
    file.text = async () => content;

    await act(async () => {
      await result.current.handleFileSelect(file);
    });

    let success = false;
    await act(async () => {
      success = await result.current.executeImport();
    });

    expect(success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('new_dash_123');
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('blockiert Import wenn persönliches Limit von 20 erreicht ist', async () => {
    const mockCreate = vi.fn();
    const { result } = renderHook(() =>
      useDashboardImport({
        userId: 'usr_me',
        organizationId: 'org_1',
        personalCount: 20,
        createDashboardFn: mockCreate,
      }),
    );

    const validEnvelope = buildDashboardExportV2(sampleConfig, { sourceRevision: 1 });
    const content = JSON.stringify(validEnvelope);
    const file = new File([content], 'export.json', {
      type: 'application/json',
    });
    file.text = async () => content;

    await act(async () => {
      await result.current.handleFileSelect(file);
    });

    let success = false;
    await act(async () => {
      success = await result.current.executeImport();
    });

    expect(success).toBe(false);
    expect(result.current.submitError).toContain('Obergrenze');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
