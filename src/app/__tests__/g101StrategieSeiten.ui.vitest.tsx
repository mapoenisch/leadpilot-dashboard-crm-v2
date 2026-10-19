import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { BSC, CHART_OKR, OKR, TREIBER } from '@/domain/strategieData';
import { OkrsPage } from '@/features/strategie/pages/OkrsPage';
import { BalancedScorecardPage } from '@/features/strategie/pages/BalancedScorecardPage';
import { GrowthDriversPage } from '@/features/strategie/pages/GrowthDriversPage';

// Auftrag 101 (Paket G2, Welle 8): OKRs, Balanced Scorecard und Wachstumstreiber als echte Seiten
// nach dem Original-WebP; OKR-Vergleich mit 3D-Tiefe, Werte nach Faktenblatt v1.2 §12/§14.
afterEach(cleanup);

const WELLE = ['strategy-okrs', 'strategy-bsc', 'strategy-growth'];

const renderMain = (Page: () => JSX.Element) =>
  render(
    <main>
      <Page />
    </main>,
  );

describe('G101 Strategieseiten als HTML-Seiten', () => {
  it('Seitenfreigabe enthält Welle 8', () => {
    expect([...HTML_PAGES]).toEqual(expect.arrayContaining(WELLE));
    for (const key of WELLE) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it.each([
    ['OKRs', OkrsPage, 'strategy-okrs', OKR.title],
    ['BSC', BalancedScorecardPage, 'strategy-bsc', BSC.title],
    ['Treiber', GrowthDriversPage, 'strategy-growth', TREIBER.title],
  ] as const)('%s: kein Ganzseitenbild, Titel, ruhig', (_n, Page, key, titel) => {
    const { container } = renderMain(Page);
    expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
    const h1 = screen.getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(titel);
    expect(
      container.querySelector(`.pk-page[data-page-key="${key}"]`)?.getAttribute('data-ruhig'),
    ).toBe('true');
  });

  it('OKRs: acht 3D-Säulenpaare, alle Key Results, Churn-Ziel ≤ 1,8 % (Faktenblatt §12)', () => {
    const { container } = renderMain(OkrsPage);
    expect(container.querySelectorAll('[data-testid="grouped-depth-columns"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-saeule]')).toHaveLength(CHART_OKR.labels.length * 2);
    const text = container.textContent ?? '';
    for (const objective of OKR.objectives)
      for (const kr of objective.krs) expect(text).toContain(kr);
    expect(text).toContain('auf ≤ 1,8 %');
    expect(text).toContain('Churn-Reduktion im Kundensegment');
  });

  it('BSC: vier Perspektiven mit Kennzahlen und Markierung „Steuerung“', () => {
    const { container } = renderMain(BalancedScorecardPage);
    const text = container.textContent ?? '';
    for (const { name, kpis } of BSC.perspectives) {
      expect(text).toContain(`${name} Perspektive`);
      expect(text).toContain(kpis);
    }
    expect(text.match(/Steuerung(?!s)/g)).toHaveLength(BSC.perspectives.length);
  });

  it('Treiber: fünf Hebel mit Basis-ARR und Effekt, Upsell Starter → Growth', () => {
    const { container } = renderMain(GrowthDriversPage);
    const text = container.textContent ?? '';
    for (const betrag of ['+72.000 €', '+58.000 €', '+34.000 €', '+26.000 €', '+18.000 €']) {
      expect(text).toContain(betrag);
    }
    expect(text.match(/Basis: 411\.840 €/g)).toHaveLength(5);
    expect(text).toContain('Upsell Starter → Growth');
    expect(text).not.toContain('Professional');
    for (const hebel of TREIBER.drivers) expect(text).toContain(hebel);
  });
});
