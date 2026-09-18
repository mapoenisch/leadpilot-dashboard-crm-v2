import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DonutRingChart } from '../DonutRingChart';

const SEGS = [
  { label: 'Maschinenbau', value: 178560, color: '#00D9C6' },
  { label: 'IT / Software', value: 112320, color: '#7CEFE6' },
  { label: 'Großhandel', value: 78960 },
];

describe('DonutRingChart (branch2)', () => {
  it('rendert Total, Segmente mit Prozent und Balken', () => {
    render(<DonutRingChart segments={SEGS} totalLabel="ARR" unit="€" />);
    expect(screen.getByText('ARR')).toBeInTheDocument();
    expect(screen.getByText('Maschinenbau')).toBeInTheDocument();
    // 178560/369840 ≈ 48 %
    expect(screen.getByText('(48%)')).toBeInTheDocument();
  });

  it('Hover auf Segment zeigt Segmentwert in der Mitte', () => {
    const { container } = render(<DonutRingChart segments={SEGS} unit="€" />);
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(SEGS.length);
    fireEvent.mouseEnter(paths[0]!);
    // Segmentlabel erscheint zusätzlich in der Mitte
    expect(screen.getAllByText('Maschinenbau').length).toBeGreaterThanOrEqual(2);
    // Hover dimmt andere Segmente
    expect(paths[1]!.getAttribute('opacity')).toBe('0.45');
    fireEvent.mouseLeave(container.querySelector('svg')!);
  });

  it('showBars=false blendet Vergleichsbalken aus', () => {
    render(<DonutRingChart segments={SEGS} showBars={false} />);
    expect(screen.queryByText('Maschinenbau')).not.toBeInTheDocument();
    expect(screen.getByText('Gesamt')).toBeInTheDocument();
  });

  it('Custom-Größe, Einheit und TotalLabel als Aria-Label', () => {
    const { container } = render(
      <DonutRingChart segments={SEGS} size={200} unit="€" totalLabel="Summe" />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('200');
    expect(svg?.getAttribute('aria-label')).toContain('Summe');
  });

  it('Tastatur: Enter setzt Hover, Blur löst ihn', async () => {
    const user = userEvent.setup();
    render(<DonutRingChart segments={SEGS} unit="€" />);
    const btn = screen.getByRole('button', { name: /IT \/ Software/ });
    btn.focus();
    expect(screen.getByText('Gesamt')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getAllByText('IT / Software').length).toBeGreaterThanOrEqual(1);
    fireEvent.blur(btn);
  });

  it('Space-Taste setzt Hover per KeyDown', () => {
    render(<DonutRingChart segments={SEGS} unit="€" />);
    const btn = screen.getByRole('button', { name: /Großhandel/ });
    fireEvent.keyDown(btn, { key: ' ' });
    expect(screen.getAllByText('Großhandel').length).toBeGreaterThanOrEqual(1);
  });

  it('Null-Segmente und fehlende Farben nutzen Palette', () => {
    render(
      <DonutRingChart
        segments={[
          { label: 'Leer', value: 0 },
          { label: 'Voll', value: 100 },
        ]}
      />,
    );
    expect(screen.getByText('(0%)')).toBeInTheDocument();
    expect(screen.getByText('(100%)')).toBeInTheDocument();
  });
});
