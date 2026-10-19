import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { PROFILE_ROWS, HIGHLIGHTS_GOOD_ROWS, HIGHLIGHTS_BAD_ROWS } from '@/domain/execData';
import { FUNKTION, ROADMAP } from '@/domain/produktData';
import { CompanyProfilePage } from '@/features/overview/pages/CompanyProfilePage';
import { YearHighlightsPage } from '@/features/overview/pages/YearHighlightsPage';
import { FeaturesPage } from '@/features/produkt/pages/FeaturesPage';
import { RoadmapPage } from '@/features/produkt/pages/RoadmapPage';

// Auftrag 095 (Paket G2, Welle 2): Steckbrief, Jahres-Highlights, Produkt-Funktionsweise und
// Roadmap als echte Seiten nach dem Original-WebP; übrige Bildseiten bleiben beim Schalter.
afterEach(cleanup);

const WELLE = ['overview-profile', 'overview-highlights', 'product-features', 'product-roadmap'];

const renderMain = (Page: () => JSX.Element) =>
  render(
    <MemoryRouter>
      <main>
        <Page />
      </main>
    </MemoryRouter>,
  );

describe('G95 Übersicht und Produkt als HTML-Seiten', () => {
  it('Seitenfreigabe enthält Welle 2', () => {
    expect([...HTML_PAGES]).toEqual(expect.arrayContaining(WELLE));
    for (const key of WELLE) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it.each([
    ['Steckbrief', CompanyProfilePage, 'overview-profile'],
    ['Highlights', YearHighlightsPage, 'overview-highlights'],
    ['Funktionen', FeaturesPage, 'product-features'],
    ['Roadmap', RoadmapPage, 'product-roadmap'],
  ] as const)('%s: kein Ganzseitenbild, eine sichtbare h1, ruhig', (_n, Page, key) => {
    const { container } = renderMain(Page);
    expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      container.querySelector(`.pk-page[data-page-key="${key}"]`)?.getAttribute('data-ruhig'),
    ).toBe('true');
  });

  it('Steckbrief: Register-Tabelle vollständig, Kapitalerhöhung als Chip', () => {
    const { container } = renderMain(CompanyProfilePage);
    const zeilen = container.querySelectorAll('[data-testid="profil-register"] .pk-kv__row');
    expect(zeilen).toHaveLength(PROFILE_ROWS.length);
    PROFILE_ROWS.forEach((row, i) => {
      expect(zeilen[i]?.textContent).toContain(row[0]);
      expect(zeilen[i]?.textContent).toContain(row[1]);
    });
    expect(container.querySelector('.ov-kapital .pk-chip')?.textContent).toBe(
      'Kapitalerhöhung Q1 2024',
    );
    expect(screen.getByText('Erreicht')).toBeTruthy();
    expect(screen.getByText('Fokus 2026')).toBeTruthy();
  });

  it('Highlights: alle Einträge, FY 2025 leuchtet', () => {
    const { container } = renderMain(YearHighlightsPage);
    const text = container.textContent ?? '';
    for (const [titel, beschreibung] of [...HIGHLIGHTS_GOOD_ROWS, ...HIGHLIGHTS_BAD_ROWS]) {
      expect(text).toContain(titel);
      expect(text).toContain(beschreibung);
    }
    const aktiv = container.querySelector('.pk-hero > .pk-pills .pk-pill[data-active="true"]');
    expect(aktiv?.textContent).toBe('FY 2025');
  });

  it('Funktionen: vier Module, dekorative Bilder, Links statt toter Buttons', () => {
    const { container } = renderMain(FeaturesPage);
    const module = container.querySelectorAll('[data-testid="produkt-modul"]');
    expect(module).toHaveLength(FUNKTION.modules.length);
    FUNKTION.modules.forEach((modul, i) => {
      expect(module[i]?.querySelector('h2')?.textContent).toBe(modul.name);
      expect(module[i]?.textContent).toContain(modul.desc);
      expect(module[i]?.querySelector('a.pd-mehr')?.getAttribute('href')).toMatch(/^\//);
      expect(module[i]?.querySelector('.pd-bild')?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('Roadmap: Reihenfolge, Töne, zweizeilige Planversion, Berg dekorativ', () => {
    const { container } = renderMain(RoadmapPage);
    const punkte = container.querySelectorAll('ol.pk-timeline > li');
    expect(punkte).toHaveLength(ROADMAP.releases.length);
    ROADMAP.releases.forEach((release, i) => {
      expect(punkte[i]?.getAttribute('data-tone')).toBe(
        release.status === 'Released' ? 'cyan' : 'orange',
      );
      expect(punkte[i]?.querySelector('h2')?.textContent).toContain(release.title);
      expect(punkte[i]?.textContent).toContain(release.desc);
    });
    expect(punkte[4]?.querySelector('.pd-version span')?.textContent).toBe('(geplant Q1 2026)');
    expect(
      container.querySelector('[data-testid="roadmap-berg"]')?.getAttribute('aria-hidden'),
    ).toBe('true');
  });
});
