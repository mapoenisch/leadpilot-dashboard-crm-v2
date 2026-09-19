import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CompanyProfilePage } from '@/features/overview/pages/CompanyProfilePage';
import { YearHighlightsPage } from '@/features/overview/pages/YearHighlightsPage';
import { IdeaPage } from '@/features/unternehmen/pages/IdeaPage';
import { ValuePropositionPage } from '@/features/unternehmen/pages/ValuePropositionPage';
import { HistoryPage } from '@/features/unternehmen/pages/HistoryPage';
import { FeaturesPage } from '@/features/produkt/pages/FeaturesPage';
import { PricingPage } from '@/features/produkt/pages/PricingPage';
import { PerformancePage } from '@/features/produkt/pages/PerformancePage';
import { RoadmapPage } from '@/features/produkt/pages/RoadmapPage';

// 067I / G54: jsdom-Spiegel der E2E-Route-Tests (läuft ohne Credentials) —
// kein Ganzseiten-WebP, genau eine h1, auswählbarer Text, semantische Struktur.
const pages: Array<[string, () => JSX.Element, string]> = [
  ['Steckbrief', CompanyProfilePage, 'HRB 40912'],
  ['Highlights', YearHighlightsPage, '+98 %'],
  ['Idee', IdeaPage, 'Kein Lead bleibt zurück'],
  ['Value', ValuePropositionPage, 'Time-to-Value'],
  ['Historie', HistoryPage, '950.000 €'],
  ['Funktionen', FeaturesPage, 'Pipeline Cockpit'],
  ['Pricing', PricingPage, '89 €'],
  ['Performance', PerformancePage, '99,7 %'],
  ['Roadmap', RoadmapPage, 'Zapier'],
];

describe('G54 semantische Seiten (jsdom-Spiegel)', () => {
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
        container.querySelectorAll('main dl, main ul, main ol, main section').length;
      expect(structures).toBeGreaterThan(0);
    });
  }

  it('Chart-Seiten tragen Zusammenfassungen', () => {
    const { container: performance } = render(<PerformancePage />);
    expect(performance.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
  });
});
