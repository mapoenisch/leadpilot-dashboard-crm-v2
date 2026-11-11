// Executive Dashboard V2 (Auftrag 149 / P06):
// WAI-ARIA `grid`-Tastatursteuerung, Kachel-Verschiebung & Skalierung
// per Alt+Pfeiltasten und Screenreader-Ansagen.

import { useCallback, useEffect, useState } from 'react';
import type {
  BreakpointKey,
  DashboardTileConfigV2,
  GridPosition,
} from '../../../model/dashboardConfigV2';
import type { TileMovement } from '../../../core/layoutCommands';
import { planLayoutChange } from '../editorPlacement';
import {
  clamp,
  getBreakpointLayout,
  GRID_CONFIGS,
  MAX_TILE_HEIGHT,
  MIN_TILE_HEIGHT,
  MIN_TILE_WIDTH,
} from './gridEngine';

export interface UseGridKeyboardOptions {
  tiles: readonly DashboardTileConfigV2[];
  breakpoint: BreakpointKey;
  selectedTileId: string | null;
  onSelectTile: (tileId: string) => void;
  onDeselect: () => void;
  onCommitLayout: (moves: TileMovement[]) => void;
  disabled?: boolean;
}

export function useGridKeyboard({
  tiles,
  breakpoint,
  selectedTileId,
  onSelectTile,
  onDeselect,
  onCommitLayout,
  disabled = false,
}: UseGridKeyboardOptions) {
  const [announcement, setAnnouncement] = useState<string>('');

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Keine Tastatursteuerung wenn ein Eingabefeld aktiv ist
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Escape hebt Auswahl auf
      if (e.key === 'Escape') {
        if (selectedTileId) {
          e.preventDefault();
          onDeselect();
          announce('Kachelauswahl aufgehoben');
        }
        return;
      }

      if (!selectedTileId) return;
      const tile = tiles.find((t) => t.id === selectedTileId);
      if (!tile) return;

      // Abgeleitetes, überlappungsfreies Layout (Auftrag 151 / P06b)
      const layout = getBreakpointLayout(tiles, breakpoint);
      const currentPos = layout.get(tile.id)!;
      const cols = GRID_CONFIGS[breakpoint].cols;

      // 1. Skalieren per Tastatur: Alt + Shift + Pfeiltasten
      if (e.altKey && e.shiftKey) {
        let deltaW = 0;
        let deltaH = 0;

        if (e.key === 'ArrowRight') deltaW = 1;
        else if (e.key === 'ArrowLeft') deltaW = -1;
        else if (e.key === 'ArrowDown') deltaH = 1;
        else if (e.key === 'ArrowUp') deltaH = -1;
        else return;

        e.preventDefault();

        const targetW = clamp(
          currentPos.w + deltaW,
          breakpoint === 'mobile' ? 1 : MIN_TILE_WIDTH,
          cols - currentPos.x,
        );
        const targetH = clamp(currentPos.h + deltaH, MIN_TILE_HEIGHT, MAX_TILE_HEIGHT);

        if (targetW === currentPos.w && targetH === currentPos.h) return;

        const targetPos: GridPosition = {
          x: currentPos.x,
          y: currentPos.y,
          w: targetW,
          h: targetH,
        };

        const { moves } = planLayoutChange(tiles, breakpoint, selectedTileId, targetPos);

        if (moves.length > 0) {
          onCommitLayout(moves);
          announce(`Kachel '${tile.title}' skaliert auf ${targetW} Spalten und ${targetH} Zeilen`);
        }
        return;
      }

      // 2. Verschieben per Tastatur: Alt + Pfeiltasten
      if (e.altKey) {
        let deltaX = 0;
        let deltaY = 0;

        if (e.key === 'ArrowRight') deltaX = 1;
        else if (e.key === 'ArrowLeft') deltaX = -1;
        else if (e.key === 'ArrowDown') deltaY = 1;
        else if (e.key === 'ArrowUp') deltaY = -1;
        else return;

        e.preventDefault();

        const targetX = clamp(currentPos.x + deltaX, 0, cols - currentPos.w);
        const targetY = Math.max(0, currentPos.y + deltaY);

        if (targetX === currentPos.x && targetY === currentPos.y) return;

        const targetPos: GridPosition = {
          x: targetX,
          y: targetY,
          w: currentPos.w,
          h: currentPos.h,
        };

        const { moves } = planLayoutChange(tiles, breakpoint, selectedTileId, targetPos);

        if (moves.length > 0) {
          onCommitLayout(moves);
          announce(
            `Kachel '${tile.title}' verschoben auf Spalte ${targetX + 1}, Zeile ${targetY + 1}`,
          );
        }
        return;
      }

      // 3. Navigation zwischen Kacheln per Pfeiltasten (ohne Modifikatoren)
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const otherTiles = tiles.filter((t) => t.id !== selectedTileId);
        if (otherTiles.length === 0) return;

        let bestCandidate: DashboardTileConfigV2 | null = null;
        let minDistance = Infinity;

        for (const candidate of otherTiles) {
          const candPos = layout.get(candidate.id)!;
          let isValidDirection = false;

          if (e.key === 'ArrowRight' && candPos.x >= currentPos.x + currentPos.w)
            isValidDirection = true;
          else if (e.key === 'ArrowLeft' && candPos.x + candPos.w <= currentPos.x)
            isValidDirection = true;
          else if (e.key === 'ArrowDown' && candPos.y >= currentPos.y + currentPos.h)
            isValidDirection = true;
          else if (e.key === 'ArrowUp' && candPos.y + candPos.h <= currentPos.y)
            isValidDirection = true;

          if (isValidDirection) {
            const dist = Math.hypot(candPos.x - currentPos.x, candPos.y - currentPos.y);
            if (dist < minDistance) {
              minDistance = dist;
              bestCandidate = candidate;
            }
          }
        }

        if (bestCandidate) {
          onSelectTile(bestCandidate.id);
          announce(`Kachel '${bestCandidate.title}' fokussiert`);
        }
      }
    },
    [
      disabled,
      selectedTileId,
      tiles,
      breakpoint,
      onDeselect,
      announce,
      onCommitLayout,
      onSelectTile,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    announcement,
  };
}
