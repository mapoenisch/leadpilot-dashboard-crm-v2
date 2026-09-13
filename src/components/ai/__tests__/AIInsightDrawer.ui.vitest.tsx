import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIInsightDrawer } from '../AIInsightDrawer';

describe('AIInsightDrawer', () => {
  it('returns null when open is false', () => {
    const { container } = render(<AIInsightDrawer open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders drawer content and handles close button', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<AIInsightDrawer open={true} onClose={handleClose} />);

    expect(screen.getByText('KI Dashboard-Assistent')).toBeInTheDocument();
    expect(screen.getByText('Echtzeit-KI Integration')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Schließen' });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('runs analysis when button is clicked', async () => {
    vi.useFakeTimers();
    render(<AIInsightDrawer open={true} onClose={() => {}} />);

    const runBtn = screen.getByRole('button', { name: 'Analyse jetzt starten' });
    act(() => {
      runBtn.click();
    });

    expect(screen.getByRole('button', { name: 'KI analysiert Live-Daten...' })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText(/LeadPilot KI-Systemanalyse/i)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
