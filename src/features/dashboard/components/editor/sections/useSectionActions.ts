// Executive Dashboard V2 (Auftrag 157 / P09a):
// Hook für Sektionsaktionen: aktiver Bereich, flüchtiger Einklappzustand im Vorschau-Modus,
// Befehlsausführung, Löschdialog, Fokus-Management und WAI-ARIA Live-Ansagen.

import { useCallback, useState } from 'react';
import type { DashboardConfigV2, DashboardSectionV2 } from '../../../model/dashboardConfigV2';
import { getUniqueSectionTitle } from '../../../model/dashboardSections';
import {
  AddSectionCommand,
  MoveSectionCommand,
  MoveTileToSectionCommand,
  RemoveSectionCommand,
  RenameSectionCommand,
  SetSectionCollapsedCommand,
} from '../../../core/sectionCommands';
import type { EditorCommand } from '../../../core/commandTypes';

export interface UseSectionActionsParams {
  config: DashboardConfigV2;
  dispatch: (command: EditorCommand) => void;
  isPreviewMode?: boolean;
  selectedTileId: string | null;
  setSelectedTileId?: (tileId: string | null) => void;
}

export interface UseSectionActionsReturn {
  activeAreaId: string | null;
  setActiveAreaId: (areaId: string | null) => void;
  previewCollapsedMap: Record<string, boolean>;
  sectionToRemove: DashboardSectionV2 | null;
  announcement: string;
  isSectionCollapsed: (sectionId: string) => boolean;
  handleToggleCollapse: (sectionId: string) => void;
  handleAddSection: (title?: string) => void;
  handleRenameSection: (sectionId: string, newTitle: string) => void;
  handleMoveSection: (sectionId: string, direction: 'up' | 'down') => void;
  handleRequestRemoveSection: (sectionId: string) => void;
  handleConfirmRemoveSection: () => void;
  handleCancelRemoveSection: () => void;
  handleMoveTileToSection: (tileId: string, targetSectionId: string | null) => void;
  getTargetSectionForNewTile: () => string | null;
}

