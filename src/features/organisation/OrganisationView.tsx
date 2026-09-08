import React from 'react';
import { HeadcountPage } from './pages/HeadcountPage';
import { HrPage } from './pages/HrPage';
import { TeamStructurePage } from './pages/TeamStructurePage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-headcount': HeadcountPage,
  's-hr': HrPage,
  's-team': TeamStructurePage,
};

export interface OrganisationViewProps {
  activeSubView?: string;
}

export function OrganisationView({ activeSubView = 's-headcount' }: OrganisationViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? HeadcountPage;
  return <Component />;
}
