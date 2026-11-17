// Auftrag 161 (P10b-2): UI-Tests für TimeControlMenuV2.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimeControlMenuV2 } from '../components/editor/TimeControlMenuV2';
import { TimeControlProvider } from '../time/TimeControlProvider';

describe('TimeControlMenuV2', () => {
  it('rendert Live/Pause Knopf im Live-Modus und schaltet um', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <TimeControlProvider>
        <TimeControlMenuV2 isLivePaused={false} onToggleLivePause={onToggle} />
      </TimeControlProvider>,
    );

    const pauseBtn = screen.getByTestId('live-pause-button');
    expect(pauseBtn).toHaveTextContent('Pausieren');
    expect(pauseBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(pauseBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    // Pausierter Zustand
    rerender(
      <TimeControlProvider>
        <TimeControlMenuV2 isLivePaused={true} onToggleLivePause={onToggle} />
      </TimeControlProvider>,
    );

    const resumeBtn = screen.getByTestId('live-pause-button');
    expect(resumeBtn).toHaveTextContent('Fortsetzen');
    expect(resumeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('öffnet den Zeitpunkt-Dialog bei Klick auf Auslöser', async () => {
    render(
      <TimeControlProvider>
        <TimeControlMenuV2 isLivePaused={false} onToggleLivePause={() => {}} />
      </TimeControlProvider>,
    );

    const trigger = screen.getByTestId('time-point-trigger');
    expect(trigger).toHaveTextContent('Zeitpunkt wählen…');

    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('zeigt Banner und Zurück-zu-Live Knopf im Modus zeitpunkt', () => {
    render(
      <TimeControlProvider
        initialState={{
          mode: 'zeitpunkt',
          analysisAt: '2026-10-31T23:00:00.000Z',
          resumeToken: 0,
        }}
      >
        <TimeControlMenuV2 isLivePaused={false} onToggleLivePause={() => {}} />
      </TimeControlProvider>,
    );

    expect(screen.getByTestId('time-point-banner')).toBeInTheDocument();
    expect(screen.getByTestId('back-to-live-button')).toHaveTextContent('Zurück zu Live');

    // Klick auf Zurück zu Live
    fireEvent.click(screen.getByTestId('back-to-live-button'));
    // Nach Zurück zu Live ist der Modus wieder live
    expect(screen.queryByTestId('time-point-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('live-pause-button')).toBeInTheDocument();
  });
});
