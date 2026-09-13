import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('returns null when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        Inhalt
      </Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title, content and footer when open', () => {
    render(
      <Modal
        open={true}
        onClose={() => {}}
        title="Details bearbeiten"
        footer={<button type="button">Speichern</button>}
      >
        <p>Modal Body Content</p>
      </Modal>
    );

    expect(screen.getByRole('dialog', { name: 'Details bearbeiten' })).toBeInTheDocument();
    expect(screen.getByText('Modal Body Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Schließen Test">
        Inhalt
      </Modal>
    );

    const buttons = screen.getAllByRole('button', { name: 'Dialog schließen' });
    const closeBtn = buttons[1]!;
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Escape Test">
        Inhalt
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('handles overlay click to close and stops propagation on modal body', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Overlay Test">
        <span data-testid="modal-inner">Inner</span>
      </Modal>
    );

    fireEvent.click(screen.getByTestId('modal-inner'));
    expect(handleClose).not.toHaveBeenCalled();

    const [overlay] = screen.getAllByRole('button', { name: 'Dialog schließen' });
    fireEvent.click(overlay!);
    expect(handleClose).toHaveBeenCalled();
  });
});
