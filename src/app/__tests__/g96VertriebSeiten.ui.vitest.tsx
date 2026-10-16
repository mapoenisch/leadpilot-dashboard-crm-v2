import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { KANAELE, PLANUNG, SLA } from '@/domain/vertriebData';
import { SlaPage } from '@/features/vertrieb/pages/SlaPage';
import { ChannelsPage } from '@/features/vertrieb/pages/ChannelsPage';
import { PlanningPage } from '@/features/vertrieb/pages/PlanningPage';
import { ArticlesPage } from '@/features/recht/pages/ArticlesPage';

// Auftrag 096 (Paket G2, Welle 3): SLA, Kanalperformance und Marketingplanung als echte Seiten
// nach dem Original-WebP; Diagramme mit 3D-Tiefe, Werte nach Faktenblatt v1.2.
afterEach(cleanup);

const WELLE = ['sales-sla', 'sales-channels', 'sales-planning'];

const renderMain = (Page: () => JSX.Element) =>
  render(
    <main>
      <Page />
    </main>,
  );

describe('G96 Vertrieb & Marketing als HTML-Seiten', () => {
  it('Seitenfreigabe enthält Welle 3', () => {
    expect([...HTML_PAGES]).toEqual(expect.arrayContaining(WELLE));
    for (const key of WELLE) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it.each([
    ['SLA', SlaPage, 'sales-sla'],
    ['Kanäle', ChannelsPage, 'sales-channels'],
    ['Planung', PlanningPage, 'sales-planning'],
  ] as const)('%s: kein Ganzseitenbild, eine sichtbare h1, ruhig', (_n, Page, key) => {
    const { container } = renderMain(Page);
    expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      container.querySelector(`.pk-page[data-page-key="${key}"]`)?.getAttribute('data-ruhig'),
    ).toBe('true');
  });

  // Auftrag 097: Finanzseiten sind inzwischen freigegeben; Gegenprobe mit der Satzung.
  it('Rechtsseiten bleiben beim Schalter', () => {
    const { container } = renderMain(ArticlesPage);
    expect(container.querySelector('[data-testid="image-page"]')).not.toBeNull();
  });

  it('SLA: Übergabetabelle vollständig, Pflichten mit dekorativer Kugel', () => {
    const { container } = renderMain(SlaPage);
    const text = container.textContent ?? '';
    for (const [merkmal, angabe] of SLA.handoff.rows) {
      expect(text).toContain(merkmal);
      expect(text).toContain(angabe);
    }
    const karten = container.querySelectorAll('.vs-pflicht');
    expect(karten).toHaveLength(2);
    expect(karten[0]?.getAttribute('data-tone')).toBe('cyan');
    expect(karten[1]?.getAttribute('data-tone')).toBe('orange');
    for (const karte of karten)
      expect(karte.querySelector('.vs-kugel')?.getAttribute('aria-hidden')).toBe('true');
    for (const punkt of [...SLA.marketing, ...SLA.sales]) expect(text).toContain(punkt);
    expect(text).toContain('automatisierten Content-Plan');
  });

  it('Kanäle: 3D-Säulen je Kanal, teuerster orange, 47 Neukunden', () => {
    const { container } = renderMain(ChannelsPage);
    const saeulen = container.querySelectorAll('[data-saeule]');
    expect(saeulen).toHaveLength(KANAELE.chartRoi.labels.length);
    expect(saeulen[saeulen.length - 1]?.getAttribute('fill')).not.toBe(
      saeulen[0]?.getAttribute('fill'),
    );
    expect(container.querySelector('.pk-donut')?.textContent).toContain('47');
    expect(container.textContent).toContain('1.476 €');
  });

  it('Planung: 3D-Säulen, Teilplan von 30.000 €, Ziel ≥ 26 %', () => {
    const { container } = renderMain(PlanningPage);
    const saeulen = container.querySelectorAll('[data-saeule]');
    expect(saeulen).toHaveLength(
      PLANUNG.chartPlanbudget.labels.length + PLANUNG.chartPlankpi.labels.length * 2,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Teilplan 19.375 € von 30.000 €');
    expect(text).toContain('Trial-to-Paid auf ≥ 26 % steigern');
    expect(text).not.toContain('25%');
  });

  it('Diagramme: Werte für Screenreader als versteckte Tabelle (Codex P2)', () => {
    const { container } = renderMain(PlanningPage);
    const tabellen = container.querySelectorAll('.sr-only table');
    expect(tabellen).toHaveLength(2);
    const budget = tabellen[0]?.textContent ?? '';
    PLANUNG.chartPlanbudget.labels.forEach((label) => expect(budget).toContain(label));
    expect(budget).toContain('3.375 €');
    const kpi = tabellen[1]?.textContent ?? '';
    for (const wert of ['86,2', '72', '2,8', '2,2', '47', '65']) expect(kpi).toContain(wert);
    cleanup();
    const kanal = renderMain(ChannelsPage).container.querySelector('.sr-only table');
    expect(kanal?.textContent).toContain('1.476 €');
  });
});
