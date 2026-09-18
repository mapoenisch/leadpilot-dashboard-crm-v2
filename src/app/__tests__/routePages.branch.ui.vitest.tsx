import { describe, it, expect } from 'vitest';
import { ROUTE_PAGES, ROUTE_PAGE_ENTRIES } from '../routePages';

describe('routePages (branch: Lazy-Mapping)', () => {
  it('bildet jeden Eintrag als React.lazy-Komponente ab', () => {
    for (const entry of ROUTE_PAGE_ENTRIES) {
      const lazy = entry.component as unknown as { $$typeof: symbol };
      expect(lazy.$$typeof.toString()).toBe('Symbol(react.lazy)');
      expect(ROUTE_PAGES[entry.id]).toBe(entry.component);
    }
  });

  it('lädt den Leads-Loader mit benannter Seitenkomponente', async () => {
    const mod = await import('@/features/crm/pages/LeadsPage');
    expect(typeof mod.LeadsPage).toBe('function');
  });

  it('lädt einen zweiten Loader (Bilanz) mit benannter Seitenkomponente', async () => {
    const mod = await import('@/features/finanzen/pages/BalanceSheetPage');
    expect(typeof mod.BalanceSheetPage).toBe('function');
  });

  it('deckt alle Kategorien ohne Duplikate ab', () => {
    const ids = ROUTE_PAGE_ENTRIES.map((e) => e.id);
    for (const id of ['s-exec', 's-leads', 's-bilanz', 's-bsc', 's-satzung']) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});
