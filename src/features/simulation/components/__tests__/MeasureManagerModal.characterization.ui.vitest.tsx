import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeasureManagerModal } from '../MeasureManagerModal';
import { useSimulationStore } from '@/store/simulationStore';

describe('MeasureManagerModal (characterization)', () => {
  beforeEach(() => {
    useSimulationStore.setState({ draftMeasures: [] });
  });

  it('geschlossen rendert nichts', () => {
    const { container } = render(<MeasureManagerModal isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offen zeigt Titel, Phasen-Formular und Maßnahmenzähler', () => {
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    expect(
      screen.getByRole('dialog', { name: 'Maßnahmenmanager & Geführte Wirkungskette' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Geführte 6-Phasen Maßnahmenkonfiguration')).toBeInTheDocument();
    expect(screen.getByText('1. Beschreibung & Zielkontext')).toBeInTheDocument();
    expect(screen.getByText('2. Zeitfenster & Wirkungsverlauf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6. Maßnahme speichern' })).toBeInTheDocument();
    expect(screen.getByText('Aktive Maßnahmen: 0')).toBeInTheDocument();
  });

  it('Speichern ohne Name zeigt Validierungsfehler', async () => {
    const user = userEvent.setup();
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: '6. Maßnahme speichern' }));
    expect(
      screen.getByText('Bitte geben Sie einen Namen für die Maßnahme ein.'),
    ).toBeInTheDocument();
    expect(useSimulationStore.getState().draftMeasures).toHaveLength(0);
  });

  it('gültige Maßnahme wird gespeichert und Zähler steigt', async () => {
    const user = userEvent.setup();
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    await user.type(
      screen.getByPlaceholderText('z. B. Sales-Team Verdopplung'),
      'Vertriebsoffensive Q2',
    );
    await user.click(screen.getByRole('button', { name: '6. Maßnahme speichern' }));
    expect(screen.getByText('Aktive Maßnahmen: 1')).toBeInTheDocument();
    expect(useSimulationStore.getState().draftMeasures).toHaveLength(1);
  });

  it('Schließen-Button im Footer ruft onClose auf', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MeasureManagerModal isOpen={true} onClose={onClose} />);
    const footer = screen.getByText(/Aktive Maßnahmen:/).closest('div');
    expect(footer).not.toBeNull();
    await user.click(screen.getByRole('button', { name: /^Schließen$/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
