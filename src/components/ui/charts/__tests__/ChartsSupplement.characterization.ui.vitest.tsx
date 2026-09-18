import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChartEmptyState } from '../ChartEmptyState';
import { ChartFrame } from '../ChartFrame';
import { ChartInsight } from '../ChartInsight';
import { ChartLegend } from '../ChartLegend';
import { ChartMetricHeader } from '../ChartMetricHeader';
import { ChartTooltip } from '../ChartTooltip';
import { DonutRingChart } from '../DonutRingChart';
import { ManagementChartState } from '../ManagementChartState';
import { ManagementChartTooltip } from '../ManagementChartTooltip';
import { MultiScenarioComparisonChart } from '../MultiScenarioComparisonChart';

describe('ChartEmptyState (characterization)', () => {
  it('rendert Standardtitel und Nachricht', () => {
    render(<ChartEmptyState message="Noch keine Läufe vorhanden" />);
    expect(screen.getByText('Noch keine ausreichende Datenbasis')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Läufe vorhanden')).toBeInTheDocument();
  });

  it('zeigt Fortschritt aus Zählern und eigenes Requirement', () => {
    const { rerender } = render(
      <ChartEmptyState message="Warten" currentCount={2} minRequired={5} />,
    );
    expect(screen.getByText('Status: 2 von 5 Läufen ausgeführt')).toBeInTheDocument();
    rerender(<ChartEmptyState message="Warten" requirement="Mind. 3 Szenarien nötig" />);
    expect(screen.getByText('Mind. 3 Szenarien nötig')).toBeInTheDocument();
  });
});

describe('ChartFrame (characterization)', () => {
  it('rendert Titel, Untertitel und Kinder', () => {
    render(
      <ChartFrame title="ARR-Verlauf" subtitle="Quartalswerte">
        <div>Diagramminhalt</div>
      </ChartFrame>,
    );
    expect(screen.getByText('ARR-Verlauf')).toBeInTheDocument();
    expect(screen.getByText('Quartalswerte')).toBeInTheDocument();
    expect(screen.getByText('Diagramminhalt')).toBeInTheDocument();
  });

  it('zeigt Quellen-Chip, Header-Aktion und Insight', () => {
    render(
      <ChartFrame
        title="Titel"
        sourceLabel="Ebene A"
        headerAction={<button type="button">Aktion</button>}
        insight="Steigend"
      >
        <div>Body</div>
      </ChartFrame>,
    );
    expect(screen.getByText('Ebene A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aktion' })).toBeInTheDocument();
    expect(screen.getByText('Steigend')).toBeInTheDocument();
  });
});

describe('ChartInsight (characterization)', () => {
  it('rendert neutralen Hinweis mit Titel', () => {
    render(<ChartInsight title="Hinweis">Alles im Plan</ChartInsight>);
    expect(screen.getByText('Hinweis:')).toBeInTheDocument();
    expect(screen.getByText('Alles im Plan')).toBeInTheDocument();
  });

  it('unterscheidet positive und Warn-Typen', () => {
    const { rerender } = render(<ChartInsight type="positive">Gut</ChartInsight>);
    expect(screen.getByText('Gut')).toBeInTheDocument();
    rerender(<ChartInsight type="warning">Achtung</ChartInsight>);
    expect(screen.getByText('Achtung')).toBeInTheDocument();
  });
});

describe('ChartLegend (characterization)', () => {
  const items = [
    { label: 'Basis', color: '#00D9C6', value: 120000 },
    { label: 'Szenario', color: '#FF7A3D', value: 90000, sharePercent: 42.6 },
  ];

  it('rendert Einträge mit Werten und Anteilen', () => {
    render(<ChartLegend items={items} />);
    expect(screen.getByRole('list', { name: 'Diagrammlegende' })).toBeInTheDocument();
    expect(screen.getByText('Basis')).toBeInTheDocument();
    expect(screen.getByText('120.000')).toBeInTheDocument();
    expect(screen.getByText('(43%)')).toBeInTheDocument();
  });

  it('meldet Hover per Callback', () => {
    const onItemHover = vi.fn();
    render(<ChartLegend items={items} onItemHover={onItemHover} />);
    const entry = screen.getByText('Basis').closest('div[role="listitem"]');
    expect(entry).not.toBeNull();
    fireEvent.mouseEnter(entry!);
    expect(onItemHover).toHaveBeenCalledWith(0);
    fireEvent.mouseLeave(entry!);
    expect(onItemHover).toHaveBeenCalledWith(null);
  });
});

