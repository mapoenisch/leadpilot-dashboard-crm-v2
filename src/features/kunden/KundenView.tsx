import React from 'react';
import { IcpPage } from './pages/IcpPage';
import { PersonaPage } from './pages/PersonaPage';
import { SegmentsPage } from './pages/SegmentsPage';
import { TopCustomersPage } from './pages/TopCustomersPage';
import { EmpathyPage } from './pages/EmpathyPage';
import { CustomerSuccessPage } from './pages/CustomerSuccessPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-icp': IcpPage,
  's-persona': PersonaPage,
  's-segmente': SegmentsPage,
  's-top10': TopCustomersPage,
  's-empathy': EmpathyPage,
  's-cs': CustomerSuccessPage,
};

export interface KundenViewProps {
  activeSubView?: string;
}

export function KundenView({ activeSubView = 's-icp' }: KundenViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? IcpPage;
  return <Component />;
}
