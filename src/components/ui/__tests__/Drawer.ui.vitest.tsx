import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from '../Drawer';

describe('Drawer', () => {
  it('returns null when open is false', () => {
    const { container } = render(
      <Drawer open={false} onClose={() => {}} title="Test Drawer">
        Inhalt
      </Drawer>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title, description, content and footer when open', () => {
    render(
      <Drawer
        open={true}
        onClose={() => {}}
        title="Kachel konfigurieren"
        description="Passe Metriken und Filter an"
        footer={<button type="button">Speichern</button>}
      >
        <p>Drawer Body Content</p>
      </Drawer>,
    );

    expect(screen.getByRole('dialog', { name: 'Kachel konfigurieren' })).toBeInTheDocument();
    expect(screen.getByText('Passe Metriken und Filter an')).toBeInTheDocument();
    expect(screen.getByText('Drawer Body Content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <Drawer open={true} onClose={handleClose} title="Schließen Test">
        Inhalt
      </Drawer>,
    );

    const closeBtn = screen.getByRole('button', { name: 'Dialog schließen' });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed if escapeActive is true', () => {
    const handleClose = vi.fn();
    render(
      <Drawer open={true} onClose={handleClose} title="Escape Test" escapeActive={true}>
        <input data-testid="drawer-input" />
      </Drawer>,
    );

    // Escape auf fokussiertem Kind-Element bubbelt zu window
    fireEvent.keyDown(screen.getByTestId('drawer-input'), { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when Escape is pressed if escapeActive is false', () => {
    const handleClose = vi.fn();
    render(
      <Drawer open={true} onClose={handleClose} title="Escape Inactive Test" escapeActive={false}>
        Inhalt
      </Drawer>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('handles overlay click to close and stops propagation on drawer body', () => {
    const handleClose = vi.fn();
    render(
      <Drawer open={true} onClose={handleClose} title="Overlay Test">
        <span data-testid="drawer-inner">Inner</span>
      </Drawer>,
    );

    fireEvent.click(screen.getByTestId('drawer-inner'));
    expect(handleClose).not.toHaveBeenCalled();

    const overlay = screen.getByTestId('drawer-overlay');
    fireEvent.click(overlay);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies custom width and position classes', () => {
    const { rerender } = render(
      <Drawer open={true} onClose={() => {}} title="Width Test" width="640px" position="right">
        Inhalt
      </Drawer>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-w-[min(640px,100vw)]');
    expect(dialog.className).toContain('right-0');

    rerender(
      <Drawer open={true} onClose={() => {}} title="Width Test" width="480px" position="left">
        Inhalt
      </Drawer>,
    );
    expect(dialog.className).toContain('max-w-[min(480px,100vw)]');
    expect(dialog.className).toContain('left-0');
  });
});
