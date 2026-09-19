import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManagementTierView } from '../ManagementTierView';

function baseProps() {
  return {
    onOpenScenarioModal: vi.fn(),
    onOpenRunModal: vi.fn(),
    onOpenMeasureModal: vi.fn(),
  };
}

describe('ManagementTierView (characterization)', () => {
  it('Standard-Render: Banner, KPI-Karten und Aktions-Buttons', () => {
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText('MANAGEMENT-EBENE')).toBeInTheDocument();
    expect(screen.getByText('Strategische Management-Prognose (P50 Median)')).toBeInTheDocument();
    expect(screen.getByText('Jahresumsatz (ARR P50 Median)')).toBeInTheDocument();
    expect(screen.getByText('Monatsumsatz (MRR P50 Median)')).toBeInTheDocument();
    expect(screen.getByText('Gesamtkunden (P50 Median)')).toBeInTheDocument();
    expect(screen.getByText('Gewonnene Neugeschäft-Deals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simulation Starten' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Szenarien & Parameter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maßnahmen \(/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run / Re-Run' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zurücksetzen' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Finanzprognose & Profitabilität (Net Revenue, EBITDA, Operating Margin, Cash Flow)',
      ),
    ).toBeInTheDocument();
  });

  it('Toolbar-Buttons rufen die übergebenen Callbacks auf', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<ManagementTierView {...props} />);
    await user.click(screen.getByRole('button', { name: 'Szenarien & Parameter' }));
    expect(props.onOpenScenarioModal).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /Maßnahmen \(/ }));
    expect(props.onOpenMeasureModal).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Run / Re-Run' }));
    expect(props.onOpenRunModal).toHaveBeenCalledTimes(1);
  });

  it('Delta-Modus zeigt Vergleichsansicht mit Baseline-Referenz', async () => {
    const user = userEvent.setup();
    render(<ManagementTierView {...baseProps()} />);
    await user.click(screen.getByRole('button', { name: 'Delta Baseline (Δ)' }));
    expect(screen.getByText('Jahresumsatz (ARR P50 Median)')).toBeInTheDocument();
    expect(screen.getAllByText(/Baseline:/).length).toBeGreaterThanOrEqual(2);
  });

  it('Szenariovergleich-Button nur mit Callback-Prop', () => {
    const { rerender } = render(<ManagementTierView {...baseProps()} />);
    expect(screen.queryByRole('button', { name: /Szenariovergleich/ })).not.toBeInTheDocument();
    const onOpenMultiCompareModal = vi.fn();
    rerender(
      <ManagementTierView {...baseProps()} onOpenMultiCompareModal={onOpenMultiCompareModal} />,
    );
    expect(screen.getByRole('button', { name: 'Szenariovergleich (3–4)' })).toBeInTheDocument();
  });
});
