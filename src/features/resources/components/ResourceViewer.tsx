import { ResourceMetadata } from '../../../types/resource';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useResourceViewerControls } from './useResourceViewerControls';
import { ResourceViewerContent } from './ResourceViewerContent';
import { ResourceMetadataDrawer, ResourceThumbnailStrip } from './ResourceViewerPanels';

export interface ResourceViewerProps {
  resource: ResourceMetadata;
  onClose: () => void;
}

// 067K / G57 — aufgeteilte Viewer-Hülle (Architekturentscheidung: Zustand in
// useResourceViewerControls, Inhalts-Viewport in ResourceViewerContent,
// Drawer/Thumbnails in ResourceViewerPanels; reine Code-Bewegung, keine
// Verhaltensänderung).
export function ResourceViewer({ resource, onClose }: ResourceViewerProps) {
  const {
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
  } = useResourceViewerControls(resource, onClose);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(6, 22, 19, 0.96)',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(8px)',
        color: 'var(--color-text)',
      }}
    >
      {/* Top Controls Header */}
      <header
        className="resource-viewer-header"
        style={{
          height: '60px',
          background: 'var(--color-bg-deep)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Back button and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', minWidth: 0 }}>
          <Button variant="secondary" size="sm" onClick={onClose}>
            ← Zurück
          </Button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                className="resource-viewer-title-h3"
                style={{
                  margin: 0,
                  fontSize: '15px',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-display)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {resource.title}
              </h3>
              <span className="resource-viewer-badge">
                <Badge variant="cyan">{resource.historicalId}</Badge>
              </span>
            </div>
            <div
              className="resource-viewer-title-sub"
              style={{
                fontSize: '11.5px',
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {resource.originalSource}
            </div>
          </div>
        </div>

        {/* Center: Page Navigation & Zoom / Viewport controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {resource.type === 'INTERACTIVE_HTML' ? (
            /* Responsive Viewport Switcher */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '2px',
                border: '1px solid var(--color-border)',
              }}
            >
              <button
                onClick={() => setViewportMode('desktop')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: viewportMode === 'desktop' ? 'var(--color-primary)' : 'transparent',
                  color:
                    viewportMode === 'desktop' ? 'var(--color-bg-deep)' : 'var(--color-text-muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Desktop
              </button>
              <button
                onClick={() => setViewportMode('tablet')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: viewportMode === 'tablet' ? 'var(--color-primary)' : 'transparent',
                  color:
                    viewportMode === 'tablet' ? 'var(--color-bg-deep)' : 'var(--color-text-muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tablet
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: viewportMode === 'mobile' ? 'var(--color-primary)' : 'transparent',
                  color:
                    viewportMode === 'mobile' ? 'var(--color-bg-deep)' : 'var(--color-text-muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mobile
              </button>
            </div>
          ) : resource.type === 'VIDEO' ? null : (
            /* Standard Document Navigation */
            <>
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--color-surface)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <button style={navBtnStyle} onClick={handlePrev} disabled={currentPage === 1}>
                    ◀
                  </button>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      minWidth: '90px',
                      textAlign: 'center',
                    }}
                  >
                    {resource.type === 'SLIDE_DECK' ? 'Folie' : 'Seite'} {currentPage} /{' '}
                    {totalPages}
                  </span>
                  <button
                    style={navBtnStyle}
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                  >
                    ▶
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--color-surface)',
                  padding: '3px 6px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <button style={navBtnStyle} onClick={handleZoomOut} disabled={zoom <= 0.6}>
                  −
                </button>
                <button
                  type="button"
                  onClick={handleZoomReset}
                  title="Klick für 100%"
                  aria-label="Zoom auf 100 Prozent zurücksetzen"
                  style={{
                    fontSize: '12px',
                    minWidth: '45px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    color: zoom !== 1 ? 'var(--color-primary)' : 'inherit',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button style={navBtnStyle} onClick={handleZoomIn} disabled={zoom >= 2.5}>
                  +
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {resource.type === 'VIDEO' && (
            <a
              href={resource.assetPaths[0]}
              download
              className="resource-viewer-header-download"
              style={{
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-raised)',
                color: 'var(--color-primary)',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid var(--color-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Video herunterladen ↗
            </a>
          )}
          {resource.type === 'INTERACTIVE_HTML' && (
            <a
              href="/resources/landingpage/index.html"
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-raised)',
                color: 'var(--color-primary)',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid var(--color-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              In neuem Tab ↗
            </a>
          )}
          <Button variant="secondary" size="sm" onClick={() => setShowMetadata(!showMetadata)}>
            Info {showMetadata ? '▲' : '▼'}
          </Button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '18px',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Document Display Viewport */}
        <ResourceViewerContent
          resource={resource}
          currentPage={currentPage}
          currentAssetPath={currentAssetPath}
          viewportMode={viewportMode}
          zoom={zoom}
        />

        {/* Metadata Sidebar Drawer */}
        {showMetadata && <ResourceMetadataDrawer resource={resource} />}
      </div>

      {/* Bottom Thumbnail Strip (for multi-page / slide decks) */}
      <ResourceThumbnailStrip
        resource={resource}
        currentPage={currentPage}
        totalPages={totalPages}
        onSelect={setCurrentPage}
      />
    </div>
  );
}
