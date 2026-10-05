// Auftrag 077: mitreisender Kontext zwischen Ansicht und Details (Filter, Fokusziel).
import { describe, expect, it } from 'vitest';
import { buildDashboardNavState, readDashboardNavState } from '../hooks/useDashboardNavigation';

const ID = 'org-1|user-1';
const FILTERS = { value: { period: { from: '2025-01-01', to: '2025-06-30' } } };

describe('readDashboardNavState', () => {
  it('liest Filter und Fokusziel aus dem eigenen Seitenaufruf', () => {
    const state = buildDashboardNavState(ID, FILTERS, 'kachel-1', 'aufruf-1');
    expect(readDashboardNavState(state, ID, 'aufruf-1')).toEqual({
      session: FILTERS,
      returnFocus: 'kachel-1',
    });
  });

  it('übernimmt einen ausdrücklich geleerten Sitzungsfilter', () => {
    const state = buildDashboardNavState(ID, { value: undefined }, undefined, 'aufruf-1');
    expect(readDashboardNavState(state, ID, 'aufruf-1')).toEqual({
      session: { value: undefined },
      returnFocus: null,
    });
  });

  it('verwirft den Kontext nach einem Reload (anderer Seitenaufruf)', () => {
    const state = buildDashboardNavState(ID, FILTERS, 'kachel-1', 'aufruf-1');
    expect(readDashboardNavState(state, ID, 'aufruf-2')).toBeNull();
  });

  it('verwirft den Kontext eines anderen Benutzers oder ohne Sitzung', () => {
    const state = buildDashboardNavState(ID, FILTERS, 'kachel-1', 'aufruf-1');
    expect(readDashboardNavState(state, 'org-1|user-2', 'aufruf-1')).toBeNull();
    expect(readDashboardNavState(state, 'org-2|user-1', 'aufruf-1')).toBeNull();
    expect(readDashboardNavState(state, null, 'aufruf-1')).toBeNull();
  });

  it('ignoriert fremde oder kaputte Zustände', () => {
    expect(readDashboardNavState(null, ID)).toBeNull();
    expect(readDashboardNavState('text', ID)).toBeNull();
    expect(readDashboardNavState({ andere: 1 }, ID)).toBeNull();
    const broken = { dashboardNav: { load: 'a', identity: ID, session: 'kaputt', returnFocus: 3 } };
    expect(readDashboardNavState(broken, ID, 'a')).toEqual({ session: null, returnFocus: null });
  });

  it('nutzt ohne Angabe das Ladezeichen dieses Seitenaufrufs', () => {
    const state = buildDashboardNavState(ID, FILTERS, 'kachel-1');
    expect(readDashboardNavState(state, ID)?.returnFocus).toBe('kachel-1');
  });
});
