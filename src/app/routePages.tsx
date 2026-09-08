import React from 'react';
import { APP_ROUTES, AppRouteId } from './routes';

// 1. Übersicht
const ExecutiveDashboardPage = React.lazy(() =>
  import('@/features/overview/pages/ExecutiveDashboardPage').then((m) => ({
    default: m.ExecutiveDashboardPage,
  }))
);
const CompanyProfilePage = React.lazy(() =>
  import('@/features/overview/pages/CompanyProfilePage').then((m) => ({
    default: m.CompanyProfilePage,
  }))
);
const YearHighlightsPage = React.lazy(() =>
  import('@/features/overview/pages/YearHighlightsPage').then((m) => ({
    default: m.YearHighlightsPage,
  }))
);
const DataBasisPage = React.lazy(() =>
  import('@/features/overview/pages/DataBasisPage').then((m) => ({
    default: m.DataBasisPage,
  }))
);

// 2. CRM & Pipeline
const LiveSimulationPage = React.lazy(() =>
  import('@/features/crm/pages/LiveSimulationPage').then((m) => ({
    default: m.LiveSimulationPage,
  }))
);
const LeadsPage = React.lazy(() =>
  import('@/features/crm/pages/LeadsPage').then((m) => ({
    default: m.LeadsPage,
  }))
);
const CompaniesPage = React.lazy(() =>
  import('@/features/crm/pages/CompaniesPage').then((m) => ({
    default: m.CompaniesPage,
  }))
);
const DealsPage = React.lazy(() =>
  import('@/features/crm/pages/DealsPage').then((m) => ({
    default: m.DealsPage,
  }))
);
const ActivitiesPage = React.lazy(() =>
  import('@/features/crm/pages/ActivitiesPage').then((m) => ({
    default: m.ActivitiesPage,
  }))
);

// 3. Unternehmen
const IdeaPage = React.lazy(() =>
  import('@/features/unternehmen/pages/IdeaPage').then((m) => ({
    default: m.IdeaPage,
  }))
);
const ValuePropositionPage = React.lazy(() =>
  import('@/features/unternehmen/pages/ValuePropositionPage').then((m) => ({
    default: m.ValuePropositionPage,
  }))
);
const HistoryPage = React.lazy(() =>
  import('@/features/unternehmen/pages/HistoryPage').then((m) => ({
    default: m.HistoryPage,
  }))
);
const LocationPage = React.lazy(() =>
  import('@/features/unternehmen/pages/LocationPage').then((m) => ({
    default: m.LocationPage,
  }))
);

// 4. Produkt
const FeaturesPage = React.lazy(() =>
  import('@/features/produkt/pages/FeaturesPage').then((m) => ({
    default: m.FeaturesPage,
  }))
);
const PricingPage = React.lazy(() =>
  import('@/features/produkt/pages/PricingPage').then((m) => ({
    default: m.PricingPage,
  }))
);
const PerformancePage = React.lazy(() =>
  import('@/features/produkt/pages/PerformancePage').then((m) => ({
    default: m.PerformancePage,
  }))
);
const RoadmapPage = React.lazy(() =>
  import('@/features/produkt/pages/RoadmapPage').then((m) => ({
    default: m.RoadmapPage,
  }))
);

// 5. Markt & Wettbewerb
const MarketOverviewPage = React.lazy(() =>
  import('@/features/markt/pages/MarketOverviewPage').then((m) => ({
    default: m.MarketOverviewPage,
  }))
);
const CompetitionPage = React.lazy(() =>
  import('@/features/markt/pages/CompetitionPage').then((m) => ({
    default: m.CompetitionPage,
  }))
);
const SwotPage = React.lazy(() =>
  import('@/features/markt/pages/SwotPage').then((m) => ({
    default: m.SwotPage,
  }))
);

