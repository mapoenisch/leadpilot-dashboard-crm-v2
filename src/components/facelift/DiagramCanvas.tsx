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
      className={`facelift-diagram-canvas box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-4)] ${className}`}
      // G39 Welle 1: eigene Anteile als Klassen; Aufrufer-Overrides via
      // style-Passthrough (externe Konsumenten möglich).
      // eslint-disable-next-line react/forbid-dom-props -- Passthrough des Aufrufer-style-Props, siehe Auftrag 054 Block D
      style={style}
    >
      {/* Header mit Titel und optionaler Beschreibung */}
      <div className="flex flex-col gap-[var(--space-1)] mb-[var(--space-3)]">
        <h4
          id={headingId}
          className="m-0 font-display text-[1rem] font-semibold tracking-[0.02em] text-text"
        >
          {title}
        </h4>
        {description && (
          <p
            id={headingDescId}
            className="font-body text-[0.8125rem] leading-[1.4] mt-[2px] mb-0 mr-0 ml-0 text-[var(--color-text-muted)]"
          >
            {description}
          </p>
        )}
      </div>

      {/* Responsiver SVG-Container ohne starre Breiten */}
      <div
        className="relative w-full overflow-hidden rounded-md border border-solid border-border-soft bg-background-deep"
        // G39 Welle 1: aspectRatio ist ein Laufzeit-Prop des Aufrufers —
        // als Klasse nicht darstellbar (Muster Auftrag 053 Nachtrag 2).
        // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (aspectRatio-Prop), siehe Auftrag 054 Entscheidung 4
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <svg
          viewBox={viewBox}
          role="img"
          aria-labelledby={svgDescId ? `${svgTitleId} ${svgDescId}` : svgTitleId}
          className={svgClassName ? `${svgClassName} block w-full h-auto select-none` : 'block w-full h-auto select-none'}
          // G39 Welle 1: eigene Anteile als Klassen; Aufrufer-Overrides via
          // style-Passthrough.
          // eslint-disable-next-line react/forbid-dom-props -- Passthrough des Aufrufer-svgStyle-Props, siehe Auftrag 054 Block D
          style={svgStyle}
          xmlns="http://www.w3.org/2000/svg"
        >
          <title id={svgTitleId}>{title}</title>
          {description && <desc id={svgDescId}>{description}</desc>}
          {children}
        </svg>
      </div>

      {/* Legendenbereich */}
      {legend && (
        <div className="border-0 font-body text-[0.8125rem] mt-[var(--space-3)] pt-[var(--space-2)] border-t border-solid border-border-soft text-[var(--color-text-muted)]">
          {legend}
        </div>
      )}

      {/* Quellenangabe (KfW, Destatis etc.) */}
      {source && (
        <div className="flex flex-wrap items-center gap-[var(--space-1)] font-body text-[0.75rem] mt-[var(--space-2)] text-[var(--color-text-muted)]">
          <span className="font-medium">Quelle:</span>
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-[2px] text-primary"
            >
              {source.label}
            </a>
          ) : (
            <span>{source.label}</span>
          )}
          {source.metric && (
            <span className="text-[var(--color-text-muted)]">
              ({source.metric})
            </span>
          )}
        </div>
      )}

      {/* Zugängliche Textzusammenfassung / Tabellen-Fallback */}
      {summary && (
        <div className="border-0 font-body text-[0.8125rem] mt-[var(--space-3)] pt-[var(--space-2)] border-t border-solid border-border-soft text-[var(--color-text-muted)]">
          {summary}
        </div>
      )}
    </figure>
  );
};
