import React from 'react';
import { LeadsPage } from './pages/LeadsPage';
import { CompaniesPage } from './pages/CompaniesPage';
import { DealsPage } from './pages/DealsPage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { LiveSimulationPage } from './pages/LiveSimulationPage';


const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-live-simulation': LiveSimulationPage,
  's-leads': LeadsPage,
  's-companies': CompaniesPage,
  's-deals': DealsPage,
  's-activities': ActivitiesPage,
  's-crm': LeadsPage,
  'crm': LeadsPage,
};


export interface CRMViewProps {
  activeSubView?: string;
}

export function CRMView({ activeSubView = 's-leads' }: CRMViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? LeadsPage;
  return <Component />;
}
