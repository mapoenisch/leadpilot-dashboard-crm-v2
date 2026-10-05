// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Konfigurationsfenster für eine Kachel. Wird
// per React.lazy erst beim Öffnen geladen (Default-Export). Native Auswahlfelder, jede Option mit
// Grund, wenn sie gesperrt ist; die Vorschau ist nur zum Ansehen und nicht bedienbar.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  DASHBOARD_CATEGORIES,
  TILE_SIZES,
  getActiveEntries,
  minSizeFor,
  sizeRank,
  type ActiveCatalogEntry,
  type DashboardCategory,
  type DashboardView,
  type TileSize,
} from '../model/dashboardCatalog';
import {
  MAX_TITLE_LENGTH,
  type DashboardFilters,
  type DashboardTileConfig,
  type TileFilterMode,
} from '../model/dashboardConfig';
import {
  SIZE_LABEL,
  VIEW_LABEL,
  activeEntryOf,
  allowedFilterModes,
  validateTileCandidate,
  type EditResult,
  type NewTileInput,
} from '../hooks/dashboardEditorReducer';
import { Group, Option, useDebounced } from './ConfiguratorFields';
import type { ChartLoaders } from './charts/chartLoaders';
import { DashboardTile } from './DashboardTile';
import { useEscapeToClose } from './UnsavedChangesDialog';
import type { TileDataHook } from './LazyDashboardTile';

const MODE_LABEL: Record<TileFilterMode, string> = {
  dashboard: 'Zentraler Dashboard-Filter',
  eigener_zeitraum: 'Eigener Zeitraum',
  fester_stand: 'Fester Stand (wie angegeben)',
};

export interface TileConfiguratorProps {
  open: boolean;
  /** `undefined`: neue Kachel; sonst wird diese Kachel bearbeitet (Kennzahl bleibt fest). */
  tile?: DashboardTileConfig;
  useData: TileDataHook;
  filters?: DashboardFilters;
  onSubmit: (values: NewTileInput) => EditResult;
  onClose: () => void;
  /** „Wiederholen“ der Diagrammvorschau; der Arbeitsbereich schützt den Reload (Rückfrage). */
  onRetryChartLoad?: () => void;
  /** Nur für Tests: Nachladefunktionen der Diagrammvorschau ersetzen. */
  chartLoaders?: ChartLoaders;
  /** `false`, solange eine Rückfrage darüber liegt: dann ruht Escape (nur der oberste Dialog). */
  escapeActive?: boolean;
}

interface Choice {
  catalogId: string;
  view: DashboardView;
  size: TileSize;
  title: string;
  filterMode: TileFilterMode;
  pipeline: string;
}

function defaultsFor(entry: ActiveCatalogEntry): Choice {
  const first = allowedFilterModes(entry).find((option) => option.allowed);
  return {
    catalogId: entry.id,
    view: entry.defaultView,
    size: minSizeFor(entry, entry.defaultView),
    title: '',
    filterMode: first?.mode ?? 'dashboard',
    pipeline: '',
  };
}

