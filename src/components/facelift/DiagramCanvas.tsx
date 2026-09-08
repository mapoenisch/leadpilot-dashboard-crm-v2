import React, { useId } from 'react';

export interface DiagramCanvasProps {
  id?: string;
  title: string;
  description?: string;
  viewBox: string;
  children: React.ReactNode;
  legend?: React.ReactNode;
  summary?: React.ReactNode;
  source?: {
    label: string;
    url?: string;
    metric?: string;
  };
  className?: string;
  style?: React.CSSProperties;
  svgClassName?: string;
  svgStyle?: React.CSSProperties;
  aspectRatio?: string;
}

export const DiagramCanvas: React.FC<DiagramCanvasProps> = ({
  id: customId,
  title,
  description,
  viewBox,
  children,
  legend,
  summary,
  source,
  className = '',
  style,
  svgClassName = '',
  svgStyle,
  aspectRatio,
}) => {
  const generatedId = useId();
  const baseId = customId || `diagram-${generatedId.replace(/:/g, '')}`;

  // Getrennte IDs zur Vermeidung doppelter DOM-IDs
  const headingId = `${baseId}-heading`;
  const headingDescId = description ? `${baseId}-heading-desc` : undefined;
  const svgTitleId = `${baseId}-svg-title`;
  const svgDescId = description ? `${baseId}-svg-desc` : undefined;

  return (
    <figure
      id={baseId}
      className={`facelift-diagram-canvas ${className}`}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-4)',
        ...style,
      }}
    >
      {/* Header mit Titel und optionaler Beschreibung */}
      <div
        style={{
          marginBottom: 'var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
        }}
      >
        <h4
          id={headingId}
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'var(--color-text)',
          }}
        >
          {title}
        </h4>
        {description && (
          <p
            id={headingDescId}
            style={{
              margin: '2px 0 0 0',
              fontFamily: 'var(--font-body)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Responsiver SVG-Container ohne starre Breiten */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-bg-deep)',
          border: '1px solid var(--color-border-soft)',
          ...(aspectRatio ? { aspectRatio } : {}),
        }}
      >
        <svg
          viewBox={viewBox}
          role="img"
          aria-labelledby={svgDescId ? `${svgTitleId} ${svgDescId}` : svgTitleId}
          className={svgClassName}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            userSelect: 'none',
            ...svgStyle,
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <title id={svgTitleId}>{title}</title>
          {description && <desc id={svgDescId}>{description}</desc>}
          {children}
        </svg>
      </div>

      {/* Legendenbereich */}
      {legend && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-2)',
            borderTop: '1px solid var(--color-border-soft)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
          }}
        >
          {legend}
        </div>
      )}

      {/* Quellenangabe (KfW, Destatis etc.) */}
      {source && (
        <div
          style={{
            marginTop: 'var(--space-2)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-1)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
          }}
        >
          <span style={{ fontWeight: 500 }}>Quelle:</span>
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              {source.label}
            </a>
          ) : (
            <span>{source.label}</span>
          )}
          {source.metric && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              ({source.metric})
            </span>
          )}
        </div>
      )}

      {/* Zugängliche Textzusammenfassung / Tabellen-Fallback */}
      {summary && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-2)',
            borderTop: '1px solid var(--color-border-soft)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
          }}
        >
          {summary}
        </div>
      )}
    </figure>
  );
};
