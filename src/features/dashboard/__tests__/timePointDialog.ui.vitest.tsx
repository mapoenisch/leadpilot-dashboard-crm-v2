// Auftrag 161 (P10b-2): UI-Tests für TimePointDialogV2.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimePointDialogV2 } from '../components/editor/TimePointDialogV2';

describe('TimePointDialogV2', () => {
  it('rendert nichts wenn isOpen false ist', () => {
    const { container } = render(
      <TimePointDialogV2 isOpen={false} onClose={() => {}} onSelect={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('wählt Schnellauswahl-Presets und ruft onSelect auf', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(<TimePointDialogV2 isOpen={true} onClose={onClose} onSelect={onSelect} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const yesterdayBtn = screen.getByTestId('time-point-preset-gestern');
    fireEvent.click(yesterdayBtn);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(typeof onSelect.mock.calls[0]?.[0]).toBe('string');
  });

  it('schließt über den Schließen-Knopf und Escape', () => {
    const onClose = vi.fn();
    render(<TimePointDialogV2 isOpen={true} onClose={onClose} onSelect={() => {}} />);

    const closeBtn = screen.getByTestId('close-time-point-dialog');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('erlaubt manuelle Eingabe und validiert zukünftige Daten', () => {
    const onSelect = vi.fn();
    render(<TimePointDialogV2 isOpen={true} onClose={() => {}} onSelect={onSelect} />);

    const input = screen.getByTestId('time-point-datetime-input');
    const applyBtn = screen.getByTestId('apply-time-point-button');

    // Valides Datum in der Vergangenheit
    fireEvent.change(input, { target: { value: '2026-10-15T12:00' } });
    fireEvent.click(applyBtn);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toContain('2026-10-15');

    // Ungültiges Datum
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(applyBtn);
    expect(screen.getByTestId('time-point-error')).toHaveTextContent(/gültiges Datum/i);

    // Zukünftiges Datum
    fireEvent.change(input, { target: { value: '2099-01-01T12:00' } });
    fireEvent.click(applyBtn);
    expect(screen.getByTestId('time-point-error')).toHaveTextContent(/Zukunft/i);
  });

  it('schließt bei Klick auf den Backdrop und ruft Abbrechen auf', () => {
    const onClose = vi.fn();
    render(<TimePointDialogV2 isOpen={true} onClose={onClose} onSelect={() => {}} />);

    const [backdrop] = screen.getAllByLabelText('Dialog schließen');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByRole('button', { name: 'Abbrechen' });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('gibt den Fokus beim Unmounten an den Auslöser zurück', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const triggerRef = { current: trigger };

    const { unmount } = render(
      <TimePointDialogV2
        isOpen={true}
        onClose={() => {}}
        onSelect={() => {}}
        triggerRef={triggerRef}
      />,
    );

    unmount();
    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });

  it('fängt den Tab-Fokus innerhalb des Dialogs ab (Focus Trap)', () => {
    render(<TimePointDialogV2 isOpen={true} onClose={() => {}} onSelect={() => {}} />);

    const dialog = screen.getByRole('dialog');
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBeGreaterThan(1);

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    // Shift+Tab auf dem ersten Element springt zum letzten
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    // Tab auf dem letzten Element springt zum ersten
    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(first);
  });

  it('behält manuelle Eingabe bei Re-Render / Minutenwechsel bei', () => {
    const { rerender } = render(
      <TimePointDialogV2
        isOpen={true}
        onClose={() => {}}
        onSelect={() => {}}
        currentAnalysisAt={null}
      />,
    );

    const input = screen.getByTestId('time-point-datetime-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-10-15T14:30' } });
    expect(input.value).toBe('2026-10-15T14:30');

    // Re-render ohne Props-Änderung (z.B. Minutentick)
    rerender(
      <TimePointDialogV2
        isOpen={true}
        onClose={() => {}}
        onSelect={() => {}}
        currentAnalysisAt={null}
      />,
    );
    expect(input.value).toBe('2026-10-15T14:30');
  });
});