function Preview(
  props: Pick<
    TileConfiguratorProps,
    'useData' | 'filters' | 'onRetryChartLoad' | 'chartLoaders'
  > & {
    tile: DashboardTileConfig;
    entry: ActiveCatalogEntry;
  },
) {
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

export default function TileConfigurator(props: TileConfiguratorProps) {
  const { open, tile, onClose } = props;
  const uid = useId();
  const editing = tile !== undefined;
  const entries = useMemo(() => getActiveEntries(), []);
  // Nur Kategorien, die aktive Einträge haben: sonst wäre die Trefferliste garantiert leer.
  const usedCategories = useMemo(
    () =>
      (Object.keys(DASHBOARD_CATEGORIES) as DashboardCategory[]).filter((key) =>
        entries.some((item) => item.category === key),
      ),
    [entries],
  );
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DashboardCategory | ''>('');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [error, setError] = useState('');
  const [sizeNote, setSizeNote] = useState('');
  const previewRef = useRef<HTMLDivElement | null>(null);
  const escapeActive = props.escapeActive ?? true;
  useEscapeToClose(open && escapeActive, onClose);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSizeNote('');
    setQuery('');
    setCategory('');
    if (tile && activeEntryOf(tile)) {
      setChoice({
        catalogId: tile.catalogId,
        view: tile.view,
        size: tile.size,
        title: tile.title ?? '',
        filterMode: tile.filterMode,
        pipeline: tile.pipeline ?? '',
      });
    } else {
      setChoice(null);
    }
  }, [open, tile]);

  useEffect(() => {
    previewRef.current?.setAttribute('inert', '');
  });

  const entry = choice ? entries.find((item) => item.id === choice.catalogId) : undefined;
  const matches = entries.filter((item) => {
    if (category && item.category !== category) return false;
    const text = query.trim().toLowerCase();
    return (
      !text ||
      item.name.toLowerCase().includes(text) ||
      item.definition.toLowerCase().includes(text)
    );
  });
  const title = choice?.title.trim() ?? '';
  const candidate: DashboardTileConfig | null =
    choice && entry
      ? {
          tileId: tile?.tileId ?? 'vorschau',
          catalogId: choice.catalogId,
          view: choice.view,
          size: choice.size,
          filterMode: choice.filterMode,
          ...(title ? { title } : {}),
          ...(choice.pipeline.trim() ? { pipeline: choice.pipeline.trim() } : {}),
        }
      : null;
  const settledPipeline = useDebounced(
    choice?.pipeline.trim() ?? '',
    400,
    `${tile?.tileId ?? ''}|${choice?.catalogId ?? ''}`,
  );
  const previewTile: DashboardTileConfig | null = candidate && {
    ...candidate,
    pipeline: settledPipeline || undefined,
  };
  const issues = candidate ? validateTileCandidate(candidate) : [];
  const valid = candidate !== null && issues.length === 0;

  const update = (patch: Partial<Choice>) => {
    setError('');
    setSizeNote('');
    setChoice((current) => (current ? { ...current, ...patch } : current));
  };

  const pickView = (view: DashboardView) => {
    if (!entry || !choice) return;
    const minimum = minSizeFor(entry, view);
    const raised = sizeRank(choice.size) < sizeRank(minimum);
    update({ view, size: raised ? minimum : choice.size });
    if (raised) setSizeNote(`Größe automatisch auf ${SIZE_LABEL[minimum]} angehoben.`);
  };

  const submit = () => {
    if (!candidate || !valid) return;
    const { tileId: _id, ...values } = candidate;
    void _id;
    const result = props.onSubmit(values);
    if (result.ok) onClose();
    else setError(result.reason);
  };

  return (
    <Modal
      open={open}
      onClose={() => escapeActive && onClose()}
      title={editing ? 'Kachel bearbeiten' : 'Kachel hinzufügen'}
      maxWidth="960px"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button disabled={!valid} onClick={submit}>
            {editing ? 'Übernehmen' : 'Hinzufügen'}
          </Button>
        </div>
      }
    >
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          {editing ? (
            <p className="m-0 text-sm [overflow-wrap:anywhere]">
              <span className="text-[var(--color-text-muted)]">Kennzahl: </span>
              {entry?.name}
            </p>
          ) : (
            <>
              <Input
                label="Kennzahl suchen"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <label className="flex flex-col gap-1 text-[13px] text-[var(--color-text-muted)]">
                Kategorie
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as DashboardCategory | '')}
                  className="rounded-md border border-solid border-border bg-surface p-2 text-sm text-[var(--color-text)]"
                >
                  <option value="">Alle Kategorien</option>
                  {usedCategories.map((key) => (
                    <option key={key} value={key}>
                      {DASHBOARD_CATEGORIES[key]}
                    </option>
                  ))}
                </select>
              </label>
              <p role="status" className="m-0 text-[12px] text-[var(--color-text-muted)]">
                {matches.length === 1 ? '1 Treffer' : `${matches.length} Treffer`}
              </p>
              <div className="max-h-[240px] overflow-y-auto">
                <Group legend="Kennzahl">
                  {matches.map((item) => (
                    <Option
                      key={item.id}
                      name={`${uid}-kennzahl`}
                      checked={choice?.catalogId === item.id}
                      label={item.name}
                      hint={`${DASHBOARD_CATEGORIES[item.category]} · ${item.timeBasis}`}
                      onSelect={() => {
                        setError('');
                        setChoice(defaultsFor(item));
                      }}
                    />
                  ))}
                </Group>
              </div>
            </>
          )}
          {choice && entry ? (
            <>
              <Group legend="Darstellung">
                {entry.views.map((view) => (
                  <Option
                    key={view}
                    name={`${uid}-darstellung`}
                    checked={choice.view === view}
                    label={VIEW_LABEL[view]}
                    onSelect={() => pickView(view)}
                  />
                ))}
              </Group>
              <p
                role="status"
                className="m-0 min-h-[18px] text-[12px] text-[var(--color-text-muted)]"
              >
                {sizeNote}
              </p>
              <Group legend="Größe">
                {TILE_SIZES.map((size) => {
                  const minimum = minSizeFor(entry, choice.view);
                  const tooSmall = sizeRank(size) < sizeRank(minimum);
                  return (
                    <Option
                      key={size}
                      name={`${uid}-groesse`}
                      checked={choice.size === size}
                      disabled={tooSmall}
                      label={SIZE_LABEL[size]}
                      hint={
                        tooSmall
                          ? `Diese Darstellung braucht mindestens ${SIZE_LABEL[minimum]}.`
                          : undefined
                      }
                      onSelect={() => update({ size })}
                    />
                  );
                })}
              </Group>
              <Group legend="Zeitbezug">
                {allowedFilterModes(entry).map((option) => (
                  <Option
                    key={option.mode}
                    name={`${uid}-zeitbezug`}
                    checked={choice.filterMode === option.mode}
                    disabled={!option.allowed}
                    label={MODE_LABEL[option.mode]}
                    hint={option.allowed ? undefined : option.reason}
                    onSelect={() => update({ filterMode: option.mode })}
                  />
                ))}
              </Group>
              {entry.filters.includes('pipeline') ? (
                <Input
                  label="Eigene Pipeline (optional, ersetzt den zentralen Filter)"
                  value={choice.pipeline}
                  onChange={(event) => update({ pipeline: event.target.value })}
                />
              ) : null}
              <Input
                label="Eigener Titel (optional)"
                value={choice.title}
                maxLength={MAX_TITLE_LENGTH + 20}
                helperText={`Höchstens ${MAX_TITLE_LENGTH} Zeichen.`}
                onChange={(event) => update({ title: event.target.value })}
              />
            </>
          ) : null}
          {issues.length > 0 ? (
            <p role="alert" className="m-0 text-sm text-error [overflow-wrap:anywhere]">
              {issues[0]?.message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="m-0 text-sm text-error [overflow-wrap:anywhere]">
              {error}
            </p>
          ) : null}
        </div>
        <div className="min-h-[260px] min-w-0">
          <p className="m-0 mb-1 text-[13px] font-medium text-[var(--color-text-muted)]">
            Vorschau
          </p>
          {valid && candidate && entry ? (
            <div ref={previewRef} data-testid="configurator-preview">
              <Preview
                key={candidate.catalogId}
                tile={previewTile ?? candidate}
                entry={entry}
                useData={props.useData}
                filters={props.filters}
                onRetryChartLoad={props.onRetryChartLoad}
                chartLoaders={props.chartLoaders}
              />
            </div>
          ) : (
            <p className="m-0 text-sm text-[var(--color-text-muted)]">
              Die Vorschau erscheint, sobald die Auswahl gültig ist.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