// 6. Kunden & ICP
const IcpPage = React.lazy(() =>
  import('@/features/kunden/pages/IcpPage').then((m) => ({
    default: m.IcpPage,
  }))
);
const PersonaPage = React.lazy(() =>
  import('@/features/kunden/pages/PersonaPage').then((m) => ({
    default: m.PersonaPage,
  }))
);
const SegmentsPage = React.lazy(() =>
  import('@/features/kunden/pages/SegmentsPage').then((m) => ({
    default: m.SegmentsPage,
  }))
);
const TopCustomersPage = React.lazy(() =>
  import('@/features/kunden/pages/TopCustomersPage').then((m) => ({
    default: m.TopCustomersPage,
  }))
);

// 7. Vertrieb & Marketing
const FunnelPage = React.lazy(() =>
  import('@/features/vertrieb/pages/FunnelPage').then((m) => ({
    default: m.FunnelPage,
  }))
);
const SlaPage = React.lazy(() =>
  import('@/features/vertrieb/pages/SlaPage').then((m) => ({
    default: m.SlaPage,
  }))
);
const ChannelsPage = React.lazy(() =>
  import('@/features/vertrieb/pages/ChannelsPage').then((m) => ({
    default: m.ChannelsPage,
  }))
);
const PlanningPage = React.lazy(() =>
  import('@/features/vertrieb/pages/PlanningPage').then((m) => ({
    default: m.PlanningPage,
  }))
);

// 8. Finanzen
const PnLPage = React.lazy(() =>
  import('@/features/finanzen/pages/PnLPage').then((m) => ({
    default: m.PnLPage,
  }))
);
const BalanceSheetPage = React.lazy(() =>
  import('@/features/finanzen/pages/BalanceSheetPage').then((m) => ({
    default: m.BalanceSheetPage,
  }))
);
const UnitEconomicsPage = React.lazy(() =>
  import('@/features/finanzen/pages/UnitEconomicsPage').then((m) => ({
    default: m.UnitEconomicsPage,
  }))
);

// 9. Organisation & Team
const HeadcountPage = React.lazy(() =>
  import('@/features/organisation/pages/HeadcountPage').then((m) => ({
    default: m.HeadcountPage,
  }))
);
const HrPage = React.lazy(() =>
  import('@/features/organisation/pages/HrPage').then((m) => ({
    default: m.HrPage,
  }))
);
const TeamStructurePage = React.lazy(() =>
  import('@/features/organisation/pages/TeamStructurePage').then((m) => ({
    default: m.TeamStructurePage,
  }))
);

// 10. Strategie 2026+
const OkrsPage = React.lazy(() =>
  import('@/features/strategie/pages/OkrsPage').then((m) => ({
    default: m.OkrsPage,
  }))
);
const BalancedScorecardPage = React.lazy(() =>
  import('@/features/strategie/pages/BalancedScorecardPage').then((m) => ({
    default: m.BalancedScorecardPage,
  }))
);
const GrowthDriversPage = React.lazy(() =>
  import('@/features/strategie/pages/GrowthDriversPage').then((m) => ({
    default: m.GrowthDriversPage,
  }))
);

// 11. Internal Resources (Schutzbereich: dynamischer Import)
const InternalResourcesView = React.lazy(() =>
  import('@/features/resources/InternalResourcesView').then((m) => ({
    default: m.InternalResourcesView,
  }))
);

// 12. Recht & Gründung
const ArticlesPage = React.lazy(() =>
  import('@/features/recht/pages/ArticlesPage').then((m) => ({
    default: m.ArticlesPage,
  }))
);
const ShareholdersPage = React.lazy(() =>
  import('@/features/recht/pages/ShareholdersPage').then((m) => ({
    default: m.ShareholdersPage,
  }))
);
const CommercialRegisterPage = React.lazy(() =>
  import('@/features/recht/pages/CommercialRegisterPage').then((m) => ({
    default: m.CommercialRegisterPage,
  }))
);

export interface RoutePageEntry {
  id: AppRouteId;
  component: React.ComponentType;
}

