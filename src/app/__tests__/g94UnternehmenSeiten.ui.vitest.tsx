import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { HISTORIE, IDEE, VALUE } from '@/domain/unternehmenData';
import { IdeaPage } from '@/features/unternehmen/pages/IdeaPage';
import { ValuePropositionPage } from '@/features/unternehmen/pages/ValuePropositionPage';
import { HistoryPage } from '@/features/unternehmen/pages/HistoryPage';
import { FeaturesPage } from '@/features/produkt/pages/FeaturesPage';

// Auftrag 094 (Paket G2, Welle 1): Geschäftsidee, Value Proposition und Historie als echte
// Seiten nach dem Original-WebP; alle übrigen Bildseiten bleiben beim globalen Schalter.
afterEach(cleanup);

const WELLE = ['company-idea', 'company-value-proposition', 'company-history'] as const;

const renderMain = (Page: () => JSX.Element) =>
  render(
    <main>
      <Page />
    </main>,
  );

describe('G94 Unternehmensseiten als HTML-Seiten', () => {
  it('Seitenfreigabe enthält genau Funnel und Welle 1', () => {
    expect([...HTML_PAGES].sort()).toEqual(['sales-funnel', ...WELLE].sort());
    for (const key of WELLE) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it.each([
    ['Idee', IdeaPage, 'company-idea'],
    ['Value', ValuePropositionPage, 'company-value-proposition'],
    ['Historie', HistoryPage, 'company-history'],
  ] as const)('%s: kein Ganzseitenbild, genau eine sichtbare h1, ruhig', (_n, Page, key) => {
    const { container } = renderMain(Page);
    expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
    expect(container.querySelector('[data-testid="image-page-hint"]')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const seite = container.querySelector(`.pk-page[data-page-key="${key}"]`);
    expect(seite?.getAttribute('data-ruhig')).toBe('true');
  });

  it('Andere Seiten bleiben Bild', () => {
    const { container } = renderMain(FeaturesPage);
    expect(container.querySelector('[data-testid="image-page"]')).not.toBeNull();
  });

  it('Geschäftsidee: voller Inhalt des Originals', () => {
    const { container } = renderMain(IdeaPage);
    const text = container.textContent ?? '';
    for (const absatz of IDEE.paragraphs) expect(text).toContain(absatz);
    expect(screen.getByRole('heading', { name: 'Alleinstellungsmerkmale (USPs)' })).toBeTruthy();
    const usps = container.querySelectorAll('[data-testid="idee-usps"] li');
    expect(Array.from(usps, (li) => li.textContent)).toEqual(IDEE.usps);
    // Dekorative 3D-Illustrationen: vorhanden, aber für Screenreader ausgeblendet.
    for (const id of ['idee-bild', 'idee-stapel']) {
      const el = container.querySelector(`[data-testid="${id}"]`);
      expect(el?.getAttribute('aria-hidden')).toBe('true');
    }
    const kacheln = container.querySelectorAll('[data-testid="idee-stapel"] > span');
    expect(Array.from(kacheln, (k) => k.textContent)).toEqual(IDEE.uspKacheln);
  });

  it('Value Proposition: Zitat und drei Nutzenkarten mit Überschrift', () => {
    const { container } = renderMain(ValuePropositionPage);
    expect(container.querySelector('blockquote')?.textContent).toContain(VALUE.heroStatement);
    const karten = container.querySelectorAll('[data-testid="value-nutzen"]');
    expect(karten).toHaveLength(VALUE.coreBenefits.length);
    VALUE.coreBenefits.forEach((nutzen, index) => {
      expect(karten[index]?.querySelector('h2')?.textContent).toBe(nutzen.title);
      expect(karten[index]?.textContent).toContain(nutzen.desc);
    });
  });

  it('Historie: Zeitleiste in Reihenfolge, Gründung und Launch orange', () => {
    const { container } = renderMain(HistoryPage);
    const punkte = container.querySelectorAll('ol.us-zeitleiste > li');
    expect(punkte).toHaveLength(HISTORIE.events.length);
    const toene = Array.from(punkte, (li) => li.getAttribute('data-tone'));
    expect(toene).toEqual(['orange', 'cyan', 'cyan', 'orange', 'cyan']);
    HISTORIE.events.forEach((ereignis, index) => {
      expect(punkte[index]?.textContent).toContain(ereignis.date);
      expect(punkte[index]?.querySelector('h2')?.textContent).toBe(ereignis.title);
      expect(punkte[index]?.textContent).toContain(ereignis.desc);
    });
    // Pfeil-Kreise sind Zierde ohne Ziel: nicht fokussierbar, für Screenreader ausgeblendet.
    expect(container.querySelectorAll('.us-pfeil[aria-hidden="true"]')).toHaveLength(5);
    expect(container.querySelector('.us-pfeil button, button.us-pfeil, a.us-pfeil')).toBeNull();
  });
});
