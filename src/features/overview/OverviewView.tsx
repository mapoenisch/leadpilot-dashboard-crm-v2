import React from 'react';
import { PersonalExecutiveDashboard } from '@/features/dashboard/pages/PersonalExecutiveDashboard';
import { CompanyProfilePage } from './pages/CompanyProfilePage';
import { YearHighlightsPage } from './pages/YearHighlightsPage';
import { DataBasisPage } from './pages/DataBasisPage';

// Auftrag 141: Die bisherige Executive-Cockpit-Ansicht ist entfernt;
// `s-exec` zeigt die persönliche Dashboard-Ansicht (PersonalExecutiveDashboard).
const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-exec': PersonalExecutiveDashboard,
  's-profil': CompanyProfilePage,
  's-highlights': YearHighlightsPage,
  's-daten': DataBasisPage,
};

export interface OverviewViewProps {
  activeSubView?: string;
}

export function OverviewView({ activeSubView = 's-exec' }: OverviewViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? PersonalExecutiveDashboard;
  return <Component />;
}
