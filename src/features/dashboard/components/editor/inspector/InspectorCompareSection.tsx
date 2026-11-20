// Auftrag 170 (P14b): Abschnitt „Vergleichen“ im Daten-Tab des Kachel-Inspectors.
// Vergleichszeitraum, zweite Reihe (zeitbezogene Verknüpfung) und Erwartungsband, jeweils mit
// sichtbarem Sperrgrund, wenn die Kachel es nicht zulässt.
import type { ChangeEvent } from 'react';
import type { ActiveCatalogEntry } from '../../../model/dashboardCatalog';
import type { DashboardTileConfigV2, TileQueryConfig } from '../../../model/dashboardConfigV2';
import { normalizeTileQuery } from '../../../model/tileQuery';
import { compareBlockReason, joinCandidates } from '../../../model/timeseries/timeSeriesQuery';
import type { TimeSeriesCompareType, TimeSeriesJoinType } from '../../../model/timeseries/types';

export interface InspectorCompareSectionProps {
  selectedTile: DashboardTileConfigV2;
  catalogEntry: ActiveCatalogEntry | undefined;
  onTileOverrideChange: (tileId: string, patch: Partial<DashboardTileConfigV2>) => void;
}

const SELECT_CLASS =
  'h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50';
const OPTION_CLASS = 'bg-[var(--color-bg-deep,#051413)]';
const HINT_CLASS = 'm-0 text-[10px] text-[var(--color-text-muted)]';

export function InspectorCompareSection({
  selectedTile,
  catalogEntry,
  onTileOverrideChange,
}: InspectorCompareSectionProps) {
  const query = normalizeTileQuery(selectedTile);
  const blocked = compareBlockReason(catalogEntry, query, selectedTile.presentation);
  const candidates = catalogEntry && !blocked ? joinCandidates(catalogEntry, query.window) : [];

  const update = (patch: Partial<TileQueryConfig>) => {
    const next: TileQueryConfig = { ...query, ...patch };
    for (const key of ['compare', 'join', 'bands'] as const) {
      if (next[key] === undefined) delete next[key];
    }
    onTileOverrideChange(selectedTile.id, { query: next });
  };

  const onCompare = (e: ChangeEvent<HTMLSelectElement>) =>
    update({ compare: (e.target.value || undefined) as TimeSeriesCompareType | undefined });
  const onJoinMetric = (e: ChangeEvent<HTMLSelectElement>) =>
    update({
      join: e.target.value
        ? { metricId: e.target.value, typ: query.join?.typ ?? 'links' }
        : undefined,
    });
  const onJoinType = (e: ChangeEvent<HTMLSelectElement>) =>
    query.join && update({ join: { ...query.join, typ: e.target.value as TimeSeriesJoinType } });
  const onBands = (e: ChangeEvent<HTMLInputElement>) =>
    update({ bands: e.target.checked ? { type: 'percentile_10_90', periodCount: 8 } : undefined });

  return (
    <div
      data-testid="inspector-compare-section"
      className="space-y-3 rounded border border-[var(--color-border,#1b3d39)] bg-black/20 p-2.5 text-xs"
    >
      <div className="font-semibold text-white">Vergleichen</div>
      {blocked ? (
        <p data-testid="inspector-compare-blocked" className={HINT_CLASS}>
          {blocked}
        </p>
      ) : null}

      <div className="space-y-1">
        <label
          htmlFor="inspector-compare-select"
          className="text-[11px] text-[var(--color-text-muted)]"
        >
          Vergleichszeitraum
        </label>
        <select
          id="inspector-compare-select"
          data-testid="inspector-compare-select"
          disabled={Boolean(blocked)}
          value={query.compare ?? ''}
          onChange={onCompare}
          className={SELECT_CLASS}
        >
          <option value="" className={OPTION_CLASS}>
            Kein Vergleich
          </option>
          <option value="vorperiode" className={OPTION_CLASS}>
            Vorperiode (gleiche Länge direkt davor)
          </option>
          <option value="vorjahr" className={OPTION_CLASS}>
            Gleiche Periode im Vorjahr
          </option>
        </select>
        <p className={HINT_CLASS}>Nur belegte Historie; fehlende Zeiträume bleiben Lücken.</p>
      </div>

      <div className="space-y-1 border-t border-white/5 pt-2">
        <label
          htmlFor="inspector-join-select"
          className="text-[11px] text-[var(--color-text-muted)]"
        >
          Zweite Reihe (gleiche Zeitpunkte)
        </label>
        <select
          id="inspector-join-select"
          data-testid="inspector-join-select"
          disabled={Boolean(blocked) || candidates.length === 0}
          value={query.join?.metricId ?? ''}
          onChange={onJoinMetric}
          className={SELECT_CLASS}
        >
          <option value="" className={OPTION_CLASS}>
            Keine zweite Reihe
          </option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id} className={OPTION_CLASS}>
              {c.name} ({c.unit})
            </option>
          ))}
        </select>
        {!blocked && candidates.length === 0 ? (
          <p data-testid="inspector-join-none" className={HINT_CLASS}>
            Keine weitere Zeitreihe mit unterstützter Auflösung vorhanden.
          </p>
        ) : null}
        {query.join ? (
          <>
            <label
              htmlFor="inspector-join-type"
              className="text-[10px] text-[var(--color-text-muted)]"
            >
              Zeitpunkte
            </label>
            <select
              id="inspector-join-type"
              data-testid="inspector-join-type"
              disabled={Boolean(blocked)}
              value={query.join.typ}
              onChange={onJoinType}
              className={SELECT_CLASS}
            >
              <option value="links" className={OPTION_CLASS}>
                Alle Zeitpunkte der ersten Reihe
              </option>
              <option value="inner" className={OPTION_CLASS}>
                Nur gemeinsame Zeitpunkte
              </option>
            </select>
          </>
        ) : null}
      </div>

      <div className="border-t border-white/5 pt-2">
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-white">
          <input
            type="checkbox"
            data-testid="inspector-bands-toggle"
            disabled={Boolean(blocked)}
            checked={Boolean(query.bands)}
            onChange={onBands}
            className="rounded border-[var(--color-border,#1b3d39)] bg-black/40 text-primary focus:ring-primary disabled:cursor-not-allowed"
          />
          <span>Erwartungsband (10.–90. Perzentil der letzten 8 Perioden)</span>
        </label>
        <p className={HINT_CLASS}>
          Keine Prognose und kein Alarm; ohne 8 vollständige Perioden kein Band.
        </p>
      </div>
    </div>
  );
}
