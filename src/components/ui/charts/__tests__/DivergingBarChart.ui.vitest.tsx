import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DivergingBarChart, DivergingImpactItem } from '../DivergingBarChart';

describe('DivergingBarChart', () => {
  it('returns null when items is empty', () => {
    const { container } = render(<DivergingBarChart items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders diverging impact items with baseline and delta values', () => {
    const items: DivergingImpactItem[] = [
      { label: 'Vertriebsoptimierung', delta: 50000, baseline: 120000, isFavorable: true },
      { label: 'Kostensteigerung Hosting', delta: -15000, baseline: 30000, isFavorable: false },
    ];

    render(<DivergingBarChart items={items} unit="€" />);

    expect(screen.getByText('Vertriebsoptimierung')).toBeInTheDocument();
    expect(screen.getByText('+50.000 €')).toBeInTheDocument();
    expect(screen.getByText('Kostensteigerung Hosting')).toBeInTheDocument();
    expect(screen.getByText('-15.000 €')).toBeInTheDocument();
  });
});
