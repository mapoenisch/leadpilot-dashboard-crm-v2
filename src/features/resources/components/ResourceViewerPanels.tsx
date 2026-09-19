import { ResourceMetadata } from '../../../types/resource';
import { Badge } from '../../../components/ui/Badge';

// 067K / G57 — aus ResourceViewer.tsx herausgelöste Seitenbereiche (reine
// Code-Bewegung, keine Verhaltensänderung): Metadaten-Drawer und
// Thumbnail-Leiste.
export function ResourceMetadataDrawer({ resource }: { resource: ResourceMetadata }) {
  return (
    <aside
      style={{
        width: '320px',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        padding: 'var(--space-5)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <h4
        style={{
          margin: 0,
          fontSize: '16px',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-display)',
        }}
      >
        Resource-Details
      </h4>

      <div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}
        >
          Titel
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
          {resource.title}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}
        >
          Beschreibung
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
          {resource.description}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}
        >
          Kategorie & Typ
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <Badge variant="cyan">{resource.category}</Badge>
          <Badge variant="orange">{resource.type}</Badge>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}
        >
          Originalquelle
        </div>
        <div
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text)',
            background: 'var(--color-bg-deep)',
            padding: '6px 8px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {resource.originalSource}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            marginBottom: '2px',
          }}
        >
          Historische Referenz-ID
        </div>
        <div
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-primary)',
          }}
        >
          {resource.historicalId}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}
        >
          Schlagworte (Tags)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {resource.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: '11px',
                background: 'var(--color-surface-raised)',
                padding: '2px 8px',
                borderRadius: '12px',
                color: 'var(--color-text-muted)',
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

export interface ResourceThumbnailStripProps {
  resource: ResourceMetadata;
  currentPage: number;
  totalPages: number;
  onSelect: (page: number) => void;
}

export function ResourceThumbnailStrip({
  resource,
  currentPage,
  totalPages,
  onSelect,
}: ResourceThumbnailStripProps) {
  if (totalPages <= 1) return null;
  return (
    <footer
      style={{
        height: '80px',
        background: 'var(--color-bg-deep)',
        borderTop: '1px solid var(--color-border)',
        padding: '0 var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        overflowX: 'auto',
      }}
    >
      {resource.assetPaths.map((path, idx) => {
        const pageNum = idx + 1;
        const isActive = pageNum === currentPage;
        return (
          <div
            key={path}
            role="button"
            tabIndex={0}
            aria-label={`Seite ${pageNum} anzeigen`}
            onClick={() => onSelect(pageNum)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(pageNum);
              }
            }}
            style={{
              height: '60px',
              width: resource.type === 'SLIDE_DECK' ? '95px' : '45px',
              flexShrink: 0,
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              cursor: 'pointer',
              border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              opacity: isActive ? 1 : 0.6,
              transition: 'opacity 150ms ease, border-color 150ms ease',
              position: 'relative',
              background: '#111',
            }}
          >
            <img
              src={path}
              alt={`Vorschau ${pageNum}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
            <div
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                fontSize: '9px',
                padding: '1px 3px',
                borderRadius: '2px',
              }}
            >
              {pageNum}
            </div>
          </div>
        );
      })}
    </footer>
  );
}
