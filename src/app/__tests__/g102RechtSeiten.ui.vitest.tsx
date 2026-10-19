import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { GESELLSCHAFTER, HANDELSREGISTER, SATZUNG } from '@/domain/rechtData';
import { ArticlesPage } from '@/features/recht/pages/ArticlesPage';
import { ShareholdersPage } from '@/features/recht/pages/ShareholdersPage';
import { CommercialRegisterPage } from '@/features/recht/pages/CommercialRegisterPage';

// Auftrag 102 (Paket G2, Welle 9): Satzung, Gesellschafterliste und Handelsregister als echte
// Seiten nach dem Original-WebP; Stammkapital und Vertretung nach Faktenblatt v1.2 (§1, §7, D4).
afterEach(cleanup);

const WELLE = ['legal-articles', 'legal-shareholders', 'legal-register'];

const renderMain = (Page: () => JSX.Element) =>
  render(
    <main>
      <Page />
    </main>,
  );

describe('G102 Rechtsseiten als HTML-Seiten', () => {
  it('Seitenfreigabe enthält Welle 9', () => {
    expect([...HTML_PAGES]).toEqual(expect.arrayContaining(WELLE));
    for (const key of WELLE) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it.each([
    ['Satzung', ArticlesPage, 'legal-articles', SATZUNG.title, 'Gesellschaftsvertrag Auszug.'],
    [
      'Gesellschafter',
      ShareholdersPage,
      'legal-shareholders',
      'Gesellschafterliste',
      'Beteiligungsverhältnisse der LeadPilot GmbH.',
    ],
    [
      'Handelsregister',
      CommercialRegisterPage,
      'legal-register',
      HANDELSREGISTER.title,
      'Handelsregisterbekanntmachung.',
    ],
  ] as const)(
    '%s: kein Ganzseitenbild, Titel und Untertitel wie im Original, ruhig',
    (_n, Page, key, titel, untertitel) => {
      const { container } = renderMain(Page);
      expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
      const h1 = screen.getAllByRole('heading', { level: 1 });
      expect(h1).toHaveLength(1);
      expect(h1[0]?.textContent).toBe(titel);
      expect(screen.getByText(untertitel)).toBeInTheDocument();
      expect(
        container.querySelector(`.pk-page[data-page-key="${key}"]`)?.getAttribute('data-ruhig'),
      ).toBe('true');
    },
  );

  it('Satzung: drei Paragraphen mit vollständigem Regelungstext', () => {
    const { container } = renderMain(ArticlesPage);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(SATZUNG.sections.length);
    const text = container.textContent ?? '';
    for (const [paragraph, inhalt] of SATZUNG.sections) {
      expect(text).toContain(paragraph);
      expect(text).toContain(inhalt);
    }
  });

  it('Gesellschafter: fünf Gesellschafter plus Summe, Stammkapital 31.250 € (Faktenblatt §7)', () => {
    const { container } = renderMain(ShareholdersPage);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(GESELLSCHAFTER.rows.length);
    expect(container.querySelectorAll('.pk-meter')).toHaveLength(GESELLSCHAFTER.rows.length);
    const text = container.textContent ?? '';
    for (const row of GESELLSCHAFTER.rows) for (const zelle of row) expect(text).toContain(zelle);
    expect(text).toContain('Stammkapital 31.250,00 €');
    expect(text).not.toContain('25.000');
  });

  it('Handelsregister: Merkmal/Details-Tabelle, Vertretung einzeln (Faktenblatt D4)', () => {
    const { container } = renderMain(CommercialRegisterPage);
    const kopf = [...container.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(kopf).toEqual(['Merkmal', 'Details']);
    const text = container.textContent ?? '';
    for (const [merkmal, details] of HANDELSREGISTER.details) {
      expect(text).toContain(merkmal);
      expect(text).toContain(details);
    }
    expect(text).toContain('HRB 40912');
    expect(text).toContain('einzelvertretungsberechtigt');
    expect(text).not.toContain('gemeinsam vertreten');
  });
});
