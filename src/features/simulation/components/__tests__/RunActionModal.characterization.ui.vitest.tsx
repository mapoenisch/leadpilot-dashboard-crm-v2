import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunActionModal } from '../RunActionModal';

describe('RunActionModal (characterization)', () => {
  it('geschlossen rendert nichts', () => {
    const { container } = render(<RunActionModal isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offen zeigt alle drei Aktionen und Quellen-Hinweis', () => {
    render(<RunActionModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'SimulationRun Steuerung' })).toBeInTheDocument();
    expect(screen.getByText('Run Ausführen (Preflight-Prüfung)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Neuen Run Starten' })).toBeInTheDocument();
    expect(screen.getByText(/Re-Run \(Erneut ausführen/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Re-Run Ausführen' })).toBeInTheDocument();
    expect(screen.getByText(/Reproduce \(Exakt Reproduzieren/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reproduzieren' })).toBeInTheDocument();
    expect(screen.getByText(/Aktive Version:/)).toBeInTheDocument();
    expect(screen.getByText(/Quelle:/)).toBeInTheDocument();
  });

  it('Reproduzieren ohne Auswahl zeigt Fehlermeldung', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RunActionModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Reproduzieren' }));
    expect(
      screen.getByText('Bitte wählen Sie einen Run zum Reproduzieren aus.'),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
