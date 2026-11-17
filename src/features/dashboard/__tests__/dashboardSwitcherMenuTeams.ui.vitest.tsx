import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DashboardSwitcherMenuV2,
  formatRelativeTime,
} from '../components/editor/selection/DashboardSwitcherMenuV2';
import type {
  AccessibleDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';

describe('Auftrag 163 - DashboardSwitcherMenuV2', () => {
  const currentDash: StoredDashboardV2Row = {
    id: 'd-1',
    title: 'Mein persönliches Dashboard',
    scope: 'personal',
    revision: 1,
    config: {
      version: 2,
      id: 'd-1',
      title: 'Mein persönliches Dashboard',
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

  const dashboards: AccessibleDashboardListItemV2[] = [
    {
      id: 'd-1',
      title: 'Mein persönliches Dashboard',
      scope: 'personal',
      teamId: null,
      teamName: null,
      canWrite: true,
      revision: 1,
      tileCount: 1,
      sectionCount: 1,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'd-team-1',
      title: 'Vertrieb Pipeline Overview',
      scope: 'team',
      teamId: 'team-vertrieb',
      teamName: 'Vertrieb',
      canWrite: false,
      revision: 2,
      tileCount: 4,
      sectionCount: 2,
      updatedAt: new Date().toISOString(),
    },
  ];

  it('zeigt Team-Gruppe mit Name und Nur-Lesen Badge für schreibgeschützte Team-Dashboards', () => {
    const onOpenAction = vi.fn();
    const onOpenDuplicateDialog = vi.fn();
    const onKeyDown = vi.fn();
    const itemRefs = { current: [] };

    render(
      <DashboardSwitcherMenuV2
        menuRef={{ current: null }}
        currentDashboard={currentDash}
        dashboards={dashboards}
        errorText={null}
        isPreviewMode={false}
        isLimitReached={false}
        isOnlyOneDashboard={false}
        onOpenAction={onOpenAction}
        onOpenDuplicateDialog={onOpenDuplicateDialog}
        onKeyDown={onKeyDown}
        itemRefs={itemRefs}
      />,
    );

    // Erwartet: Team-Gruppe "Team: Vertrieb"
    expect(screen.getByText(/Team: Vertrieb/i)).toBeInTheDocument();
    // Erwartet: Badge "Nur lesen"
    expect(screen.getByText(/Nur lesen/i)).toBeInTheDocument();
  });

  it('behandelt Aktionen: Neu, Duplizieren, Teilen, Löschen', () => {
    const onOpenAction = vi.fn();
    const onOpenDuplicateDialog = vi.fn();
    const onOpenShareDialog = vi.fn();
    const onKeyDown = vi.fn();
    const itemRefs = { current: [] };

    render(
      <DashboardSwitcherMenuV2
        menuRef={{ current: null }}
        currentDashboard={currentDash}
        dashboards={dashboards}
        errorText={null}
        isPreviewMode={false}
        isLimitReached={false}
        isOnlyOneDashboard={false}
        onOpenAction={onOpenAction}
        onOpenDuplicateDialog={onOpenDuplicateDialog}
        onOpenShareDialog={onOpenShareDialog}
        canShareWithTeam={true}
        onKeyDown={onKeyDown}
        itemRefs={itemRefs}
      />,
    );

    fireEvent.click(screen.getByTestId('new-dashboard-menu-item'));
    expect(onOpenAction).toHaveBeenCalledWith({ type: 'new' });

    fireEvent.click(screen.getByTestId('duplicate-dashboard-menu-item'));
    expect(onOpenDuplicateDialog).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('share-with-team-menu-item'));
    expect(onOpenShareDialog).toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('delete-dashboard-menu-item'));
    expect(onOpenAction).toHaveBeenCalledWith({
      type: 'delete',
      id: currentDash.id,
      title: currentDash.title,
    });
  });

  it('deaktiviert Löschen bei schreibgeschütztem Team-Dashboard', () => {
    const teamReadDash: StoredDashboardV2Row = {
      ...currentDash,
      id: 'd-team-ro',
      scope: 'team',
      canWrite: false,
    };

    render(
      <DashboardSwitcherMenuV2
        menuRef={{ current: null }}
        currentDashboard={teamReadDash}
        dashboards={dashboards}
        errorText={null}
        isPreviewMode={false}
        isLimitReached={false}
        isOnlyOneDashboard={false}
        onOpenAction={vi.fn()}
        onOpenDuplicateDialog={vi.fn()}
        onKeyDown={vi.fn()}
        itemRefs={{ current: [] }}
      />,
    );

    const deleteBtn = screen.getByTestId('delete-dashboard-menu-item');
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveAttribute(
      'title',
      'Keine Schreibberechtigung für dieses Team-Dashboard',
    );
  });

  it('formatiert relative Zeitangaben über formatRelativeTime', () => {
    const now = Date.now();
    expect(formatRelativeTime(new Date(now - 10 * 1000).toISOString())).toBe('gerade eben');
    expect(formatRelativeTime(new Date(now - 5 * 60 * 1000).toISOString())).toBe('vor 5 Min.');
    expect(formatRelativeTime(new Date(now - 2 * 3600 * 1000).toISOString())).toBe('vor 2 Std.');
    expect(formatRelativeTime(new Date(now - 24 * 3600 * 1000).toISOString())).toBe('vor 1 Tag');
    expect(formatRelativeTime(new Date(now - 3 * 24 * 3600 * 1000).toISOString())).toBe(
      'vor 3 Tagen',
    );
    expect(formatRelativeTime('invalid-date')).toBe('');
  });
});
