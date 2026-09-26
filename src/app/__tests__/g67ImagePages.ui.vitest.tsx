import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

// Auftrag 069 / G67: Die 32 statischen Inhaltsseiten zeigen wieder das
// Original-WebP aus v2.2.0. Der v2.3.1-Inhalt liegt als unsichtbare
// Textschicht darunter; der Schalter PAGE_PRESENTATION = 'html' stellt das
// Aussehen von v2.3.1 wieder her.
const mode = vi.hoisted(() => ({ value: 'bild' as 'bild' | 'html' }));
vi.mock('@/config/pagePresentation', () => ({
  get PAGE_PRESENTATION() {
    return mode.value;
  },
}));

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

const root = process.cwd();

afterEach(() => {
  cleanup();
  mode.value = 'bild';
});

describe('G67 Bildseiten wie v2.2.0', () => {
  it('deckt genau die 32 statischen Seiten ab, ohne Datenbasis', () => {
    expect(pages).toHaveLength(32);
    expect(Object.keys(IMAGE_PAGES)).toHaveLength(32);
    expect(new Set(pages.map(([key]) => key)).size).toBe(32);
    const srcs = Object.values(IMAGE_PAGES).map((entry) => entry.src);
    expect(srcs).not.toContain('/assets/auftrag-037g/03-datenbasis-konsistenz.webp');
  });

  it('alle Bilddateien sind unverändert (SHA-256 laut ASSET_SOURCE.md)', () => {
    for (const { src } of Object.values(IMAGE_PAGES)) {
      const file = path.join(root, 'public', src);
      const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
      const source = fs.readFileSync(path.join(path.dirname(file), 'ASSET_SOURCE.md'), 'utf8');
      expect(source, src).toContain(hash);
    }
  });

  for (const [key, Page] of pages) {
    it(`${key}: Original-WebP, Hochformat-Hinweis und unsichtbare Textschicht`, () => {
      const { src, testId } = IMAGE_PAGES[key];
      const { container } = render(
        <main>
          <Page />
        </main>,
      );
      const img = screen.getByTestId(testId);
      expect(img.getAttribute('src')).toBe(src);
      expect(img.getAttribute('alt')?.length ?? 0).toBeGreaterThan(10);

      // Genau ein Bild, immer das ganze; der Hinweis ist für Screenreader ausgeblendet.
      expect(container.querySelectorAll('img')).toHaveLength(1);
      const hint = screen.getByTestId('image-page-hint');
      expect(hint.getAttribute('aria-hidden')).toBe('true');
      expect(hint.textContent).toMatch(/quer drehen oder mit zwei Fingern zoomen/);

      // Textschicht: optisch verborgen, aber im Accessibility-Tree.
      const layer = screen.getByTestId('image-page-text');
      expect(layer.classList.contains('sr-only')).toBe(true);
      expect(layer.getAttribute('aria-hidden')).toBeNull();
      expect(layer.querySelectorAll('h1')).toHaveLength(1);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect((layer.textContent ?? '').length).toBeGreaterThan(100);
    });
  }

  for (const [key, Page] of pages) {
    it(`${key}: Schalter 'html' stellt v2.3.1 wieder her`, () => {
      mode.value = 'html';
      const { container } = render(<Page />);
      expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
      expect(container.querySelectorAll('img[src$=".webp"]')).toHaveLength(0);
      expect(container.querySelector('.pk-page')).not.toBeNull();
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });
  }

  it('Standard ist die Bilddarstellung', () => {
    const config = fs.readFileSync(path.join(root, 'src/config/pagePresentation.ts'), 'utf8');
    expect(config).toMatch(/PAGE_PRESENTATION: PagePresentation = 'bild';/);
  });

  it('Handy: Hinweis nur im Hochformat unter 600 px, Zoom nicht gesperrt', () => {
    const css = fs.readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');
    const block = css.slice(css.indexOf('.image-page {'), css.indexOf('/* Auftrag 038'));
    expect(block).toMatch(/\.image-page__hint \{\s*display: none;/);
    expect(block).toMatch(
      /@media \(max-width: 599px\) and \(orientation: portrait\) \{\s*\.image-page__hint \{\s*display: flex;/,
    );
    expect(block).not.toMatch(/touch-action/);
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const viewport = /<meta name="viewport" content="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/);
  });
});
