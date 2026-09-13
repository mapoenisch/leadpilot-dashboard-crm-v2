import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveArrMixDonut } from '../LiveArrMixDonut';
import * as liveKpiActivityHook from '@/hooks/useLiveKpiActivity';

vi.mock('@/hooks/useLiveKpiActivity');

describe('LiveArrMixDonut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders incomplete status when not all 4 sources are present', () => {
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [
        {
          kpiId: 'arr_direct',
          value: 400000,
          occurredAt: new Date().toISOString(),
          qualityStatus: 'valid',
          unit: 'EUR',
        },
      ],
      status: 'live',
    });

    render(<LiveArrMixDonut />);
    expect(screen.getByText('ARR-Mix nach Akquisitionsquelle')).toBeInTheDocument();
    expect(screen.getByText('1/4 Werte')).toBeInTheDocument();
  });

  it('renders complete donut chart when all 4 sources are provided', () => {
    const now = new Date().toISOString();
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [
        { kpiId: 'arr_direct', value: 500000, occurredAt: now, qualityStatus: 'valid', unit: 'EUR' },
        { kpiId: 'arr_partner', value: 300000, occurredAt: now, qualityStatus: 'valid', unit: 'EUR' },
        { kpiId: 'arr_outbound', value: 150000, occurredAt: now, qualityStatus: 'valid', unit: 'EUR' },
        { kpiId: 'arr_other', value: 50000, occurredAt: now, qualityStatus: 'valid', unit: 'EUR' },
      ],
      status: 'live',
    });

    render(<LiveArrMixDonut />);
    expect(screen.getByText('Mix vollständig')).toBeInTheDocument();
    expect(screen.getByText('Summe')).toBeInTheDocument();
    expect(screen.getByText('ARR Direct')).toBeInTheDocument();
  });

  it('shows degraded quality warning badge when any source is degraded', () => {
    const now = new Date().toISOString();
    vi.mocked(liveKpiActivityHook.useLiveKpiActivity).mockReturnValue({
      items: [
        { kpiId: 'arr_direct', value: 500000, occurredAt: now, qualityStatus: 'valid', unit: 'EUR' },
        { kpiId: 'arr_partner', value: 300000, occurredAt: now, qualityStatus: 'degraded', unit: 'EUR' },
        { kpiId: 'arr_outbound', value: 150000, occurredAt: now, qualityStatus: 'valid', unit: 'EUR' },
        { kpiId: 'arr_other', value: 50000, occurredAt: now, qualityStatus: 'valid', unit: 'EUR' },
      ],
      status: 'live',
    });

    render(<LiveArrMixDonut />);
    expect(screen.getByText('Qualität eingeschränkt (Degraded Snapshot)')).toBeInTheDocument();
  });
});
