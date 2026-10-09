// Auftrag 088 (Regel aus Paket D): Werte in den 3D-Diagrammen folgen dem Textton statt fest Weiß,
// damit sie im hellen Modus lesbar sind.
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Depth3dBarChart } from '../components/charts/Depth3dBarChart';
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

const boldTexts = (container: HTMLElement) =>
  [...container.querySelectorAll('svg text[font-weight="700"]')] as SVGTextElement[];

describe('Diagrammwerte folgen dem Textton', () => {
  it.each([
    ['Säulen', <Depth3dBarChart key="s" {...PROPS} />],
    ['Balken', <Depth3dBarChart key="b" {...PROPS} orientation="horizontal" />],
    ['Ring', <Depth3dDonutChart key="r" {...PROPS} />],
  ])('%s', (_name, element) => {
    const { container } = render(element);
    const texts = boldTexts(container);
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text.getAttribute('fill')).not.toBe('#ffffff');
      expect(text.getAttribute('class')).toContain('fill-[var(--color-text-primary');
    }
  });
});
