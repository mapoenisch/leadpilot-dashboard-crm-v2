import { describe, it, expect } from 'vitest';
import { ROUTE_PAGES, ROUTE_PAGE_ENTRIES } from '../routePages';
import { APP_ROUTES } from '../routes';

describe('routePages (characterization)', () => {
  it('lädt das Modul mit vollständigem Lazy-Routen-Mapping', () => {
    expect(ROUTE_PAGE_ENTRIES.length).toBeGreaterThan(30);
    expect(Object.keys(ROUTE_PAGES).length).toBe(ROUTE_PAGE_ENTRIES.length);
    for (const entry of ROUTE_PAGE_ENTRIES) {
      expect(entry.id).toBeTruthy();
      expect(entry.component).toBeDefined();
    }
  });

  it('enthält jede APP_ROUTES-ID genau einmal und ohne Lücken', () => {
    const ids = ROUTE_PAGE_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const route of APP_ROUTES) {
      expect(ids).toContain(route.id);
    }
    expect(ids.length).toBe(APP_ROUTES.length);
  });

  it('mappt Kernrouten auf Lazy-Komponenten', () => {
    for (const id of ['s-deals', 's-activities', 's-markt', 's-kampagne-internal'] as const) {
      expect(ROUTE_PAGES[id]).toBeDefined();
    }
  });
});
