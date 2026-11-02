import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { HEADCOUNT, HR, TEAM } from '@/domain/organisationData';
import { HeadcountPage, hatEngpass } from '@/features/organisation/pages/HeadcountPage';
import { HrPage } from '@/features/organisation/pages/HrPage';
import { TeamStructurePage } from '@/features/organisation/pages/TeamStructurePage';

// Auftrag 100 (Paket G2, Welle 7): Headcount, HR-Kennzahlen und Teamstruktur als echte Seiten
// nach dem Original-WebP; FTE-Verlauf mit 3D-Tiefe, Werte nach Faktenblatt v1.2 §10.
afterEach(cleanup);

const WELLE = ['organisation-headcount', 'organisation-hr', 'organisation-team'];

const renderMain = (Page: () => JSX.Element) =>
  render(
    <main>
      <Page />
    </main>,
  );

describe('G100 Organisationsseiten als HTML-Seiten', () => {
  it('Seitenfreigabe enthält Welle 7', () => {
    expect([...HTML_PAGES]).toEqual(expect.arrayContaining(WELLE));
    for (const key of WELLE) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it.each([
    ['Headcount', HeadcountPage, 'organisation-headcount', 'Entwicklung der Teamgröße'],
    ['HR', HrPage, 'organisation-hr', 'HR-Kennzahlen'],
    ['Team', TeamStructurePage, 'organisation-team', 'Teamstruktur & Engpässe (31.12.2025)'],
  ] as const)('%s: kein Ganzseitenbild, Titel, ruhig', (_n, Page, key, titel) => {
    const { container } = renderMain(Page);
    expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
    const h1 = screen.getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]?.textContent).toBe(titel);
    expect(
      container.querySelector(`.pk-page[data-page-key="${key}"]`)?.getAttribute('data-ruhig'),
    ).toBe('true');
  });

  it('Kapazitätsfokus wie im Original: Engineering, Sales, Customer Success', () => {
    const markiert = HEADCOUNT.rows.map((row) => row[0] ?? '').filter(hatEngpass);
    expect(markiert).toEqual(['Engineering / Product', 'Sales', 'Customer Success']);
  });

  it('Headcount: 3D-Verlauf, alle Bereiche, Gesamtbestand mit Ziel und Plan', () => {
    const { container } = renderMain(HeadcountPage);
    expect(container.querySelectorAll('[data-testid="depth-flaechen"]')).toHaveLength(1);
    const text = container.textContent ?? '';
    for (const row of HEADCOUNT.rows) for (const zelle of row) expect(text).toContain(zelle);
    expect(text.match(/Kapazitätsfokus/g)).toHaveLength(3);
    expect(text).toContain('Geplant: +2,0 FTE');
  });

  it('HR: alle sechs Kennzahlen vollständig, Benchmark-Fokus und Kostenblock', () => {
    const { container } = renderMain(HrPage);
    const text = container.textContent ?? '';
    for (const { label, val } of HR.metrics) {
      expect(text).toContain(label);
      expect(text).toContain(val);
    }
    expect(text).toContain('Benchmark-Fokus');
    expect(text).toContain('Kostenblock');
  });

  it('Team: Organigramm und vier Analysefelder mit Markierungen', () => {
    const { container } = renderMain(TeamStructurePage);
    const text = container.textContent ?? '';
    for (const feld of TEAM.bottlenecks) expect(text).toContain(feld);
    for (const marke of [
      'Kritischer Engpass',
      'Kapazitätsgrenze',
      'Schlüsselrisiko',
      'Geplante Maßnahme',
    ]) {
      expect(text).toContain(marke);
    }
    expect(text.match(/Kapazitätsfokus/g)).toHaveLength(3);
    expect(
      screen.getByRole('heading', { name: 'Operative Engpässe & Risikofelder' }),
    ).toBeInTheDocument();
  });
});
