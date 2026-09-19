import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioManagerModal } from '../ScenarioManagerModal';

describe('ScenarioManagerModal (characterization)', () => {
  it('geschlossen rendert nichts', () => {
    const { container } = render(<ScenarioManagerModal isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offen zeigt Titel, Header-Bar und beide Tabs', () => {
    render(<ScenarioManagerModal isOpen={true} onClose={() => {}} />);
    expect(
      screen.getByRole('dialog', { name: 'Szenario- & Versions-Entscheidungswerkbank' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aktives Szenario')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-manage-tab')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-diff-tab')).toBeInTheDocument();
    expect(screen.getByText('Szenario wechseln')).toBeInTheDocument();
  });

  it('Tab-Wechsel zwischen Verwalten und Diff funktioniert', async () => {
    const user = userEvent.setup();
    render(<ScenarioManagerModal isOpen={true} onClose={() => {}} />);
    await user.click(screen.getByTestId('scenario-diff-tab'));
    expect(screen.getByText('Referenz-Version (Version A)')).toBeInTheDocument();
    await user.click(screen.getByTestId('scenario-manage-tab'));
    expect(screen.getByText('Szenario wechseln')).toBeInTheDocument();
  });
});
