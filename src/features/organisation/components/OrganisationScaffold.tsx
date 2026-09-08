import React from 'react';
import { HEADCOUNT } from '../../../domain/organisationData';

export const OrganisationScaffold: React.FC = () => {
  // Zeitreihendaten aus HEADCOUNT.chart
  const timelineLabels = HEADCOUNT.chart?.labels || [];
  const timelineData = (HEADCOUNT.chart?.datasets?.[0]?.data as number[]) || [];
  const firstQuarter = timelineLabels[0] || '—';
  const lastQuarter = timelineLabels.length > 0 ? timelineLabels[timelineLabels.length - 1] : '—';
  const firstFte = timelineData[0] !== undefined ? `${timelineData[0].toFixed(1).replace('.', ',')} FTE` : '—';
  const lastFte = timelineData.length > 0 ? `${timelineData[timelineData.length - 1].toFixed(1).replace('.', ',')} FTE` : '—';

  // Funktionale Rollen und Gesamtzeile dynamisch aus HEADCOUNT.rows
  const totalRow = HEADCOUNT.rows.length > 1 ? HEADCOUNT.rows[HEADCOUNT.rows.length - 1] : null;
  const functionalRows = HEADCOUNT.rows.length > 1 ? HEADCOUNT.rows.slice(0, -1) : HEADCOUNT.rows;

  // SVG-Skalierung für Zeitreihe (vollständig aus den vorhandenen Datenpunkten abgeleitet)
  const maxTimelineVal = timelineData.length > 0 ? Math.max(...timelineData) * 1.15 : 0;
  const svgW = 600;
  const svgH = 130;
  const padX = 40;
  const padY = 20;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const getX = (i: number) => padX + (i / Math.max(1, timelineData.length - 1)) * plotW;
  const getY = (val: number) => maxTimelineVal > 0 ? padY + plotH - (val / maxTimelineVal) * plotH : padY + plotH;

  const points = timelineData.map((v, i) => ({ x: getX(i), y: getY(v), val: v, label: timelineLabels[i] }));
  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const lastPt = points[points.length - 1];
  const areaD = points.length > 0 && lastPt ? `${pathD} L ${lastPt.x} ${padY + plotH} L ${points[0].x} ${padY + plotH} Z` : '';

  // Berechne numerische FTE je Funktion für proportionale Bausteine
  const parseFte = (valStr: string) => {
    const num = parseFloat(valStr.replace(/[^\d,.]/g, '').replace(',', '.'));
    return isNaN(num) ? 0 : num;
  };

  const maxFunctionalFte = functionalRows.length > 0 ? Math.max(...functionalRows.map((r) => parseFte(r[1]))) : 0;

  return (
    <section
      className="facelift-organisation-scaffold"
      aria-label="Organisationsgerüst und Headcount-Entwicklung"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5, 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5, 20px)',
        overflowWrap: 'anywhere',
      }}
    >
      <style>{`
        .scaffold-functional-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          align-items: end;
        }
        @media (max-width: 600px) {
          .facelift-organisation-scaffold {
            padding: 12px 8px !important;
          }
          .scaffold-functional-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
        }
        @media (max-width: 380px) {
          .scaffold-functional-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
              color: 'var(--color-primary)',
              backgroundColor: 'rgba(0, 217, 198, 0.12)',
              border: '1px solid rgba(0, 217, 198, 0.25)',
              whiteSpace: 'normal',
            }}
          >
            ORGANISATIONSGERÜST
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Zeitreihe {firstQuarter} bis {lastQuarter} & funktionale Bausteine
          </span>
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 'clamp(1.1rem, 4vw, 1.25rem)',
            fontWeight: 700,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-display)',
            overflowWrap: 'anywhere',
          }}
        >
          Headcount-Entwicklung & Organisationsgerüst
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Personalaufbau von {firstFte} ({firstQuarter}) auf {lastFte} ({lastQuarter}) über {timelineData.length} Quartale. Die Bausteine zeigen die funktionale Kapazitätsverteilung zum Stichtag.
        </p>
      </div>

      {/* 1. Teil: Zeitreihe (Quartalsverlauf) */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--color-border)',
          padding: '12px 8px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '0 8px', flexWrap: 'wrap', gap: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
            ZEITREIHE: QUARTALSVERLAUF (FTE)
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {firstQuarter}: {firstFte} ➔ {lastQuarter}: {lastFte}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '160px' }}
          role="img"
          aria-label="Diagramm: Quartalsweise FTE-Entwicklung"
        >
          <defs>
            <linearGradient id="scaffoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00D9C6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00D9C6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Basis- und Rasterlinie */}
          <line
            x1={padX}
            y1={padY + plotH}
            x2={svgW - padX}
            y2={padY + plotH}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />

          {/* Flächenfüllung & Trendlinie */}
          {areaD && <path d={areaD} fill="url(#scaffoldGrad)" />}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="var(--color-primary, #00D9C6)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Datenpunkte & Quartalsbeschriftungen */}
          {points.map((p) => (
            <g key={p.label}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="var(--color-primary, #00D9C6)"
                stroke="var(--color-surface)"
                strokeWidth="1.5"
              />
              <text
                x={p.x}
                y={p.y - 8}
                fill="var(--color-primary, #00D9C6)"
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                {p.val.toFixed(1).replace('.', ',')}
              </text>
              <text
                x={p.x}
                y={svgH - 2}
                fill="var(--color-text-muted)"
                fontSize="10"
                textAnchor="middle"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* 2. Teil: Wachsende Organisationsbausteine (Scaffold) je Funktion */}
      <div>
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            FUNKTIONALE KAPAZITÄTSBAUSTEINE (FTE ZUM STICHTAG)
          </span>
        </div>

        <div className="scaffold-functional-grid" role="region" aria-label="Funktionale FTE-Bausteine">
          {functionalRows.map((row) => {
            const role = row[0];
            const fteStr = row[1];
            const detail = row[2];
            const fteNum = parseFte(fteStr);
            const blockHeight = Math.max(70, Math.round((fteNum / maxFunctionalFte) * 160));
            const isHighlight = detail.includes('kritisch') || detail.includes('ausgereizt');

            return (
              <article
                key={role}
                className="scaffold-card"
                style={{
                  borderRadius: 'var(--radius-md, 8px)',
                  border: isHighlight ? '1px solid rgba(255, 122, 61, 0.4)' : '1px solid var(--color-border)',
                  backgroundColor: isHighlight
                    ? 'rgba(255, 122, 61, 0.04)'
                    : 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: `${blockHeight}px`,
                  minWidth: 0,
                  boxSizing: 'border-box',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--color-text)', overflowWrap: 'anywhere' }}>
                      {role}
                    </strong>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: isHighlight ? 'var(--color-accent, #FF7A3D)' : 'var(--color-primary, #00D9C6)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fteStr}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  {/* Visuelle Stufenblöcke (1 Block je 0,5–1 FTE) */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {Array.from({ length: Math.round(fteNum) }).map((_, bIdx) => (
                      <div
                        key={bIdx}
                        style={{
                          flex: '1 1 12px',
                          height: '8px',
                          borderRadius: '2px',
                          backgroundColor: isHighlight ? 'var(--color-accent, #FF7A3D)' : 'var(--color-primary, #00D9C6)',
                          opacity: 0.35 + (bIdx + 1) * 0.15,
                        }}
                      />
                    ))}
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.4,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {detail}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Gesamtbestand & Ziel-Notiz aus totalRow */}
      {totalRow && (
        <div
          style={{
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'rgba(0, 217, 198, 0.04)',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{totalRow[0]}</strong>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(0, 217, 198, 0.12)',
              }}
            >
              {totalRow[1]}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {totalRow[2]}
          </div>
        </div>
      )}
    </section>
  );
};
