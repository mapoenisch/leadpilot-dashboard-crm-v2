import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CockpitKpiRail } from '../CockpitKpiRail';
import { CockpitKpiItem } from '@/domain/executiveCockpitData';

describe('CockpitKpiRail', () => {
  it('renders list of executive kpi cards with deltas and labels', () => {
    const kpis: CockpitKpiItem[] = [
      {
        id: 'arr',
        label: 'Annual Recurring Revenue',
        value: '1.250.000 €',
        rawValue: 1250000,
        delta: '+12%',
        deltaType: 'positive',
        period: 'vs. Vormonat',
        sourceLabel: 'CRM Sync',
      },
      {
        id: 'burn',
        label: 'Net Burn Rate',
        value: '-45.000 €',
        rawValue: -45000,
        delta: '-5%',
        deltaType: 'negative',
        period: 'MoM',
        sourceLabel: 'Finance',
        isNegativeAlert: true,
      },
    ];

    render(<CockpitKpiRail kpis={kpis} />);

    expect(screen.getByTestId('cockpit-kpi-rail')).toBeInTheDocument();
    expect(screen.getByTestId('cockpit-kpi-arr')).toBeInTheDocument();
    expect(screen.getByText('Annual Recurring Revenue')).toBeInTheDocument();
    expect(screen.getByText('1.250.000 €')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();

    expect(screen.getByTestId('cockpit-kpi-burn')).toBeInTheDocument();
    expect(screen.getByText('Net Burn Rate')).toBeInTheDocument();
    expect(screen.getByText('-45.000 €')).toBeInTheDocument();
  });
});
