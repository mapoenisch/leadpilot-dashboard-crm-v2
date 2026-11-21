// Executive Dashboard V2 (Auftrag 157 / P09a, ausgelagert in Auftrag 172):
// Schaltfläche „In Sektion verschieben…“ mit Bereichsmenü. Genutzt in der Schnellaktions-Leiste
// (Raster) und in der Aktionsleiste des Listenmodus (Smartphone-Ansicht, `large`).

import { useState } from 'react';
import { FolderInput } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TileSectionMenuProps {
  tileId: string;
  availableSections: Array<{ id: string; title: string }>;
  currentSectionId?: string | null;
  onMoveTileToSection: (tileId: string, targetSectionId: string | null) => void;
  /** Listenmodus: 44-px-Schaltfläche mit Text */
  large?: boolean;
}

export function TileSectionMenu({
  tileId,
  availableSections,
  currentSectionId,
  onMoveTileToSection,
  large = false,
}: TileSectionMenuProps) {
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        data-testid={`tile-move-section-btn-${tileId}`}
        aria-label="In Sektion verschieben"
        aria-expanded={showSectionMenu}
        onClick={(e) => {
          e.stopPropagation();
          setShowSectionMenu((prev) => !prev);
        }}
        className={cn(
          'flex items-center justify-center rounded transition-colors',
          large
            ? 'h-11 min-w-11 gap-1 border border-[var(--color-border,#1b3d39)] px-2 text-xs font-medium'
            : 'h-6 w-6',
          showSectionMenu
            ? 'bg-primary/20 text-primary'
            : 'text-[var(--color-text-muted)] hover:bg-white/10 hover:text-white',
        )}
        title="In Sektion verschieben…"
      >
        <FolderInput className={large ? 'h-4 w-4' : 'h-3 w-3'} aria-hidden="true" />
        {large && <span>Sektion</span>}
      </button>

      {showSectionMenu && (
        <div
          data-testid={`tile-move-section-menu-${tileId}`}
          className={cn(
            'absolute z-50 min-w-[140px] space-y-0.5 rounded-md border border-[var(--color-border,#1b3d39)] bg-[var(--color-bg-deep,#051413)] p-1 text-xs shadow-xl',
            large ? 'top-12 left-0' : 'top-7 right-0',
          )}
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Bereich wählen
          </div>
          <button
            type="button"
            data-testid={`tile-move-section-option-unsectioned-${tileId}`}
            onClick={() => {
              onMoveTileToSection(tileId, null);
              setShowSectionMenu(false);
            }}
            className={cn(
              'flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors',
              currentSectionId === null || currentSectionId === undefined
                ? 'bg-primary/20 text-primary font-medium'
                : 'text-[var(--color-text-soft)] hover:bg-white/10 hover:text-white',
            )}
          >
            <span>Ohne Sektion</span>
            {(currentSectionId === null || currentSectionId === undefined) && (
              <span className="text-[10px] text-primary">✓</span>
            )}
          </button>
          {availableSections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              data-testid={`tile-move-section-option-${sec.id}-${tileId}`}
              onClick={() => {
                onMoveTileToSection(tileId, sec.id);
                setShowSectionMenu(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors',
                currentSectionId === sec.id
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-[var(--color-text-soft)] hover:bg-white/10 hover:text-white',
              )}
            >
              <span className="truncate">{sec.title}</span>
              {currentSectionId === sec.id && <span className="text-[10px] text-primary">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
