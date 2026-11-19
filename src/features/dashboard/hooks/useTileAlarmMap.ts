// Executive Dashboard V2 (Auftrag 168 / P13c):
// Ordnet Server-Alarmregeln den Kacheln zu (Kachel-Badge im Dashboard-Raster).
// Aus DashboardGrid.tsx ausgelagert, um die Dateigrößengrenze von 400 Zeilen einzuhalten.

import { useMemo } from 'react';
import { useDashboardAlarms } from './useDashboardAlarms';
import type { DashboardAlarmRule } from '../services/dashboardAlarmService';

export interface TileAlarmInfo {
  status: string;
  reason?: string;
}

export function useTileAlarmMap(
  dashboardId?: string,
  alarmRules?: readonly DashboardAlarmRule[],
): Map<string, TileAlarmInfo> {
  const { rules: serverRules } = useDashboardAlarms({ dashboardId });
  const rules = alarmRules ?? serverRules;
  return useMemo(() => {
    const map = new Map<string, TileAlarmInfo>();
    for (const r of rules) {
      if (r.tileId) {
        map.set(r.tileId, {
          status: r.status,
          reason: r.status === 'pausiert' ? 'Alarmregel pausiert' : undefined,
        });
      }
    }
    return map;
  }, [rules]);
}
