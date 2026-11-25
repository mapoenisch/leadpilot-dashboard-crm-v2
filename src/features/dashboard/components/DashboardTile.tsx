// Executive Dashboard, Teilauftrag 4 (Auftrag 073): einheitlicher Kachelrahmen (Plan §3, §4).
// Kopf mit Kategorie, Titel, Zeitraum/Stand, Quelle, Zeitbezug und Geltungsbereich; Inhalt über
// DashboardChart; Fußzeile mit „Details“. Die Kachel lädt keine Daten selbst, sie bekommt sie.
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { DASHBOARD_CATEGORIES, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import type { TileData } from '../data/dashboardData';
import type { ChartLoaders } from './charts/chartLoaders';
import { checkTileValues } from './DashboardChart';
import {
  BLOCKING_STATES,
  blockingText,
  CombinationFormula,
  MUTED,
  TileNotices,
  TileStateBadge,
  TimeReference,
} from './TileStatus';

import { formatAsOf, NO_DATA, SOURCE_LABEL, timeLabel } from './tileFormat';
import { TileStandLine } from '../time/TileStandLine';
import { readTileStand } from '../time/useTimeControlledData';
import { TileBody } from './TileBody';
import { TileExplanationToggle } from './TileExplanation';
import { TileFitBox } from './TileFitBox';
import type { TileFitMinimum } from './tileFit';
import { formatTransformationSummary, getEffectiveTitle } from '../model/transformations';

export interface DashboardTileProps {
  tile: DashboardTileConfig;
  /** Aktiver Katalogeintrag; fehlt er, werden keine Metadaten erfunden. */
  entry?: ActiveCatalogEntry;
  data: TileData;
  onShowDetails: (tileId: string) => void;
  /** Entscheidung Marc E3 (Auftrag 077): im Bearbeitungsmodus gesperrt, mit sichtbarem Grund. */
  detailsBlocked?: boolean;
  /**
   * „Wiederholen“ nach einem fehlgeschlagenen Modulabruf. Standard: Seite neu laden, weil der
   * Browser den fehlgeschlagenen Abruf festhält (wie in der Testkachel). Teilauftrag 5 sichert
   * vorher die Arbeitskopie.
   */
  onRetryChartLoad?: () => void;
  /** Nur für Tests: Nachladefunktionen ersetzen. */
  chartLoaders?: ChartLoaders;
  /** Zentrale Filter: nur zur Anzeige einer abgelehnten Pipeline-Wahl im Zeitbezug. */
  dashboardFilters?: DashboardFilters;
  className?: string;
  /**
   * Auftrag 174b: Die Kachel füllt eine feste Rasterfläche (Dashboard-Editor V2). Der Inhalt wird
   * ohne Scrollen eingepasst, lange Erläuterungen sind eingeklappt.
   */
  fit?: boolean;
  /** Mit `fit`: Platzbedarf der ganzen Kachel bei Mindestfaktor (px). */
  onFitMinimum?: (minimum: TileFitMinimum) => void;
}

/** Live-Kacheln: feste Höhe für bis zu drei Hinweiszeilen; mehr scrollt. */
const NOTICE_SLOT_CLASS = 'h-[56px] overflow-y-auto';
export const DETAILS_BLOCKED_HINT = 'Erst speichern, dann Details öffnen.';

/** Vorsilbe der Ansage, wenn der Text allein den Zustand nicht nennt. */
const STATE_PREFIX: Partial<Record<TileData['state'], string>> = {
  fehler: 'Fehler: ',
  nicht_berechenbar: 'Nicht berechenbar: ',
};

/** Bereite Daten, die als „Keine Daten“ erscheinen (z. B. leere Reihe): ansagen wie einen Zustand. */
function isDerivedEmpty(
  tile: DashboardTileConfig,
  entry: ActiveCatalogEntry | undefined,
  data: TileData,
  title: string,
): boolean {
  if (data.state !== 'bereit') return false;
  const check = checkTileValues(tile.view, entry, data, title);
  // Unpassende Kombination: sichtbar ist der Hinweis, nicht „Keine Daten“.
  if (check.kind === 'hinweis') return false;
  if (tile.view === 'uebersicht') return !data.overview;
  return check.kind === 'keine_daten';
}

export function DashboardTile({
  tile,
  entry,
  data,
  onShowDetails,
  detailsBlocked = false,
  onRetryChartLoad = () => window.location.reload(),
  chartLoaders,
  dashboardFilters,
  className,
  fit = false,
  onFitMinimum,
}: DashboardTileProps) {
  const transformations = tile.query?.transformations;
  const hasTransformations = Boolean(transformations && transformations.length > 0);
  const transformationSummary = hasTransformations
    ? formatTransformationSummary(transformations)
    : '';
  const title = getEffectiveTitle(tile.title ?? entry?.name ?? tile.catalogId, transformations);
  // useId liefert Doppelpunkte, die in SVG-Referenzen (url(#…)) stören: nur Buchstaben und Ziffern.
  const idPrefix = `tile${useId()}${tile.tileId}`.replace(/[^a-zA-Z0-9]/g, '');
  const resolved = data.state === 'nicht_verfuegbar' ? null : data;
  const period = resolved ? timeLabel(resolved.timeBasis, resolved.asOf) : '';
  // Hatte der Ladeplatzhalter den Fokus, übernimmt ihn nach dem Datenempfang der Inhaltsbereich,
  // statt auf den Seitenanfang zurückzufallen (Codex-Befund PR #57).
  const bodyRef = useRef<HTMLDivElement>(null);
  const loadingHadFocus = useRef(false);
  useEffect(() => {
    if (data.state === 'laden' || !loadingHadFocus.current) return;
    loadingHadFocus.current = false;
    bodyRef.current?.focus();
  }, [data.state]);
  // Auch nicht blockierende Wechsel ansagen: ein sichtbarer, aber veralteter Wert (Codex-Befund).
  const stand = resolved?.asOf ? formatAsOf(resolved.asOf) : null;
  // Rückkehr von „veraltet“ oder „eingeschränkt“ zu normalen Daten ansagen (Codex-Befund).
  const warned = data.state === 'veraltet' || resolved?.quality === 'degradiert';
  const wasWarned = useRef(false);
  const [recovered, setRecovered] = useState(false);
  useEffect(() => {
    if (warned) {
      wasWarned.current = true;
      setRecovered(false);
    } else if (wasWarned.current && data.state === 'bereit') {
      wasWarned.current = false;
      setRecovered(true);
    } else if (data.state !== 'bereit') {
      setRecovered(false);
    }
  }, [warned, data.state]);
  // Auftrag 174b (K2/K3): Platzbedarf der Kachel = Bedarf des Inhalts + Kopf, Fuß, Abstände.
  const handleBodyMinimum = (body: TileFitMinimum) => {
    const bodyEl = bodyRef.current;
    const card = bodyEl?.closest<HTMLElement>('[data-testid="dashboard-tile"]');
    if (!bodyEl || !card || !onFitMinimum) return;
    onFitMinimum({
      width: body.width + (card.offsetWidth - bodyEl.offsetWidth),
      height: body.height + (card.offsetHeight - bodyEl.offsetHeight),
    });
  };
  const standMeta = readTileStand(data);
  const timeReference = (
    <TimeReference
      tile={tile}
      data={resolved}
      dashboardFilters={dashboardFilters}
      leading={
        resolved ? (
          <span data-testid="tile-meta">
            {period}
            {resolved.origin.layer === 'live' && !resolved.asOf ? (
              // Reserviert den Umbruch des späteren „Stand …“, damit der Kopf nicht springt.
              <span aria-hidden="true" className="invisible" data-testid="tile-stand-reserve">
                {' · Stand 00.00.0000, 00:00'}
              </span>
            ) : null}
            {/* Auftrag 091: Quelle ohne Vorsilbe; nicht doppelt, wenn der Stand sie schon nennt (Live). */}
            {period.startsWith(SOURCE_LABEL[resolved.origin.layer])
              ? null
              : ` · ${SOURCE_LABEL[resolved.origin.layer]}`}
          </span>
        ) : null
      }
    />
  );
  const body = (
    <TileBody
      loadingHadFocus={loadingHadFocus}
      tile={tile}
      entry={entry}
      data={data}
      title={title}
      period={period}
      idPrefix={idPrefix}
      onRetryChartLoad={onRetryChartLoad}
      chartLoaders={chartLoaders}
    />
  );
  const isTimePoint = standMeta?.mode === 'zeitpunkt';
  const isTimePointNoData =
    isTimePoint && entry && (entry.history.kind === 'puffer' || entry.history.kind === 'keine');
  const isTimePointFest = isTimePoint && entry?.history.kind === 'fest';

  const liveText = isTimePointNoData
    ? 'Für gewählten Zeitpunkt ist kein Stand gespeichert.'
    : BLOCKING_STATES.has(data.state)
      ? `${STATE_PREFIX[data.state] ?? ''}${blockingText(data)}`
      : warned
        ? // Beide Warnungen zusammen (veraltet und eingeschränkt) in einer Meldung.
          [
            data.state === 'veraltet' ? `Wert veraltet. ${stand ?? 'Zeitpunkt unbekannt'}.` : '',
            resolved?.quality === 'degradiert' ? 'Datenqualität eingeschränkt.' : '',
          ]
            .filter(Boolean)
            .join(' ')
        : isDerivedEmpty(tile, entry, data, title)
          ? NO_DATA
          : recovered
            ? 'Wert wieder aktuell.'
            : '';

  return (
    <Card
      variant="glass"
      // Auftrag 091 (Muster 1): 16 px Innenabstand für die kompakte Kachel.
      padding="var(--space-4)"
      aria-label={`Kachel: ${title}`}
      data-testid="dashboard-tile"
      data-size={tile.size}
      data-view={tile.view}
      data-state={data.state}
      className={cn(
        'w-full min-w-0 motion-reduce:transition-none',
        fit && 'flex h-full flex-col overflow-hidden',
        className,
      )}
    >
      {/* Auftrag 091 (Muster 1): 8 px Abstand statt 12 px. */}
      <div className={cn('flex flex-col gap-[8px]', fit && 'h-full min-h-0')}>
        <header
          className={cn(
            'flex flex-wrap items-start justify-between gap-[10px]',
            fit && 'relative shrink-0',
          )}
        >
          <div className="min-w-0">
            {entry ? (
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {DASHBOARD_CATEGORIES[entry.category]}
              </p>
            ) : null}
            <h3 className="m-0 mt-[2px] break-words text-[15px] font-semibold leading-snug text-[var(--color-text-primary,#fff)] flex items-center flex-wrap gap-1.5">
              <span>{title}</span>
              {hasTransformations && (
                <span
                  data-testid="tile-transformed-hint"
                  title={transformationSummary}
                  className="rounded bg-white/10 px-1 py-0.5 text-[10px] font-medium text-slate-300 cursor-help"
                >
                  umgeformt
                </span>
              )}
            </h3>
            {/* Auftrag 091 (Entscheidung Marc): Klartext unter dem Kürzel; ein eigener Titel ersetzt beides. */}
            {!tile.title && entry?.plainName ? (
              <p
                data-testid="tile-plain-name"
                title={fit ? entry.plainName : undefined}
                className={cn(
                  'm-0 text-[12px] text-[var(--color-text-muted)]',
                  fit ? 'truncate' : 'break-words',
                )}
              >
                {entry.plainName}
              </p>
            ) : null}
            {fit ? (
              // Auftrag 174b (K3): eine kurze Stand-Zeile; Zeitbezug, Quelle und Formel klappen auf.
              <div className="mt-[2px] flex items-start gap-[4px]">
                <div className="min-w-0 flex-1">
                  <TileStandLine data={data} entry={entry} />
                </div>
                <TileExplanationToggle>
                  {timeReference}
                  <CombinationFormula entry={entry} />
                </TileExplanationToggle>
              </div>
            ) : (
              <>
                <div className="mt-[2px]">{timeReference}</div>
                <TileStandLine data={data} entry={entry} />
                <CombinationFormula entry={entry} />
              </>
            )}
          </div>
          <TileStateBadge data={data} />
        </header>

        {/* Live-Hinweise (veraltet, eingeschränkt) erscheinen nach dem Laden: zwei Zeilen reservieren. */}
        <div
          data-testid="tile-notice-slot"
          {...(resolved?.origin.layer === 'live' || isTimePointFest
            ? {
                className: NOTICE_SLOT_CLASS,
                // Überläuft der Platz (beide Hinweise in einer schmalen Kachel): per Tastatur scrollbar.
                ...(warned
                  ? { role: 'region', tabIndex: 0, 'aria-label': 'Hinweise zur Datenqualität' }
                  : {}),
              }
            : // Auftrag 091: ohne Inhalt kein leerer Flex-Eintrag (sonst 8 px Abstand zu viel).
              { className: 'empty:hidden' })}
        >
          <TileNotices data={data} />
          {isTimePointFest ? (
            <div
              data-testid="tile-notice"
              className="flex flex-col gap-[2px] text-[12px] text-accent"
            >
              <p className="m-0">zeitunabhängiger Wert</p>
            </div>
          ) : null}
        </div>

        {/* Bleibt bestehen: Zustandswechsel (z. B. Laden → Fehler) werden vorgelesen. */}
        <p role="status" className="sr-only" data-testid="tile-live-status">
          {liveText}
        </p>
        <div
          ref={bodyRef}
          tabIndex={-1}
          className={cn(
            'min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary',
            fit && 'min-h-0 flex-1',
          )}
          data-testid="tile-body"
        >
          {fit ? <TileFitBox onMinimum={handleBodyMinimum}>{body}</TileFitBox> : body}
        </div>

        <footer
          className={cn(
            'flex items-center justify-end gap-[8px] border-0 border-t border-solid border-border pt-[8px]',
            fit ? 'shrink-0 flex-nowrap' : 'flex-wrap',
          )}
        >
          {detailsBlocked ? (
            <p
              id={`${idPrefix}-details-hint`}
              title={fit ? DETAILS_BLOCKED_HINT : undefined}
              className={cn(MUTED, 'mr-auto', fit && 'min-w-0 flex-1 truncate text-[11px]')}
            >
              {DETAILS_BLOCKED_HINT}
            </p>
          ) : null}
          {/* Fokussierbar auch gesperrt (aria-disabled), damit der Hinweis erreichbar bleibt. */}
          <Button
            variant="secondary"
            size="sm"
            data-action="details"
            aria-label={`Details zu ${title}`}
            aria-disabled={detailsBlocked || undefined}
            aria-describedby={detailsBlocked ? `${idPrefix}-details-hint` : undefined}
            className={detailsBlocked ? 'cursor-not-allowed opacity-60' : undefined}
            onClick={() => {
              if (!detailsBlocked) onShowDetails(tile.tileId);
            }}
          >
            Details
          </Button>
        </footer>
      </div>
    </Card>
  );
}
