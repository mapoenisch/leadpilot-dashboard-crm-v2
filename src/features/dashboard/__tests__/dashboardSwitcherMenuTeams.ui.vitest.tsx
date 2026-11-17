import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardSwitcherMenuV2 } from '../components/editor/selection/DashboardSwitcherMenuV2';
import type {
  AccessibleDashboardListItemV2,
  StoredDashboardV2Row,
} from '../services/dashboardStorageV2Types';

describe('Auftrag 163 - T1 Rot-Nachweis (a): Switcher-Menü zeigt Team-Gruppe', () => {
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
});
