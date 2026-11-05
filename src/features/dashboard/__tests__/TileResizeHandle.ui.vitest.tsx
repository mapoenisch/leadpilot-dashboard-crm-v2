import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  TileResizeHandle,
  type TileResizeHandleProps,
} from '../components/TileResizeHandle';

function setup(overrides: Partial<TileResizeHandleProps> = {}) {
  const onResize = vi.fn();
  const props: TileResizeHandleProps = {
    tileId: 'tile-1',
    tileTitle: 'Pipeline Deals',
    currentSize: 'mittel',
    minSize: 'klein',
    locked: false,
    onResize,
    ...overrides,
  };
  const view = render(<TileResizeHandle {...props} />);
  return { props, onResize, ...view };
}

describe('TileResizeHandle', () => {
  it('rendert Slider mit korrekten ARIA-Attributen', () => {
    setup({ currentSize: 'mittel' });
    const handle = screen.getByRole('slider', { name: /Kachelgröße anpassen: Pipeline Deals/ });
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute('aria-valuenow', '1'); // mittel = index 1
    expect(handle).toHaveAttribute('aria-valuemin', '0'); // klein = index 0
    expect(handle).toHaveAttribute('aria-valuemax', '3'); // voll = index 3
    expect(handle).toHaveAttribute('aria-valuetext', 'Mittel');
  });

  it('vergrößert bei ArrowRight / ArrowUp', () => {
    const { onResize } = setup({ currentSize: 'mittel' });
    const handle = screen.getByRole('slider');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onResize).toHaveBeenCalledWith('tile-1', 'gross');
  });

  it('verkleinert bei ArrowLeft / ArrowDown', () => {
    const { onResize } = setup({ currentSize: 'mittel', minSize: 'klein' });
    const handle = screen.getByRole('slider');

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(onResize).toHaveBeenCalledWith('tile-1', 'klein');
  });

  it('verkleinert nicht unter die Mindestgröße', () => {
    const { onResize } = setup({ currentSize: 'mittel', minSize: 'mittel' });
    const handle = screen.getByRole('slider');

    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(onResize).not.toHaveBeenCalled();
  });

  it('vergrößert nicht über die Maximalgröße (voll)', () => {
    const { onResize } = setup({ currentSize: 'voll' });
    const handle = screen.getByRole('slider');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onResize).not.toHaveBeenCalled();
  });

  it('ignoriert Tastaturinteraktion, wenn gesperrt', () => {
    const { onResize } = setup({ locked: true });
    const handle = screen.getByRole('slider');
    expect(handle).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(onResize).not.toHaveBeenCalled();
  });

  it('verhindert native Touch-Scroll-Gesten mit touch-none', () => {
    setup();
    const handle = screen.getByRole('slider');
    expect(handle.className).toContain('touch-none');
  });
});
