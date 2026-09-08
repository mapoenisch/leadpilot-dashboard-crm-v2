import React from 'react';
import { CockpitKpiItem } from '@/domain/executiveCockpitData';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface CockpitKpiRailProps {
  kpis: CockpitKpiItem[];
}

export const CockpitKpiRail: React.FC<CockpitKpiRailProps> = ({ kpis }) => {
  return (
    <div
      data-testid="cockpit-kpi-rail"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--space-4)',
        width: '100%',
      }}
    >
      {kpis.map((kpi) => {
        const isNegative = kpi.isNegativeAlert || kpi.rawValue < 0;
        const valueColor = isNegative ? '#FF7A3D' : '#00D9C6';
        const borderColor = isNegative ? 'rgba(255, 122, 61, 0.28)' : 'rgba(0, 217, 198, 0.18)';
        const glowColor = isNegative ? 'rgba(255, 122, 61, 0.1)' : 'rgba(0, 217, 198, 0.08)';

        return (
          <div
            key={kpi.id}
            data-testid={`cockpit-kpi-${kpi.id}`}
            style={{
              background: 'linear-gradient(135deg, rgba(11, 30, 28, 0.75) 0%, rgba(5, 18, 17, 0.85) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${borderColor}`,
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 16px ${glowColor}`,
              borderRadius: '8px',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '135px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Oben: Label & Delta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.02em',
                }}
              >
                {kpi.label}
              </span>
              {kpi.delta && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: isNegative
                      ? 'rgba(255, 122, 61, 0.12)'
                      : kpi.deltaType === 'positive'
                      ? 'rgba(0, 217, 198, 0.12)'
                      : 'rgba(255, 255, 255, 0.06)',
                    color: isNegative
                      ? '#FF7A3D'
                      : kpi.deltaType === 'positive'
                      ? '#00D9C6'
                      : 'var(--color-text-muted)',
                    border: `1px solid ${isNegative ? 'rgba(255, 122, 61, 0.25)' : kpi.deltaType === 'positive' ? 'rgba(0, 217, 198, 0.25)' : 'rgba(255, 255, 255, 0.1)'}`,
                  }}
                >
                  {isNegative ? (
                    <ArrowDownRight size={12} />
                  ) : kpi.deltaType === 'positive' ? (
                    <ArrowUpRight size={12} />
                  ) : (
                    <Minus size={10} />
                  )}
                  {kpi.delta}
                </span>
              )}
            </div>

            {/* Mitte: Dominanter Wert */}
            <div
              style={{
                fontSize: '30px',
                fontWeight: 700,
                color: valueColor,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: '10px 0 6px',
                textShadow: `0 0 16px ${isNegative ? 'rgba(255, 122, 61, 0.2)' : 'rgba(0, 217, 198, 0.2)'}`,
              }}
            >
              {kpi.value}
            </div>

            {/* Unten: Kontextnotiz */}
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.35,
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '6px',
              }}
            >
              {kpi.note}
            </div>
          </div>
        );
      })}
    </div>
  );
};
