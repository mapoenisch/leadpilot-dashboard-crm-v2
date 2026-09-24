import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PnLPage } from '@/features/finanzen/pages/PnLPage';
import { BalanceSheetPage } from '@/features/finanzen/pages/BalanceSheetPage';
import { UnitEconomicsPage } from '@/features/finanzen/pages/UnitEconomicsPage';
import { ArticlesPage } from '@/features/recht/pages/ArticlesPage';
import { ShareholdersPage } from '@/features/recht/pages/ShareholdersPage';
import { CommercialRegisterPage } from '@/features/recht/pages/CommercialRegisterPage';
import { OkrsPage } from '@/features/strategie/pages/OkrsPage';
import { BalancedScorecardPage } from '@/features/strategie/pages/BalancedScorecardPage';
import { GrowthDriversPage } from '@/features/strategie/pages/GrowthDriversPage';

// 067I / G52: jsdom-Spiegel der E2E-Route-Tests (läuft ohne Credentials) —
// kein Ganzseiten-WebP, genau eine h1, auswählbarer Text, semantische Struktur.
const pages: Array<[string, () => JSX.Element, string]> = [
  ['GuV', PnLPage, '307.600'],
  ['Bilanz', BalanceSheetPage, '479.000'],
  ['Unit Economics', UnitEconomicsPage, '862'],
  ['Satzung', ArticlesPage, 'Leipzig'],
  ['Gesellschafter', ShareholdersPage, '100,0'],
  ['Handelsregister', CommercialRegisterPage, 'HRB 40912'],
  ['OKRs', OkrsPage, '620.000'],
  ['Scorecard', BalancedScorecardPage, '411.840'],
  ['Wachstumstreiber', GrowthDriversPage, '72.000'],
];

describe('G52 semantische Seiten (jsdom-Spiegel)', () => {
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
    const { container: pnl } = render(<PnLPage />);
    expect(pnl.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
    const { container: okr } = render(<OkrsPage />);
    expect(okr.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
    const { container: treiber } = render(<GrowthDriversPage />);
    expect(treiber.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
    const { container: unit } = render(<UnitEconomicsPage />);
    expect(unit.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
  });
});
