import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeasureManagerModal } from '../MeasureManagerModal';
import { useSimulationStore } from '@/store/simulationStore';

function mkMeasure(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    name: `Maßnahme ${id}`,
    startTick: 0,
    changes: [{ parameter: 'salesRepCount', mode: 'set', value: 4 }],
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe('MeasureManagerModal (branch)', () => {
  const origPreview = useSimulationStore.getState().previewMeasures;

  beforeEach(() => {
    useSimulationStore.setState({ draftMeasures: [] });
  });

  afterEach(() => {
    useSimulationStore.setState({ draftMeasures: [], previewMeasures: origPreview });
    vi.restoreAllMocks();
  });

  it('Parameter-Zeile hinzufügen und entfernen (Guard bei einer Zeile)', async () => {
    const user = userEvent.setup();
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: '✕' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Parameter hinzufügen' }));
    expect(screen.getAllByRole('button', { name: '✕' })).toHaveLength(2);
    expect(screen.getAllByText('Zielparameter (Treiber)')).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: '✕' })[0]!);
    expect(screen.getAllByText('Zielparameter (Treiber)')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '✕' })).not.toBeInTheDocument();
  });

  it('Moduswechsel auf Multiplizieren zeigt Faktor-Label', async () => {
    const user = userEvent.setup();
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    const combos = screen.getAllByRole('combobox');
    const modeCombo = combos.find(
      (c) =>
        c.id && document.querySelector(`label[for="${c.id}"]`)?.textContent === 'Änderungsmodus',
    );
    expect(modeCombo).toBeDefined();
    await user.click(modeCombo!);
    await user.click(screen.getByRole('option', { name: /Multiplizieren/ }));
    expect(screen.getByText('Wert (Faktor x)')).toBeInTheDocument();
  });

  it('ungültige Dauer blockt Speichern, gültige Dauer + Ramp-up werden übernommen', async () => {
    const user = userEvent.setup();
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    const nameInput = screen.getByPlaceholderText('z. B. Sales-Team Verdopplung');
    // Determinismus unter CI-/Coverage-Last (Node 22.18): synchroner Change
    // statt user.type — Tippen blieb unter Last nachweislich stehen (CI-Run
    // 35708776868: leer; lokale Coverage-Läufe: "Dau"), danach griff die
    // Namens- statt der Dauer-Validierung. Beleg direkt danach:
    fireEvent.change(nameInput, { target: { value: 'Dauer-Test' } });
    expect(nameInput).toHaveValue('Dauer-Test');
    const durationInput = screen.getByPlaceholderText('dauerhaft');
    fireEvent.change(durationInput, { target: { value: '-3' } });
    await user.click(screen.getByRole('button', { name: '6. Maßnahme speichern' }));
    expect(
      screen.getByText('Die Dauer muss eine positive Zahl von Ticks sein.'),
    ).toBeInTheDocument();
    expect(useSimulationStore.getState().draftMeasures).toHaveLength(0);

    fireEvent.change(durationInput, { target: { value: '10' } });
    // Ramp-up erhöhen (erster Stepper = Start, zweiter = Ramp-up)
    const rampUpInput = screen.getByLabelText('Ramp-up (Ticks)');
    fireEvent.change(rampUpInput, { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: '6. Maßnahme speichern' }));
    const saved = useSimulationStore.getState().draftMeasures;
    expect(saved).toHaveLength(1);
    expect(saved[0]!.durationTicks).toBe(10);
    expect(saved[0]!.rampUpTicks).toBe(5);
    expect(screen.getByText('Aktive Maßnahmen: 1')).toBeInTheDocument();
  });

  it('Speichern ohne Beschreibung setzt undefined, Timeline zeigt Dauerhaft', async () => {
    const user = userEvent.setup();
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    const nameInputOhneDetails = screen.getByPlaceholderText('z. B. Sales-Team Verdopplung');
    // Gleicher Last-Flake wie im Dauer-Test ("Ohne D" unter Coverage-Last):
    // synchroner Change, danach Beleg des kontrollierten Feldwerts.
    fireEvent.change(nameInputOhneDetails, { target: { value: 'Ohne Details' } });
    expect(nameInputOhneDetails).toHaveValue('Ohne Details');
    await user.click(screen.getByRole('button', { name: '6. Maßnahme speichern' }));
    const saved = useSimulationStore.getState().draftMeasures;
    expect(saved).toHaveLength(1);
    expect(saved[0]!.description).toBeUndefined();
    expect(saved[0]!.durationTicks).toBeUndefined();
  });

  it('Konfliktwarnung bei zwei SET-Maßnahmen auf gleichem Parameter', () => {
    useSimulationStore.setState({
      draftMeasures: [mkMeasure('k1'), mkMeasure('k2')] as never,
    });
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByTestId('measure-conflict-alert')).toBeInTheDocument();
    expect(screen.getByText('Konfliktwarnung (MULTIPLE_SET)')).toBeInTheDocument();
    expect(screen.getByText(/Konflikt erkannt: Mehrere Maßnahmen/)).toBeInTheDocument();
  });

  it('Konflikt-Fallback nutzt Param-Schlüssel bei unbekannter Definition', () => {
    useSimulationStore.setState({
      draftMeasures: [
        mkMeasure('u1', { changes: [{ parameter: 'unbekannt-x', mode: 'set', value: 1 }] }),
        mkMeasure('u2', { changes: [{ parameter: 'unbekannt-x', mode: 'set', value: 2 }] }),
      ] as never,
    });
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    expect(
      screen.getByText(
        'Konflikt erkannt: Mehrere Maßnahmen setzen den Parameter „unbekannt-x" absolut (Modus SET).',
      ),
    ).toBeInTheDocument();
  });

  it('kein Konflikt bei unterschiedlichen Modi/Parametern; Löschen-Button entfernt', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({
      draftMeasures: [
        mkMeasure('d1'),
        mkMeasure('d2', { changes: [{ parameter: 'salesRepCount', mode: 'delta', value: 1 }] }),
      ] as never,
    });
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    expect(screen.queryByTestId('measure-conflict-alert')).not.toBeInTheDocument();
    expect(screen.getByText('Maßnahme d1')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Löschen' })[0]!);
    expect(useSimulationStore.getState().draftMeasures).toHaveLength(1);
    expect(screen.queryByText('Maßnahme d1')).not.toBeInTheDocument();
  });

  it('Wirkungsvorschau: Erfolg rendert Deltas + Konflikte, Fehler zeigt Alert', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({ draftMeasures: [mkMeasure('p1')] as never });
    const previewMeasures = vi.fn().mockResolvedValue({
      kpiDeltas: [
        {
          kpiId: 'liveARR',
          label: 'ARR',
          unit: '€',
          baseValue: 411840,
          withMeasuresValue: 412840,
          delta: 1000,
          deltaPercent: 0.2,
        },
      ],
      conflicts: [
        {
          parameter: 'salesRepCount',
          measureIds: ['p1'],
          kind: 'MULTIPLE_SET',
          message: 'Demo-Konflikt',
        },
      ],
    });
    useSimulationStore.setState({ previewMeasures: previewMeasures as never });

    const { unmount } = render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    const btn = screen.getByRole('button', { name: '⚡ Wirkungsvorschau simulieren' });
    expect(btn).toBeEnabled();
    await user.click(btn);
    await waitFor(() => expect(screen.getByText('Demo-Konflikt')).toBeInTheDocument());
    expect(previewMeasures).toHaveBeenCalledTimes(1);
    unmount();

    previewMeasures.mockRejectedValueOnce(new Error('Preview boom'));
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: '⚡ Wirkungsvorschau simulieren' }));
    await waitFor(() =>
      expect(screen.getByText('Fehler bei Wirkungsvorschau')).toBeInTheDocument(),
    );
    expect(screen.getByText('Preview boom')).toBeInTheDocument();
  });

  it('Vorschau-Button deaktiviert ohne Maßnahmen', () => {
    render(<MeasureManagerModal isOpen={true} onClose={() => {}} />);
    expect(
      screen.getByText('Noch keine Maßnahmen für diesen Szenario-Entwurf angelegt.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '⚡ Wirkungsvorschau simulieren' })).toBeDisabled();
  });
});
