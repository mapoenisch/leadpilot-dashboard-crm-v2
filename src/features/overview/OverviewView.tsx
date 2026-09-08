import React from 'react';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboardPage';
import { CompanyProfilePage } from './pages/CompanyProfilePage';
import { YearHighlightsPage } from './pages/YearHighlightsPage';
import { DataBasisPage } from './pages/DataBasisPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-exec': ExecutiveDashboardPage,
  's-profil': CompanyProfilePage,
  's-highlights': YearHighlightsPage,
  's-daten': DataBasisPage,
};

export interface OverviewViewProps {
  activeSubView?: string;
}

export function OverviewView({ activeSubView = 's-exec' }: OverviewViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? ExecutiveDashboardPage;
  return <Component />;
}
