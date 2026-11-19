import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
let mockRulesSuccess = true;
let mockRulesError = false;

vi.mock('@/auth/organizationContext', () => ({
  useOrganization: () => ({
    session: { role: 'manager', organizationId: 'org-1', userId: 'user-1' },
    user: { id: 'user-1' },
  }),
}));

vi.mock('../hooks/useDashboardAlarms', () => ({
  useDashboardAlarms: () => ({
    rules: mockRules,
    isRulesSuccess: mockRulesSuccess,
    isRulesError: mockRulesError,
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

const makeRule = (
  id: string,
  ruleConfig: Record<string, unknown> = mockTile.threshold as unknown as Record<string, unknown>,
): DashboardAlarmRule => ({
  id,
  dashboardId: 'dash-1',
  tileId: mockTile.id,
  catalogId: 'crm.pipeline_deals',
  status: 'aktiv',
  mindestdauerLaeufe: 2,
  abklingzeitSekunden: 3600,
  ruleConfig,
  responsibleUserId: 'user-1',
  createdAt: '2026-11-19T10:00:00Z',
  updatedAt: '2026-11-19T10:00:00Z',
});

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
    mockRulesSuccess = true;
    mockRulesError = false;
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
    const activeRule: DashboardAlarmRule = makeRule('rule-123', { warnung: 10 });
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
        ruleConfig: activeRule.ruleConfig,
        mindestdauerLaeufe: 3,
      }),
    );

    // Abklingzeit ändern
    // Abklingzeit ändern – erst nach Abschluss des ersten Updates, und mit der
    // gerade gewählten Mindestdauer (kein gegenseitiges Überschreiben).
    const abklingzeitSelect = screen.getByTestId('alarm-abklingzeit-select');
    await waitFor(() => expect(abklingzeitSelect).not.toBeDisabled());
    fireEvent.change(abklingzeitSelect, { target: { value: '900' } });
    await waitFor(() =>
      expect(mockUpdateRule).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ruleId: 'rule-123',
          ruleConfig: activeRule.ruleConfig,
          mindestdauerLaeufe: 3,
          abklingzeitSekunden: 900,
        }),
      ),
    );

    // Deaktiviert bei ungespeicherten Entwurfsänderungen (isDirty)
    rerender(
      <AlarmSection
        selectedTile={mockTile}
        dashboardId="dash-1"
        catalogEntry={mockCatalogEntry}
        hasValidRule={true}
        isDirty={true}
        canWrite={true}
      />,
    );
    expect(screen.getByTestId('alarm-mindestdauer-select')).toBeDisabled();
    expect(screen.getByTestId('alarm-abklingzeit-select')).toBeDisabled();

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

  it('synchronisiert Schwellenwertänderungen nach dem Speichern mit der Alarmregel', () => {
    const existingRule = makeRule('rule-sync-1', {
      ...mockTile.threshold,
      warnung: 10,
      kritisch: 20,
    });
    mockRules = [existingRule];

    const updatedTile: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        ...(mockTile.threshold as import('../model/thresholdRuleV2').ThresholdRuleV2),
        warnung: 15,
        kritisch: 25,
      },
    };

    render(
      <AlarmSection
        selectedTile={updatedTile}
        dashboardId="dash-1"
        catalogEntry={mockCatalogEntry}
        hasValidRule={true}
        isDirty={false}
        canWrite={true}
      />,
    );

    expect(mockUpdateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'rule-sync-1',
        ruleConfig: expect.objectContaining({ warnung: 15, kritisch: 25 }),
      }),
    );
  });

  it('pausiert Alarmregel automatisch, wenn Schwellenwert deaktiviert und gespeichert ist', () => {
    const existingRule = makeRule('rule-sync-2', { ...mockTile.threshold });
    mockRules = [existingRule];

    const disabledThresholdTile: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        ...mockTile.threshold!,
        enabled: false,
      },
    };

    render(
      <AlarmSection
        selectedTile={disabledThresholdTile}
        dashboardId="dash-1"
        catalogEntry={mockCatalogEntry}
        hasValidRule={true}
        isDirty={false}
        canWrite={true}
      />,
    );

    expect(mockPauseRule).toHaveBeenCalledWith('rule-sync-2');
  });
  it('sperrt den Alarm-Schalter, solange die Regeln nicht erfolgreich geladen sind', () => {
    mockRulesSuccess = false;
    const { rerender } = render(
      <AlarmSection selectedTile={mockTile} dashboardId="dash-1" catalogEntry={mockCatalogEntry} />,
    );
    const checkbox = screen.getByTestId('alarm-toggle-checkbox');
    expect(checkbox).toBeDisabled();
    expect(screen.getByTestId('alarm-rules-unknown')).toHaveTextContent('werden geladen');
    fireEvent.click(checkbox);
    expect(mockCreateRule).not.toHaveBeenCalled();

    mockRulesError = true;
    rerender(
      <AlarmSection selectedTile={mockTile} dashboardId="dash-1" catalogEntry={mockCatalogEntry} />,
    );
    expect(screen.getByTestId('alarm-rules-unknown')).toHaveTextContent(
      'konnten nicht geladen werden',
    );
    expect(screen.getByTestId('alarm-toggle-checkbox')).toBeDisabled();
  });

  it('hält die Lösch-Bestätigung bei Fehlschlag offen', async () => {
    mockDeleteRule.mockResolvedValueOnce({ ok: false, error: 'x' });
    mockRules = [makeRule('rule-del')];
    render(
      <AlarmSection selectedTile={mockTile} dashboardId="dash-1" catalogEntry={mockCatalogEntry} />,
    );
    fireEvent.click(screen.getByTestId('alarm-delete-init-btn'));
    fireEvent.click(screen.getByTestId('alarm-delete-confirm-btn'));
    await waitFor(() => expect(screen.getByTestId('alarm-delete-error')).toBeInTheDocument());
    expect(screen.getByTestId('alarm-delete-confirm-btn')).not.toBeDisabled();
  });

  it('sperrt die Parameter-Auswahl, solange ein Update läuft', async () => {
    let resolveUpdate: (v: { ok: boolean }) => void = () => {};
    mockUpdateRule.mockImplementationOnce(
      () => new Promise<{ ok: boolean }>((r) => (resolveUpdate = r)),
    );
    mockRules = [makeRule('rule-9')];
    render(
      <AlarmSection selectedTile={mockTile} dashboardId="dash-1" catalogEntry={mockCatalogEntry} />,
    );
    fireEvent.change(screen.getByTestId('alarm-mindestdauer-select'), { target: { value: '6' } });
    expect(screen.getByTestId('alarm-abklingzeit-select')).toBeDisabled();
    expect(screen.getByTestId('alarm-mindestdauer-select')).toHaveValue('6');

    resolveUpdate({ ok: false });
    await waitFor(() => expect(screen.getByTestId('alarm-abklingzeit-select')).not.toBeDisabled());
    // Fehlgeschlagenes Update verwirft den Entwurf wieder.
    expect(screen.getByTestId('alarm-mindestdauer-select')).toHaveValue('2');
  });
});
