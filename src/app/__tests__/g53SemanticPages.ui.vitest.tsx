import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MarketOverviewPage } from '@/features/markt/pages/MarketOverviewPage';
import { CompetitionPage } from '@/features/markt/pages/CompetitionPage';
import { SwotPage } from '@/features/markt/pages/SwotPage';
import { IcpPage } from '@/features/kunden/pages/IcpPage';
import { PersonaPage } from '@/features/kunden/pages/PersonaPage';
import { SegmentsPage } from '@/features/kunden/pages/SegmentsPage';
import { TopCustomersPage } from '@/features/kunden/pages/TopCustomersPage';
import { FunnelPage } from '@/features/vertrieb/pages/FunnelPage';
import { SlaPage } from '@/features/vertrieb/pages/SlaPage';
import { ChannelsPage } from '@/features/vertrieb/pages/ChannelsPage';
import { PlanningPage } from '@/features/vertrieb/pages/PlanningPage';

// 067I / G53: jsdom-Spiegel der E2E-Route-Tests (läuft ohne Credentials) —
// kein Ganzseiten-WebP, genau eine h1, auswählbarer Text, semantische Struktur.
const pages: Array<[string, () => JSX.Element, string]> = [
  ['Marktübersicht', MarketOverviewPage, '14,23'],
  ['Wettbewerb', CompetitionPage, '29,4'],
  ['SWOT', SwotPage, 'Time-to-Value'],
  ['ICP', IcpPage, 'Sweet Spot'],
  ['Persona', PersonaPage, 'Volker'],
  ['Segmente', SegmentsPage, 'Maschinenbau'],
  ['Top-Kunden', TopCustomersPage, 'Northwind'],
  ['Funnel', FunnelPage, '1.776'],
  ['SLA', SlaPage, 'Score ≥ 80'],
  ['Kanäle', ChannelsPage, '492 €'],
  ['Planung', PlanningPage, '12.000 €'],
];

describe('G53 semantische Seiten (jsdom-Spiegel)', () => {
  for (const [name, Page, probe] of pages) {
    it(`${name}: kein WebP, genau eine h1, Text und Struktur`, () => {
      // Das Layout stellt <main> (vgl. E2E-Scope auf Hauptinhalt).
      const { container } = render(
        <main>
          <Page />
        </main>,
      );
      expect(container.querySelectorAll('img[src$=".webp"]')).toHaveLength(0);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      const main = container.querySelector('main');
      expect(main).not.toBeNull();
      const text = main?.textContent ?? '';
      expect(text.length).toBeGreaterThan(200);
      expect(text).toContain(probe);
      const scoped = within(main as HTMLElement);
      const structures =
        scoped.queryAllByRole('table').length +
        container.querySelectorAll('main dl, main ul, main section').length;
      expect(structures).toBeGreaterThan(0);
    });
  }

  it('Chart-Seiten tragen Zusammenfassungen', () => {
    const { container: wettbewerb } = render(<CompetitionPage />);
    expect(wettbewerb.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
    const { container: segmente } = render(<SegmentsPage />);
    expect(segmente.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
    const { container: funnel } = render(<FunnelPage />);
    expect(funnel.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
    const { container: kanaele } = render(<ChannelsPage />);
    expect(kanaele.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
    const { container: planung } = render(<PlanningPage />);
    expect(planung.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
  });
});
