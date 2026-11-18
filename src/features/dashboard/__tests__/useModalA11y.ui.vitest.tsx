import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { useModalA11y } from '../components/editor/versions/useModalA11y';

function TestModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const containerRef = useModalA11y<HTMLDivElement>({ isOpen, onClose });
  if (!isOpen) return null;
  return (
    <div ref={containerRef} role="dialog" tabIndex={-1}>
      <button data-testid="first-btn">Erster</button>
      <button data-testid="second-btn">Zweiter</button>
    </div>
  );
}

describe('useModalA11y', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('schließt Dialog bei Druck auf Escape', () => {
    const handleClose = vi.fn();
    render(<TestModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('stellt vorherigen Fokus nach dem Schließen wieder her', () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('data-testid', 'trigger-button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const handleClose = vi.fn();
    const { rerender } = render(<TestModal isOpen={true} onClose={handleClose} />);

    // Fast-forward initial focus timer
    vi.advanceTimersByTime(60);
    expect(screen.getByTestId('first-btn')).toBe(document.activeElement);

    // Unmount modal
    rerender(<TestModal isOpen={false} onClose={handleClose} />);
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});
