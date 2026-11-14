// Executive Dashboard V2 (Auftrag 148 / P05):
// Rechter Inspector des V2-Dashboard-Editors.
// Zeigt bei Deselektion die Dashboard-Übersicht und bei Kachelauswahl
// 4 strukturierte Tabs: Daten & Filter, Darstellung, Schwellenwerte, Interaktion.

import { useState } from 'react';
import { ChevronRight, Database, Sliders, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  getCatalogEntry,
  VIEWS_BY_SHAPE,
  type ActiveCatalogEntry,
  type DashboardView,
} from '../../model/dashboardCatalog';
import type {
  DashboardConfigV2,
  DashboardTileConfigV2,
  TileThresholdRule,
} from '../../model/dashboardConfigV2';
import { getSectionForTile } from '../../model/dashboardSections';
import {
  InspectorDataTab,
  InspectorInteractionTab,
  InspectorPresentationTab,
  InspectorThresholdTab,
} from './inspector/InspectorTabs';

export interface EditorInspectorV2Props {
  selectedTile: DashboardTileConfigV2 | null;
  config: DashboardConfigV2;
  onDeselect: () => void;
  onTileTitleChange: (tileId: string, newTitle: string) => void;
  onTileViewChange: (tileId: string, view: DashboardView) => void;
  onTileOverrideChange: (tileId: string, patch: Partial<DashboardTileConfigV2>) => void;
  onTileThresholdChange: (tileId: string, rule: TileThresholdRule | undefined) => void;
  onTileDrilldownChange?: (tileId: string, url: string | undefined) => void;
  onOpenPanelEditor?: (tileId: string) => void;
  onClose?: () => void;
  className?: string;
  onMoveTileToSection?: (tileId: string, targetSectionId: string | null) => void;
  onExpandSection?: (sectionId: string) => void;
  isSectionCollapsed?: (sectionId: string) => boolean;
}

type InspectorTab = 'daten' | 'darstellung' | 'schwellenwerte' | 'interaktion';

