import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedKpiValue } from '../AnimatedKpiValue';

describe('AnimatedKpiValue', () => {
  it('renders valid formatted number without animation', () => {
    render(<AnimatedKpiValue value={1250000} unit="€" shouldAnimate={false} />);
    expect(screen.getByText('1.250.000 €')).toBeInTheDocument();
  });

  it('renders fallbackUnit when unit is omitted', () => {
    render(<AnimatedKpiValue value={42} fallbackUnit="Leads" shouldAnimate={false} />);
    expect(screen.getByText('42 Leads')).toBeInTheDocument();
  });

  it('renders dash placeholder when value is NaN or invalid', () => {
    render(<AnimatedKpiValue value={NaN} unit="€" shouldAnimate={false} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders with shouldAnimate enabled and updates value', () => {
    const { rerender } = render(<AnimatedKpiValue value={100} unit="€" shouldAnimate={true} />);
    expect(screen.getByText('100 €')).toBeInTheDocument();

    rerender(<AnimatedKpiValue value={150} unit="€" shouldAnimate={true} />);
    expect(screen.getByText('150 €')).toBeInTheDocument();
  });
});
