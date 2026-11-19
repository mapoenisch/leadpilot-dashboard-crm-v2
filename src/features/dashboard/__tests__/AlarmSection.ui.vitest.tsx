import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlarmSection } from '../components/editor/inspector/threshold/AlarmSection';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardAlarmRule } from '../services/dashboardAlarmTypes';

const mockCreateRule = vi.fn().mockResolvedValue({});
const mockUpdateRule = vi.fn().mockResolvedValue({});
const mockPauseRule = vi.fn().mockResolvedValue({});
const mockResumeRule = vi.fn().mockResolvedValue({});
const mockDeleteRule = vi.fn().mockResolvedValue({});
let mockRules: DashboardAlarmRule[] = [];

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { role: 'manager', organizationId: 'org-1', userId: 'user-1' },
    user: { id: 'user-1' },
  }),
}));

vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: () => ({
    rules: mockRules,
    createRule: mockCreateRule,
    updateRule: mockUpdateRule,
    pauseRule: mockPauseRule,
    resumeRule: mockResumeRule,
    deleteRule: mockDeleteRule,
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockRules = [];
  });

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

  it('erzeugt Regel beim Einschalten der Checkbox', async () => {
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

    const checkbox = screen.getByTestId('alarm-toggle-checkbox');
    fireEvent.click(checkbox);

    expect(mockCreateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboardId: 'dash-1',
        tileId: mockTile.id,
        catalogId: 'crm.pipeline_deals',
        mindestdauerLaeufe: 2,
        abklingzeitSekunden: 3600,
      }),
    );
  });

  it('rendert Konfiguration und steuert Aktionen bei vorhandener Regel', async () => {
    const activeRule: DashboardAlarmRule = {
      id: 'rule-123',
      dashboardId: 'dash-1',
      tileId: mockTile.id,
      catalogId: 'crm.pipeline_deals',
      status: 'aktiv',
      mindestdauerLaeufe: 2,
      abklingzeitSekunden: 3600,
      ruleConfig: { warnung: 10 },
      responsibleUserId: 'user-1',
      createdAt: '2026-11-19T10:00:00Z',
      updatedAt: '2026-11-19T10:00:00Z',
    };
    mockRules = [activeRule];

    const { rerender } = render(
      <AlarmSection
        selectedTile={mockTile}
        dashboardId="dash-1"
        catalogEntry={mockCatalogEntry}
        hasValidRule={true}
        isDirty={false}
        canWrite={true}
      />,
    );

    expect(screen.getByTestId('alarm-status-badge')).toHaveTextContent('Aktiv');

    // Mindestdauer ändern
    const mindestdauerSelect = screen.getByTestId('alarm-mindestdauer-select');
    fireEvent.change(mindestdauerSelect, { target: { value: '3' } });
    expect(mockUpdateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'rule-123',
        mindestdauerLaeufe: 3,
      }),
    );

    // Abklingzeit ändern
    const abklingzeitSelect = screen.getByTestId('alarm-abklingzeit-select');
    fireEvent.change(abklingzeitSelect, { target: { value: '900' } });
    expect(mockUpdateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'rule-123',
        abklingzeitSekunden: 900,
      }),
    );

    // Pausieren
    const pauseBtn = screen.getByTestId('alarm-pause-btn');
    expect(pauseBtn).toHaveTextContent('Pausieren');
    fireEvent.click(pauseBtn);
    expect(mockPauseRule).toHaveBeenCalledWith('rule-123');

    // Fortsetzen bei pausiertem Status
    mockRules = [
      {
        ...activeRule,
        status: 'pausiert',
      },
    ];
    rerender(
      <AlarmSection
        selectedTile={mockTile}
        dashboardId="dash-1"
        catalogEntry={mockCatalogEntry}
        hasValidRule={true}
        isDirty={false}
        canWrite={true}
      />,
    );
    expect(screen.getByTestId('alarm-status-badge')).toHaveTextContent('Pausiert');
    const resumeBtn = screen.getByTestId('alarm-pause-btn');
    expect(resumeBtn).toHaveTextContent('Fortsetzen');
    fireEvent.click(resumeBtn);
    expect(mockResumeRule).toHaveBeenCalledWith('rule-123');

    // Löschen initialisieren und bestätigen
    const deleteInitBtn = screen.getByTestId('alarm-delete-init-btn');
    fireEvent.click(deleteInitBtn);
    const confirmBtn = screen.getByTestId('alarm-delete-confirm-btn');
    fireEvent.click(confirmBtn);
    expect(mockDeleteRule).toHaveBeenCalledWith('rule-123');
  });
});
