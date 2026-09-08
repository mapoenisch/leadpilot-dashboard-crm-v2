import React from 'react';
import { PnLPage } from './pages/PnLPage';
import { BalanceSheetPage } from './pages/BalanceSheetPage';
import { UnitEconomicsPage } from './pages/UnitEconomicsPage';
import { BudgetPage } from './pages/BudgetPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-guv': PnLPage,
  's-bilanz': BalanceSheetPage,
  's-unit': UnitEconomicsPage,
  's-budget': BudgetPage,
};

export interface FinanzenViewProps {
  activeSubView?: string;
}

export function FinanzenView({ activeSubView = 's-guv' }: FinanzenViewProps) {
  const Component = SUBVIEW_MAP[activeSubView] ?? PnLPage;
  return <Component />;
}
