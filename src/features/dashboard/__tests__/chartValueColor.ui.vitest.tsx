// Auftrag 088 (Regel aus Paket D): Werte neben den 3D-Säulen folgen dem Textton statt fest Weiß,
// damit sie im hellen Modus lesbar sind. Codex PR #74: Werte innerhalb einer Säule und die Summe in
// der (immer dunklen) Ringaussparung bleiben weiß.
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Depth3dBarChart, valueLabelClass } from '../components/charts/Depth3dBarChart';
import { Depth3dDonutChart } from '../components/charts/Depth3dDonutChart';

const DATA = [
  { label: 'Q1', value: 10 },
  { label: 'Q2', value: 12 },
];
const PROPS = {
  idPrefix: 't',
  data: DATA,
  unit: 'Stück',
  period: '2025',
  title: 'T',
  reducedMotion: true,
};
const TEXT_TONE = 'fill-[var(--color-text-primary';

const boldTexts = (container: HTMLElement) =>
  [...container.querySelectorAll('svg text[font-weight="700"]')] as SVGTextElement[];

describe('Diagrammwerte: Textton außen, Weiß innen', () => {
  it('Säulen: Werte über der Säule im Textton', () => {
    const { container } = render(<Depth3dBarChart {...PROPS} />);
    const texts = boldTexts(container);
    expect(texts).toHaveLength(2);
    for (const text of texts) expect(text.getAttribute('class')).toContain(TEXT_TONE);
  });

  it('Säulen: Wert innerhalb einer bis zum Rand reichenden negativen Säule bleibt weiß', () => {
    const { container } = render(
      <Depth3dBarChart
        {...PROPS}
        data={[
          { label: 'A', value: 5 },
          { label: 'B', value: -100 },
        ]}
      />,
    );
    const negative = boldTexts(container).find((text) => text.textContent?.includes('100'));
    expect(negative?.getAttribute('class')).toBe('fill-white');
  });

  it('Balken: innen rechtsbündige Werte bleiben weiß', () => {
    expect(valueLabelClass(true)).toBe('fill-white');
    expect(valueLabelClass(false)).toContain(TEXT_TONE);
  });

  it('Ring: Summe in der dunklen Aussparung bleibt weiß', () => {
    const { container } = render(<Depth3dDonutChart {...PROPS} />);
    const sum = boldTexts(container)[0];
    expect(sum?.getAttribute('fill')).toBe('#ffffff');
  });
});
