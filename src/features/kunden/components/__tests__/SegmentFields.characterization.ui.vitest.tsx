import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentFields } from '../SegmentFields';

describe('SegmentFields (characterization)', () => {
  it('rendert alle vier Segmentfelder mit ARR-Flächen und Summe', () => {
    const { container } = render(<SegmentFields />);
    expect(screen.getByText('HINGUCKER-GRAFIK · TREEMAP')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
    for (const share of ['43,35 %', '27,27 %', '19,17 %', '10,20 %']) {
      expect(container.textContent).toContain(share);
    }
    expect(container.textContent).toContain('411.840 €');
  });

  it('wählt ein Segment per Klick aus und wieder ab', () => {
    render(<SegmentFields />);
    const buttons = screen.getAllByRole('button');
    const first = buttons[0] as HTMLElement;
    expect(first.className).not.toContain('border-2');
    fireEvent.click(first);
    expect(screen.getAllByRole('button')[0]?.className).toContain('border-2');
    fireEvent.click(screen.getAllByRole('button')[0] as HTMLElement);
    expect(screen.getAllByRole('button')[0]?.className).not.toContain('border-2');
  });

  it('wechselt die Auswahl zwischen Segmenten', () => {
    render(<SegmentFields />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1] as HTMLElement);
    expect(screen.getAllByRole('button')[1]?.className).toContain('border-2');
    expect(screen.getAllByRole('button')[0]?.className).not.toContain('border-2');
  });
});
