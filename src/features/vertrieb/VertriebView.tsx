import React from 'react';
import { FunnelPage } from './pages/FunnelPage';
import { SlaPage } from './pages/SlaPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { PlanningPage } from './pages/PlanningPage';
import { MarketingBudgetPage } from './pages/MarketingBudgetPage';
import { BrandPage } from './pages/BrandPage';
import { ContentStrategyPage } from './pages/ContentStrategyPage';
import { SalesToolsPage } from './pages/SalesToolsPage';
import { CampaignPlanningPage } from './pages/CampaignPlanningPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-funnel': FunnelPage,
  's-sla': SlaPage,
  's-kanaele': ChannelsPage,
  's-planung': PlanningPage,
  's-mbudget': MarketingBudgetPage,
  's-brand': BrandPage,
  's-content': ContentStrategyPage,
  's-tools': SalesToolsPage,
  's-kampagne': CampaignPlanningPage,
};

export interface VertriebViewProps {
  activeSubView?: string;
}

export function VertriebView({ activeSubView = 's-funnel' }: VertriebViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? FunnelPage;
  return <Component />;
}
