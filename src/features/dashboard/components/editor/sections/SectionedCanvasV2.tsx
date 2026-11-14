// Executive Dashboard V2 (Auftrag 157 / P09a):
// Sektionierter 12-Spalten-Canvas (Zone Mitte).
// Rendert Bereich 'Ohne Sektion' und Sektionen in Reihenfolge.
// Eingeklappte Sektionen rendern keine Kacheln und rufen useData nicht auf.

import { useRef, type DragEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type {
  BreakpointKey,
  DashboardConfigV2,
  DashboardSectionV2,
  GridPosition,
} from '../../../model/dashboardConfigV2';
import type { TileMovement } from '../../../core/layoutCommands';
import type { TileDataHook } from '../../LazyDashboardTile';
import { calculateGridCoordsFromPixel, GRID_CONFIGS } from '../grid/gridEngine';
import { isAddableCatalogId } from '../editorPlacement';
import { groupTilesBySection } from '../../../model/dashboardSections';
import { SectionHeaderV2 } from './SectionHeaderV2';
import { SectionAreaGridV2 } from './SectionAreaGridV2';
import { RemoveSectionDialog } from './RemoveSectionDialog';

export interface SectionedCanvasV2Props {
  config: DashboardConfigV2;
  activeBreakpoint: BreakpointKey;
  selectedTileId: string | null;
  onSelectTile: (tileId: string) => void;
  onDeselect: () => void;
  onRemoveTile: (tileId: string) => void;
  onDuplicateTile: (tileId: string) => void;
  onCommitLayout?: (moves: TileMovement[]) => void;
  onAddTileAtPosition?: (
    catalogId: string,
    position: GridPosition,
    targetSectionId?: string | null,
  ) => void;
  onMoveMobile?: (tileId: string, direction: 'up' | 'down') => void;
  onShowDetails?: (tileId: string) => void;
  onAddTileClick?: () => void;
  isPreviewMode?: boolean;
  useData: TileDataHook;
  className?: string;

  // Sektions-Verwaltung
  activeAreaId?: string | null;
  onSelectActiveArea?: (areaId: string | null) => void;
  isSectionCollapsed?: (sectionId: string) => boolean;
  onToggleCollapseSection?: (sectionId: string) => void;
  onAddSection?: (title?: string) => void;
  onRenameSection?: (sectionId: string, newTitle: string) => void;
  onMoveSection?: (sectionId: string, direction: 'up' | 'down') => void;
  onRemoveSection?: (sectionId: string) => void;
  onMoveTileToSection?: (tileId: string, targetSectionId: string | null) => void;
  sectionToRemove?: DashboardSectionV2 | null;
  onConfirmRemoveSection?: () => void;
  onCancelRemoveSection?: () => void;
  announcement?: string;
}

export function SectionedCanvasV2({
  config,
  activeBreakpoint,
  selectedTileId,
  onSelectTile,
  onDeselect,
  onRemoveTile,
  onDuplicateTile,
  onCommitLayout = () => {},
  onAddTileAtPosition,
  onMoveMobile,
  onShowDetails = () => {},
  onAddTileClick,
  isPreviewMode = false,
  useData,
  className,
  activeAreaId = null,
  onSelectActiveArea,
  isSectionCollapsed = (id) => config.sections?.find((s) => s.id === id)?.collapsed ?? false,
  onToggleCollapseSection,
  onAddSection,
  onRenameSection,
  onMoveSection,
  onRemoveSection,
  onMoveTileToSection,
  sectionToRemove = null,
  onConfirmRemoveSection = () => {},
  onCancelRemoveSection = () => {},
  announcement,
}: SectionedCanvasV2Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { cols } = GRID_CONFIGS[activeBreakpoint];
  const isMobile = activeBreakpoint === 'mobile';

  const sections = config.sections ?? [];
  const hasSections = sections.length > 0;
  const { unsectionedTiles, sectionedTiles } = groupTilesBySection(config.tiles, config.sections);
  const bySection = new Map(sectionedTiles.map((st) => [st.section.id, st.tiles]));

  const availableSections = sections.map((s) => ({ id: s.id, title: s.title }));

  // HTML5 Drop von Widget-Bibliothek
  const handleDrop = (e: DragEvent, dropTargetSectionId?: string | null) => {
    e.preventDefault();
    if (isPreviewMode) return;
    const catalogId = (
      e.dataTransfer.getData('text/leadpilot-kpi') || e.dataTransfer.getData('text/plain')
    ).trim();
    if (!isAddableCatalogId(catalogId) || !onAddTileAtPosition || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const coords = calculateGridCoordsFromPixel(
      e.clientX,
      e.clientY,
      containerRect,
      containerRef.current.scrollLeft,
      containerRef.current.scrollTop,
      activeBreakpoint,
    );

    const targetSection = dropTargetSectionId !== undefined ? dropTargetSectionId : activeAreaId;

    onAddTileAtPosition(
      catalogId,
      {
        x: coords.x,
        y: coords.y,
        w: isMobile ? 1 : Math.min(6, cols),
        h: 4,
      },
      targetSection,
    );
  };

  return (
    <main
      ref={containerRef}
      data-testid="editor-canvas"
      data-breakpoint={activeBreakpoint}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e)}
      className={cn(
        'relative flex-1 overflow-y-auto p-4 transition-colors space-y-6',
        !isPreviewMode &&
          'bg-[radial-gradient(#1b3d39_1px,transparent_1px)] [background-size:16px_16px]',
        className,
      )}
    >
      {/* Screenreader Live-Region */}
      <div
        role="status"
        aria-live="polite"
        data-testid="grid-a11y-announcement"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Leerzustand wenn keine Kacheln und keine Sektionen vorhanden sind */}
      {config.tiles.length === 0 && !hasSections ? (
        <div
          data-testid="canvas-empty-state"
          className="flex min-h-[380px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border,#1b3d39)] p-8 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <Plus className="h-6 w-6" />
          </div>
          <h3 className="m-0 text-base font-semibold text-white">Dein Dashboard ist noch leer</h3>
          <p className="m-0 mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">
            Ziehe Kennzahlen per Drag & Drop aus der linken Widget-Bibliothek auf das Raster oder
            klicke auf Hinzufügen.
          </p>
          {onAddTileClick && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              data-testid="empty-state-add-btn"
              onClick={onAddTileClick}
              className="mt-4 gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Kachel aus Bibliothek hinzufügen</span>
            </Button>
          )}
        </div>
      ) : !hasSections ? (
        /* Standard-Dashboard ohne Sektionen: identisches DOM zu bisher */
        <SectionAreaGridV2
          areaId={null}
          tiles={config.tiles}
          activeBreakpoint={activeBreakpoint}
          selectedTileId={selectedTileId}
          onSelectTile={onSelectTile}
          onDeselect={onDeselect}
          onRemoveTile={onRemoveTile}
          onDuplicateTile={onDuplicateTile}
          onCommitLayout={onCommitLayout}
          onMoveMobile={onMoveMobile}
          onShowDetails={onShowDetails}
          onMoveTileToSection={onMoveTileToSection}
          availableSections={availableSections}
          currentSectionId={null}
          isPreviewMode={isPreviewMode}
          useData={useData}
          globalTimeframe={config.globalTimeframe}
          globalPipeline={config.globalPipeline}
        />
      ) : (
        /* Gliederte Ansicht mit Sektionen */
        <div className="space-y-6">
          {/* Bereich 'Ohne Sektion' (nur wenn Kacheln vorhanden sind) */}
          {unsectionedTiles.length > 0 && (
            <div
              data-testid="unsectioned-area"
              data-active-area={activeAreaId === null}
              role="region"
              aria-label="Bereich Ohne Sektion"
              onPointerDown={() => onSelectActiveArea?.(null)}
              onDrop={(e) => {
                e.stopPropagation();
                handleDrop(e, null);
              }}
              className={cn(
                'rounded-lg transition-colors',
                activeAreaId === null &&
                  !isPreviewMode &&
                  'ring-1 ring-primary/40 bg-primary/5 p-2',
              )}
            >
              <SectionAreaGridV2
                areaId={null}
                areaTitle="Ohne Sektion"
                tiles={unsectionedTiles}
                activeBreakpoint={activeBreakpoint}
                selectedTileId={selectedTileId}
                onSelectTile={onSelectTile}
                onDeselect={onDeselect}
                onRemoveTile={onRemoveTile}
                onDuplicateTile={onDuplicateTile}
                onCommitLayout={onCommitLayout}
                onMoveMobile={onMoveMobile}
                onShowDetails={onShowDetails}
                onMoveTileToSection={onMoveTileToSection}
                availableSections={availableSections}
                currentSectionId={null}
                isPreviewMode={isPreviewMode}
                useData={useData}
                globalTimeframe={config.globalTimeframe}
                globalPipeline={config.globalPipeline}
              />
            </div>
          )}

          {/* Sektionen in fester Reihenfolge */}
          {sections.map((section, index) => {
            const secTiles = bySection.get(section.id) ?? [];
            const collapsed = isSectionCollapsed(section.id);
            const isActive = activeAreaId === section.id;

            return (
              <section
                key={section.id}
                aria-label={`Sektion ${section.title}`}
                data-testid={`dashboard-section-${section.id}`}
                data-section-id={section.id}
                onDrop={(e) => {
                  e.stopPropagation();
                  handleDrop(e, section.id);
                }}
                className="space-y-3"
              >
                <SectionHeaderV2
                  section={section}
                  tileCount={secTiles.length}
                  isCollapsed={collapsed}
                  onToggleCollapse={() => onToggleCollapseSection?.(section.id)}
                  onRenameSection={(newTitle) => onRenameSection?.(section.id, newTitle)}
                  onMoveSectionUp={index > 0 ? () => onMoveSection?.(section.id, 'up') : undefined}
                  onMoveSectionDown={
                    index < sections.length - 1
                      ? () => onMoveSection?.(section.id, 'down')
                      : undefined
                  }
                  onRemoveSection={() => onRemoveSection?.(section.id)}
                  isActiveArea={isActive}
                  onSelectActiveArea={() => onSelectActiveArea?.(section.id)}
                  isPreviewMode={isPreviewMode}
                />

                <div
                  id={`section-content-${section.id}`}
                  data-testid={`section-content-${section.id}`}
                >
                  {!collapsed ? (
                    secTiles.length === 0 ? (
                      !isPreviewMode && (
                        <button
                          type="button"
                          data-testid={`section-empty-state-${section.id}`}
                          onClick={() => onSelectActiveArea?.(section.id)}
                          className="flex min-h-[100px] w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border,#1b3d39)] p-4 text-center text-xs text-[var(--color-text-muted)] hover:border-primary/40 transition-colors"
                        >
                          Keine Kacheln in dieser Sektion. Klicke hier oder ziehe eine Kachel
                          hinein.
                        </button>
                      )
                    ) : (
                      <SectionAreaGridV2
                        areaId={section.id}
                        areaTitle={section.title}
                        tiles={secTiles}
                        activeBreakpoint={activeBreakpoint}
                        selectedTileId={selectedTileId}
                        onSelectTile={onSelectTile}
                        onDeselect={onDeselect}
                        onRemoveTile={onRemoveTile}
                        onDuplicateTile={onDuplicateTile}
                        onCommitLayout={onCommitLayout}
                        onMoveMobile={onMoveMobile}
                        onShowDetails={onShowDetails}
                        onMoveTileToSection={onMoveTileToSection}
                        availableSections={availableSections}
                        currentSectionId={section.id}
                        isPreviewMode={isPreviewMode}
                        useData={useData}
                        globalTimeframe={config.globalTimeframe}
                        globalPipeline={config.globalPipeline}
                      />
                    )
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Button: 'Sektion hinzufügen' am Ende des Canvas */}
      {!isPreviewMode && onAddSection && (
        <div className="pt-2 pb-6 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-testid="add-section-bottom-btn"
            disabled={sections.length >= 12}
            onClick={() => onAddSection()}
            title={sections.length >= 12 ? 'Maximal 12 Sektionen erlaubt' : undefined}
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>
              {sections.length >= 12 ? 'Maximal 12 Sektionen erreicht' : 'Sektion hinzufügen'}
            </span>
          </Button>
        </div>
      )}

      {/* Bestätigungsdialog beim Löschen einer belegten Sektion */}
      <RemoveSectionDialog
        open={Boolean(sectionToRemove)}
        section={sectionToRemove}
        onConfirm={onConfirmRemoveSection}
        onCancel={onCancelRemoveSection}
      />
    </main>
  );
}
