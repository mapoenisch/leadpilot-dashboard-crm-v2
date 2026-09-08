import React from 'react';
import { IdeaPage } from './pages/IdeaPage';
import { ValuePropositionPage } from './pages/ValuePropositionPage';
import { HistoryPage } from './pages/HistoryPage';
import { LocationPage } from './pages/LocationPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-idee': IdeaPage,
  's-value': ValuePropositionPage,
  's-historie': HistoryPage,
  's-standort': LocationPage,
};

export interface UnternehmenViewProps {
  activeSubView?: string;
}

export function UnternehmenView({ activeSubView = 's-idee' }: UnternehmenViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? IdeaPage;
  return <Component />;
}
