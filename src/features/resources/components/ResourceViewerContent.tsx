import { ResourceMetadata } from '../../../types/resource';
import { ResourceViewportMode } from './useResourceViewerControls';

export interface ResourceViewerContentProps {
  resource: ResourceMetadata;
  currentPage: number;
  currentAssetPath: string | undefined;
  viewportMode: ResourceViewportMode;
  zoom: number;
}

// 067K / G57 — aus ResourceViewer.tsx herausgelöster Inhalts-Viewport
// (reine Code-Bewegung, keine Verhaltensänderung): Interactive-, Video-
// und Dokumentenansicht.
export function ResourceViewerContent({
  resource,
  currentPage,
  currentAssetPath,
  viewportMode,
  zoom,
}: ResourceViewerContentProps) {
  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        padding: 'var(--space-4)',
        background: 'rgba(0,0,0,0.35)',
      }}
    >
      {resource.type === 'INTERACTIVE_HTML' ? (
        <div
          style={{
            width:
              viewportMode === 'desktop' ? '100%' : viewportMode === 'tablet' ? '768px' : '375px',
            height: '100%',
            maxWidth: '100%',
            background: '#fff',
            borderRadius: viewportMode === 'desktop' ? '0' : 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            transition: 'width 250ms ease',
          }}
        >
          <iframe
            src="/resources/landingpage/index.html"
            title="LeadPilot Live Landingpage"
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : resource.type === 'VIDEO' ? (
        <div
          style={{
            width: '100%',
            maxWidth: '960px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
        >
          <video
            controls
            playsInline
            preload="metadata"
            poster={resource.thumbnailPath}
            aria-label="LeadPilot Werbespot"
            style={{
              width: '100%',
              maxHeight: '72vh',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
              background: '#000',
            }}
          >
            <source src={resource.assetPaths[0]} type="video/webm" />
            <p
              style={{
                color: 'var(--color-text-muted)',
                fontSize: '13px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              Ihr Browser unterstützt kein HTML5-WebM-Video. Sie können die{' '}
              <a
                href={resource.assetPaths[0]}
                download
                style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
              >
                Videodatei direkt herunterladen ({resource.originalSource})
              </a>
              .
            </p>
          </video>
          <div
            style={{
              marginTop: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-2)',
              width: '100%',
            }}
          >
            <a
              href={resource.assetPaths[0]}
              download
              style={{
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-raised)',
                color: 'var(--color-primary)',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--color-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>↓</span> Video herunterladen ({resource.originalSource})
            </a>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
              }}
            >
              Fallback-Option:{' '}
              <a
                href={resource.assetPaths[0]}
                download
                style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
              >
                leadpilot-werbespot.webm direkt herunterladen ({resource.originalSource})
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 120ms ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <img
            src={currentAssetPath}
            alt={`${resource.title} - Seite ${currentPage}`}
            style={{
              maxWidth: '92vw',
              maxHeight: '78vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
              background: '#111',
            }}
          />
        </div>
      )}
    </main>
  );
}
