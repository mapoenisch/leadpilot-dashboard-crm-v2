import { ALARM_ENTRIES } from './catalog/alarmEntries';

export type AlarmCapabilityStatus = 'ausgeschlossen' | 'pruefbar' | 'nicht_einzelwert';

export interface AlarmCapability {
  status: AlarmCapabilityStatus;
  grund: string;
  serverquelle?: string;
}

export const ALARM_CAPABILITIES: Readonly<Record<string, AlarmCapability>> = ALARM_ENTRIES;

export function getAlarmCapability(catalogId: string): AlarmCapability | undefined {
  return ALARM_CAPABILITIES[catalogId];
}
