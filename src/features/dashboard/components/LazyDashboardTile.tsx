// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Kachel mit Lazy-Aktivierung. Daten werden erst
// abgefragt, wenn die Kachel im Bereich war; Filter gelten erst bei Annäherung, damit außerhalb
// des Bereichs keine Abfrage startet und unter einem neuen Filter keine alten Daten stehen.
// Auftrag 166 (P13a): Schwellenwert-Bewertung und Badge-Anzeige auf der Kachel.
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import type { TileThresholdRule } from '../model/thresholdRuleV2';
import { evaluateThresholdV2 } from '../model/thresholdRuleV2';
import type { TileData } from '../data/dashboardData';
import { activeEntryOf } from '../hooks/dashboardEditorReducer';
import { useTileActivation } from '../hooks/useTileActivation';
import type { ChartLoaders } from './charts/chartLoaders';
import { useOptionalTimeControl } from '../time/TimeControlProvider';
import { DashboardTile } from './DashboardTile';
import { TileThresholdBadge } from './TileThresholdBadge';
import { isDataOlderThanMaxAlarmAge } from '../model/alarmDataAge';
import { applyTransformations, getUnitConversion } from '../model/transformations';

export type TileDataHook = (
  tile: DashboardTileConfig,
  filters?: DashboardFilters,
  options?: { enabled?: boolean },
) => TileData;

export interface LazyDashboardTileProps {
  tile: DashboardTileConfig;
  filters?: DashboardFilters;
  useData: TileDataHook;
  onShowDetails: (tileId: string) => void;
  detailsBlocked?: boolean;
  onActivated?: (tileId: string) => void;
  /** Hält alle Abfragen an (z. B. während der Arbeitsbereich noch lädt). */
  suspended?: boolean;
  onRetryChartLoad?: () => void;
  chartLoaders?: ChartLoaders;
  /** Auftrag 166 (P13a): Schwellenwert-Regel der Kachel */
  threshold?: TileThresholdRule;
  alarm?: { status: string; reason?: string };
}

export function LazyDashboardTile({
  tile,
  filters,
  useData,
  onShowDetails,
  detailsBlocked,
  onActivated,
  suspended = false,
  onRetryChartLoad,
  chartLoaders,
  threshold,
  alarm,
}: LazyDashboardTileProps) {
  const { ref, near, active, activate } = useTileActivation();
  const lastApplied = useRef(filters);
  const applied = near ? filters : lastApplied.current;
  useEffect(() => {
    if (near) lastApplied.current = filters;
  });

  const timeControl = useOptionalTimeControl();
  const rawData = useData(tile, applied, { enabled: active && !suspended });
  const transformations = tile.query?.transformations;
  const data = useMemo(
    () => applyTransformations(rawData, transformations),
    [rawData, transformations],
  );

  const notify = useRef(onActivated);
  notify.current = onActivated;
  useEffect(() => {
    if (active) notify.current?.(tile.tileId);
  }, [active, tile.tileId]);

  useEffect(() => {
    if (data && tile.tileId) {
      timeControl?.tileDataStore.set(tile.tileId, data, rawData);
    }
  }, [data, rawData, tile.tileId, timeControl]);

  const rawEntry = activeEntryOf(tile);
  const entry = useMemo(() => {
    if (!rawEntry) return undefined;
    if (!rawEntry.comparison || !transformations || transformations.length === 0) {
      return rawEntry;
    }
    let compValue = rawEntry.comparison.value;
    for (const step of transformations) {
      if (step.art === 'einheit_umrechnen') {
        const conv = getUnitConversion(step.von, step.zu);
        if (conv) {
          compValue =
            conv.operation === 'divide' ? compValue / conv.operand : compValue * conv.operand;
        }
      }
    }
    if (compValue === rawEntry.comparison.value) return rawEntry;
    return {
      ...rawEntry,
      comparison: {
        ...rawEntry.comparison,
        value: compValue,
      },
    };
  }, [rawEntry, transformations]);
  const effectiveThreshold = threshold ?? (tile as { threshold?: TileThresholdRule }).threshold;
  const isSingleValue = entry
    ? ['einzelwert', 'verhaeltnis', 'anteil'].includes(entry.shape)
    : true;
  const singleValue =
    isSingleValue && data && (data.state === 'bereit' || data.state === 'veraltet')
      ? data.value
      : null;

  const tileRecord = tile as unknown as Record<string, unknown>;
  const alarmInfo =
    alarm ??
    (tileRecord.alarm as { status?: 'aktiv' | 'pausiert'; reason?: string } | undefined) ??
    (tileRecord.alarmRule as { status?: 'aktiv' | 'pausiert'; reason?: string } | undefined) ??
    undefined;
  const alarmStatus =
    alarmInfo?.status ?? (tileRecord.alarmStatus as 'aktiv' | 'pausiert' | undefined) ?? undefined;
  const alarmPauseReason =
    alarmInfo?.reason ?? (tileRecord.alarmPauseReason as string | undefined) ?? undefined;

  const dataTimestamp =
    data &&
    ('asOf' in data && data.asOf
      ? data.asOf
      : 'timestamp' in data
        ? (data as { timestamp?: string }).timestamp
        : undefined);
  const isStaleData = isDataOlderThanMaxAlarmAge(dataTimestamp);
  const evaluation = useMemo(() => {
    if (!effectiveThreshold || !isSingleValue) return undefined;
    if (isStaleData) {
      return { stufe: 'nicht_bewertet' as const, text: 'Letzter Wert älter als 24 Stunden' };
    }
    const currentUnit = data && 'unit' in data && data.unit ? data.unit : (entry?.unit ?? '');
    return evaluateThresholdV2(effectiveThreshold, singleValue, data?.state, currentUnit);
  }, [effectiveThreshold, isSingleValue, isStaleData, singleValue, data, entry?.unit]);

  const borderClass =
    evaluation?.stufe === 'kritisch'
      ? 'border-l-2 border-l-rose-500'
      : evaluation?.stufe === 'warnung'
        ? 'border-l-2 border-l-amber-400'
        : '';

  const hasBadge =
    (evaluation &&
      (evaluation.stufe === 'warnung' ||
        evaluation.stufe === 'kritisch' ||
        evaluation.stufe === 'regel_ungueltig' ||
        (evaluation.stufe === 'nicht_bewertet' && isStaleData))) ||
    Boolean(alarmStatus);

  return (
    <div
      ref={ref}
      onFocusCapture={activate}
      data-testid="lazy-tile"
      data-tile-id={tile.tileId}
      data-active={String(active)}
      className="min-w-0 relative h-full w-full"
    >
      {hasBadge && (
        <div className="absolute top-3.5 right-4 z-10 pointer-events-auto">
          <TileThresholdBadge
            evaluation={evaluation ?? { stufe: 'normal', text: '' }}
            alarmStatus={alarmStatus}
            alarmPauseReason={alarmPauseReason}
            dataTimestamp={dataTimestamp}
          />
        </div>
      )}
      <DashboardTile
        tile={tile}
        entry={entry}
        data={data}
        onShowDetails={onShowDetails}
        detailsBlocked={detailsBlocked}
        onRetryChartLoad={onRetryChartLoad}
        chartLoaders={chartLoaders}
        dashboardFilters={filters}
        className={cn(borderClass)}
      />
    </div>
  );
}
