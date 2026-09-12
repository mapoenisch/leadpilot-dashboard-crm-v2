import React from 'react';
import { FaceliftGlyphName, VisualTone } from '../../domain/faceliftVisualData';

export interface FaceliftGlyphProps {
  name: FaceliftGlyphName;
  size?: number | string;
  tone?: VisualTone;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  ariaHidden?: boolean;
}

const TONE_COLORS: Record<VisualTone, string> = {
  positive: 'var(--color-primary)',
  attention: 'var(--color-accent)',
  neutral: 'var(--color-text-muted)',
  accent: 'var(--cyan-light)',
};

const DEFAULT_LABELS: Record<FaceliftGlyphName, string> = {
  contactToCustomer: 'Kontakt wird Kunde',
  focus: 'Fokus statt Reporting-Aufwand',
  ready: 'Vom ersten Tag handlungsfähig',
  success: 'Positives Signal / Erfolg',
  challenge: 'Herausforderung / Hürde',
  fit: 'Zielgruppen-Fit / Eignung',
  risk: 'Risiko / Engpass',
  opportunity: 'Chance / Wachstumspotenzial',
};

export const FaceliftGlyph: React.FC<FaceliftGlyphProps> = ({
  name,
  size = 20,
  tone,
  className = '',
  style,
  ariaLabel,
  ariaHidden,
}) => {
  const color = tone ? TONE_COLORS[tone] : 'currentColor';
  const label = ariaLabel ?? DEFAULT_LABELS[name];

  const a11yProps =
    ariaHidden === true
      ? { 'aria-hidden': true as const }
      : { role: 'img' as const, 'aria-label': label };

  const renderPaths = () => {
    switch (name) {
      case 'contactToCustomer':
        return (
          <>
            {/* Person silhouette */}
            <circle cx="5" cy="7" r="2.5" fill="none" stroke={color} strokeWidth="1.5" />
            <path
              d="M1.5 15.5c0-2.2 1.8-3.5 3.5-3.5h0c1.7 0 3.5 1.3 3.5 3.5"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Conversion arrow */}
            <path
              d="M9.5 10h4m-1.5-2l2 2-2 2"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Customer badge */}
            <polygon
              points="18.5,5 20.2,8.8 24,9.3 21.2,12 21.9,16 18.5,14 15.1,16 15.8,12 13,9.3 16.8,8.8"
              fill="none"
              stroke={color}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </>
        );

      case 'focus':
        return (
          <>
            {/* Reticle brackets */}
            <path
              d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Center target */}
            <circle cx="12" cy="12" r="3.5" fill="none" stroke={color} strokeWidth="1.5" />
            <circle cx="12" cy="12" r="1" fill={color} />
          </>
        );

      case 'ready':
        return (
          <>
            {/* Hexagonal shield / badge */}
            <polygon
              points="12,2.5 21,7.5 21,16.5 12,21.5 3,16.5 3,7.5"
              fill="none"
              stroke={color}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Checkmark */}
            <path
              d="M7.5 12l3 3 6-6"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'success':
        return (
          <>
            {/* Upward dynamic shield facet */}
            <path
              d="M12 2l8 4.5v6.5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6.5L12 2z"
              fill="none"
              stroke={color}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Crisp checkmark */}
            <path
              d="M8 12.5l2.8 2.8 5.7-5.8"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        );

      case 'challenge':
        return (
          <>
            {/* Angular steep mountain / challenge peak */}
            <polygon
              points="12,3 22,20 2,20"
              fill="none"
              stroke={color}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Peak step ridge */}
            <path
              d="M12 8.5v5m0 3v.5"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        );

      case 'fit':
        return (
          <>
            {/* Interlocking dovetail puzzle connection */}
            <path
              d="M4 6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a1.5 1.5 0 0 0 3 0V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1a1.5 1.5 0 0 0 0 3h1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1a1.5 1.5 0 0 0-3 0v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1a1.5 1.5 0 0 0 0-3H6a2 2 0 0 1-2-2V6z"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </>
        );

      case 'risk':
        return (
          <>
            {/* Warning diamond */}
            <polygon
              points="12,2 22,12 12,22 2,12"
              fill="none"
              stroke={color}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M12 7.5v5.5m0 3v.5"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        );

      case 'opportunity':
        return (
          <>
            {/* Diagonal ascending breakout spark / ray */}
            <path
              d="M4 20l14-14m0 0H11m7 0v7"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="5" cy="19" r="1.5" fill={color} />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`facelift-glyph inline-block align-middle shrink-0 ${className}`}
      // G39 Welle 1: eigene Anteile als Klassen; Aufrufer-Overrides via
      // style-Passthrough (Konsumenten in features/**).
      // eslint-disable-next-line react/forbid-dom-props -- Passthrough des Aufrufer-style-Props (externe Konsumenten), siehe Auftrag 054 Block D
      style={style}
      {...a11yProps}
    >
      {renderPaths()}
    </svg>
  );
};
