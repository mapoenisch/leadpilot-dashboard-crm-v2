import React from 'react';
import { MarketOverviewPage } from './pages/MarketOverviewPage';
import { CompetitionPage } from './pages/CompetitionPage';
import { SwotPage } from './pages/SwotPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-markt': MarketOverviewPage,
  's-wettbewerb': CompetitionPage,
  's-swot': SwotPage,
};

export interface MarktViewProps {
  activeSubView?: string;
}

export function MarktView({ activeSubView = 's-markt' }: MarktViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? MarketOverviewPage;
  return <Component />;
}
