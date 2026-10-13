import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { HTML_PAGES, PAGE_PRESENTATION } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { FUNNEL } from '@/domain/vertriebData';
import { FunnelPage } from '@/features/vertrieb/pages/FunnelPage';
import { SlaPage } from '@/features/vertrieb/pages/SlaPage';

// Auftrag 093 (Paket G1): Sales Funnel als erste echte Seite per Seitenfreigabe,
// alle übrigen Seiten bleiben beim globalen Bildschalter.
afterEach(cleanup);

describe('G93 Sales Funnel als HTML-Seite', () => {
  it('Seitenfreigabe nennt nur den Funnel, globaler Schalter bleibt Bild', () => {
    expect(PAGE_PRESENTATION).toBe('bild');
    expect(HTML_PAGES).toEqual(['sales-funnel']);
    for (const key of HTML_PAGES) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it('Funnel zeigt kein Ganzseitenbild, keinen Zoom-Hinweis und genau eine h1', () => {
    const { container } = render(
      <main>
        <FunnelPage />
      </main>,
    );
    expect(container.querySelector('[data-testid="image-page"]')).toBeNull();
    expect(container.querySelectorAll('img[src$=".webp"]')).toHaveLength(0);
    expect(screen.queryByTestId('image-page-hint')).toBeNull();
    expect(container.querySelector('.sr-only.image-page__text')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Sales Funnel 2025' })).toBeVisible();
  });

  it('andere Seiten bleiben Bild', () => {
    render(<SlaPage />);
    expect(screen.getByTestId('image-page')).toBeInTheDocument();
    expect(screen.getByTestId(IMAGE_PAGES['sales-sla'].testId)).toBeInTheDocument();
  });

  // Inhaltsinventar des Original-WebP (01-sales-funnel-2025): nichts darf fehlen.
  it('alle Inhalte des Originals: Kopf, Trichter mit Hebel, Quartale, Tabelle, Hinweis', () => {
    const { container } = render(<FunnelPage />);
    expect(screen.getByText('Conversion-Raten über alle Trichterstufen.')).toBeInTheDocument();
    for (const titel of [
      'Sales Pipeline Funnel Stufen (FY 2025)',
      'Quartalsverlauf Funnel-Stufen 2025',
      'Trichtertabelle',
      FUNNEL.note.title,
    ]) {
      // Vergleich per startsWith statt RegExp: Titel enthalten Sonderzeichen wie ( ) +.
      const treffer = screen
        .getAllByRole('heading')
        .filter((h) => (h.textContent ?? '').trim().startsWith(titel));
      expect(treffer.length).toBeGreaterThanOrEqual(1);
    }
    expect(
      screen.getByText('Durchlaufende Leads, Stufen-Conversion und Engpass-Erkennung'),
    ).toBeInTheDocument();
    // Trichter: fünf Stufen mit „Stufe n“, vier Conversion-Übergänge, SQL-Stufe als Hebel.
    const trichter = screen.getByTestId('funnel-stufen-chart');
    for (let n = 1; n <= 5; n += 1) expect(trichter.textContent).toContain(`Stufe ${n}`);
    expect(trichter.textContent?.match(/Conversion:/g)).toHaveLength(4);
    const hebel = trichter.querySelector('.funnel-stufe--hebel');
    expect(hebel?.closest('li')?.textContent).toContain('SQL');
    expect(within(trichter).getByText('Trial-Conversion Hebel')).toBeInTheDocument();
    // Quartale: 4 Quartale × 4 Reihen als 3D-Säulen, Legende in den vier Reihenfarben.
    const quartale = screen.getByTestId('grouped-depth-columns');
    expect(quartale.querySelectorAll('rect[data-saeule]')).toHaveLength(16);
    const farben = new Set(
      Array.from(quartale.querySelectorAll('li rect')).map((r) => r.getAttribute('fill')),
    );
    expect(farben).toEqual(new Set(['var(--funnel-silber)', '#00D9C6', '#62EDE2', '#FF7A3D']));
    // Tabelle: alle Stufen, Ø/Monat und Conversion als Pills.
    for (const row of FUNNEL.rows) {
      expect(screen.getAllByText(row[0] ?? '').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(row[7] ?? '').length).toBeGreaterThanOrEqual(1);
    }
    expect(container.querySelectorAll('.pk-table .pk-chip').length).toBe(FUNNEL.rows.length * 2);
  });

  // Marc 13.10.2026: Trichterbalken müssen ihre Werte proportional zeigen (keine Mindestbreite).
  it('Trichterbalken sind exakt proportional zum Wert', () => {
    render(<FunnelPage />);
    const balken = Array.from(
      screen.getByTestId('funnel-stufen-chart').querySelectorAll<HTMLElement>('.funnel-stufe'),
    ).map((el) => Number.parseFloat(el.style.width));
    const werte = FUNNEL.rows
      .filter((r) => !r[0]?.startsWith('Testversionen'))
      .map((r) => Number((r[5] ?? '0').replace(/\./g, '')));
    const max = Math.max(...werte);
    werte.forEach((wert, i) => expect(balken[i]).toBeCloseTo((wert / max) * 100, 1));
    expect(new Set(balken).size).toBe(werte.length);
  });

  it('Original-Gestaltung: Hero-Raster, leuchtende Panels und Hinweis bleiben', () => {
    const { container } = render(<FunnelPage />);
    expect(container.querySelector('.pk-page.funnel-seite')).not.toBeNull();
    expect(container.querySelector('.pk-hero')).not.toBeNull();
    expect(container.querySelectorAll('.pk-panel').length).toBeGreaterThanOrEqual(3);
    expect(container.querySelector('.pk-callout')).not.toBeNull();
  });
});
