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

    // Codex finding 3: Die Aktivierung bleibt zunächst lokal, unvollständige Regeln werden nicht unvalidiert in die Config geschrieben
    expect(toggle).toBeChecked();
    expect(onTileThresholdChange).not.toHaveBeenCalled();

    // Eingabefelder sind sichtbar und leer
    const warnInput = screen.getByTestId('threshold-warnung-input') as HTMLInputElement;
    expect(warnInput).toBeVisible();
    expect(warnInput.value).toBe('');

    // Übernehmen ist noch gesperrt (da Warnwert fehlt)
    const applyBtn = screen.getByTestId('threshold-apply-btn');
    expect(applyBtn).toBeDisabled();
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

  it('Codex Finding 1: behaelt den DOM-Fokus beim Eintippen mehrstelliger Werte', () => {
    const tileWithRule: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
      },
    };

    render(
      <InspectorThresholdTab
        selectedTile={tileWithRule}
        onTileThresholdChange={vi.fn()}
        catalogEntry={mockCatalogEntry}
      />,
    );

    const warnInput = screen.getByTestId('threshold-warnung-input') as HTMLInputElement;
    warnInput.focus();
    expect(document.activeElement).toBe(warnInput);

    // Erste Ziffer tippen
    fireEvent.change(warnInput, { target: { value: '1' } });
    expect(document.activeElement).toBe(warnInput);

    // Zweite Ziffer tippen
    fireEvent.change(warnInput, { target: { value: '10' } });
    expect(document.activeElement).toBe(warnInput);
    expect(warnInput.value).toBe('10');
  });

  it('Codex Finding 2: synchronisiert den Formularentwurf bei Undo/Redo von aussen', () => {
    const tileA: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 500,
      },
    };

    const { rerender } = render(
      <InspectorThresholdTab
        selectedTile={tileA}
        onTileThresholdChange={vi.fn()}
        catalogEntry={mockCatalogEntry}
      />,
    );

    const warnInput = screen.getByTestId('threshold-warnung-input') as HTMLInputElement;
    expect(warnInput.value).toBe('500');

    // Undo-Simulation: Parent reicht zurueckgesetzten Schwellenwert herein
    const tileAfterUndo: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 200,
      },
    };

    rerender(
      <InspectorThresholdTab
        selectedTile={tileAfterUndo}
        onTileThresholdChange={vi.fn()}
        catalogEntry={mockCatalogEntry}
      />,
    );

    expect(warnInput.value).toBe('200');
  });

  it('Codex Finding 4: beruecksichtigt den Datenzustand in der Live-Vorschau (z. B. veraltet)', () => {
    const tileWithRule: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 100,
      },
    };

    render(
      <InspectorThresholdTab
        selectedTile={tileWithRule}
        onTileThresholdChange={vi.fn()}
        catalogEntry={mockCatalogEntry}
        currentValue={1234}
        tileDataState="veraltet"
      />,
    );

    const preview = screen.getByTestId('threshold-live-preview');
    expect(preview).toHaveTextContent('Kachel veraltet');
  });

  it('Codex Review 2 Finding: unterscheidet ungueltige Eingaben wie 500,0,0 von leeren optionalen Feldern', () => {
    const onTileThresholdChange = vi.fn();
    const tileWithRule: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 100,
        kritisch: 200,
      },
    };

    render(
      <InspectorThresholdTab
        selectedTile={tileWithRule}
        onTileThresholdChange={onTileThresholdChange}
        catalogEntry={mockCatalogEntry}
      />,
    );

    const applyBtn = screen.getByTestId('threshold-apply-btn');
    const kritInput = screen.getByTestId('threshold-kritisch-input') as HTMLInputElement;

    // Ungueltiger Text 500,0,0 sperrt Uebernehmen und zeigt Fehler
    fireEvent.change(kritInput, { target: { value: '500,0,0' } });
    expect(applyBtn).toBeDisabled();
    expect(screen.getByText('Kritischer Wert muss eine Zahl sein.')).toBeInTheDocument();

    // Geleertes Feld entfernt die optionale Grenze valide
    fireEvent.change(kritInput, { target: { value: '' } });
    expect(applyBtn).not.toBeDisabled();
    fireEvent.click(applyBtn);

    expect(onTileThresholdChange).toHaveBeenCalledWith('t-1', {
      formatVersion: 2,
      enabled: true,
      art: 'hoch_ist_schlecht',
      einheit: 'EUR',
      warnung: 100,
    });
  });

  it('Codex Review 3 Finding: entfernt inaktive Zahlenfelder beim Wechsel der Regelart', () => {
    const onTileThresholdChange = vi.fn();
    const tileWithRule: DashboardTileConfigV2 = {
      ...mockTile,
      threshold: {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 100,
      },
    };

    render(
      <InspectorThresholdTab
        selectedTile={tileWithRule}
        onTileThresholdChange={onTileThresholdChange}
        catalogEntry={mockCatalogEntry}
      />,
    );

    const kritInput = screen.getByTestId('threshold-kritisch-input') as HTMLInputElement;
    fireEvent.change(kritInput, { target: { value: '500,0,0' } });

    // Wechsel zu Zielbereich
    const zielbereichRadio = screen.getByTestId('threshold-art-zielbereich');
    fireEvent.click(zielbereichRadio);

    // Zielbereich ausfuellen
    fireEvent.change(screen.getByTestId('threshold-untenWarnung-input'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByTestId('threshold-obenWarnung-input'), {
      target: { value: '150' },
    });

    const applyBtn = screen.getByTestId('threshold-apply-btn');
    expect(applyBtn).not.toBeDisabled();
    fireEvent.click(applyBtn);

    expect(onTileThresholdChange).toHaveBeenCalledWith('t-1', {
      formatVersion: 2,
      enabled: true,
      art: 'zielbereich',
      einheit: 'EUR',
      untenWarnung: 50,
      obenWarnung: 150,
    });
    const emittedRule = onTileThresholdChange.mock.calls[0]![1];
    expect(emittedRule).not.toHaveProperty('kritisch');
    expect(emittedRule).not.toHaveProperty('warnung');
  });
});
