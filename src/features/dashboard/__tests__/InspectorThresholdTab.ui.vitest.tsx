import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InspectorThresholdTab } from '../components/editor/inspector/InspectorThresholdTab';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import type { ActiveCatalogEntry } from '../model/dashboardCatalog';

const mockTile: DashboardTileConfigV2 = {
  id: 't-1',
  catalogId: 'baseline.arr',
  title: 'ARR',
  presentation: 'zahl',
  layouts: {
    desktop: { x: 0, y: 0, w: 4, h: 4 },
    mobile: { x: 0, y: 0, w: 1, h: 2 },
  },
};

const mockCatalogEntry: ActiveCatalogEntry = {
  id: 'baseline.arr',
  name: 'ARR',
  category: 'finanzen',
  kind: 'kpi',
  status: 'aktiv',
  source: {
    layer: 'baseline',
    module: 'src/domain/execData.ts',
    exportName: 'EXEC_KPIS_1',
  },
  definition: 'Jährlich wiederkehrender Umsatz',
  unit: 'EUR',
  shape: 'einzelwert',
  aggregation: 'bestand',
  timeMode: 'aktuell',
  timeBasis: 'Stand 2025',
  views: ['zahl'],
  defaultView: 'zahl',
  minSize: 'klein',
  groupings: [],
  filters: [],
  history: { kind: 'fest', reconstructable: 'nein', note: 'Feste Referenzwerte' },
  detailRouteId: 'finanzen',
  access: 'Jeder',
};

describe('InspectorThresholdTab (Auftrag 166 / P13a)', () => {
  it('aktiviert Schwellenwerte ohne kennzahlfremde Vorbelegung (Felder sind leer)', () => {
    const onTileThresholdChange = vi.fn();
    render(
      <InspectorThresholdTab
        selectedTile={mockTile}
        onTileThresholdChange={onTileThresholdChange}
        catalogEntry={mockCatalogEntry}
        currentValue={312}
      />,
    );

    const toggle = screen.getByTestId('threshold-enable-toggle');
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    expect(onTileThresholdChange).toHaveBeenCalledWith('t-1', {
      formatVersion: 2,
      enabled: true,
      art: 'hoch_ist_schlecht',
      einheit: 'EUR',
    });
  });

  it('sperrt Uebernehmen bei widerspruechlichen Grenzen (Kritisch <= Warnung) und zeigt Fehler am Feld', () => {
    const tileWithRule: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 200,
        kritisch: 100, // Widerspruch!
      },
    };

    render(
      <InspectorThresholdTab
        selectedTile={tileWithRule}
        onTileThresholdChange={vi.fn()}
        catalogEntry={mockCatalogEntry}
        currentValue={150}
      />,
    );

    const applyBtn = screen.getByTestId('threshold-apply-btn');
    expect(applyBtn).toBeDisabled();

    const critInput = screen.getByTestId('threshold-kritisch-input');
    expect(critInput).toHaveAttribute('aria-invalid', 'true');

    const errorMsg = screen.getByTestId('threshold-error-kritisch');
    expect(errorMsg).toHaveTextContent('Kritischer Wert muss größer als der Warnwert sein');
  });

  it('erlaubt Uebernehmen sobald Grenzen gueltig sind', () => {
    const onTileThresholdChange = vi.fn();
    const tileWithRule: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 200,
        kritisch: 500,
      },
    };

    render(
      <InspectorThresholdTab
        selectedTile={tileWithRule}
        onTileThresholdChange={onTileThresholdChange}
        catalogEntry={mockCatalogEntry}
        currentValue={250}
      />,
    );

    const applyBtn = screen.getByTestId('threshold-apply-btn');
    expect(applyBtn).not.toBeDisabled();

    fireEvent.click(applyBtn);
    expect(onTileThresholdChange).toHaveBeenCalledWith('t-1', {
      formatVersion: 2,
      enabled: true,
      art: 'hoch_ist_schlecht',
      einheit: 'EUR',
      warnung: 200,
      kritisch: 500,
    });
  });

  it('zeigt Live-Vorschau basierend auf aktuellem Kachelwert', () => {
    const tileWithRule: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 200,
        kritisch: 500,
      },
    };

    render(
      <InspectorThresholdTab
        selectedTile={tileWithRule}
        onTileThresholdChange={vi.fn()}
        catalogEntry={mockCatalogEntry}
        currentValue={250}
      />,
    );

    const preview = screen.getByTestId('threshold-live-preview');
    expect(preview).toHaveTextContent('Warnung (ab 200 EUR)');
  });

  it('ist gesperrt fuer Nicht-Einzelwerte (z. B. Zeitreihen)', () => {
    const timeSeriesCatalogEntry: ActiveCatalogEntry = {
      ...mockCatalogEntry,
      shape: 'zeitreihe',
    };

    render(
      <InspectorThresholdTab
        selectedTile={mockTile}
        onTileThresholdChange={vi.fn()}
        catalogEntry={timeSeriesCatalogEntry}
      />,
    );

    expect(screen.queryByTestId('threshold-enable-toggle')).toBeNull();
    expect(
      screen.getByText('Schwellenwerte gibt es nur für Kacheln mit einem einzelnen Wert.'),
    ).toBeInTheDocument();
  });

  it('zeigt in der Leseansicht (isReadOnly) nur die Regelanzeige ohne Formular', () => {
    const tileWithRule: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 200,
        kritisch: 500,
      },
    };

    render(
      <InspectorThresholdTab
        selectedTile={tileWithRule}
        onTileThresholdChange={vi.fn()}
        catalogEntry={mockCatalogEntry}
        isReadOnly={true}
      />,
    );

    expect(screen.queryByTestId('threshold-enable-toggle')).toBeNull();
    expect(screen.getByText('Warnung ab 200 EUR, Kritisch ab 500 EUR')).toBeInTheDocument();
  });

  it('zeigt bei Altregeln mit between die Reset-Moeglichkeit an', () => {
    const onTileThresholdChange = vi.fn();
    const legacyTile: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        enabled: true,
        operator: 'between',
        warningValue: 100,
        criticalValue: 200,
      },
    };

    render(
      <InspectorThresholdTab
        selectedTile={legacyTile}
        onTileThresholdChange={onTileThresholdChange}
        catalogEntry={mockCatalogEntry}
      />,
    );

    expect(screen.getByTestId('threshold-invalid-notice')).toBeInTheDocument();
    const resetBtn = screen.getByTestId('threshold-reset-btn');
    fireEvent.click(resetBtn);

    expect(onTileThresholdChange).toHaveBeenCalledWith('t-1', {
      formatVersion: 2,
      enabled: true,
      art: 'hoch_ist_schlecht',
      einheit: 'EUR',
    });
  });
});
