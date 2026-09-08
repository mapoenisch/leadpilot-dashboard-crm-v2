import React from 'react';

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function SectionHeader({ eyebrow, title, description, actions }: SectionHeaderProps) {
  return (
    <div
      className="section-header-root"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 'var(--space-5)',
        flexWrap: 'wrap',
        marginBottom: 'var(--space-2)',
        minWidth: 0,
        width: '100%',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 auto', overflowWrap: 'anywhere' }}>
        {eyebrow && (
          <div
            style={{
              color: 'var(--color-primary)',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '4px',
              overflowWrap: 'anywhere',
            }}
          >
            {eyebrow}
          </div>
        )}
        <h2
          className="section-header-title"
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '26px',
            fontWeight: 600,
            color: 'var(--color-text)',
            letterSpacing: '-0.02em',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              margin: '6px 0 0',
              color: 'var(--color-text-muted)',
              fontSize: '14px',
              maxWidth: '640px',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
          {actions}
        </div>
      )}
      <style>{`
        @media (max-width: 600px) {
          .section-header-title {
            font-size: 1.35rem !important;
          }
        }
      `}</style>
    </div>
  );
}
