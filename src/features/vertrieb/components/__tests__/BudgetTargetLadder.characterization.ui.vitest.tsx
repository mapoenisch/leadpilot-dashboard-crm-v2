import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetTargetLadder } from '../BudgetTargetLadder';

describe('BudgetTargetLadder (characterization)', () => {
  it('rendert alle vier Sprossen der Zielkette', () => {
    render(<BudgetTargetLadder />);
    expect(screen.getByText('BUDGET-ZU-ZIEL-LEITER')).toBeInTheDocument();
    expect(
      screen.getByText('Wachstumspfad: Mitteleinsatz bis Neukundenabschluss'),
    ).toBeInTheDocument();
    for (const n of ['SPROSSE 1 VON 4', 'SPROSSE 2 VON 4', 'SPROSSE 3 VON 4', 'SPROSSE 4 VON 4']) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
    for (const title of [
      'Budget & Mitteleinsatz',
      'MQL (Marketing Qualified)',
      'SQL (Sales Qualified)',
      'Neukunden (Ertrag)',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('zeigt Ist-, Ziel- und Verknüpfungsblöcke je Sprosse', () => {
    const { container } = render(<BudgetTargetLadder />);
    expect(screen.getAllByText('Ist FY 2025')).toHaveLength(4);
    expect(screen.getAllByText('Zielplanung Jan. 2027')).toHaveLength(4);
    expect(screen.getAllByText('Verknüpfung:').length).toBe(4);
    expect(container.textContent).toContain('Januar 2027');
  });

  it('führt Testversionen als parallelen Zufluss außerhalb der Kette', () => {
    const { container } = render(<BudgetTargetLadder />);
    expect(screen.getByText('Parallele Testversionen (Self-Service)')).toBeInTheDocument();
    expect(container.textContent).toContain('264 Testversionen gestartet');
  });
});
