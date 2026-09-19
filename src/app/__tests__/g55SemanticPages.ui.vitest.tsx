import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HeadcountPage } from '@/features/organisation/pages/HeadcountPage';
import { HrPage } from '@/features/organisation/pages/HrPage';
import { TeamStructurePage } from '@/features/organisation/pages/TeamStructurePage';

// 067I / G55: jsdom-Spiegel der E2E-Route-Tests (läuft ohne Credentials) —
// kein Ganzseiten-WebP, genau eine h1, auswählbarer Text, semantische Struktur.
const pages: Array<[string, () => JSX.Element, string]> = [
  ['Headcount', HeadcountPage, '10,0 FTE'],
  ['HR', HrPage, '54.400 €'],
  ['Teamstruktur', TeamStructurePage, 'Single Point of Failure'],
];

describe('G55 semantische Seiten (jsdom-Spiegel)', () => {
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
    const { container: headcount } = render(<HeadcountPage />);
    expect(headcount.querySelectorAll('[data-testid="chart-summary"]').length).toBeGreaterThan(0);
  });
});
