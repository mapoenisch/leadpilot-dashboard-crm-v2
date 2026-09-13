import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveFunnelBarChart } from '../LiveFunnelBarChart';
import * as liveKpiActivityHook from '@/hooks/useLiveKpiActivity';

vi.mock('@/hooks/useLiveKpiActivity');

describe('LiveFunnelBarChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders incomplete status when not all 5 funnel stages are present', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [
        {
          kpiId: 'pipeline_leads',
          value: 120,
          occurredAt: new Date().toISOString(),
          qualityStatus: 'valid',
          unit: 'Leads',
        },
      ],
      status: 'live',
    });

    render(<LiveFunnelBarChart />);
    expect(screen.getByText('Live Funnel nach Stufe')).toBeInTheDocument();
    expect(screen.getByText('1/5 bestätigt')).toBeInTheDocument();
  });

  it('renders complete funnel bar chart when all 5 stages are present', () => {
    const now = new Date().toISOString();
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [
        { kpiId: 'pipeline_leads', value: 500, occurredAt: now, qualityStatus: 'valid', unit: 'Leads' },
        { kpiId: 'pipeline_mql', value: 250, occurredAt: now, qualityStatus: 'valid', unit: 'Leads' },
        { kpiId: 'pipeline_sql', value: 100, occurredAt: now, qualityStatus: 'valid', unit: 'Leads' },
        { kpiId: 'pipeline_offers', value: 40, occurredAt: now, qualityStatus: 'valid', unit: 'Leads' },
        { kpiId: 'pipeline_won', value: 15, occurredAt: now, qualityStatus: 'valid', unit: 'Leads' },
      ],
      status: 'live',
    });

    render(<LiveFunnelBarChart />);
    expect(screen.getByText('5/5 Stufen aktiv')).toBeInTheDocument();
    expect(screen.getByText('Bestätigter Wert')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('shows degraded warning badge when any stage is degraded', () => {
    const now = new Date().toISOString();
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [
        { kpiId: 'pipeline_leads', value: 500, occurredAt: now, qualityStatus: 'valid', unit: 'Leads' },
        { kpiId: 'pipeline_mql', value: 250, occurredAt: now, qualityStatus: 'degraded', unit: 'Leads' },
        { kpiId: 'pipeline_sql', value: 100, occurredAt: now, qualityStatus: 'valid', unit: 'Leads' },
        { kpiId: 'pipeline_offers', value: 40, occurredAt: now, qualityStatus: 'valid', unit: 'Leads' },
        { kpiId: 'pipeline_won', value: 15, occurredAt: now, qualityStatus: 'valid', unit: 'Leads' },
      ],
      status: 'live',
    });

    render(<LiveFunnelBarChart />);
    expect(
      screen.getByText('Qualität eingeschränkt (Degraded Snapshot in einer Stufe)')
    ).toBeInTheDocument();
  });
});
