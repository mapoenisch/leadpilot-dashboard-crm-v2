import React from 'react';
import { TEAM } from '../../../domain/organisationData';

export const RoleLegend: React.FC = () => {
  const bottlenecks = TEAM.bottlenecks || [];

  return (
    <aside
      className="facelift-role-legend"
      aria-label="Rollen-Landkarte und Engpass-Legende"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-4, 16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4, 16px)',
        overflowWrap: 'anywhere',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--color-border)',
            }}
          >
            LEGENDE & DETAILS
          </span>
          <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>
            Rollen-Landkarte & Engpass-Dokumentation
          </strong>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Quelle: TEAM.bottlenecks
        </span>
      </div>

      {/* Liste der 3 Engpässe und der Maßnahme als Quellentexte */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: 0,
        }}
      >
        {bottlenecks.map((item, idx) => {
          const isMeasure = item.startsWith('Maßnahme:');

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                border: isMeasure ? '1px solid rgba(0, 217, 198, 0.3)' : '1px solid rgba(255, 122, 61, 0.3)',
                backgroundColor: isMeasure ? 'rgba(0, 217, 198, 0.04)' : 'rgba(255, 122, 61, 0.05)',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isMeasure ? 'var(--color-primary, #00D9C6)' : 'var(--color-accent, #FF7A3D)',
                  lineHeight: 1.4,
                  flexShrink: 0,
                }}
              >
                {isMeasure ? '✅' : '⚠️'}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text)',
                  lineHeight: 1.4,
                  overflowWrap: 'anywhere',
                }}
              >
                {item}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
