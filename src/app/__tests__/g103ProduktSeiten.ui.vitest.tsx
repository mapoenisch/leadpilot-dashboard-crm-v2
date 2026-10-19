import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { CHART_CHURN, CHART_PRODUKT, PERF, PRICING } from '@/domain/produktData';
import { PricingPage } from '@/features/produkt/pages/PricingPage';
import { PerformancePage } from '@/features/produkt/pages/PerformancePage';

// Auftrag 103 (Paket G2, Welle 10): Preismodell und Produkt-Performance als echte Seiten nach
// dem Original-WebP. Damit sind alle 32 Bildseiten freigegeben; die Rückschaltung auf den
// Bildweg prüft weiterhin g67ImagePages (Seitenfreigabe dort leer).
afterEach(cleanup);

const WELLE = ['product-pricing', 'product-performance'];

const renderMain = (Page: () => JSX.Element) =>
  render(
    <MemoryRouter>
      <main>
        <Page />
      </main>
    </MemoryRouter>,
  );

describe('G103 Produktseiten als HTML-Seiten', () => {
  it('Seitenfreigabe enthält Welle 10 – alle 32 Bildseiten sind freigegeben', () => {
    expect([...HTML_PAGES]).toEqual(expect.arrayContaining(WELLE));
    expect([...HTML_PAGES].sort()).toEqual(Object.keys(IMAGE_PAGES).sort());
    expect(new Set(HTML_PAGES).size).toBe(HTML_PAGES.length);
  });

  it.each([
    [
      'Preismodell',
      PricingPage,
      'product-pricing',
      PRICING.title,
      'Transparente SaaS-Pakete für den B2B-Mittelstand.',
    ],
    [
      'Performance',
      PerformancePage,
      'product-performance',
      PERF.title,
      'System-Performance & Verarbeitungsmetriken.',
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

  it('Preismodell: drei Tarife vollständig, Growth hervorgehoben, Links statt toter Buttons', () => {
    const { container } = renderMain(PricingPage);
    const karten = container.querySelectorAll('[data-testid="produkt-tarif"]');
    expect(karten).toHaveLength(PRICING.tiers.length);
    PRICING.tiers.forEach((tarif, i) => {
      const karte = karten[i];
      expect(karte?.querySelector('h2')?.textContent).toBe(tarif.name);
      const text = karte?.textContent ?? '';
      for (const teil of [tarif.price, tarif.period, tarif.desc, ...tarif.features])
        expect(text).toContain(teil);
      const link = karte?.querySelector('a.pd-tarif__wahl');
      expect(link?.textContent).toContain('Paket wählen');
      expect(link?.getAttribute('href')).toBe('/crm/deals');
      expect(link?.getAttribute('aria-label')).toMatch(/^Paket wählen/);
      expect(karte?.querySelector('.pd-tarifbild')?.getAttribute('aria-hidden')).toBe('true');
    });
    const growth = [...karten].find((k) => k.querySelector('h2')?.textContent === 'Growth');
    expect(growth?.getAttribute('data-featured')).toBe('true');
    expect(growth?.textContent).toContain('Bestseller');
    // Faktenblatt v1.2 §2: pro Nutzer und Monat, Pro als individuelles Angebot mit Referenz 80 €.
    expect(container.textContent).toContain('49 €');
    expect(container.textContent).toContain('89 €');
    expect(container.textContent).toContain('Referenz 80 €');
  });

  it('Performance: sechs Kacheln mit Zielstatus, Pille zählt die Kacheln', () => {
    const { container } = renderMain(PerformancePage);
    const kacheln = container.querySelectorAll('[data-testid="perf-kachel"]');
    expect(kacheln).toHaveLength(PERF.metrics.length);
    PERF.metrics.forEach((metric, i) => {
      const kachel = kacheln[i];
      expect(kachel?.textContent).toContain(metric.label);
      const status = metric.val.includes('verfehlt') ? 'verfehlt' : 'erreicht';
      expect(kachel?.querySelector('.pd-perf__status')?.getAttribute('data-status')).toBe(status);
      expect(kachel?.querySelector('.pd-perf__icon')?.getAttribute('data-status')).toBe(status);
    });
    expect(screen.getByText(`${PERF.metrics.length} Kernmetriken`)).toBeInTheDocument();
    expect(container.textContent).not.toContain('4 Kernmetriken');
  });

  it('Performance: Quartalsverlauf als 3D-Fläche, Stand Q4 nach Daten (nicht 72 %)', () => {
    const { container } = renderMain(PerformancePage);
    expect(container.querySelectorAll('[data-testid="depth-flaechen"]')).toHaveLength(1);
    const stand = screen.getByTestId('perf-stand').textContent ?? '';
    expect(stand).toContain('Q4 25');
    for (const set of CHART_PRODUKT.datasets)
      expect(stand).toContain(`${set.data[set.data.length - 1]} %`);
    expect(stand).not.toContain('72 %');
  });

  it('Performance: Kündigungsgründe mit Anteilen, Hinweis nach ICP-Befund', () => {
    const { container } = renderMain(PerformancePage);
    const text = container.textContent ?? '';
    const werte = CHART_CHURN.datasets[0]?.data ?? [];
    const gesamt = werte.reduce((s, w) => s + w, 0);
    expect(gesamt).toBe(17);
    CHART_CHURN.labels.forEach((label, i) => {
      expect(text).toContain(label);
      expect(text).toContain(`(${Math.round(((werte[i] ?? 0) / gesamt) * 100)} %)`);
    });
    expect(text).toContain('Hinweis:');
    expect(text).toContain('ICP-konforme Kunden');
    expect(text).not.toContain('Enterprise-Go-to-Market');
    expect(text).toContain('Quartalsansicht');
    expect(text).toContain('Absolute Zahlen');
  });
});
