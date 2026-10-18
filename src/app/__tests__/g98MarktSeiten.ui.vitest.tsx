import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { CHART_WETTBEWERB, MARKT, SWOT, WETTBEWERB } from '@/domain/marktData';
import { MarketOverviewPage } from '@/features/markt/pages/MarketOverviewPage';
import { CompetitionPage } from '@/features/markt/pages/CompetitionPage';
import { SwotPage } from '@/features/markt/pages/SwotPage';
import { OkrsPage } from '@/features/strategie/pages/OkrsPage';

// Auftrag 098 (Paket G2, Welle 5): Marktlage, Wettbewerb und SWOT als echte Seiten nach dem
// Original-WebP; Marktanteile als 3D-Säulen, Werte nach Faktenblatt v1.2 (D1, D6).
afterEach(cleanup);

const WELLE = ['market-dach', 'market-competition', 'market-swot'];

const renderMain = (Page: () => JSX.Element) =>
  render(
    <main>
      <Page />
    </main>,
  );

describe('G98 Markt & Wettbewerb als HTML-Seiten', () => {
  it('Seitenfreigabe enthält Welle 5', () => {
    expect([...HTML_PAGES]).toEqual(expect.arrayContaining(WELLE));
    for (const key of WELLE) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it.each([
    ['Marktlage', MarketOverviewPage, 'market-dach', 'Marktlage & Cloud-CRM DACH'],
    [
      'Wettbewerb',
      CompetitionPage,
      'market-competition',
      'Wettbewerbslandschaft & Marktanteile Europa',
    ],
    ['SWOT', SwotPage, 'market-swot', 'SWOT-Analyse der LeadPilot GmbH (GJ 2025)'],
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

  it('nicht freigegebene Seiten bleiben beim Schalter (seit Auftrag 100: OKRs)', () => {
    const { container } = renderMain(OkrsPage);
    expect(container.querySelector('[data-testid="image-page"]')).not.toBeNull();
  });

  it('Marktlage: alle vier Zeilen des Originals, LeadPilot hervorgehoben', () => {
    const { container } = renderMain(MarketOverviewPage);
    const text = container.textContent ?? '';
    for (const [segment, daten] of MARKT.overview) {
      expect(text).toContain(segment);
      expect(text).toContain(daten);
    }
  });

  it('Wettbewerb: Marktanteile als 3D-Säulen, Europa statt Europa/DACH (Faktenblatt D6)', () => {
    const { container } = renderMain(CompetitionPage);
    expect(container.querySelectorAll('[data-saeule]')).toHaveLength(
      CHART_WETTBEWERB.labels.length,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Marktanteile Cloud-CRM Europa (%)');
    expect(text).not.toContain('Europa/DACH');
    expect(text).toContain('< 0,1 %');
    for (const row of WETTBEWERB.rows) for (const zelle of row) expect(text).toContain(zelle);
  });

  it('SWOT: vier Quadranten vollständig, Trial-to-Paid-Ziel 26 % (Faktenblatt D1)', () => {
    const { container } = renderMain(SwotPage);
    const text = container.textContent ?? '';
    for (const item of [
      ...SWOT.strengths,
      ...SWOT.weaknesses,
      ...SWOT.opportunities,
      ...SWOT.threats,
    ])
      expect(text).toContain(item);
    expect(text).toContain('18 % → 26 %');
    expect(text).not.toContain('→ 25 %');
  });
});