describe('ChartMetricHeader (characterization)', () => {
  it('rendert Label, Wert und Einheit', () => {
    render(<ChartMetricHeader label="Live ARR" value={411840} unit="€" />);
    expect(screen.getByText('Live ARR')).toBeInTheDocument();
    expect(screen.getByText('411.840')).toBeInTheDocument();
    expect(screen.getByText('€')).toBeInTheDocument();
  });

  it('zeigt Delta, Zielstatus und Basis', () => {
    render(
      <ChartMetricHeader
        label="MRR"
        value="34.320 €"
        deltaPercent={5.2}
        goalStatus="ACHIEVED"
        baselineValue="30.000 €"
      />,
    );
    expect(screen.getByText('ACHIEVED')).toBeInTheDocument();
    expect(screen.getByText(/5\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/Basis: 30\.000 €/)).toBeInTheDocument();
  });
});

describe('ChartTooltip (characterization)', () => {
  const items = [
    { label: 'ARR', value: 120000, color: '#00D9C6', delta: '+5 %', isFavorable: true },
  ];

  it('rendert Titel und Einträge', () => {
    render(<ChartTooltip title="Q4 2025" items={items} />);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Q4 2025')).toBeInTheDocument();
    expect(screen.getByText('ARR')).toBeInTheDocument();
    expect(screen.getByText('120.000')).toBeInTheDocument();
  });

  it('bleibt bei unsichtbar oder leer verborgen', () => {
    const { container, rerender } = render(
      <ChartTooltip title="T" items={items} visible={false} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<ChartTooltip title="T" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DonutRingChart (characterization)', () => {
  const segments = [
    { label: 'Vertrieb', value: 60 },
    { label: 'Service', value: 40 },
  ];

  it('rendert Gesamt und Aufschlüsselung', () => {
    render(<DonutRingChart segments={segments} totalLabel="Mitarbeitende" />);
    expect(screen.getByText('Mitarbeitende')).toBeInTheDocument();
    expect(screen.getByText('Vertrieb')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('(60%)')).toBeInTheDocument();
  });

  it('blendet Balken per Flag aus', () => {
    render(<DonutRingChart segments={segments} showBars={false} />);
    expect(screen.queryByText('Vertrieb')).toBeNull();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});

describe('ManagementChartState (characterization)', () => {
  it('rendert Lade- und Fehlerzustände mit Testids', () => {
    const { rerender } = render(<ManagementChartState type="loading" />);
    expect(screen.getByTestId('management-chart-loading')).toBeInTheDocument();
    rerender(<ManagementChartState type="error" message="Netzwerkfehler" />);
    expect(screen.getByTestId('management-chart-error')).toHaveTextContent('Netzwerkfehler');
  });

  it('zeigt Standardtexte und Quellenhinweis', () => {
    render(<ManagementChartState type="empty" />);
    expect(
      screen.getByText('Keine validen Messdaten für diesen Zeitraum verfügbar'),
    ).toBeInTheDocument();
    expect(screen.getByText(/keine synthetischen Ersatzwerte/)).toBeInTheDocument();
  });
});

describe('ManagementChartTooltip (characterization)', () => {
  it('bleibt ohne aktive Payload verborgen', () => {
    const { container } = render(<ManagementChartTooltip label="Q1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('rendert Label und formatierte Werte', () => {
    render(
      <ManagementChartTooltip active label="Q1 2025" payload={[{ name: 'ARR', value: 100000 }]} />,
    );
    expect(screen.getByText('Q1 2025')).toBeInTheDocument();
    expect(screen.getByText('ARR')).toBeInTheDocument();
    expect(screen.getByText('100 k€')).toBeInTheDocument();
  });
});

describe('MultiScenarioComparisonChart (characterization)', () => {
  const series = [
    {
      id: 'ref',
      name: 'Basis',
      isReference: true,
      color: '#00D9C6',
      points: [
        { tick: 0, value: 100 },
        { tick: 1, value: 120 },
      ],
    },
    {
      id: 'alt',
      name: 'Optimistisch',
      isReference: false,
      color: '#FF7A3D',
      points: [
        { tick: 0, value: 100 },
        { tick: 1, value: 150 },
      ],
    },
  ];

  it('gibt null bei leerer Serie zurück', () => {
    const { container } = render(<MultiScenarioComparisonChart series={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('rendert Trajektorien mit Referenz-Legende', () => {
    render(<MultiScenarioComparisonChart series={series} />);
    expect(
      screen.getByRole('img', { name: 'Multi-Szenario Trajektorienvergleich' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Basis (Referenz)')).toBeInTheDocument();
    expect(screen.getByText('Optimistisch')).toBeInTheDocument();
  });
});
