import { NAV_CATEGORIES } from '@/domain/navData';
import { logger } from '@/services/logger';

export interface AppRouteMeta {
  id: string;
  path: string;
  title: string;
  categoryLabel: string;
}

export const APP_ROUTES = [
  // 1. Übersicht
  { id: 's-exec', path: '/dashboard', title: 'Executive Dashboard', categoryLabel: 'Übersicht' },
  {
    id: 's-profil',
    path: '/company/profile',
    title: 'Unternehmenssteckbrief',
    categoryLabel: 'Übersicht',
  },
  {
    id: 's-highlights',
    path: '/company/highlights',
    title: 'Jahres-Highlights 2025',
    categoryLabel: 'Übersicht',
  },
  {
    id: 's-daten',
    path: '/company/data-basis',
    title: 'Datenbasis & Konsistenz',
    categoryLabel: 'Übersicht',
  },

  // 2. CRM & Pipeline
  {
    id: 's-live-simulation',
    path: '/crm/live-simulation',
    title: '⚡ Live-Simulation (Ebene B)',
    categoryLabel: 'CRM & Pipeline',
  },
  { id: 's-leads', path: '/crm/leads', title: 'Leads & Kontakte', categoryLabel: 'CRM & Pipeline' },
  {
    id: 's-companies',
    path: '/crm/companies',
    title: 'Unternehmen (Accounts)',
    categoryLabel: 'CRM & Pipeline',
  },
  { id: 's-deals', path: '/crm/deals', title: 'Deal Pipeline', categoryLabel: 'CRM & Pipeline' },
  {
    id: 's-activities',
    path: '/crm/activities',
    title: 'Aktivitäten-Historie',
    categoryLabel: 'CRM & Pipeline',
  },

  // 3. Unternehmen
  { id: 's-idee', path: '/company/idea', title: 'Geschäftsidee', categoryLabel: 'Unternehmen' },
  {
    id: 's-value',
    path: '/company/value-proposition',
    title: 'Value Proposition',
    categoryLabel: 'Unternehmen',
  },
  {
    id: 's-historie',
    path: '/company/history',
    title: 'Gründung & Entwicklung',
    categoryLabel: 'Unternehmen',
  },
  {
    id: 's-standort',
    path: '/company/location',
    title: 'Sitz & Räumlichkeiten',
    categoryLabel: 'Unternehmen',
  },

  // 4. Produkt
  {
    id: 's-funktion',
    path: '/product/features',
    title: 'Produkt & Funktionsweise',
    categoryLabel: 'Produkt',
  },
  {
    id: 's-pricing',
    path: '/product/pricing',
    title: 'Pakete & Preismodell',
    categoryLabel: 'Produkt',
  },
  {
    id: 's-perf',
    path: '/product/performance',
    title: 'Produkt-Performance 2025',
    categoryLabel: 'Produkt',
  },
  {
    id: 's-roadmap',
    path: '/product/roadmap',
    title: 'Releases & Roadmap',
    categoryLabel: 'Produkt',
  },

  // 5. Markt & Wettbewerb
  {
    id: 's-markt',
    path: '/market/overview',
    title: 'Marktlage DACH',
    categoryLabel: 'Markt & Wettbewerb',
  },
  {
    id: 's-wettbewerb',
    path: '/market/competition',
    title: 'Wettbewerbslandschaft',
    categoryLabel: 'Markt & Wettbewerb',
  },
  {
    id: 's-swot',
    path: '/market/swot',
    title: 'SWOT-Analyse',
    categoryLabel: 'Markt & Wettbewerb',
  },

  // 6. Kunden & ICP
  {
    id: 's-icp',
    path: '/customers/icp',
    title: 'Ideal Customer Profile (ICP)',
    categoryLabel: 'Kunden & ICP',
  },
  {
    id: 's-persona',
    path: '/customers/persona',
    title: 'Buyer Persona „Volker"',
    categoryLabel: 'Kunden & ICP',
  },
  {
    id: 's-segmente',
    path: '/customers/segments',
    title: 'Kundensegmente',
    categoryLabel: 'Kunden & ICP',
  },
  {
    id: 's-top10',
    path: '/customers/top-customers',
    title: 'Top-10-Kunden',
    categoryLabel: 'Kunden & ICP',
  },

  // 7. Vertrieb & Marketing
  {
    id: 's-funnel',
    path: '/sales/funnel',
    title: 'Sales Funnel 2025',
    categoryLabel: 'Vertrieb & Marketing',
  },
  {
    id: 's-sla',
    path: '/sales/sla',
    title: 'SLA Marketing & Sales',
    categoryLabel: 'Vertrieb & Marketing',
  },
  {
    id: 's-kanaele',
    path: '/sales/channels',
    title: 'Kanalperformance & CAC',
    categoryLabel: 'Vertrieb & Marketing',
  },
  {
    id: 's-planung',
    path: '/sales/planning',
    title: 'Marketingplanung H2 2026',
    categoryLabel: 'Vertrieb & Marketing',
  },

  // 8. Finanzen
  {
    id: 's-guv',
    path: '/finance/p-and-l',
    title: 'Gewinn- und Verlustrechnung',
    categoryLabel: 'Finanzen',
  },
  {
    id: 's-bilanz',
    path: '/finance/balance-sheet',
    title: 'Bilanz & SaaS KPIs',
    categoryLabel: 'Finanzen',
  },
  {
    id: 's-unit',
    path: '/finance/unit-economics',
    title: 'Unit Economics 2026',
    categoryLabel: 'Finanzen',
  },

  // 9. Organisation & Team
  {
    id: 's-headcount',
    path: '/organisation/headcount',
    title: 'Headcount-Entwicklung',
    categoryLabel: 'Organisation & Team',
  },
  {
    id: 's-hr',
    path: '/organisation/hr',
    title: 'HR-Kennzahlen',
    categoryLabel: 'Organisation & Team',
  },
  {
    id: 's-team',
    path: '/organisation/team',
    title: 'Teamstruktur & Engpässe',
    categoryLabel: 'Organisation & Team',
  },

  // 10. Strategie 2026+
  { id: 's-okr', path: '/strategy/okrs', title: 'Ziele & OKRs', categoryLabel: 'Strategie 2026+' },
  {
    id: 's-bsc',
    path: '/strategy/balanced-scorecard',
    title: 'Balanced Scorecard',
    categoryLabel: 'Strategie 2026+',
  },
  {
    id: 's-treiber',
    path: '/strategy/growth-drivers',
    title: 'Wachstumstreiber',
    categoryLabel: 'Strategie 2026+',
  },

  // 11. Internal Resources
  {
    id: 's-kampagne-internal',
    path: '/resources/materials',
    title: '📁 Originalmaterialien & Decks',
    categoryLabel: 'Internal Resources',
  },

  // 12. Recht & Gründung
  {
    id: 's-satzung',
    path: '/legal/articles',
    title: 'Satzung LeadPilot GmbH',
    categoryLabel: 'Recht & Gründung',
  },
  {
    id: 's-gesellschafter',
    path: '/legal/shareholders',
    title: 'Gesellschafterliste',
    categoryLabel: 'Recht & Gründung',
  },
  {
    id: 's-handelsregister',
    path: '/legal/commercial-register',
    title: 'Handelsregister',
    categoryLabel: 'Recht & Gründung',
  },

  // 13. Administration (Admin-only)
  {
    id: 's-admin-members',
    path: '/admin/members',
    title: 'Mitgliederverwaltung',
    categoryLabel: 'Administration',
  },
] as const;

