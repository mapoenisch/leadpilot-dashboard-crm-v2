import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveFunnelBarChart } from '../LiveFunnelBarChart';
import * as liveKpiActivityHook from '@/hooks/useLiveKpiActivity';

vi.mock('@/hooks/useLiveKpiActivity');
vi.mock('@/services/liveKpi/liveKpiDefinitions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/liveKpi/liveKpiDefinitions')>();
  return {
    ...actual,
    getLiveKpiDefinition: (id: string) =>
      id === 'pipeline_sql' ? undefined : actual.getLiveKpiDefinition(id),
  };
});

const IDS = ['pipeline_leads', 'pipeline_mql', 'pipeline_sql', 'pipeline_offers', 'pipeline_won'];

function item(kpiId: string, value: unknown, qualityStatus?: string) {
  return {
    kpiId,
    value,
    occurredAt: new Date().toISOString(),
    ...(qualityStatus === undefined ? {} : { qualityStatus }),
    unit: 'Anzahl',
  } as never;
}

describe('LiveFunnelBarChart (branch3)', () => {
  const origMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.matchMedia = origMatchMedia;
  });

  it('volle 5/5: Aktiv-Badge, Diagramm-Container und Panel-Klasse ohne Extraklasse', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: IDS.map((id) => item(id, 100)),
      status: 'live',
    });
    const { container } = render(<LiveFunnelBarChart />);
    expect(screen.getByText('5/5 Stufen aktiv')).toBeInTheDocument();
    expect(container.querySelector('.live-performance-panel')).not.toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(
      screen.queryByText('Qualität eingeschränkt (Degraded Snapshot in einer Stufe)'),
    ).not.toBeInTheDocument();
  });

  it('fehlende KPI-Definition nutzt die ID als Stufenlabel', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [item('pipeline_sql', 77)],
      status: 'live',
    });
    render(<LiveFunnelBarChart />);
    expect(screen.getByText('1/5 bestätigt')).toBeInTheDocument();
    // Label erscheint in Diagrammachse und Tabelle (Fallback greift in beiden).
    expect(screen.getAllByText('pipeline_sql').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('77')).toBeInTheDocument();
  });

  it('Wert Null zählt als bestätigt und erscheint in der Tabelle', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [item('pipeline_leads', 0)],
      status: 'live',
    });
    render(<LiveFunnelBarChart />);
    expect(screen.getByText('1/5 bestätigt')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('reduzierte Bewegung per MatchMedia rendert weiter vollständig', () => {
    window.matchMedia = (() => ({ matches: true })) as never as typeof window.matchMedia;
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: IDS.map((id) => item(id, 50)),
      status: 'live',
    });
    render(<LiveFunnelBarChart />);
    expect(screen.getByText('5/5 Stufen aktiv')).toBeInTheDocument();
    expect(screen.getByText('Live Funnel nach Stufe')).toBeInTheDocument();
  });

  it('fehlender Qualitätsstatus gilt als gültig ohne Warnung', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [item('pipeline_leads', 300)],
      status: 'live',
    });
    render(<LiveFunnelBarChart />);
    expect(screen.getByText('Gültig')).toBeInTheDocument();
    expect(
      screen.queryByText('Qualität eingeschränkt (Degraded Snapshot in einer Stufe)'),
    ).not.toBeInTheDocument();
  });
});
