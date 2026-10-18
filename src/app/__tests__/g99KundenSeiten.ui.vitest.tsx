import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HTML_PAGES } from '@/config/pagePresentation';
import { IMAGE_PAGES } from '@/components/imagePage/imagePages';
import { CHART_SEGMENT, ICP, PERSONA, REGIONEN, SEGMENTE, TOP10 } from '@/domain/kundenData';
import { IcpPage } from '@/features/kunden/pages/IcpPage';
import { PersonaPage } from '@/features/kunden/pages/PersonaPage';
import { SegmentsPage } from '@/features/kunden/pages/SegmentsPage';
import { TopCustomersPage } from '@/features/kunden/pages/TopCustomersPage';

// Auftrag 099 (Paket G2, Welle 6): ICP, Buyer Persona, Kundensegmente und Top-10-Kunden als
// echte Seiten nach dem Original-WebP; ARR je Segment als 3D-Säulen, Werte nach Faktenblatt
// v1.2 (D3 Pro-Kunden, D8 Kleinstkunden im Negative-Fit).
afterEach(cleanup);

const WELLE = ['customers-icp', 'customers-persona', 'customers-segments', 'customers-top10'];

const renderMain = (Page: () => JSX.Element) =>
  render(
    <main>
      <Page />
    </main>,
  );

describe('G99 Kundenseiten als HTML-Seiten', () => {
  it('Seitenfreigabe enthält Welle 6', () => {
    expect([...HTML_PAGES]).toEqual(expect.arrayContaining(WELLE));
    for (const key of WELLE) expect(Object.keys(IMAGE_PAGES)).toContain(key);
  });

  it.each([
    ['ICP', IcpPage, 'customers-icp', 'Ideal Customer Profile (ICP) - LeadPilot GmbH'],
    ['Persona', PersonaPage, 'customers-persona', 'Buyer Persona „Vertriebsleiter Volker“'],
    ['Segmente', SegmentsPage, 'customers-segments', 'Kundensegmente (66 Kunden zum 31.12.2025)'],
    [
      'Top 10',
      TopCustomersPage,
      'customers-top10',
      'Top B2B Referenzkunden (ICP-konform, < 200 MA)',
    ],
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

  it('ICP: Firmografie, Trigger und vier Ausschlusskriterien (Faktenblatt D8)', () => {
    const { container } = renderMain(IcpPage);
    const text = container.textContent ?? '';
    for (const { key, value } of ICP.firmografie) {
      expect(text).toContain(key);
      expect(text).toContain(value);
    }
    for (const item of [...ICP.triggers, ...ICP.exclusion]) expect(text).toContain(item);
    expect(ICP.exclusion).toHaveLength(4);
    expect(text).toContain('Kleinstkunden mit Ein-Personen-Vertrieb bzw. nur 2–3 Nutzern');
  });

  it('Persona: Zitat, Ziele, Schmerzpunkte und Kanäle vollständig', () => {
    const { container } = renderMain(PersonaPage);
    const text = container.textContent ?? '';
    expect(text).toContain(PERSONA.quote);
    expect(text).toContain('47 Jahre - Head of Sales');
    for (const item of [...PERSONA.goals, ...PERSONA.painPoints, ...PERSONA.channels]) {
      expect(text).toContain(item);
    }
    expect(screen.getByRole('heading', { name: /Ziele:/ })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Schmerzpunkte \(Pain Points\):/ }),
    ).toBeInTheDocument();
  });

  it('Segmente: ARR als 3D-Säulen mit Werten, Branchen- und Regionentabelle', () => {
    const { container } = renderMain(SegmentsPage);
    expect(container.querySelectorAll('[data-saeule]')).toHaveLength(CHART_SEGMENT.labels.length);
    const text = container.textContent ?? '';
    for (const wert of CHART_SEGMENT.datasets[0]?.data ?? []) {
      expect(text).toContain(`${wert.toLocaleString('de-DE')} €`);
    }
    // Codex-Befund PR #86: alle vier Werte auch außerhalb des ausgeblendeten SVG (Tabelle + Summary).
    const zugaenglich = Array.from(container.querySelectorAll('table, figcaption, p'))
      .filter((el) => !el.closest('[aria-hidden="true"]'))
      .map((el) => el.textContent ?? '')
      .join(' ');
    expect(zugaenglich).toContain('Agenturen');
    expect(zugaenglich).toContain('42.000 €');
    for (const row of SEGMENTE.rows) {
      expect(text).toContain(row.branche);
      expect(text).toContain(row.anteil);
      expect(text).toContain(row.charakter);
    }
    for (const row of REGIONEN.rows) {
      expect(text).toContain(row.region);
      expect(text).toContain(row.share);
      expect(text).toContain(row.status);
    }
  });

  it('Top 10: zehn Kunden, Pro-ARR nach Faktenblatt D3, Summe Pro-MRR 4.695 €', () => {
    const { container } = renderMain(TopCustomersPage);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    const text = container.textContent ?? '';
    for (const row of TOP10.rows) for (const zelle of row) expect(text).toContain(zelle);
    const pro = TOP10.rows.filter((row) => row[3] === 'Pro');
    expect(pro.map((row) => row[5])).toEqual(['17.520 €', '18.780 €', '20.040 €']);
    const arr = (wert: string) => Number(wert.replace(/\D/g, ''));
    expect(pro.reduce((summe, row) => summe + arr(row[5] ?? '0'), 0) / 12).toBe(4695);
  });
});
