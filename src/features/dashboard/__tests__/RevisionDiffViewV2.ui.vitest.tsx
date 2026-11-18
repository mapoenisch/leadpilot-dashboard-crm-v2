import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RevisionDiffViewV2 } from '../components/editor/versions/RevisionDiffViewV2';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

const sampleConfigA: DashboardConfigV2 = {
  version: 2,
  id: 'dash_a',
  title: 'Dashboard A',
  scope: 'personal',
  ownerUserId: 'usr_me',
  organizationId: 'org_1',
  globalTimeframe: 'letzte_30_tage',
  tiles: [
    {
      id: 't_1',
      catalogId: 'baseline.arr',
      title: 'ARR',
      presentation: 'zahl',
      layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
    },
  ],
};

const sampleConfigB: DashboardConfigV2 = {
  version: 2,
  id: 'dash_b',
  title: 'Dashboard B (Neu)',
  scope: 'personal',
  ownerUserId: 'usr_me',
  organizationId: 'org_1',
  globalTimeframe: 'letzte_7_tage',
  tiles: [
    {
      id: 't_1',
      catalogId: 'baseline.arr',
      title: 'ARR Neu',
      presentation: 'zahl',
      layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
    },
    {
      id: 't_2',
      catalogId: 'baseline.arr',
      title: 'ARR 2',
      presentation: 'zahl',
      layouts: { desktop: { x: 3, y: 0, w: 3, h: 3 } },
    },
  ],
  sections: [{ id: 'sec_1', title: 'Sektion 1', collapsed: false, tileIds: ['t_1'] }],
};

describe('RevisionDiffViewV2', () => {
  it('zeigt Leermeldung an wenn keine Unterschiede vorliegen', () => {
    render(
      <RevisionDiffViewV2
        configA={sampleConfigA}
        configB={sampleConfigA}
        labelA="Rev 1"
        labelB="Rev 2"
        onBack={() => {}}
      />,
    );
    expect(screen.getAllByText('Keine inhaltlichen Unterschiede.').length).toBeGreaterThan(0);
  });

  it('rendert Unterschiede mit Aufklappfunktion', () => {
    render(
      <RevisionDiffViewV2
        configA={sampleConfigA}
        configB={sampleConfigB}
        labelA="Rev 1"
        labelB="Rev 2"
        onBack={() => {}}
      />,
    );

    expect(screen.getByText('Dashboard-Einstellungen')).toBeDefined();

    // Aufklappen
    const toggleBtn = screen.getByText('Dashboard-Einstellungen').closest('button');
    if (toggleBtn) {
      fireEvent.click(toggleBtn);
      expect(screen.getByText('title:')).toBeDefined();
    }
  });
});