export function useSectionActions({
  config,
  dispatch,
  isPreviewMode = false,
  selectedTileId,
}: UseSectionActionsParams): UseSectionActionsReturn {
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const [previewCollapsedMap, setPreviewCollapsedMap] = useState<Record<string, boolean>>({});
  const [sectionToRemove, setSectionToRemove] = useState<DashboardSectionV2 | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  const isSectionCollapsed = useCallback(
    (sectionId: string): boolean => {
      const sec = config.sections?.find((s) => s.id === sectionId);
      if (!sec) return false;
      if (isPreviewMode) {
        return previewCollapsedMap[sectionId] ?? sec.collapsed;
      }
      return sec.collapsed;
    },
    [config.sections, isPreviewMode, previewCollapsedMap],
  );

  const handleToggleCollapse = useCallback(
    (sectionId: string) => {
      const sec = config.sections?.find((s) => s.id === sectionId);
      if (!sec) return;
      const currentlyCollapsed = isSectionCollapsed(sectionId);
      const nextCollapsed = !currentlyCollapsed;

      if (isPreviewMode) {
        setPreviewCollapsedMap((prev) => ({ ...prev, [sectionId]: nextCollapsed }));
      } else {
        dispatch(new SetSectionCollapsedCommand(sectionId, nextCollapsed));
      }

      const count = sec.tileIds.length;
      const countLabel = count === 1 ? '1 Kachel' : `${count} Kacheln`;
      setAnnouncement(
        nextCollapsed
          ? `Sektion '${sec.title}' eingeklappt, ${countLabel} ausgeblendet`
          : `Sektion '${sec.title}' ausgeklappt`,
      );
    },
    [config.sections, dispatch, isPreviewMode, isSectionCollapsed],
  );

  const handleAddSection = useCallback(
    (customTitle?: string) => {
      const currentSections = config.sections ?? [];
      if (currentSections.length >= 12) {
        setAnnouncement('Maximal 12 Sektionen erlaubt');
        return;
      }
      const title = customTitle ?? getUniqueSectionTitle(currentSections);
      const newSection: DashboardSectionV2 = {
        id: `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        collapsed: false,
        tileIds: [],
      };
      dispatch(new AddSectionCommand(newSection));
      setActiveAreaId(newSection.id);
      setAnnouncement(`Sektion '${title}' hinzugefügt`);
    },
    [config.sections, dispatch],
  );

  const handleRenameSection = useCallback(
    (sectionId: string, newTitle: string) => {
      const sec = config.sections?.find((s) => s.id === sectionId);
      if (!sec || sec.title === newTitle) return;
      dispatch(new RenameSectionCommand(sectionId, sec.title, newTitle));
      setAnnouncement(`Sektion '${sec.title}' in '${newTitle}' umbenannt`);
    },
    [config.sections, dispatch],
  );

  const handleMoveSection = useCallback(
    (sectionId: string, direction: 'up' | 'down') => {
      const sections = config.sections ?? [];
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sections.length) return;
      dispatch(new MoveSectionCommand(sectionId, idx, targetIdx));
      setAnnouncement(
        `Sektion '${sections[idx]?.title}' nach ${direction === 'up' ? 'oben' : 'unten'} verschoben`,
      );
    },
    [config.sections, dispatch],
  );

  const handleRequestRemoveSection = useCallback(
    (sectionId: string) => {
      const sec = config.sections?.find((s) => s.id === sectionId);
      if (!sec) return;
      if (sec.tileIds.length > 0) {
        setSectionToRemove(sec);
      } else {
        dispatch(new RemoveSectionCommand(sec.id));
        if (activeAreaId === sec.id) {
          setActiveAreaId(null);
        }
        setAnnouncement(`Sektion '${sec.title}' entfernt`);
      }
    },
    [activeAreaId, config.sections, dispatch],
  );

  const handleConfirmRemoveSection = useCallback(() => {
    if (!sectionToRemove) return;
    dispatch(new RemoveSectionCommand(sectionToRemove.id));
    if (activeAreaId === sectionToRemove.id) {
      setActiveAreaId(null);
    }
    const count = sectionToRemove.tileIds.length;
    setAnnouncement(
      `Sektion '${sectionToRemove.title}' entfernt. ${count === 1 ? '1 Kachel bleibt' : `${count} Kacheln bleiben`} erhalten und wandern nach 'Ohne Sektion'.`,
    );
    setSectionToRemove(null);
  }, [activeAreaId, dispatch, sectionToRemove]);

  const handleCancelRemoveSection = useCallback(() => {
    setSectionToRemove(null);
  }, []);

  const handleMoveTileToSection = useCallback(
    (tileId: string, targetSectionId: string | null) => {
      const tile = config.tiles.find((t) => t.id === tileId);
      const tileTitle = tile?.title || tileId;
      const targetSec = config.sections?.find((s) => s.id === targetSectionId);
      const targetName = targetSec ? targetSec.title : 'Ohne Sektion';

      dispatch(new MoveTileToSectionCommand(tileId, targetSectionId));
      setAnnouncement(`Kachel '${tileTitle}' nach '${targetName}' verschoben`);
    },
    [config.sections, config.tiles, dispatch],
  );

  // Zielbereich für neue Kacheln ermitteln (Auftrag 157 §2.4 Nr. 18):
  // 1. Wenn activeAreaId gesetzt ist -> dieser Bereich
  // 2. Sonst Bereich der ausgewählten Kachel
  // 3. Sonst 'Ohne Sektion' (null)
  const getTargetSectionForNewTile = useCallback((): string | null => {
    if (activeAreaId !== null) {
      // Prüfen ob die Sektion noch existiert
      if (config.sections?.some((s) => s.id === activeAreaId)) {
        return activeAreaId;
      }
    }
    if (selectedTileId && config.sections) {
      const sec = config.sections.find((s) => s.tileIds.includes(selectedTileId));
      if (sec) return sec.id;
    }
    return null;
  }, [activeAreaId, config.sections, selectedTileId]);

  return {
    activeAreaId,
    setActiveAreaId,
    previewCollapsedMap,
    sectionToRemove,
    announcement,
    isSectionCollapsed,
    handleToggleCollapse,
    handleAddSection,
    handleRenameSection,
    handleMoveSection,
    handleRequestRemoveSection,
    handleConfirmRemoveSection,
    handleCancelRemoveSection,
    handleMoveTileToSection,
    getTargetSectionForNewTile,
  };
}
