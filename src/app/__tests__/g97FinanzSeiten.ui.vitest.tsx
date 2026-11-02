import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { BILANZ, CHART_KOSTEN, CHART_MRR26, GUV } from '@/domain/finanzenData';
import { PnLPage } from '@/features/finanzen/pages/PnLPage';
import { BalanceSheetPage } from '@/features/finanzen/pages/BalanceSheetPage';
import { UnitEconomicsPage } from '@/features/finanzen/pages/UnitEconomicsPage';

// Auftrag 097 (Paket G2, Welle 4): GuV, Bilanz und Unit Economics als echte Seiten nach dem
// Original-WebP; Diagramme mit 3D-Tiefe, Werte nach Faktenblatt v1.2.
afterEach(cleanup);

const WELLE = ['finance-pnl', 'finance-balance-sheet', 'finance-unit-economics'];

const renderMain = (Page: () => JSX.Element) =>
  render(
    <main>
      <Page />
    </main>,
  );

describe('G97 Finanzen als HTML-Seiten', () => {
  it('Seitenfreigabe enthält Welle 4', () => {
    expect([...HTML_PAGES]).toEqual(expect.arrayContaining(WELLE));
    for (const key of WELLE) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it.each([
    ['GuV', PnLPage, 'finance-pnl', 'Gewinn- und Verlustrechnung (GuV)'],
    ['Bilanz', BalanceSheetPage, 'finance-balance-sheet', 'Bilanz 2025'],
    [
      'Unit Economics',
      UnitEconomicsPage,
      'finance-unit-economics',
      'Unit Economics & SaaS-Kernmetriken 2025',
    ],
  ] as const)('%s: kein Ganzseitenbild, Titel wie Original, ruhig', (_n, Page, key, titel) => {
    const { container } = renderMain(Page);
    expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
    const h1 = screen.getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(titel);
    expect(
      container.querySelector(`.pk-page[data-page-key="${key}"]`)?.getAttribute('data-ruhig'),
    ).toBe('true');
  });

  it('GuV: Kostenstruktur als 3D-Säulen, EBITDA als Verlust, alle Positionen in der Tabelle', () => {
    const { container } = renderMain(PnLPage);
    expect(container.querySelectorAll('[data-saeule]')).toHaveLength(
      CHART_KOSTEN.labels.length * CHART_KOSTEN.datasets.length,
    );
    const daten = container.querySelector('.sr-only table')?.textContent ?? '';
    expect(daten).toContain('-309 k€');
    const text = container.textContent ?? '';
    for (const row of GUV.rows) for (const zelle of row.slice(1)) expect(text).toContain(zelle);
  });

  it('GuV: Plan-Abo-Umsatz als „Ziel-ARR, vereinfacht“ gekennzeichnet (Faktenblatt D11)', () => {
    const { container } = renderMain(PnLPage);
    const text = container.textContent ?? '';
    expect(text).toContain('Plan 2026: Ziel-ARR, vereinfacht');
    expect(text).toContain('nicht die Summe der Plan-MRR');
  });

  it('Bilanz: Aktiva und Passiva vollständig, Bilanzsumme gleich', () => {
    const { container } = renderMain(BalanceSheetPage);
    const text = container.textContent ?? '';
    for (const [, betrag] of [...BILANZ.aktiva, ...BILANZ.passiva]) expect(text).toContain(betrag);
    expect(BILANZ.aktiva[BILANZ.aktiva.length - 1]?.[1]).toBe(
      BILANZ.passiva[BILANZ.passiva.length - 1]?.[1],
    );
  });

  it('Unit Economics: MRR und Churn als 3D-Flächen mit Werten nach Faktenblatt', () => {
    const { container } = renderMain(UnitEconomicsPage);
    expect(container.querySelectorAll('[data-testid="depth-flaechen"]')).toHaveLength(2);
    const daten = Array.from(container.querySelectorAll('.sr-only table'))
      .map((t) => t.textContent ?? '')
      .join(' ');
    for (const wert of CHART_MRR26.datasets[0]?.data ?? [])
      expect(daten).toContain(`${wert.toLocaleString('de-DE')} €`);
    expect(daten).toContain('26 %');
  });
});
