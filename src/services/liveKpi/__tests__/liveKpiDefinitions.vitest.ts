// G32-Charakterisierung: liveKpiDefinitions (Katalog, keine Mocks nötig).
import { describe, it, expect } from 'vitest';
import {
  LIVE_KPI_DEFINITIONS,
  LIVE_KPI_IDS,
  getLiveKpiDefinition,
  isSupportedLiveKpiId,
} from '../liveKpiDefinitions';

describe('liveKpiDefinitions', () => {
  it('Katalog: 12 IDs, Set deckungsgleich', () => {
    expect(LIVE_KPI_DEFINITIONS).toHaveLength(12);
    expect(LIVE_KPI_IDS.size).toBe(12);
    for (const def of LIVE_KPI_DEFINITIONS) {
      expect(LIVE_KPI_IDS.has(def.id)).toBe(true);
    }
  });

  it('isSupportedLiveKpiId unterscheidet bekannt/unbekannt', () => {
    expect(isSupportedLiveKpiId('arr')).toBe(true);
    expect(isSupportedLiveKpiId('pipeline_won')).toBe(true);
    expect(isSupportedLiveKpiId('ARR')).toBe(false);
    expect(isSupportedLiveKpiId('')).toBe(false);
  });

  it('getLiveKpiDefinition liefert Definition oder undefined', () => {
    expect(getLiveKpiDefinition('mrr')?.label).toBe('Live MRR');
    expect(getLiveKpiDefinition('mrr')?.unit).toBe('EUR');
    expect(getLiveKpiDefinition('unbekannt')).toBeUndefined();
  });
});
