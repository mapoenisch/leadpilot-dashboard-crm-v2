import React from 'react';
import { OkrsPage } from './pages/OkrsPage';
import { BalancedScorecardPage } from './pages/BalancedScorecardPage';
import { GrowthDriversPage } from './pages/GrowthDriversPage';
import { MeasuresPage } from './pages/MeasuresPage';
import { RiskRegisterPage } from './pages/RiskRegisterPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-okr': OkrsPage,
  's-bsc': BalancedScorecardPage,
  's-treiber': GrowthDriversPage,
  's-massnahmen': MeasuresPage,
  's-risiko': RiskRegisterPage,
};

export interface StrategieViewProps {
  activeSubView?: string;
}

export function StrategieView({ activeSubView = 's-okr' }: StrategieViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? OkrsPage;
  return <Component />;
}
