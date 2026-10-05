// Auftrag 074: kleine Bausteine des Konfigurationsfensters (Auswahlgruppe, Option, Verzögerung,
// Auswahlstand, Vorschau), ausgelagert wegen der Dateigrenze von 400 Zeilen (Auftrag 076).
import { useEffect, useState, type ReactNode } from 'react';
import { allowedFilterModes } from '../hooks/dashboardEditorReducer';
import {
  DASHBOARD_CATEGORIES,
  minSizeFor,
  type ActiveCatalogEntry,
  type DashboardCategory,
  type DashboardView,
  type TileSize,
} from '../model/dashboardCatalog';
import type {
  DashboardFilters,
  DashboardTileConfig,
  TileFilterMode,
} from '../model/dashboardConfig';
import type { ChartLoaders } from './charts/chartLoaders';
import { DashboardTile } from './DashboardTile';
import type { TileDataHook } from './LazyDashboardTile';

export const MODE_LABEL: Record<TileFilterMode, string> = {
  dashboard: 'Zentraler Dashboard-Filter',
  eigener_zeitraum: 'Eigener Zeitraum',
  fester_stand: 'Fester Stand (wie angegeben)',
};

export interface Choice {
  /** Erste Kennzahl aus der Liste (Auftrag 076); bei einer Kombination deren Ausgang. */
  firstId: string;
  /** Gespeicherte Kennzahl: die erste Kennzahl selbst oder die gewählte Kombinationsregel. */
  catalogId: string;
  view: DashboardView;
  size: TileSize;
  title: string;
  filterMode: TileFilterMode;
  pipeline: string;
}

/** Voreinstellungen eines Eintrags; Darstellung, Größe und Zeitbezug kommen aus dem Katalog. */
export function defaultsFor(entry: ActiveCatalogEntry, firstId = entry.id): Choice {
  const first = allowedFilterModes(entry).find((option) => option.allowed);
  return {
    firstId,
    catalogId: entry.id,
    view: entry.defaultView,
    size: minSizeFor(entry, entry.defaultView),
    title: '',
    filterMode: first?.mode ?? 'dashboard',
    pipeline: '',
  };
}

export function Preview(props: {
  tile: DashboardTileConfig;
  entry: ActiveCatalogEntry;
  useData: TileDataHook;
  filters?: DashboardFilters;
  onRetryChartLoad?: () => void;
  chartLoaders?: ChartLoaders;
}) {
  const data = props.useData(props.tile, props.filters, { enabled: true });
  return (
    <DashboardTile
      tile={props.tile}
      entry={props.entry}
      data={data}
      dashboardFilters={props.filters}
      onShowDetails={() => undefined}
      onRetryChartLoad={props.onRetryChartLoad}
      chartLoaders={props.chartLoaders}
    />
  );
}

export function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-1 p-0 text-[13px] font-medium text-[var(--color-text-muted)]">
        {legend}
      </legend>
      <div className="flex flex-col gap-1">{children}</div>
    </fieldset>
  );
}

export function Option(props: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <label className="flex min-w-0 cursor-pointer items-start gap-2 text-sm [overflow-wrap:anywhere]">
      <input
        type="radio"
        name={props.name}
        checked={props.checked}
        disabled={props.disabled}
        onChange={props.onSelect}
        className="mt-1"
      />
      <span className={props.disabled ? 'opacity-60' : undefined}>
        {props.label}
        {props.hint ? (
          <span className="block text-[12px] text-[var(--color-text-muted)]">{props.hint}</span>
        ) : null}
      </span>
    </label>
  );
}

/**
 * Verzögerter Wert: Tippen löst keine Abfrage je Buchstabe aus. Ändert sich `resetKey` (andere Kachel
 * oder Kennzahl), gilt der neue Wert sofort, ohne verzögerten Erstabruf mit dem alten.
 */
export function useDebounced<T>(value: T, ms: number, resetKey: string): T {
  const [state, setState] = useState({ settled: value, key: resetKey });
  const current = state.key === resetKey ? state.settled : value;
  useEffect(() => {
    if (state.key !== resetKey) {
      setState({ settled: value, key: resetKey });
      return undefined;
    }
    if (state.settled === value) return undefined;
    const timer = setTimeout(() => setState({ settled: value, key: resetKey }), ms);
    return () => clearTimeout(timer);
  }, [value, ms, resetKey, state]);
  return current;
}

export function CategorySelect(props: {
  value: DashboardCategory | '';
  categories: readonly DashboardCategory[];
  onChange: (value: DashboardCategory | '') => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[13px] text-[var(--color-text-muted)]">
      Kategorie
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as DashboardCategory | '')}
        className="rounded-md border border-solid border-border bg-surface p-2 text-sm text-[var(--color-text)]"
      >
        <option value="">Alle Kategorien</option>
        {props.categories.map((key) => (
          <option key={key} value={key}>
            {DASHBOARD_CATEGORIES[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
