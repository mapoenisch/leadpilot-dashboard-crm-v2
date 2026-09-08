import React from 'react';
import { ProjectTasksPage } from './pages/ProjectTasksPage';
import { SourcesPage } from './pages/SourcesPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-projekt': ProjectTasksPage,
  's-quellen': SourcesPage,
};

export function ProjektkontextView({ activeSubView = 's-projekt' }: { activeSubView?: string }) {
  const Component = SUBVIEW_MAP[activeSubView] ?? ProjectTasksPage;
  return <Component />;
}
