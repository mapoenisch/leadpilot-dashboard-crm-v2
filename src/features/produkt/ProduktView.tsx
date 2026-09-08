import React from 'react';
import { FeaturesPage } from './pages/FeaturesPage';
import { PricingPage } from './pages/PricingPage';
import { PerformancePage } from './pages/PerformancePage';
import { RoadmapPage } from './pages/RoadmapPage';
import { IntegrationPage } from './pages/IntegrationPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-funktion': FeaturesPage,
  's-pricing': PricingPage,
  's-perf': PerformancePage,
  's-roadmap': RoadmapPage,
  's-integr': IntegrationPage,
};

export interface ProduktViewProps {
  activeSubView?: string;
}

/**
 * Pure compatibility delegate without if-cascades or domain JSX.
 */
export function ProduktView({ activeSubView = 's-funktion' }: ProduktViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? FeaturesPage;
  return <Component />;
}
