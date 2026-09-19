// G44 (Auftrag 067A, Block D): Exakte Liste der 33 vom Review bestätigten
// Ganzseiten-WebP-Ansichten. Gruppen: 9 Finanzen/Recht/Strategie, 11
// Markt/Kunden/Vertrieb, 10 Unternehmen/Übersicht/Produkt, 3 Organisation.
// LocationPage.tsx gehört nicht dazu (semantische Seite mit ergänzendem
// Backdrop-Medium); OrganisationStructure ist eine Komponente, keine Route.
export type FullPageWebpGroup =
  'finance-legal-strategy' | 'market-customer-sales' | 'company-overview-product' | 'organisation';

export interface FullPageWebpRoute {
  route: string;
  file: string;
  group: FullPageWebpGroup;
}

export const FULL_PAGE_WEBP_ROUTES: readonly FullPageWebpRoute[] = [
  {
    route: '/finance/p-and-l',
    file: 'src/features/finanzen/pages/PnLPage.tsx',
    group: 'finance-legal-strategy',
  },
  {
    route: '/finance/balance-sheet',
    file: 'src/features/finanzen/pages/BalanceSheetPage.tsx',
    group: 'finance-legal-strategy',
  },
  {
    route: '/finance/unit-economics',
    file: 'src/features/finanzen/pages/UnitEconomicsPage.tsx',
    group: 'finance-legal-strategy',
  },
  {
    route: '/legal/articles',
    file: 'src/features/recht/pages/ArticlesPage.tsx',
    group: 'finance-legal-strategy',
  },
  {
    route: '/legal/shareholders',
    file: 'src/features/recht/pages/ShareholdersPage.tsx',
    group: 'finance-legal-strategy',
  },
  {
    route: '/legal/commercial-register',
    file: 'src/features/recht/pages/CommercialRegisterPage.tsx',
    group: 'finance-legal-strategy',
  },
  {
    route: '/strategy/okrs',
    file: 'src/features/strategie/pages/OkrsPage.tsx',
    group: 'finance-legal-strategy',
  },
  {
    route: '/strategy/balanced-scorecard',
    file: 'src/features/strategie/pages/BalancedScorecardPage.tsx',
    group: 'finance-legal-strategy',
  },
  {
    route: '/strategy/growth-drivers',
    file: 'src/features/strategie/pages/GrowthDriversPage.tsx',
    group: 'finance-legal-strategy',
  },
  {
    route: '/market/overview',
    file: 'src/features/markt/pages/MarketOverviewPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/market/competition',
    file: 'src/features/markt/pages/CompetitionPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/market/swot',
    file: 'src/features/markt/pages/SwotPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/customers/icp',
    file: 'src/features/kunden/pages/IcpPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/customers/persona',
    file: 'src/features/kunden/pages/PersonaPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/customers/segments',
    file: 'src/features/kunden/pages/SegmentsPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/customers/top-customers',
    file: 'src/features/kunden/pages/TopCustomersPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/sales/funnel',
    file: 'src/features/vertrieb/pages/FunnelPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/sales/sla',
    file: 'src/features/vertrieb/pages/SlaPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/sales/channels',
    file: 'src/features/vertrieb/pages/ChannelsPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/sales/planning',
    file: 'src/features/vertrieb/pages/PlanningPage.tsx',
    group: 'market-customer-sales',
  },
  {
    route: '/company/idea',
    file: 'src/features/unternehmen/pages/IdeaPage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/company/value-proposition',
    file: 'src/features/unternehmen/pages/ValuePropositionPage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/company/history',
    file: 'src/features/unternehmen/pages/HistoryPage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/company/profile',
    file: 'src/features/overview/pages/CompanyProfilePage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/company/highlights',
    file: 'src/features/overview/pages/YearHighlightsPage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/company/data-basis',
    file: 'src/features/overview/pages/DataBasisPage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/product/features',
    file: 'src/features/produkt/pages/FeaturesPage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/product/pricing',
    file: 'src/features/produkt/pages/PricingPage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/product/performance',
    file: 'src/features/produkt/pages/PerformancePage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/product/roadmap',
    file: 'src/features/produkt/pages/RoadmapPage.tsx',
    group: 'company-overview-product',
  },
  {
    route: '/organisation/headcount',
    file: 'src/features/organisation/pages/HeadcountPage.tsx',
    group: 'organisation',
  },
  {
    route: '/organisation/hr',
    file: 'src/features/organisation/pages/HrPage.tsx',
    group: 'organisation',
  },
  {
    route: '/organisation/team',
    file: 'src/features/organisation/pages/TeamStructurePage.tsx',
    group: 'organisation',
  },
];
