import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DashboardSwitcherMenuV2,
  formatRelativeTime,
} from '../components/editor/selection/DashboardSwitcherMenuV2';
import type { PersonalDashboardListItemV2, StoredDashboardV2Row } from '../services/dashboardStorageV2Types';

describe('formatRelativeTime', () => {
  it('formatiert Zeiten korrekt für relative Abschnitte', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 10 * 1000).toISOString())).toBe('gerade eben');
    expect(formatRelativeTime(new Date(now - 5 * 60 * 1000).toISOString())).toBe('vor 5 Min.');
    expect(formatRelativeTime(new Date(now - 3 * 3600 * 1000).toISOString())).toBe('vor 3 Std.');
    expect(formatRelativeTime(new Date(now - 24 * 3600 * 1000).toISOString())).toBe('vor 1 Tag');
    expect(formatRelativeTime(new Date(now - 3 * 86400 * 1000).toISOString())).toBe('vor 3 Tagen');
    expect(formatRelativeTime(new Date(now - 30 * 86400 * 1000).toISOString())).toMatch(/\d{2}\.\d{2}/);
    expect(formatRelativeTime('ungültiges-datum')).toBe('');
  });
});

describe('DashboardSwitcherMenuV2 UI-Tests', () => {
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
    updatedAt: new Date().toISOString(),
  };

  const dashboards: PersonalDashboardListItemV2[] = [
    {
      id: 'd-1',
      title: 'Dashboard 1',
      scope: 'personal',
      revision: 1,
      tileCount: 1,
      sectionCount: 1,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'd-2',
      title: 'Dashboard 2',
      scope: 'personal',
      revision: 1,
      tileCount: 3,
      sectionCount: 2,
      updatedAt: new Date().toISOString(),
    },
  ];

  it('rendert Dashboards, Error-Text und Aktionen im Standard-Modus', () => {
    const onOpenAction = vi.fn();
    const onOpenDuplicateDialog = vi.fn();
    const onKeyDown = vi.fn();
    const itemRefs = { current: [] };

    render(
      <DashboardSwitcherMenuV2
        menuRef={{ current: null }}
        currentDashboard={currentDash}
        dashboards={dashboards}
        errorText="Fehler aufgetreten"
        isPreviewMode={false}
        isLimitReached={false}
        isOnlyOneDashboard={false}
        onOpenAction={onOpenAction}
        onOpenDuplicateDialog={onOpenDuplicateDialog}
        onKeyDown={onKeyDown}
        itemRefs={itemRefs}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Fehler aufgetreten');
    expect(screen.getByTestId('current-dashboard-badge')).toHaveTextContent('Geöffnet');

    fireEvent.click(screen.getByTestId('dashboard-item-d-2'));
    expect(onOpenAction).toHaveBeenCalledWith({
      type: 'open',
      id: 'd-2',
      title: 'Dashboard 2',
    });

    fireEvent.click(screen.getByTestId('new-dashboard-menu-item'));
    expect(onOpenAction).toHaveBeenCalledWith({ type: 'new' });

    fireEvent.click(screen.getByTestId('duplicate-dashboard-menu-item'));
    expect(onOpenDuplicateDialog).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('delete-dashboard-menu-item'));
    expect(onOpenAction).toHaveBeenCalledWith({
      type: 'delete',
      id: 'd-1',
      title: 'Dashboard 1',
    });
  });

  it('deaktiviert Aktionen bei Limitierung oder einzelnem Dashboard und blendet Aktionen in Vorschau aus', () => {
    const onOpenAction = vi.fn();
    const onOpenDuplicateDialog = vi.fn();
    const itemRefs = { current: [] };

    const { rerender } = render(
      <DashboardSwitcherMenuV2
        menuRef={{ current: null }}
        currentDashboard={currentDash}
        dashboards={dashboards.slice(0, 1)}
        errorText={null}
        isPreviewMode={false}
        isLimitReached={true}
        isOnlyOneDashboard={true}
        onOpenAction={onOpenAction}
        onOpenDuplicateDialog={onOpenDuplicateDialog}
        onKeyDown={vi.fn()}
        itemRefs={itemRefs}
      />,
    );

    const newBtn = screen.getByTestId('new-dashboard-menu-item');
    const dupBtn = screen.getByTestId('duplicate-dashboard-menu-item');
    const delBtn = screen.getByTestId('delete-dashboard-menu-item');

    expect(newBtn).toBeDisabled();
    expect(dupBtn).toBeDisabled();
    expect(delBtn).toBeDisabled();

    fireEvent.click(newBtn);
    fireEvent.click(dupBtn);
    fireEvent.click(delBtn);
    expect(onOpenAction).not.toHaveBeenCalled();
    expect(onOpenDuplicateDialog).not.toHaveBeenCalled();

    // Vorschau-Modus
    rerender(
      <DashboardSwitcherMenuV2
        menuRef={{ current: null }}
        currentDashboard={currentDash}
        dashboards={dashboards}
        errorText={null}
        isPreviewMode={true}
        isLimitReached={false}
        isOnlyOneDashboard={false}
        onOpenAction={onOpenAction}
        onOpenDuplicateDialog={onOpenDuplicateDialog}
        onKeyDown={vi.fn()}
        itemRefs={itemRefs}
      />,
    );

    expect(screen.queryByTestId('new-dashboard-menu-item')).not.toBeInTheDocument();
  });
});
