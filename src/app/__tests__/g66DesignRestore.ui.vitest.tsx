import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
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

// Auftrag 068 / G66: v2.3.0 lieferte die 32 G52–G55-Seiten ohne jede Gestaltung
// aus (0 Klassen je Seite) und ersetzte das echte Logo durch ein erfundenes
// Zeichen. Dieser Test verlangt je Seite Seitenkopf mit Eyebrow und
// gestaltete Flächen und prüft das echte Logo in Sidebar, Login und Favicon.
const pages: Array<[string, () => JSX.Element]> = [
  ['GuV', PnLPage],
  ['Bilanz', BalanceSheetPage],
  ['Unit Economics', UnitEconomicsPage],
  ['Satzung', ArticlesPage],
  ['Gesellschafter', ShareholdersPage],
  ['Handelsregister', CommercialRegisterPage],
  ['OKRs', OkrsPage],
  ['Scorecard', BalancedScorecardPage],
  ['Wachstumstreiber', GrowthDriversPage],
  ['Marktlage', MarketOverviewPage],
  ['Wettbewerb', CompetitionPage],
  ['SWOT', SwotPage],
  ['ICP', IcpPage],
  ['Persona', PersonaPage],
  ['Segmente', SegmentsPage],
  ['Top-Kunden', TopCustomersPage],
  ['Funnel', FunnelPage],
  ['SLA', SlaPage],
  ['Kanäle', ChannelsPage],
  ['Planung', PlanningPage],
  ['Steckbrief', CompanyProfilePage],
  ['Highlights', YearHighlightsPage],
  ['Idee', IdeaPage],
  ['Value Proposition', ValuePropositionPage],
  ['Historie', HistoryPage],
  ['Funktionen', FeaturesPage],
  ['Preise', PricingPage],
  ['Performance', PerformancePage],
  ['Roadmap', RoadmapPage],
  ['Headcount', HeadcountPage],
  ['HR', HrPage],
  ['Teamstruktur', TeamStructurePage],
];

const GESTALTET = '.pk-panel, .pk-stat, .pk-unit, .pk-row, .pk-feature, .pk-callout, .pk-quote';
const root = path.resolve(__dirname, '../../..');

describe('G66 Design-Wiederherstellung', () => {
  it('deckt alle 32 Inhaltsseiten ab', () => {
    expect(pages).toHaveLength(32);
  });

  for (const [name, Page] of pages) {
    it(`${name}: Seitenkopf mit Eyebrow und gestaltete Flächen`, () => {
      const { container } = render(<Page />);
      const seite = container.querySelector('.pk-page');
      expect(seite).not.toBeNull();
      const kopf = container.querySelector('[data-testid="page-hero"]');
      expect(kopf?.querySelector('.pk-eyebrow')?.textContent?.trim()).toBeTruthy();
      expect(kopf?.querySelector('h1.pk-title')).not.toBeNull();
      expect(container.querySelectorAll(GESTALTET).length).toBeGreaterThan(0);
      // Keine ungestaltete Tabelle mehr (v2.3.0-Rückschritt).
      for (const tabelle of Array.from(container.querySelectorAll('table'))) {
        expect(tabelle.classList.contains('pk-table')).toBe(true);
      }
    });
  }

  it('Sidebar zeigt das echte LeadPilot-Logo', () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar isMobile={false} />
      </MemoryRouter>,
    );
    const logo = container.querySelector('img[alt="LeadPilot Logo"]');
    expect(logo?.getAttribute('src')).toBe('/assets/logo/leadpilot-logo.png');
  });

  it('Login und Favicon nutzen das echte Logo aus public/ (build-fest)', () => {
    const login = fs.readFileSync(path.join(root, 'src/features/auth/pages/LoginPage.tsx'), 'utf8');
    expect(login).toContain('/assets/logo/leadpilot-logo.png');
    expect(login).not.toContain('leadpilot-logo-full.png');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    expect(html).toContain('href="/assets/logo/leadpilot-favicon.png"');
    expect(html).not.toContain('leadpilot-mark');
    for (const datei of ['leadpilot-logo.png', 'leadpilot-favicon.png']) {
      expect(fs.existsSync(path.join(root, 'public/assets/logo', datei))).toBe(true);
    }
    expect(fs.existsSync(path.join(root, 'public/assets/logo/leadpilot-mark.svg'))).toBe(false);
  });
});
