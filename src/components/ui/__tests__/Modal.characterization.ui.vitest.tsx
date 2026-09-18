import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal } from '../Modal';

// Ergänzend zur bestehenden Modal.ui.vitest.tsx (Overlay-Klick, Escape,
// Fokus-Trap-Grundlagen): Fokus-Wiederherstellung, Scroll-Sperre,
// Dialog-Semantik und maxWidth-Varianten.
describe('Modal (characterization: ergänzende Fälle)', () => {
  it('hält den Fokus per Tab-Trap im Dialog (Wrap an beiden Enden)', async () => {
    render(
      <Modal open onClose={() => {}} title="Trap Test">
        <button type="button">Erster</button>
        <button type="button">Letzter</button>
      </Modal>,
    );
    // Erstes fokussierbares Element ist der ×-Schließen-Button im Header
    const close = screen.getByRole('button', { name: 'Dialog schließen' });
    const last = screen.getByRole('button', { name: 'Letzter' });
    await waitFor(() => expect(close).toHaveFocus());
    last.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('sperrt Body-Scroll und gibt den Fokus beim Schließen zurück', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Öffner';
    document.body.appendChild(opener);
    opener.focus();
    try {
      const { rerender } = render(
        <Modal open onClose={() => {}} title="Fokus Test">
          <button type="button">Drinnen</button>
        </Modal>,
      );
      expect(document.body.style.overflow).toBe('hidden');
      rerender(
        <Modal open={false} onClose={() => {}} title="Fokus Test">
          <button type="button">Drinnen</button>
        </Modal>,
      );
      expect(document.body.style.overflow).not.toBe('hidden');
      expect(opener).toHaveFocus();
    } finally {
      opener.remove();
    }
  });

  it('trägt Dialog-Semantik mit Titelverknüpfung (auch custom titleId)', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="Semantik Test">
        Inhalt
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Semantik Test' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy as string)?.textContent).toBe('Semantik Test');
    rerender(
      <Modal open onClose={() => {}} title="Custom Id" titleId="mein-titel">
        Inhalt
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Custom Id' })).toHaveAttribute(
      'aria-labelledby',
      'mein-titel',
    );
  });

  it('schließt nicht bei Klick in den Dialog und mappt maxWidth ohne Footer', () => {
    const onClose = vi.fn();
    const { container, rerender } = render(
      <Modal open onClose={onClose} title="Breit Test" maxWidth="960px">
        <span data-testid="breit-innen">Innen</span>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId('breit-innen'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog').className).toContain('min(960px');
    expect(container.textContent).not.toContain('Speichern');
    rerender(
      <Modal
        open
        onClose={onClose}
        title="Fuß Test"
        footer={<button type="button">Speichern</button>}
      >
        Inhalt
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
  });
});