export type AppRouteId = (typeof APP_ROUTES)[number]['id'];

export const routeForViewId: Record<string, AppRouteMeta> = Object.fromEntries(
  APP_ROUTES.map((route) => [route.id, route]),
);

const routesByPath = new Map<string, AppRouteMeta>(APP_ROUTES.map((route) => [route.path, route]));

export function routeForPathname(pathname: string): AppRouteMeta {
  // Exakter Treffer
  const exact = routesByPath.get(pathname);
  if (exact) return exact;

  // Trailing slash Normalisierung falls vorhanden (außer root "/")
  const normalized =
    pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const match = routesByPath.get(normalized);
  if (match) return match;

  // Sicherer Fallback für unbekannte Pfade (404)
  return {
    id: 'not-found',
    path: pathname,
    title: 'Seite nicht gefunden (404)',
    categoryLabel: 'Navigation',
  };
}

// Dev-Guard: Prüft Vollständigkeit und Einzigartigkeit aller IDs
if (import.meta.env.DEV) {
  const allNavIds = new Set<string>();
  for (const cat of NAV_CATEGORIES) {
    for (const item of cat.items) {
      if (allNavIds.has(item.id)) {
        logger.error(`[routes.tsx] Doppelte ID in NAV_CATEGORIES gefunden: ${item.id}`);
      }
      allNavIds.add(item.id);
    }
  }

  for (const navId of allNavIds) {
    if (!routeForViewId[navId]) {
      logger.error(`[routes.tsx] Fehlende Route-Metadaten für View-ID: ${navId}`);
    }
  }

  const adminRouteIds = new Set(['s-admin-members']);
  const standardRoutes = APP_ROUTES.filter((r) => !adminRouteIds.has(r.id));
  if (standardRoutes.length !== allNavIds.size) {
    logger.error(
      `[routes.tsx] Anzahl Standard-Routen (${standardRoutes.length}) weicht von NAV_CATEGORIES (${allNavIds.size}) ab!`,
    );
  }
}