export const ROUTE_PAGE_ENTRIES: readonly RoutePageEntry[] = [
  // 1. Übersicht
  { id: 's-exec', component: ExecutiveDashboardPage },
  { id: 's-profil', component: CompanyProfilePage },
  { id: 's-highlights', component: YearHighlightsPage },
  { id: 's-daten', component: DataBasisPage },

  // 2. CRM & Pipeline
  { id: 's-live-simulation', component: LiveSimulationPage },
  { id: 's-leads', component: LeadsPage },
  { id: 's-companies', component: CompaniesPage },
  { id: 's-deals', component: DealsPage },
  { id: 's-activities', component: ActivitiesPage },

  // 3. Unternehmen
  { id: 's-idee', component: IdeaPage },
  { id: 's-value', component: ValuePropositionPage },
  { id: 's-historie', component: HistoryPage },
  { id: 's-standort', component: LocationPage },

  // 4. Produkt
  { id: 's-funktion', component: FeaturesPage },
  { id: 's-pricing', component: PricingPage },
  { id: 's-perf', component: PerformancePage },
  { id: 's-roadmap', component: RoadmapPage },

  // 5. Markt & Wettbewerb
  { id: 's-markt', component: MarketOverviewPage },
  { id: 's-wettbewerb', component: CompetitionPage },
  { id: 's-swot', component: SwotPage },

  // 6. Kunden & ICP
  { id: 's-icp', component: IcpPage },
  { id: 's-persona', component: PersonaPage },
  { id: 's-segmente', component: SegmentsPage },
  { id: 's-top10', component: TopCustomersPage },

  // 7. Vertrieb & Marketing
  { id: 's-funnel', component: FunnelPage },
  { id: 's-sla', component: SlaPage },
  { id: 's-kanaele', component: ChannelsPage },
  { id: 's-planung', component: PlanningPage },

  // 8. Finanzen
  { id: 's-guv', component: PnLPage },
  { id: 's-bilanz', component: BalanceSheetPage },
  { id: 's-unit', component: UnitEconomicsPage },

  // 9. Organisation & Team
  { id: 's-headcount', component: HeadcountPage },
  { id: 's-hr', component: HrPage },
  { id: 's-team', component: TeamStructurePage },

  // 10. Strategie 2026+
  { id: 's-okr', component: OkrsPage },
  { id: 's-bsc', component: BalancedScorecardPage },
  { id: 's-treiber', component: GrowthDriversPage },

  // 11. Internal Resources
  { id: 's-kampagne-internal', component: InternalResourcesView },

  // 12. Recht & Gründung
  { id: 's-satzung', component: ArticlesPage },
  { id: 's-gesellschafter', component: ShareholdersPage },
  { id: 's-handelsregister', component: CommercialRegisterPage },
] as const;

// Dev-Guard: Validiert Vollständigkeit und Duplikate gegen APP_ROUTES
if (import.meta.env.DEV) {
  const seenIds = new Set<string>();
  for (const entry of ROUTE_PAGE_ENTRIES) {
    if (seenIds.has(entry.id)) {
      console.error(`[routePages.tsx] Doppelte ID in ROUTE_PAGE_ENTRIES gefunden: ${entry.id}`);
    }
    seenIds.add(entry.id);
  }

  for (const route of APP_ROUTES) {
    if (!seenIds.has(route.id)) {
      console.error(`[routePages.tsx] Fehlende Page-Komponente für Route-ID: ${route.id}`);
    }
  }

  if (ROUTE_PAGE_ENTRIES.length !== APP_ROUTES.length) {
    console.error(
      `[routePages.tsx] Anzahl der Page-Einträge (${ROUTE_PAGE_ENTRIES.length}) weicht von APP_ROUTES (${APP_ROUTES.length}) ab!`
    );
  }
}

export const ROUTE_PAGES: Record<AppRouteId, React.ComponentType> = Object.fromEntries(
  ROUTE_PAGE_ENTRIES.map((entry) => [entry.id, entry.component])
) as Record<AppRouteId, React.ComponentType>;
