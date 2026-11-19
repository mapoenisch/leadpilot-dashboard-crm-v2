import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlarmSection } from '../components/editor/inspector/threshold/AlarmSection';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { role: 'manager', organizationId: 'org-1', userId: 'user-1' },
    user: { id: 'user-1' },
  }),
}));

const mockTile: DashboardTileConfigV2 = {
  id: 'tile-alarm-test',
  catalogId: 'crm.pipeline_deals',
  title: 'Deals',
  presentation: 'zahl',
  layouts: { desktop: { x: 0, y: 0, w: 4, h: 4 }, mobile: { x: 0, y: 0, w: 1, h: 2 } },
  threshold: {
    formatVersion: 2,
    enabled: true,
    art: 'hoch_ist_schlecht',
    einheit: 'Stück',
    warnung: 10,
    kritisch: 20,
  },
};

const mockCatalogEntry: ActiveCatalogEntry = {
  id: 'crm.pipeline_deals',
  name: 'Deals in Pipeline',
  category: 'vertrieb_crm',
  kind: 'kpi',
  status: 'aktiv',
  source: { layer: 'crm', module: 'pipeline', exportName: 'DEALS' },
  definition: 'Anzahl Deals in aktiven Pipeline-Stufen',
  unit: 'Stück',
  shape: 'einzelwert',
  aggregation: 'bestand',
  timeMode: 'aktuell',
  timeBasis: 'stichtag',
  detailRouteId: 'crm.pipeline_deals',
  views: ['zahl'],
  defaultView: 'zahl',
  minSize: 'klein',
  groupings: [],
  filters: [],
  history: { kind: 'fest', reconstructable: 'nein', note: 'test' },
  access: 'Jeder',
};

describe('AlarmSection (Auftrag 168 / P13c)', () => {
  it('rendert den Alarm-Abschnitt mit Checkbox', () => {
    render(
      <AlarmSection
        selectedTile={mockTile}
        dashboardId="dash-1"
        catalogEntry={mockCatalogEntry}
        hasValidRule={true}
        isDirty={false}
        canWrite={true}
      />,
    );
    expect(screen.getByTestId('alarm-section')).toBeInTheDocument();
    expect(screen.getByTestId('alarm-toggle-checkbox')).toBeInTheDocument();
  });

  it('zeigt Sperrgrund, wenn das Dashboard noch nicht gespeichert ist (isDirty)', () => {
    render(
      <AlarmSection
        selectedTile={mockTile}
        dashboardId="dash-1"
        catalogEntry={mockCatalogEntry}
        hasValidRule={true}
        isDirty={true}
        canWrite={true}
      />,
    );
    const reason = screen.getByTestId('alarm-disabled-reason');
    expect(reason).toHaveTextContent('Speichere das Dashboard zuerst.');
    expect(screen.getByTestId('alarm-toggle-checkbox')).toBeDisabled();
  });

  it('zeigt Sperrgrund, wenn die Kennzahl nicht alarmfähig ist', () => {
    const nonAlarmKpi: ActiveCatalogEntry = {
      ...mockCatalogEntry,
      id: 'custom.not_capable',
    };
    render(
      <AlarmSection
        selectedTile={{ ...mockTile, catalogId: 'custom.not_capable' }}
        dashboardId="dash-1"
        catalogEntry={nonAlarmKpi}
        hasValidRule={true}
        isDirty={false}
        canWrite={true}
      />,
    );
    const reason = screen.getByTestId('alarm-disabled-reason');
    expect(reason).toHaveTextContent('Für diese Kennzahl gibt es noch keinen Server-Alarm.');
    expect(screen.getByTestId('alarm-toggle-checkbox')).toBeDisabled();
  });
});
