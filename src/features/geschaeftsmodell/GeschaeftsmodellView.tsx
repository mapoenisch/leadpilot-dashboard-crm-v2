import React from 'react';
import { BmcPage } from './pages/BmcPage';
import { BusinessLogicPage } from './pages/BusinessLogicPage';

const SUBVIEW_MAP: Record<string, React.ComponentType> = {
  's-bmc': BmcPage,
  's-logik': BusinessLogicPage,
};

export function GeschaeftsmodellView({ activeSubView = 's-bmc' }: { activeSubView?: string }) {
  const Component = SUBVIEW_MAP[activeSubView] ?? BmcPage;
  return <Component />;
}
