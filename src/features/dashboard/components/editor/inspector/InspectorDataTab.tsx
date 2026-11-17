// Executive Dashboard V2 (Auftrag 148 / P05, Auftrag 160 / P10b-1):
// Daten- & Filter-Tab des Kachel-Inspectors.

import { useContext, type ChangeEvent } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import type { ActiveCatalogEntry, DashboardView } from '../../../model/dashboardCatalog';
import type { DashboardFilters, DashboardTileConfig } from '../../../model/dashboardConfig';
import type { DashboardTileConfigV2 } from '../../../model/dashboardConfigV2';
import { getQueryCapabilities } from '../../../model/queryCapabilities';
import { normalizeTileQuery } from '../../../model/tileQuery';
import {
  formatHistoryLabel,
  formatResolutionText,
  formatTimeframeText,
} from '../../../model/historyCapability';
import { useOptionalTimeControl } from '../../../time/TimeControlProvider';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { TimeWindowField, type TimeWindowConfig } from './TimeWindowField';

export function InspectorDataTab({
  selectedTile,
  catalogEntry,
  onTileOverrideChange,
  isCollapsed = false,
  globalPipeline,
}: {
  selectedTile: DashboardTileConfigV2;
  catalogEntry: ActiveCatalogEntry | undefined;
  onTileOverrideChange: (tileId: string, patch: Partial<DashboardTileConfigV2>) => void;
  isCollapsed?: boolean;
  globalPipeline?: string;
}) {
  const normQuery = normalizeTileQuery(selectedTile);
  const caps = catalogEntry ? getQueryCapabilities(catalogEntry) : undefined;
  const supportsPipeline = caps?.supportsPipelineFilter ?? false;

  let effectivePipeline: string | undefined;
  if (normQuery.pipelineId === null) {
    effectivePipeline = undefined;
  } else if (typeof normQuery.pipelineId === 'string') {
    effectivePipeline = normQuery.pipelineId;
  } else {
    effectivePipeline = selectedTile.pipelineOverride ?? globalPipeline;
  }

  let pipelineValue = '';
  if (normQuery.pipelineId === null) {
    pipelineValue = '__all__';
  } else if (typeof normQuery.pipelineId === 'string') {
    pipelineValue = normQuery.pipelineId;
  }

  const handlePipelineChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const rawVal = e.target.value;
    let nextPipelineId: string | null | undefined;
    if (rawVal === '__all__') {
      nextPipelineId = null;
    } else if (rawVal) {
      nextPipelineId = rawVal;
    } else {
      nextPipelineId = undefined;
    }

    onTileOverrideChange(selectedTile.id, {
      query: {
        ...normQuery,
        pipelineId: nextPipelineId,
      },
    });
  };

  const handleWindowChange = (nextWindow: TimeWindowConfig | undefined) => {
    onTileOverrideChange(selectedTile.id, {
      query: {
        ...normQuery,
        window: nextWindow,
      },
    });
  };

  const isTimeSeries = catalogEntry?.history.kind === 'ereignisse';
  const timeControl = useOptionalTimeControl();
  const isPaused = timeControl?.state.mode === 'pausiert';

  const effectiveWindow = normQuery.window ?? catalogEntry?.history.defaultWindow;

  const tileConfig: DashboardTileConfig = {
    tileId: selectedTile.id,
    catalogId: selectedTile.catalogId,
    view: (selectedTile.presentation as DashboardView) || 'linie',
    size: 'mittel',
    filterMode: 'dashboard',
    pipeline: effectivePipeline,
    query: normQuery,
  };

  const filters: DashboardFilters = { pipeline: globalPipeline };

  const pipelineReason =
    catalogEntry?.source.layer === 'live'
      ? 'Live-Feed, kein Pipeline-Filter'
      : 'Feste Stammdaten, kein Pipeline-Filter';

  return (
    <div data-testid="tab-content-daten" className="space-y-4">
      {catalogEntry && (
        <div className="rounded border border-[var(--color-border,#1b3d39)] bg-black/20 p-2.5 text-xs space-y-1.5">
          <div className="text-[var(--color-text-muted)] font-medium">Kennzahl-Details:</div>
          <div className="text-white font-semibold">{catalogEntry.name}</div>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            {catalogEntry.definition}
          </div>
          <div className="flex gap-2 pt-1 text-[10px]">
            <span className="text-[var(--color-text-muted)]">Einheit:</span>
            <span className="text-white font-medium">{catalogEntry.unit}</span>
            <span className="text-[var(--color-text-muted)] ml-2">Quelle:</span>
            <span className="text-white font-medium capitalize">{catalogEntry.source.layer}</span>
          </div>

          {/* Historie & Auflösung (Auftrag 159, Auftrag 160 §2.4 Nr. 25) */}
          <div
            data-testid="inspector-history"
            className="border-t border-white/5 pt-1.5 text-[10px]"
            title={catalogEntry.history.note}
          >
            <InspectorHistoryLabel
              catalogEntry={catalogEntry}
              tileConfig={tileConfig}
              filters={filters}
              isPaused={isPaused}
              isCollapsed={isCollapsed}
            />

            {isTimeSeries && effectiveWindow && (
              <div
                data-testid="inspector-time-series-meta"
                className="mt-1 flex flex-col gap-0.5 text-[10px] text-[var(--color-text-muted)]"
              >
                <div>
                  <span>Auflösung: </span>
                  <span className="text-white font-medium" data-testid="inspector-resolution-text">
                    {formatResolutionText(effectiveWindow.resolution)}
                  </span>
                </div>
                <div>
                  <span>Zeitraum: </span>
                  <span className="text-white font-medium" data-testid="inspector-timeframe-text">
                    {formatTimeframeText(effectiveWindow)}
                  </span>
                </div>
              </div>
            )}

            <p className="m-0 mt-0.5 text-[10px] leading-tight text-[var(--color-text-muted)]">
              {catalogEntry.history.note}
            </p>
          </div>
        </div>
      )}

      {/* Pipeline-Zuordnung */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">
          Pipeline-Zuordnung
        </label>
        <select
          data-testid="inspector-pipeline-override"
          aria-label="Pipeline-Zuordnung"
          disabled={!supportsPipeline}
          value={supportsPipeline ? pipelineValue : ''}
          onChange={handlePipelineChange}
          className="h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="" className="bg-[var(--color-bg-deep,#051413)]">
            Standard (folgt Dashboard)
          </option>
          <option value="__all__" className="bg-[var(--color-bg-deep,#051413)]">
            Alle Pipelines (kein Filter)
          </option>
          <option value="vertrieb_q4" className="bg-[var(--color-bg-deep,#051413)]">
            Vertrieb Q4
          </option>
          <option value="enterprise" className="bg-[var(--color-bg-deep,#051413)]">
            Enterprise Deals
          </option>
          <option value="inbound" className="bg-[var(--color-bg-deep,#051413)]">
            Inbound Leads
          </option>
        </select>
        {!supportsPipeline && (
          <p
            className="text-[10px] text-[var(--color-text-muted)]"
            data-testid="pipeline-disabled-reason"
          >
            {pipelineReason}
          </p>
        )}

        {/* Hinweis zur Pipeline-Filterung für CRM-Verlaufskacheln (Auftrag 160 §2.2 Nr. 11, §2.4 Nr. 25) */}
        {isTimeSeries && catalogEntry?.source.layer === 'crm' && (
          <div
            data-testid="inspector-pipeline-hint"
            className="mt-1.5 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[10.5px] text-amber-200/90 leading-tight space-y-1"
          >
            <div className="font-semibold text-amber-300">Hinweis zur Pipeline-Filterung:</div>
            <div>
              Gezählt wird nach der <strong>heutigen Pipeline</strong> des Deals (
              <code>aktuelle_pipeline_des_deals</code>). Ein späterer Pipelinewechsel eines Deals
              verschiebt seine Ereignisse rückwirkend.
            </div>
            <div>
              Gelöschte Deals fehlen in der Historie (Kaskade <code>ON DELETE CASCADE</code>).
            </div>
          </div>
        )}
      </div>

      {/* Zeitfenster für Verlaufskacheln (Auftrag 161 §2.3 Nr. 15) bzw. Zeitraum für andere */}
      {isTimeSeries && catalogEntry ? (
        <TimeWindowField
          catalogEntry={catalogEntry}
          currentWindow={normQuery.window}
          onChangeWindow={handleWindowChange}
        />
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Zeitraum</label>
          <select
            data-testid="inspector-timeframe-override"
            aria-label="Zeitraum"
            disabled
            value={caps?.allowedTimeframes[0] ?? 'fest'}
            className="h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="fest" className="bg-[var(--color-bg-deep,#051413)]">
              Fester Stichtag (31.12.2025)
            </option>
            <option value="aktuell" className="bg-[var(--color-bg-deep,#051413)]">
              Aktueller Snapshot (CRM)
            </option>
            <option value="live" className="bg-[var(--color-bg-deep,#051413)]">
              Echtzeit-Stream (Live)
            </option>
          </select>
          <p
            className="text-[10px] text-[var(--color-text-muted)]"
            data-testid="timeframe-disabled-reason"
          >
            Fester Zeitbezug laut Kennzahl ({caps?.allowedTimeframes[0] ?? 'fest'}).
          </p>
        </div>
      )}
    </div>
  );
}

function InspectorHistoryLabel({
  catalogEntry,
  tileConfig,
  filters,
  isPaused,
  isCollapsed = false,
}: {
  catalogEntry: ActiveCatalogEntry;
  tileConfig: DashboardTileConfig;
  filters?: DashboardFilters;
  isPaused: boolean;
  isCollapsed?: boolean;
}) {
  const queryClient = useContext(QueryClientContext);
  const isTimeSeries = catalogEntry.history.kind === 'ereignisse';

  if (!queryClient || !isTimeSeries) {
    return (
      <div data-testid="inspector-history-label" className="text-white font-medium">
        {formatHistoryLabel(catalogEntry.history)}
      </div>
    );
  }

  return (
    <InspectorHistoryWithQuery
      catalogEntry={catalogEntry}
      tileConfig={tileConfig}
      filters={filters}
      isPaused={isPaused}
      enabled={!isCollapsed}
    />
  );
}

function InspectorHistoryWithQuery({
  catalogEntry,
  tileConfig,
  filters,
  isPaused,
  enabled = true,
}: {
  catalogEntry: ActiveCatalogEntry;
  tileConfig: DashboardTileConfig;
  filters?: DashboardFilters;
  isPaused: boolean;
  enabled?: boolean;
}) {
  const tileData = useDashboardData(tileConfig, filters, {
    enabled,
    frozen: isPaused,
  });
  const historyStartAt =
    tileData.state === 'bereit' && tileData.timeSeries
      ? tileData.timeSeries.historyStartAt
      : undefined;

  return (
    <div data-testid="inspector-history-label" className="text-white font-medium">
      {formatHistoryLabel(catalogEntry.history, historyStartAt)}
    </div>
  );
}
