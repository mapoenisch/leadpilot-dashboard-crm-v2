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

  it('Diagramm und Conversion-Tabelle aus derselben Quelle (FUNNEL.rows)', () => {
    render(<FunnelPage />);
    const tabelle = within(screen.getByRole('region', { name: 'Conversion-Tabelle' }));
    for (const row of FUNNEL.rows) {
      const zeile = tabelle.getByRole('rowheader', { name: row[0] ?? '' }).closest('tr');
      expect(zeile?.textContent).toContain(row[5] ?? '');
      expect(zeile?.textContent).toContain(row[7] ?? '');
    }
    // Testversionen bleiben Nebenpfad: in der Tabelle, aber nicht als Balken der Kette.
    const stufen = screen.getByTestId('funnel-stufen');
    expect(stufen.textContent).not.toContain('Testversionen');
    for (const row of FUNNEL.rows.filter((r) => !r[0]?.startsWith('Testversionen'))) {
      expect(stufen.textContent).toContain(row[5] ?? '');
    }
  });

  it('Muster-Aufbau: Eyebrow, Quelle, Karten mit h2 und Hinweis', () => {
    render(<FunnelPage />);
    expect(screen.getByText('Vertrieb · Funnel')).toBeInTheDocument();
    expect(screen.getByText(/Faktenblatt v1\.1 · Stand FY 2025/)).toBeInTheDocument();
    for (const titel of [
      'Stufen im Geschäftsjahr',
      'Conversion je Stufe',
      'Quartalsverlauf je Stufe',
      FUNNEL.note.title,
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: titel })).toBeInTheDocument();
    }
  });
});
