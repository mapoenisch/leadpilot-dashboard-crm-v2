import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SteppedFunnelChart, FunnelStage } from '../SteppedFunnelChart';

describe('SteppedFunnelChart', () => {
  it('returns null when stages is empty', () => {
    const { container } = render(<SteppedFunnelChart stages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders funnel stages with conversion and bottleneck alerts', () => {
    const stages: FunnelStage[] = [
      { name: 'Leads', count: 1000, value: 500000 },
      {
        name: 'MQL',
        count: 200,
        value: 100000,
        isBottleneck: true,
        bottleneckReason: 'Lead-Qualifizierung verlangsamt',
      },
      { name: 'Deals Closed', count: 50, value: 30000 },
    ];

    render(<SteppedFunnelChart stages={stages} unit="Leads" valueUnit="€" />);

    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('MQL')).toBeInTheDocument();
    expect(screen.getByText('Deals Closed')).toBeInTheDocument();
    expect(screen.getByText(/Lead-Qualifizierung verlangsamt/)).toBeInTheDocument();
  });
});
