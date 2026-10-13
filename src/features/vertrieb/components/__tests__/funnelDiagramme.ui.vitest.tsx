import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FunnelStufenChart } from '../FunnelStufenChart';
import { GroupedDepthColumns } from '../GroupedDepthColumns';

// Auftrag 093, Codex PR #79: Randfälle der beiden Funnel-Diagramme.
afterEach(cleanup);

describe('FunnelStufenChart', () => {
  it('Wert 0 erhält keine Breite und keinen Quader, Werte unter 1 % bleiben exakt', () => {
    render(
      <FunnelStufenChart
        stufen={[
          { name: 'A', count: 1000, einheit: 'Leads' },
          { name: 'B', count: 5, einheit: 'MQL' },
          { name: 'C', count: 0, einheit: 'SQL' },
        ]}
      />,
    );
    const balken = Array.from(
      screen.getByTestId('funnel-stufen-chart').querySelectorAll<HTMLElement>('.funnel-stufe'),
    );
    expect(balken.map((b) => b.style.width)).toEqual(['100%', '0.5%', '0%']);
    expect(balken[2]?.getAttribute('data-leer')).toBe('true');
    expect(balken[1]?.getAttribute('data-leer')).toBeNull();
  });
});

describe('GroupedDepthColumns', () => {
  it.each([
    ['ohne Reihen', []],
    ['nur Nullwerte', [{ name: 'Leads', values: [0, 0], color: '#fff' }]],
  ])('%s: endliche Geometrie, keine React-Warnung', (_name, series) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <GroupedDepthColumns idPrefix="t" labels={['Q1', 'Q2']} series={series} />,
    );
    const zahlen = Array.from(container.querySelectorAll('svg *')).flatMap((el) =>
      ['x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'rx', 'width', 'height', 'points']
        .map((attr) => el.getAttribute(attr))
        .filter((v): v is string => v !== null),
    );
    expect(zahlen.some((v) => v.includes('NaN') || v.includes('Infinity'))).toBe(false);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
