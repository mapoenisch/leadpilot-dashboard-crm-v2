import type { Ref, RefObject } from 'react';
import { Check, Copy, Plus, Share2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AccessibleDashboardListItemV2,
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../../../services/dashboardStorageV2Types';
import { MAX_PERSONAL_DASHBOARDS } from '../../../model/dashboardTitles';
import type { PendingSelectionAction } from './useDashboardSelection';

export interface DashboardSwitcherMenuV2Props {
  menuRef: Ref<HTMLDivElement>;
  currentDashboard: StoredDashboardV2Row;
  dashboards: (AccessibleDashboardListItemV2 | PersonalDashboardListItemV2)[];
  errorText: string | null;
  isPreviewMode: boolean;
  isLimitReached: boolean;
  isOnlyOneDashboard?: boolean;
  onOpenAction: (action: PendingSelectionAction) => void;
  onOpenDuplicateDialog: () => void;
  onOpenShareDialog?: () => void;
  canShareWithTeam?: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
  itemRefs: RefObject<Array<HTMLButtonElement | null>>;
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    if (diffSec < 60) return 'gerade eben';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `vor ${diffMin} Min.`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `vor ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'}`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

// Gruppierung: Persönlich zuerst, danach Teams alphabetisch (Auftrag 163 §2.2 Nr. 16)
export function groupDashboardsForMenu(
  dashboards: (AccessibleDashboardListItemV2 | PersonalDashboardListItemV2)[],
) {
  const personalDashboards = dashboards.filter((d) => d.scope !== 'team');
  const teamDashboards = dashboards.filter((d) => d.scope === 'team');

  const teamGroupsMap = new Map<
    string,
    (AccessibleDashboardListItemV2 | PersonalDashboardListItemV2)[]
  >();
  for (const dash of teamDashboards) {
    const tName = 'teamName' in dash && dash.teamName ? dash.teamName : 'Unbenanntes Team';
    const group = teamGroupsMap.get(tName) ?? [];
    group.push(dash);
    teamGroupsMap.set(tName, group);
  }
  const sortedTeamNames = Array.from(teamGroupsMap.keys()).sort((a, b) => a.localeCompare(b, 'de'));

  const orderedDashboards = [
    ...personalDashboards,
    ...sortedTeamNames.flatMap((tName) => teamGroupsMap.get(tName) ?? []),
  ];

  return { personalDashboards, sortedTeamNames, teamGroupsMap, orderedDashboards };
}

export function DashboardSwitcherMenuV2({
  menuRef,
  currentDashboard,
  dashboards,
  errorText,
  isPreviewMode,
  isLimitReached,
  onOpenAction,
  onOpenDuplicateDialog,
  onOpenShareDialog,
  canShareWithTeam = false,
  onKeyDown,
  itemRefs,
}: DashboardSwitcherMenuV2Props) {
  const { personalDashboards, sortedTeamNames, teamGroupsMap, orderedDashboards } =
    groupDashboardsForMenu(dashboards);

  const isCurrentTeam = currentDashboard.scope === 'team';
  const isPersonalLast = personalDashboards.length <= 1;
  const isDeleteDisabled = isCurrentTeam ? currentDashboard.canWrite === false : isPersonalLast;
  const deleteDisabledTooltip = isCurrentTeam
    ? currentDashboard.canWrite === false
      ? 'Keine Schreibberechtigung für dieses Team-Dashboard'
      : undefined
    : isPersonalLast
      ? 'Das letzte Dashboard kann nicht gelöscht werden'
      : undefined;

  const renderDashboardItem = (
    dash: AccessibleDashboardListItemV2 | PersonalDashboardListItemV2,
    idx: number,
  ) => {
    const isCurrent = dash.id === currentDashboard.id;
    const canWrite = 'canWrite' in dash ? dash.canWrite : true;
    return (
      <button
        key={dash.id}
        ref={(el) => {
          if (itemRefs.current) itemRefs.current[idx] = el;
        }}
        type="button"
        role="menuitem"
        data-testid={`dashboard-item-${dash.id}`}
        onClick={() => {
          onOpenAction({
            type: 'open',
            id: dash.id,
            title: dash.title,
          });
        }}
        className={cn(
          'flex min-h-[44px] w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-white/5 focus:bg-white/10 focus:outline-none',
          isCurrent && 'bg-primary/10 text-primary hover:bg-primary/15',
        )}
      >
        <div className="flex flex-col truncate pr-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="truncate font-semibold text-white">{dash.title}</span>
            {!canWrite && (
              <span
                data-testid="readonly-badge"
                className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[9px] font-medium text-amber-300"
              >
                Nur lesen
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {dash.tileCount} {dash.tileCount === 1 ? 'Kachel' : 'Kacheln'} · {dash.sectionCount}{' '}
            {dash.sectionCount === 1 ? 'Sektion' : 'Sektionen'} ·{' '}
            {formatRelativeTime(dash.updatedAt)}
          </span>
        </div>
        {isCurrent && (
          <span
            data-testid="current-dashboard-badge"
            className="flex shrink-0 items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary"
          >
            <Check className="h-3 w-3" />
            <span>Geöffnet</span>
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Dashboards"
      data-testid="dashboard-switcher-menu"
      onKeyDown={onKeyDown}
      className="absolute left-0 top-full z-50 mt-1.5 flex w-[320px] max-w-[calc(100vw-24px)] flex-col rounded-lg border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] p-1.5 shadow-2xl backdrop-blur-md sm:w-[360px]"
    >
      {errorText && (
        <div
          role="alert"
          className="mb-1 rounded border border-error/40 bg-error/10 p-2 text-xs text-error"
        >
          {errorText}
        </div>
      )}

      {/* Dashboards Liste */}
      <div className="max-h-[280px] overflow-y-auto py-1">
        {/* Persönliche Dashboards */}
        <div role="group" aria-label="Persönliche Dashboards">
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Meine Dashboards ({personalDashboards.length} von {MAX_PERSONAL_DASHBOARDS})
          </span>

          <div className="mt-1 flex flex-col gap-0.5">
            {personalDashboards.length === 0 && (
              <div className="px-2.5 py-3 text-center text-xs text-muted-foreground">
                {errorText
                  ? 'Dashboard-Liste konnte nicht geladen werden.'
                  : 'Keine Dashboards vorhanden.'}
              </div>
            )}
            {personalDashboards.map((dash) => {
              const idx = orderedDashboards.findIndex((d) => d.id === dash.id);
              return renderDashboardItem(dash, idx);
            })}
          </div>
        </div>

        {/* Team-Gruppen (alphabetisch) */}
        {sortedTeamNames.map((teamName) => {
          const items = teamGroupsMap.get(teamName) ?? [];
          return (
            <div
              key={teamName}
              role="group"
              aria-label={`Team: ${teamName}`}
              className="mt-2 border-t border-[var(--color-border,#1b3d39)]/50 pt-1.5"
            >
              <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Team: {teamName}
              </span>
              <div className="mt-1 flex flex-col gap-0.5">
                {items.map((dash) => {
                  const idx = orderedDashboards.findIndex((d) => d.id === dash.id);
                  return renderDashboardItem(dash, idx);
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trennlinie & Aktionen (im Vorschau-Modus ausgeblendet) */}
      {!isPreviewMode && (
        <div className="mt-1 flex flex-col border-t border-[var(--color-border,#1b3d39)] pt-1.5">
          <button
            ref={(el) => {
              if (itemRefs.current) itemRefs.current[orderedDashboards.length] = el;
            }}
            type="button"
            role="menuitem"
            data-testid="new-dashboard-menu-item"
            disabled={isLimitReached}
            onClick={() => {
              if (isLimitReached) return;
              onOpenAction({ type: 'new' });
            }}
            className={cn(
              'flex min-h-[44px] w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs transition-colors',
              isLimitReached
                ? 'cursor-not-allowed opacity-50 text-muted-foreground'
                : 'text-[var(--color-text-soft,#e6f3f1)] hover:bg-white/5 hover:text-white focus:bg-white/10 focus:outline-none',
            )}
            title={
              isLimitReached
                ? `Höchstens ${MAX_PERSONAL_DASHBOARDS} persönliche Dashboards`
                : undefined
            }
          >
            <Plus className="h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span>Neues Dashboard …</span>
              {isLimitReached && (
                <span className="text-[10px] text-muted-foreground">
                  Höchstens {MAX_PERSONAL_DASHBOARDS} persönliche Dashboards
                </span>
              )}
            </div>
          </button>

          <button
            ref={(el) => {
              if (itemRefs.current) itemRefs.current[orderedDashboards.length + 1] = el;
            }}
            type="button"
            role="menuitem"
            data-testid="duplicate-dashboard-menu-item"
            disabled={isLimitReached && !isCurrentTeam}
            onClick={() => {
              if (isLimitReached && !isCurrentTeam) return;
              onOpenDuplicateDialog();
            }}
            className={cn(
              'flex min-h-[44px] w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs transition-colors',
              isLimitReached && !isCurrentTeam
                ? 'cursor-not-allowed opacity-50 text-muted-foreground'
                : 'text-[var(--color-text-soft,#e6f3f1)] hover:bg-white/5 hover:text-white focus:bg-white/10 focus:outline-none',
            )}
            title={
              isLimitReached && !isCurrentTeam
                ? `Höchstens ${MAX_PERSONAL_DASHBOARDS} persönliche Dashboards`
                : undefined
            }
          >
            <Copy className="h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span>Dashboard duplizieren …</span>
              {isLimitReached && !isCurrentTeam && (
                <span className="text-[10px] text-muted-foreground">
                  Höchstens {MAX_PERSONAL_DASHBOARDS} persönliche Dashboards
                </span>
              )}
            </div>
          </button>

          {canShareWithTeam && onOpenShareDialog && (
            <button
              ref={(el) => {
                if (itemRefs.current) itemRefs.current[orderedDashboards.length + 2] = el;
              }}
              type="button"
              role="menuitem"
              data-testid="share-with-team-menu-item"
              onClick={() => {
                onOpenShareDialog();
              }}
              className="flex min-h-[44px] w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs transition-colors text-[var(--color-text-soft,#e6f3f1)] hover:bg-white/5 hover:text-white focus:bg-white/10 focus:outline-none"
            >
              <Share2 className="h-4 w-4 text-primary" />
              <span>Mit Team teilen …</span>
            </button>
          )}

          <button
            ref={(el) => {
              const deleteIdx =
                orderedDashboards.length + (canShareWithTeam && onOpenShareDialog ? 3 : 2);
              if (itemRefs.current) itemRefs.current[deleteIdx] = el;
            }}
            type="button"
            role="menuitem"
            data-testid="delete-dashboard-menu-item"
            disabled={isDeleteDisabled}
            onClick={() => {
              if (isDeleteDisabled) return;
              onOpenAction({
                type: 'delete',
                id: currentDashboard.id,
                title: currentDashboard.title,
              });
            }}
            className={cn(
              'flex min-h-[44px] w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs transition-colors',
              isDeleteDisabled
                ? 'cursor-not-allowed opacity-50 text-muted-foreground'
                : 'text-error hover:bg-error/10 focus:bg-error/15 focus:outline-none',
            )}
            title={deleteDisabledTooltip}
          >
            <Trash2 className="h-4 w-4 text-error" />
            <div className="flex flex-col">
              <span>Dashboard löschen …</span>
              {isDeleteDisabled && deleteDisabledTooltip && (
                <span className="text-[10px] text-muted-foreground">{deleteDisabledTooltip}</span>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
