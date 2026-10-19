import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES, PAGE_PRESENTATION } from '@/config/pagePresentation';
import { IMAGE_PAGES, type ImagePageKey } from '@/components/imagePage';
import { PnLPage } from '@/features/finanzen/pages/PnLPage';
import { BalanceSheetPage } from '@/features/finanzen/pages/BalanceSheetPage';
import { UnitEconomicsPage } from '@/features/finanzen/pages/UnitEconomicsPage';
import { ArticlesPage } from '@/features/recht/pages/ArticlesPage';
import { ShareholdersPage } from '@/features/recht/pages/ShareholdersPage';
import { CommercialRegisterPage } from '@/features/recht/pages/CommercialRegisterPage';
import { OkrsPage } from '@/features/strategie/pages/OkrsPage';
import { BalancedScorecardPage } from '@/features/strategie/pages/BalancedScorecardPage';
import { GrowthDriversPage } from '@/features/strategie/pages/GrowthDriversPage';
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
import { CompanyProfilePage } from '@/features/overview/pages/CompanyProfilePage';
import { YearHighlightsPage } from '@/features/overview/pages/YearHighlightsPage';
import { IdeaPage } from '@/features/unternehmen/pages/IdeaPage';
import { ValuePropositionPage } from '@/features/unternehmen/pages/ValuePropositionPage';
import { HistoryPage } from '@/features/unternehmen/pages/HistoryPage';
import { FeaturesPage } from '@/features/produkt/pages/FeaturesPage';
import { PricingPage } from '@/features/produkt/pages/PricingPage';
import { PerformancePage } from '@/features/produkt/pages/PerformancePage';
import { RoadmapPage } from '@/features/produkt/pages/RoadmapPage';
import { HeadcountPage } from '@/features/organisation/pages/HeadcountPage';
import { HrPage } from '@/features/organisation/pages/HrPage';
import { TeamStructurePage } from '@/features/organisation/pages/TeamStructurePage';

// Auftrag 104 (Paket G3): Abschluss der Bildseiten-Migration. Der globale Schalter steht
// auf 'html', die Seitenfreigabe nennt alle 32 Seiten. Ohne Mock: Keine Seite rendert noch
// Ganzseiten-WebP, Zoom-Hinweis oder unsichtbare Textschicht (doppelte Inhaltsfassung).
// Den Rückweg auf den Bildweg prüft weiterhin g67ImagePages (Schalter dort gemockt).
// Codex PR #91 (P2): Die Erwartung folgt dem Schalter, damit der dokumentierte Rückweg
// (Schalter 'bild', Schlüssel aus HTML_PAGES entfernt) diese Suite nicht bricht.
afterEach(cleanup);

const alsBild = (key: ImagePageKey) => PAGE_PRESENTATION === 'bild' && !HTML_PAGES.includes(key);

const pages: Array<[ImagePageKey, () => JSX.Element]> = [
  ['market-dach', MarketOverviewPage],
  ['market-competition', CompetitionPage],
  ['market-swot', SwotPage],
  ['customers-icp', IcpPage],
  ['customers-persona', PersonaPage],
  ['customers-segments', SegmentsPage],
  ['customers-top10', TopCustomersPage],
  ['sales-funnel', FunnelPage],
  ['sales-sla', SlaPage],
  ['sales-channels', ChannelsPage],
  ['sales-planning', PlanningPage],
  ['finance-pnl', PnLPage],
  ['finance-balance-sheet', BalanceSheetPage],
  ['finance-unit-economics', UnitEconomicsPage],
  ['organisation-headcount', HeadcountPage],
  ['organisation-hr', HrPage],
  ['organisation-team', TeamStructurePage],
  ['strategy-okrs', OkrsPage],
  ['strategy-bsc', BalancedScorecardPage],
  ['strategy-growth', GrowthDriversPage],
  ['legal-articles', ArticlesPage],
  ['legal-shareholders', ShareholdersPage],
  ['legal-register', CommercialRegisterPage],
  ['overview-profile', CompanyProfilePage],
  ['overview-highlights', YearHighlightsPage],
  ['company-idea', IdeaPage],
  ['company-value-proposition', ValuePropositionPage],
  ['company-history', HistoryPage],
  ['product-features', FeaturesPage],
  ['product-pricing', PricingPage],
  ['product-performance', PerformancePage],
  ['product-roadmap', RoadmapPage],
];

describe('G104 Abschluss: alle 32 Inhaltsseiten sind echte Seiten', () => {
  it('Inventar 32 von 32 ohne Lücke oder Doppelung, Freigaben nur bekannte Seiten', () => {
    expect(['bild', 'html']).toContain(PAGE_PRESENTATION);
    expect(pages).toHaveLength(32);
    expect(pages.map(([key]) => key).sort()).toEqual(Object.keys(IMAGE_PAGES).sort());
    for (const key of HTML_PAGES) expect(Object.keys(IMAGE_PAGES)).toContain(key);
    // Codex-Prüfung Runde 2 (P3): Vollständigkeit hier selbsttragend, solange kein Rückweg aktiv ist.
    if (PAGE_PRESENTATION === 'html') {
      expect([...HTML_PAGES].sort()).toEqual(Object.keys(IMAGE_PAGES).sort());
    }
    expect(new Set(HTML_PAGES).size).toBe(HTML_PAGES.length);
  });

  it.each(pages)(
    '%s: Darstellung folgt dem Schalter, ohne Rückweg keine versteckte Zweitfassung',
    (key, Page) => {
      const { container } = render(
        <MemoryRouter>
          <main>
            <Page />
          </main>
        </MemoryRouter>,
      );
      if (alsBild(key)) {
        expect(container.querySelector('[data-testid="image-page"]')).not.toBeNull();
        expect(container.querySelectorAll('img.image-page__img')).toHaveLength(1);
        return;
      }
      expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
      expect(container.querySelector('[data-testid="image-page-text"]')).toBeNull();
      expect(container.querySelector('[data-testid="image-page-hint"]')).toBeNull();
      expect(container.querySelectorAll('img.image-page__img')).toHaveLength(0);
      // Codex PR #91 (P3): Schlüssel und Seite gebunden – eine vertauschte Zuordnung fällt auf.
      expect(container.querySelector(`main > .pk-page[data-page-key="${key}"]`)).not.toBeNull();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    },
  );
});
