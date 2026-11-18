import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, renderHook } from '@testing-library/react';
import { useModalA11y } from '../components/editor/versions/useModalA11y';
import { isModalKeyboardLocked } from '../components/editor/modalKeyboardLock';
import { useEditorShortcuts } from '../components/editor/useEditorShortcuts';

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
  it('sperrt Editor-Kürzel (Undo) solange ein Dialog offen ist (Codex P2)', () => {
    const undo = vi.fn();
    renderHook(() =>
      useEditorShortcuts({
        isSaving: false,
        showDiscardConfirm: false,
        isLeaving: false,
        hasLeaveRequest: false,
        canUndo: true,
        canRedo: false,
        undo,
        redo: vi.fn(),
      }),
    );

    const { rerender, unmount } = render(<TestModal isOpen={true} onClose={vi.fn()} />);
    expect(isModalKeyboardLocked()).toBe(true);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();

    rerender(<TestModal isOpen={false} onClose={vi.fn()} />);
    expect(isModalKeyboardLocked()).toBe(false);
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
    unmount();
    expect(isModalKeyboardLocked()).toBe(false);
  });
});
