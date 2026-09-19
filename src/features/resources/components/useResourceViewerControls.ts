import React, { useState, useEffect, useCallback } from 'react';
import { ResourceMetadata } from '../../../types/resource';

export type ResourceViewportMode = 'desktop' | 'tablet' | 'mobile';

// 067K / G57 — aus ResourceViewer.tsx herausgelöster Steuerungszustand
// (reine Code-Bewegung, keine Verhaltensänderung).
export function useResourceViewerControls(resource: ResourceMetadata, onClose: () => void) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [viewportMode, setViewportMode] = useState<ResourceViewportMode>('desktop');
  const [showMetadata, setShowMetadata] = useState<boolean>(false);

  const totalPages = resource.pageCount || 1;

  const handlePrev = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 10) / 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.6, Math.round((z - 0.2) * 10) / 10));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrev, handleNext, handleZoomIn, handleZoomOut]);

  const currentAssetPath = resource.assetPaths[currentPage - 1] || resource.assetPaths[0];

  const navBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '13px',
  };

  return {
    currentPage,
    setCurrentPage,
    zoom,
    viewportMode,
    setViewportMode,
    showMetadata,
    setShowMetadata,
    totalPages,
    handlePrev,
    handleNext,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    currentAssetPath,
    navBtnStyle,
  };
}
