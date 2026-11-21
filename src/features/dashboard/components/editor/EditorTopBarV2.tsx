// Executive Dashboard V2 (Auftrag 148 & 158 / P05 & P09b):
// Top-Bar des V2-Dashboard-Editors.
// Dashboard-Auswahl (Switcher) mit Scope-Badge, Inline-Edit-Titel, Dirty-Indikator,
// Breakpoint-Wahlschalter, Globale Filter, Live/Pause, Vorschau-Modus, Undo/Redo und Speichern/Abbrechen.

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { PanelLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type {
  BreakpointKey,
  DashboardConfigV2,
  DashboardScope,
} from '../../model/dashboardConfigV2';
import type {
  AccessibleDashboardListItemV2,
  DashboardV2StorageError,
  PersonalDashboardListItemV2,
  StoredDashboardV2Row,
} from '../../services/dashboardStorageV2Types';
import { BreakpointSelector } from './topbar/BreakpointSelector';
import { EditorTopBarActionsV2 } from './topbar/EditorTopBarActionsV2';
import { DashboardSwitcherV2 } from './selection/DashboardSwitcherV2';
import { TimeControlMenuV2 } from './TimeControlMenuV2';
import { KioskLaunchButton } from '../kiosk/KioskLaunchButton';

export interface EditorTopBarV2Props {
  config: DashboardConfigV2;
  isDirty: boolean;
  activeBreakpoint: BreakpointKey;
  onBreakpointChange: (bp: BreakpointKey) => void;
  onTitleChange: (newTitle: string) => void;
  onScopeChange?: (scope: DashboardScope) => void;
  onGlobalFilterChange: (filters: { timeframe?: string; pipeline?: string }) => void;
  isLivePaused: boolean;
  onToggleLivePause: () => void;
  onResume?: () => void;
  isPreviewMode: boolean;
  onTogglePreviewMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => Promise<boolean> | void;
  isSaving: boolean;
  onCancel: () => void;
  isLibraryOpen?: boolean;
  onToggleLibrary?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  readOnly?: boolean;
  className?: string;
  // Auftrag 158: Dashboard-Auswahl
  dashboards?: (AccessibleDashboardListItemV2 | PersonalDashboardListItemV2)[];
  currentStoredDashboard?: StoredDashboardV2Row;
  onOpenDashboard?: (id: string) => Promise<boolean>;
  onCreateFromTemplate?: (
    templateId: string,
    title?: string,
  ) => Promise<{ ok: boolean; error?: unknown }>;
  onDuplicateCurrent?: (title?: string) => Promise<{ ok: boolean; error?: unknown }>;
  onDeleteDashboard?: (
    id: string,
  ) => Promise<{ ok: boolean; nextDashboardId?: string | null; error?: unknown }>;
  onShareWithTeam?: (teamId: string, title: string) => Promise<{ ok: boolean; error?: unknown }>;
  onRefreshList?: () => Promise<void>;
  listError?: DashboardV2StorageError | null;
  onOpenVersions?: (context?: { isDirty: boolean; draftConfig: DashboardConfigV2 }) => void;
  onOpenImport?: () => void;
}

export const TIMEFRAME_OPTIONS = [
  { value: 'letzte_7_tage', label: 'Letzte 7 Tage' },
  { value: 'letzte_30_tage', label: 'Letzte 30 Tage' },
  { value: 'quartal', label: 'Aktuelles Quartal' },
  { value: 'jahr', label: 'Laufendes Jahr' },
  { value: 'gesamt', label: 'Gesamtzeitraum' },
];

export const PIPELINE_OPTIONS = [
  { value: '', label: 'Alle Pipelines' },
  { value: 'vertrieb_q4', label: 'Vertrieb Q4' },
  { value: 'enterprise', label: 'Enterprise Deals' },
  { value: 'inbound', label: 'Inbound Leads' },
];

export function EditorTopBarV2({
  config,
  isDirty,
  activeBreakpoint,
  onBreakpointChange,
  onTitleChange,
  onGlobalFilterChange,
  isLivePaused,
  onToggleLivePause,
  onResume,
  isPreviewMode,
  onTogglePreviewMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  isSaving,
  onCancel,
  isLibraryOpen = true,
  onToggleLibrary,
  isInspectorOpen = true,
  onToggleInspector,
  readOnly = false,
  className,
  dashboards,
  currentStoredDashboard,
  onOpenDashboard,
  onCreateFromTemplate,
  onDuplicateCurrent,
  onDeleteDashboard,
  onShareWithTeam,
  onRefreshList,
  listError,
  onOpenVersions,
  onOpenImport,
}: EditorTopBarV2Props) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(config.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleInput(config.title);
  }, [config.title]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleTitleSubmit = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== config.title) {
      onTitleChange(trimmed.slice(0, 80));
    } else {
      setTitleInput(config.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitleInput(config.title);
      setIsEditingTitle(false);
    }
  };

  const storedDashboard = currentStoredDashboard ?? {
    id: config.id,
    title: config.title,
    scope: (config.scope as 'personal' | 'team') ?? 'personal',
    revision: 1,
    config,
    updatedAt: new Date().toISOString(),
  };

  return (
    <header
      data-testid="editor-top-bar"
      className={cn(
        'flex min-h-[56px] w-full flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] px-4 py-2 text-[var(--color-text-soft,#e6f3f1)] select-none',
        className,
      )}
    >
      {/* Linker Bereich: Navigation / Panels Toggle, Scope & Switcher & Titel */}
      <div className="flex items-center gap-3">
        {!readOnly && onToggleLibrary && (
          <button
            type="button"
            data-testid="toggle-library-button"
            onClick={onToggleLibrary}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded border transition-colors',
              isLibraryOpen
                ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-[var(--color-border,#1b3d39)] bg-black/20 text-[var(--color-text-muted)] hover:text-white',
            )}
            title={isLibraryOpen ? 'Bibliothek einklappen' : 'Bibliothek einblenden'}
            aria-label="Bibliothek umschalten"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        {/* Dashboard-Auswahl (Switcher) oder Fallback-Scope-Badge */}
        {dashboards &&
        onOpenDashboard &&
        onCreateFromTemplate &&
        onDuplicateCurrent &&
        onDeleteDashboard ? (
          <DashboardSwitcherV2
            currentDashboard={storedDashboard}
            dashboards={dashboards}
            isDirty={isDirty}
            isPreviewMode={isPreviewMode}
            isSaving={isSaving}
            onOpenDashboard={onOpenDashboard}
            onCreateFromTemplate={onCreateFromTemplate}
            onDuplicateCurrent={onDuplicateCurrent}
            onDeleteDashboard={onDeleteDashboard}
            onShareWithTeam={onShareWithTeam}
            onRefreshList={onRefreshList}
            listError={listError}
            onOpenImport={onOpenImport}
            onSaveCurrent={async () => {
              const res = await onSave();
              return res !== false;
            }}
          />
        ) : (
          <Badge
            data-testid="scope-badge"
            variant="neutral"
            className={cn(
              'text-[11px] font-medium tracking-wide uppercase',
              config.scope === 'personal'
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                : 'border-purple-500/40 bg-purple-500/10 text-purple-300',
            )}
          >
            {config.scope === 'personal' ? 'Persönlich' : `Team: ${config.teamId ?? 'Gruppe'}`}
          </Badge>
        )}

        {/* Dashboard-Titel mit Inline-Editing & Dirty-Indikator */}
        <div className="flex items-center gap-2">
          {isEditingTitle && !readOnly ? (
            <input
              ref={titleInputRef}
              data-testid="title-input"
              type="text"
              value={titleInput}
              maxLength={80}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={handleTitleKeyDown}
              className="h-8 rounded border border-primary bg-black/40 px-2 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-primary"
            />
          ) : readOnly ? (
            <div
              data-testid="title-display"
              className="px-2 py-1 text-sm font-semibold text-[var(--color-text-primary,#fff)]"
            >
              <span>{config.title}</span>
            </div>
          ) : (
            <button
              type="button"
              data-testid="title-button"
              onClick={() => setIsEditingTitle(true)}
              className="group flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold text-[var(--color-text-primary,#fff)] hover:bg-white/5 transition-colors"
              title="Klicken zum Umbenennen des Dashboards"
            >
              <span>{config.title}</span>
              {isDirty && (
                <span
                  data-testid="dirty-indicator"
                  className="flex items-center gap-1 text-amber-400 font-bold"
                  title="Ungespeicherte Änderungen"
                >
                  *
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mittlerer Bereich: Globale Filter & Breakpoints */}
      <div className="flex flex-wrap items-center gap-2">
        <BreakpointSelector
          activeBreakpoint={activeBreakpoint}
          onBreakpointChange={onBreakpointChange}
        />

        {/* Globaler Zeitraum-Filter */}
        <select
          data-testid="global-timeframe-select"
          value={config.globalTimeframe}
          onChange={(e) => onGlobalFilterChange({ timeframe: e.target.value })}
          className="h-8 rounded border border-[var(--color-border,#1b3d39)] bg-black/30 px-2 text-xs text-[var(--color-text-soft,#e6f3f1)] outline-none focus:border-primary"
          title="Globaler Standard-Zeitraum für alle Kacheln"
        >
          {TIMEFRAME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--color-bg-deep,#051413)]">
              {opt.label}
            </option>
          ))}
        </select>

        {/* Globaler Pipeline-Filter */}
        <select
          data-testid="global-pipeline-select"
          value={config.globalPipeline ?? ''}
          onChange={(e) => onGlobalFilterChange({ pipeline: e.target.value || undefined })}
          className="h-8 rounded border border-[var(--color-border,#1b3d39)] bg-black/30 px-2 text-xs text-[var(--color-text-soft,#e6f3f1)] outline-none focus:border-primary"
          title="Globale Pipeline für CRM-Kennzahlen"
        >
          {PIPELINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--color-bg-deep,#051413)]">
              {opt.label}
            </option>
          ))}
        </select>

        {/* Live / Pause & Zeitpunkt Menü */}
        <TimeControlMenuV2
          isLivePaused={isLivePaused}
          onToggleLivePause={onToggleLivePause}
          onResume={onResume}
        />
      </div>

      {/* Auftrag 171: Kiosk-Einstieg (auch Leseansicht), nur mit gespeichertem Dashboard */}
      {currentStoredDashboard && dashboards && (
        <KioskLaunchButton
          currentDashboardId={currentStoredDashboard.id}
          dashboards={dashboards}
          disabledReason={
            isDirty ? 'Erst speichern – der Kiosk zeigt den gespeicherten Stand' : null
          }
        />
      )}

      {/* Rechter Bereich: Aktionen (Undo/Redo, Versionen, Vorschau, Inspector, Abbrechen, Speichern) */}
      <EditorTopBarActionsV2
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        isPreviewMode={isPreviewMode}
        onTogglePreviewMode={onTogglePreviewMode}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={onToggleInspector}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={onSave}
        onCancel={onCancel}
        readOnly={readOnly}
        onOpenVersions={
          onOpenVersions ? () => onOpenVersions({ isDirty, draftConfig: config }) : undefined
        }
      />
    </header>
  );
}
