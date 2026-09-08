import React from 'react';
import { ROUTE_PAGES } from './routePages';
import { AppRouteId } from './routes';

export interface LegacyRouteViewProps {
  viewId: string;
}

/**
 * Defensive compatibility view for any legacy callers.
 * No longer imports any domain feature views directly.
 */
export function LegacyRouteView({ viewId }: LegacyRouteViewProps) {
  const Component = ROUTE_PAGES[viewId as AppRouteId];
  if (Component) {
    return <Component />;
  }

  return <div>Ansicht nicht gefunden: {viewId}</div>;
}
