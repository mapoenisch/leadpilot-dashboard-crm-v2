import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaterfallChart, WaterfallStep } from '../WaterfallChart';

describe('WaterfallChart', () => {
  it('returns null when steps array is empty', () => {
    const { container } = render(<WaterfallChart steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders waterfall steps with labels and running balance bars', () => {
    const steps: WaterfallStep[] = [
      { label: 'Start-ARR', value: 100000 },
      { label: 'Neugeschäft', value: 30000 },
      { label: 'Churn', value: -10000 },
      { label: 'End-ARR', value: 120000, isTotal: true },
    ];

    render(<WaterfallChart steps={steps} unit="€" />);

    expect(screen.getByText('Start-ARR')).toBeInTheDocument();
    expect(screen.getByText('Neugeschäft')).toBeInTheDocument();
    expect(screen.getByText('Churn')).toBeInTheDocument();
    expect(screen.getByText('End-ARR')).toBeInTheDocument();
  });
});
