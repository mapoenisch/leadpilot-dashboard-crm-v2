import { describe, it, expect } from 'vitest';
import { NAV_CATEGORIES, NAV_SECTIONS, groupNavCategories } from '../navData';

describe('groupNavCategories', () => {
  it('ordnet jeden Fachbereich genau einmal zu', () => {
    const ids = groupNavCategories().flatMap((s) => s.categories.map((c) => c.id));
    expect(ids).toHaveLength(NAV_CATEGORIES.length);
    expect(new Set(ids)).toEqual(new Set(NAV_CATEGORIES.map((c) => c.id)));
  });

  it('beginnt mit den häufigen Aufgaben', () => {
    const [first] = groupNavCategories();
    expect(first?.label).toBe('Tägliche Arbeit');
    expect(first?.categories.map((c) => c.id)).toEqual(['uebersicht', 'crm', 'vertrieb']);
  });

  it('hängt nicht zugeordnete Bereiche unter „Weitere Bereiche“ an', () => {
    const extra = { id: 'neu', label: 'Neu', status: 'live' as const, items: [] };
    const grouped = groupNavCategories([...NAV_CATEGORIES, extra], NAV_SECTIONS);
    const last = grouped[grouped.length - 1];
    expect(last?.label).toBe('Weitere Bereiche');
    expect(last?.categories.map((c) => c.id)).toEqual(['neu']);
  });
});
