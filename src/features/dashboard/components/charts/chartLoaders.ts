// Executive Dashboard, Teilauftrag 4 (Auftrag 073): Diagrammmodule werden je Darstellung erst bei
// Bedarf geladen (Plan §5, „Lazy Loading“). Säulen und Balken teilen sich ein Modul, ebenso Kreis
// und Ring. Zahl, Tabelle und Übersicht laden kein Diagrammmodul.
import React from 'react';
import type { DashboardView } from '../../model/dashboardCatalog';
import type { DepthChartProps } from './chartTypes';

export type ChartView = Extract<
  DashboardView,
  'saeulen' | 'balken' | 'kreis' | 'ring' | 'linie' | 'flaeche'
>;
export type ChartModuleId = 'balken' | 'ring' | 'linie' | 'flaeche';
type ChartModule = { default: React.ComponentType<DepthChartProps> };
export type ChartLoaders = Record<ChartModuleId, () => Promise<ChartModule>>;

export const CHART_VIEWS: readonly ChartView[] = [
  'saeulen',
  'balken',
  'kreis',
  'ring',
  'linie',
  'flaeche',
];

export const MODULE_BY_VIEW: Record<ChartView, ChartModuleId> = {
  saeulen: 'balken',
  balken: 'balken',
  kreis: 'ring',
  ring: 'ring',
  linie: 'linie',
  flaeche: 'flaeche',
};

export const DEFAULT_CHART_LOADERS: ChartLoaders = {
  balken: () => import('./Depth3dBarChart').then((m) => ({ default: m.Depth3dBarChart })),
  ring: () => import('./Depth3dDonutChart').then((m) => ({ default: m.Depth3dDonutChart })),
  linie: () => import('./DepthLineChart').then((m) => ({ default: m.DepthLineChart })),
  flaeche: () => import('./DepthAreaChart').then((m) => ({ default: m.DepthAreaChart })),
};

export function isChartView(view: DashboardView): view is ChartView {
  return (CHART_VIEWS as readonly DashboardView[]).includes(view);
}

// Ein lazy-Modul je Loader-Satz und Modul: zwei Ring-Kacheln laden das Modul nur einmal.
const lazyCache = new WeakMap<
  ChartLoaders,
  Map<ChartModuleId, React.LazyExoticComponent<React.ComponentType<DepthChartProps>>>
>();

export function lazyChart(loaders: ChartLoaders, view: ChartView) {
  const moduleId = MODULE_BY_VIEW[view];
  const perLoaders = lazyCache.get(loaders) ?? new Map();
  lazyCache.set(loaders, perLoaders);
  let component = perLoaders.get(moduleId);
  if (!component) {
    component = React.lazy(loaders[moduleId]);
    perLoaders.set(moduleId, component);
  }
  return component;
}
