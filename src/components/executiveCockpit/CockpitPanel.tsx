import React from 'react';

export interface CockpitPanelProps {
  title: string;
  subtitle?: string;
  sourceLabel?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
}

export const CockpitPanel: React.FC<CockpitPanelProps> = ({
  title,
  subtitle,
  sourceLabel,
  badge,
  actions,
  children,
  className = '',
  style = {},
  noPadding = false,
}) => {
  return (
    <section
      data-testid="cockpit-panel"
      className={`cockpit-panel ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgba(11, 30, 28, 0.72) 0%, rgba(5, 18, 17, 0.82) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 217, 198, 0.16)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(0, 217, 198, 0.12)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Subtile Lichtkante oben */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 217, 198, 0.4) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(0, 217, 198, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '-0.01em',
                fontFamily: 'var(--font-display)',
              }}
            >
              {title}
            </h3>
            {badge}
          </div>
          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {sourceLabel && (
            <span
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '2px 7px',
                borderRadius: '4px',
                background: 'rgba(0, 217, 198, 0.08)',
                color: '#00D9C6',
                border: '1px solid rgba(0, 217, 198, 0.16)',
                fontWeight: 600,
              }}
            >
              {sourceLabel}
            </span>
          )}
          {actions}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          padding: noPadding ? '0' : '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {children}
      </div>
    </section>
  );
};
