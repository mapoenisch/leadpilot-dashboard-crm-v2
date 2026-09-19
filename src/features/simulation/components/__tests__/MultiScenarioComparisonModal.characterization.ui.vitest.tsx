import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiScenarioComparisonModal } from '../MultiScenarioComparisonModal';

describe('MultiScenarioComparisonModal (characterization)', () => {
  it('geschlossen rendert nichts', () => {
    const { container } = render(
      <MultiScenarioComparisonModal isOpen={false} onClose={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('offen zeigt Titel, Zone 1 und Übernahme-Footer', () => {
    render(<MultiScenarioComparisonModal isOpen={true} onClose={() => {}} />);
    expect(
      screen.getByRole('dialog', {
        name: 'Multi-Szenario-Vergleich & Trade-Off-Entscheidungsfläche',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ZONE 1: Szenario-Auswahl/)).toBeInTheDocument();
    expect(screen.getByText('Konfiguration übernehmen:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Als neue Version übernehmen' })).toBeInTheDocument();
  });

  it('Schließen-Button ruft onClose auf', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MultiScenarioComparisonModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /^Schließen$/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
