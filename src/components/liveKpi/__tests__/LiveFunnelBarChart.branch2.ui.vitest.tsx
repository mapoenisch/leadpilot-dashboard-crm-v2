import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveFunnelBarChart } from '../LiveFunnelBarChart';
import * as liveKpiActivityHook from '@/hooks/useLiveKpiActivity';

vi.mock('@/hooks/useLiveKpiActivity');

const IDS = ['pipeline_leads', 'pipeline_mql', 'pipeline_sql', 'pipeline_offers', 'pipeline_won'];

function item(kpiId: string, value: number, qualityStatus: 'degraded' | 'valid' = 'valid') {
  return {
    kpiId,
    value,
    occurredAt: new Date().toISOString(),
    qualityStatus,
    unit: 'Anzahl',
  };
}

describe('LiveFunnelBarChart (branch2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('leerer Feed: Warte-Platzhalter, neutrales Badge und Tabellen-Striche', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [],
      status: 'live',
    });
    render(<LiveFunnelBarChart />);
    expect(screen.getByText('0/5 bestätigt')).toBeInTheDocument();
    expect(
      screen.getByText('Warte auf bestätigte Funnel-Snapshots aus n8n / Live-Feed...'),
    ).toBeInTheDocument();
    // Tabelle: keine Werte, keine Qualität
    expect(screen.getAllByText('Warte auf bestätigten Live-Wert').length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5);
    expect(
      screen.queryByText('Qualität eingeschränkt (Degraded Snapshot in einer Stufe)'),
    ).not.toBeInTheDocument();
  });

  it('nicht-numerische Werte zählen nicht als bestätigt', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      // @ts-expect-error branch: Wert ist kein number
      items: [item('pipeline_leads', 'viel'), item('pipeline_mql', null)],
      status: 'live',
    });
    render(<LiveFunnelBarChart />);
    expect(screen.getByText('0/5 bestätigt')).toBeInTheDocument();
  });

  it('doppelte KPI-IDs: nur erstes Item je Stufe wird gewertet', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [item('pipeline_leads', 500), item('pipeline_leads', 5)],
      status: 'live',
    });
    render(<LiveFunnelBarChart />);
    expect(screen.getByText('1/5 bestätigt')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.queryByText(/^5$/)).not.toBeInTheDocument();
  });

  it('className wird mit Panel-Klasse kombiniert, Region-Label bleibt', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [],
      status: 'live',
    });
    const { container } = render(<LiveFunnelBarChart className="extra-klasse" />);
    expect(container.querySelector('.extra-klasse.live-performance-panel')).not.toBeNull();
    expect(screen.getByRole('region', { name: 'Live Funnel nach Stufe' })).toBeInTheDocument();
  });

  it('degraded Stufe: Tabellen-Qualität Degraded plus Warn-Badge', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [item('pipeline_leads', 300, 'degraded'), ...IDS.slice(1).map((id) => item(id, 10))],
      status: 'live',
    });
    render(<LiveFunnelBarChart />);
    expect(
      screen.getByText('Qualität eingeschränkt (Degraded Snapshot in einer Stufe)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Degraded')).toBeInTheDocument();
    expect(screen.getAllByText('Gültig').length).toBeGreaterThanOrEqual(4);
  });

  it('unbekannte KPI-ID ohne Definition nutzt ID als Label', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      // @ts-expect-error branch: fremde ID ausserhalb der Funnel-IDs
      items: [{ kpiId: 'unbekannt_xyz', value: 42, occurredAt: new Date().toISOString() }],
      status: 'live',
    });
    render(<LiveFunnelBarChart />);
    // fremde IDs werden ignoriert: keine Stufe bestätigt
    expect(screen.getByText('0/5 bestätigt')).toBeInTheDocument();
  });
});
