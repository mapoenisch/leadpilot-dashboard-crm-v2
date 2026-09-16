// G44 (Auftrag 067A, Block D): Rote Frontend-Verträge für Semantik,
// Accessibility und Assets. Bewusst rot — friert die bestätigten Mängel als
// Sollverträge ein. Genau ein maßgeblicher Test pro Finding-ID;
// Detailassertions laufen per soft weiter. Produktdateien bleiben unberührt.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FULL_PAGE_WEBP_ROUTES } from '../fixtures/fullPageWebpRoutes';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf-8');
}

describe('v2.3.0 frontend findings', () => {
  it('[PR-SEMANTIC-11] liefert Fachinhalt ohne Ganzseitenbild', () => {
    expect(FULL_PAGE_WEBP_ROUTES, 'exakt 33 Bildseiten erfasst').toHaveLength(33);
    expect(
      FULL_PAGE_WEBP_ROUTES.map((entry) => entry.file),
      'LocationPage ist semantisch und ausgenommen',
    ).not.toContain('src/features/unternehmen/pages/LocationPage.tsx');
    expect(
      FULL_PAGE_WEBP_ROUTES.filter((entry) => entry.group === 'finance-legal-strategy').length,
      '9 Finanzen/Recht/Strategie',
    ).toBe(9);
    expect(
      FULL_PAGE_WEBP_ROUTES.filter((entry) => entry.group === 'market-customer-sales').length,
      '11 Markt/Kunden/Vertrieb',
    ).toBe(11);
    expect(
      FULL_PAGE_WEBP_ROUTES.filter((entry) => entry.group === 'company-overview-product').length,
      '10 Unternehmen/Übersicht/Produkt',
    ).toBe(10);
    expect(
      FULL_PAGE_WEBP_ROUTES.filter((entry) => entry.group === 'organisation').length,
      '3 Organisation',
    ).toBe(3);
    for (const entry of FULL_PAGE_WEBP_ROUTES) {
      const source = readRepo(entry.file);
      const h1Count = (source.match(/<h1[\s>]/g) ?? []).length;
      expect.soft(h1Count, `${entry.route}: genau eine sichtbare h1`).toBe(1);
      expect
        .soft(source, `${entry.route}: h1 nicht versteckt`)
        .not.toMatch(/<h1[^>]*(hidden|aria-hidden="true"|sr-only)/);
      const hasSemantics = /<(section|article|table|ul|ol)[\s>]/.test(source);
      expect.soft(hasSemantics, `${entry.route}: semantischer Fachinhalt`).toBe(true);
      const hasFullPageWebp = /<img[^>]*\.webp/.test(source);
      expect
        .soft(
          !(hasFullPageWebp && !hasSemantics),
          `${entry.route}: kein Ganzseiten-WebP als alleinige Informationsquelle`,
        )
        .toBe(true);
    }
  });

  it('[PR-A11Y-12] erfüllt Skip-Link-, Fokus- und Single-DOM-Vertrag', () => {
    const layoutSource = readRepo('src/components/layout/Layout.tsx');
    expect.soft(layoutSource, 'Skip-Link nach #main-content').toContain('#main-content');
    expect.soft(layoutSource, 'main trägt die Sprungmarken-ID').toMatch(/id="main-content"/);
    const sidebarSource = readRepo('src/components/layout/Sidebar.tsx');
    expect.soft(sidebarSource, 'Drawer setzt Initialfokus beim Öffnen').toContain('autoFocus');
    const modalSource = readRepo('src/components/ui/Modal.tsx');
    expect.soft(modalSource, 'Backdrop ist kein künstlicher Button').not.toContain('role="button"');
    const listSource = readRepo('src/features/crm/components/CrmResponsiveList.tsx');
    const rendersBothDom =
      listSource.includes('crm-v2-desktop-table') && listSource.includes('crm-v2-mobile-cards');
    expect.soft(rendersBothDom, 'genau ein Responsive-DOM pro Datensatz').toBe(false);
  });

  it('[PR-ASSET-14] liefert Assets lokal mit Sicherheitsheadern aus', () => {
    const indexHtml = readRepo('index.html');
    const logoMatch = /href="(\/assets\/[^"]+)"/.exec(indexHtml);
    expect.soft(logoMatch?.[1], 'Logo-Pfad referenziert').toBeDefined();
    expect
      .soft(
        existsSync(resolve(repoRoot, `public${logoMatch?.[1] ?? '/assets/missing.png'}`)),
        'referenziertes Logo existiert in public/',
      )
      .toBe(true);
    expect.soft(indexHtml, 'keine externen Google-Fonts').not.toMatch(/fonts\.googleapis\.com/);
    const headerCandidates = ['public/_headers', 'vercel.json', 'netlify.toml'];
    const headerSource = headerCandidates
      .map((candidate) => {
        const absolute = resolve(repoRoot, candidate);
        return existsSync(absolute) ? readFileSync(absolute, 'utf-8') : '';
      })
      .join('\n');
    expect.soft(headerSource, 'CSP-Header definiert').toContain('Content-Security-Policy');
    expect.soft(headerSource, 'MIME-Schutz definiert').toContain('X-Content-Type-Options');
    expect.soft(headerSource, 'Referrer-Schutz definiert').toContain('Referrer-Policy');
    expect.soft(headerSource, 'Permissions-Schutz definiert').toContain('Permissions-Policy');
    expect
      .soft(headerSource, 'Framing-Schutz definiert')
      .toMatch(/frame-ancestors|X-Frame-Options/);
  });
});