export function EditorInspectorV2({
  selectedTile,
  config,
  onDeselect,
  onTileTitleChange,
  onTileViewChange,
  onTileOverrideChange,
  onTileThresholdChange,
  onTileDrilldownChange,
  onOpenPanelEditor,
  onClose,
  className,
  onMoveTileToSection,
  onExpandSection,
  isSectionCollapsed,
}: EditorInspectorV2Props) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('darstellung');

  const catalogEntry = selectedTile
    ? (getCatalogEntry(selectedTile.catalogId) as ActiveCatalogEntry | undefined)
    : undefined;

  const supportedViews = catalogEntry?.shape
    ? (VIEWS_BY_SHAPE[catalogEntry.shape] ?? ['zahl'])
    : (['zahl', 'tabelle', 'saeulen', 'balken', 'linie'] as DashboardView[]);

  return (
    <aside
      data-testid="editor-inspector"
      className={cn(
        'flex h-full w-[320px] shrink-0 flex-col border-l border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#041110)] select-none',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border,#1b3d39)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <h3 className="m-0 text-xs font-semibold tracking-wide text-white uppercase">
            {selectedTile ? 'Kachel-Inspector' : 'Dashboard-Info'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {selectedTile && (
            <button
              type="button"
              data-testid="inspector-deselect-btn"
              onClick={onDeselect}
              className="rounded px-1.5 py-0.5 text-[11px] text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white"
              title="Kachelauswahl aufheben (Escape)"
            >
              Auswahl aufheben
            </button>
          )}
          {onClose && (
            <button
              type="button"
              data-testid="close-inspector-button"
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white"
              title="Inspector schließen"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Inhalt: Leerzustand wenn keine Kachel ausgewählt ist */}
      {!selectedTile ? (
        <div data-testid="inspector-empty-state" className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-lg border border-[var(--color-border,#1b3d39)] bg-black/20 p-3.5 space-y-2.5">
            <h4 className="m-0 text-xs font-semibold text-white flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>Übersicht</span>
            </h4>
            <div className="space-y-1.5 text-xs text-[var(--color-text-soft,#e6f3f1)]">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Titel:</span>
                <span className="font-medium text-white">{config.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Scope:</span>
                <span className="capitalize">{config.scope}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Standard-Zeitraum:</span>
                <span>{config.globalTimeframe}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Aktive Kacheln:</span>
                <span className="font-semibold text-primary">{config.tiles.length} / 24</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/5 p-3.5 space-y-2">
            <h5 className="m-0 text-xs font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Tipps & Tastaturkürzel</span>
            </h5>
            <ul className="m-0 list-disc pl-4 text-[11px] leading-relaxed text-[var(--color-text-muted)] space-y-1">
              <li>Klicke auf eine Kachel auf dem Canvas, um ihre Parameter hier zu bearbeiten.</li>
              <li>
                Drücke <kbd className="rounded bg-black/40 px-1 py-0.5 text-white">Esc</kbd>, um die
                Auswahl aufzuheben.
              </li>
              <li>
                Wähle <kbd className="rounded bg-black/40 px-1 py-0.5 text-white">Cmd+Z</kbd> /{' '}
                <kbd className="rounded bg-black/40 px-1 py-0.5 text-white">Ctrl+Z</kbd> für Undo.
              </li>
              <li>Nutze den Vorschau-Schalter oben rechts, um das fertige Dashboard zu prüfen.</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Kachel-Inspektion mit 4 Tabs */
        <div data-testid="inspector-tile-content" className="flex flex-1 flex-col overflow-hidden">
          {/* Kachel-Info Banner */}
          <div className="border-b border-[var(--color-border,#1b3d39)] bg-black/20 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="truncate text-xs font-semibold text-white">
                {selectedTile.title}
              </span>
              <Badge variant="neutral" className="text-[9px] border-primary/30 text-primary">
                {selectedTile.catalogId}
              </Badge>
            </div>
          </div>

          {/* Sektions-Warnung bei eingeklappter Kachel (Auftrag 157 §2.4 Nr. 23) */}
          {(() => {
            const tileSection = getSectionForTile(config.sections, selectedTile.id);
            const isCollapsed = tileSection
              ? isSectionCollapsed
                ? isSectionCollapsed(tileSection.id)
                : tileSection.collapsed
              : false;

            return (
              <>
                {isCollapsed && tileSection && (
                  <div
                    data-testid="inspector-tile-collapsed-warning"
                    className="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
                  >
                    <span className="truncate">
                      Kachel liegt in eingeklappter Sektion „{tileSection.title}“
                    </span>
                    {onExpandSection && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        data-testid="inspector-expand-section-btn"
                        onClick={() => onExpandSection(tileSection.id)}
                        className="h-6 px-2 text-[11px] shrink-0 border-amber-500/40 text-amber-200 hover:bg-amber-500/20"
                      >
                        Sektion ausklappen
                      </Button>
                    )}
                  </div>
                )}

                {/* Sektion-Auswahlfeld (Auftrag 157 §2.4 Nr. 19) */}
                {config.sections && config.sections.length > 0 && (
                  <div className="border-b border-[var(--color-border,#1b3d39)] bg-black/10 px-3 py-2 flex items-center justify-between gap-2">
                    <label
                      htmlFor="inspector-section-select"
                      className="text-xs text-[var(--color-text-muted)] shrink-0"
                    >
                      Sektion:
                    </label>
                    <select
                      id="inspector-section-select"
                      data-testid="inspector-section-select"
                      value={tileSection?.id ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : e.target.value;
                        onMoveTileToSection?.(selectedTile.id, val);
                      }}
                      className="h-7 flex-1 rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary truncate cursor-pointer"
                    >
                      <option value="">Ohne Sektion</option>
                      {config.sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            );
          })()}

          {/* Tab-Leiste */}
          <div
            className="flex border-b border-[var(--color-border,#1b3d39)] bg-black/30 px-1"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'darstellung'}
              data-testid="inspector-tab-darstellung"
              onClick={() => setActiveTab('darstellung')}
              className={cn(
                'flex-1 py-2 text-center text-[11px] font-medium border-b-2 transition-colors',
                activeTab === 'darstellung'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-white',
              )}
            >
              Darstellung
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'daten'}
              data-testid="inspector-tab-daten"
              onClick={() => setActiveTab('daten')}
              className={cn(
                'flex-1 py-2 text-center text-[11px] font-medium border-b-2 transition-colors',
                activeTab === 'daten'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-white',
              )}
            >
              Daten
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'schwellenwerte'}
              data-testid="inspector-tab-schwellenwerte"
              onClick={() => setActiveTab('schwellenwerte')}
              className={cn(
                'flex-1 py-2 text-center text-[11px] font-medium border-b-2 transition-colors',
                activeTab === 'schwellenwerte'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-white',
              )}
            >
              Alarme
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'interaktion'}
              data-testid="inspector-tab-interaktion"
              onClick={() => setActiveTab('interaktion')}
              className={cn(
                'flex-1 py-2 text-center text-[11px] font-medium border-b-2 transition-colors',
                activeTab === 'interaktion'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-white',
              )}
            >
              Interaktion
            </button>
          </div>

          {/* Tab-Panels */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'darstellung' && (
              <InspectorPresentationTab
                selectedTile={selectedTile}
                supportedViews={supportedViews}
                onTileTitleChange={onTileTitleChange}
                onTileViewChange={onTileViewChange}
                onTileOverrideChange={onTileOverrideChange}
              />
            )}
            {activeTab === 'daten' && (
              <InspectorDataTab
                selectedTile={selectedTile}
                catalogEntry={catalogEntry}
                onTileOverrideChange={onTileOverrideChange}
              />
            )}
            {activeTab === 'schwellenwerte' && (
              <InspectorThresholdTab
                selectedTile={selectedTile}
                onTileThresholdChange={onTileThresholdChange}
              />
            )}
            {activeTab === 'interaktion' && (
              <InspectorInteractionTab
                selectedTile={selectedTile}
                onTileDrilldownChange={onTileDrilldownChange}
              />
            )}
          </div>

          {/* Footer Action: Panel-Editor */}
          <div className="border-t border-[var(--color-border,#1b3d39)] p-3">
            <Button
              type="button"
              variant="secondary"
              data-testid="open-panel-editor-btn"
              onClick={() => onOpenPanelEditor?.(selectedTile.id)}
              className="w-full justify-between text-xs border-primary/30 text-primary hover:bg-primary hover:text-black"
            >
              <span>Im Panel-Editor öffnen</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
