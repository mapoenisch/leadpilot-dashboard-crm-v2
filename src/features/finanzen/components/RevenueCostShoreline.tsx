import React from 'react';
import { GUV } from '../../../domain/finanzenData';

export const RevenueCostShoreline: React.FC = () => {
  const parseEuro = (s: string) => {
    const isNegative = s.includes('−') || s.includes('-');
    const cleaned = s.replace(/[^\d]/g, '');
    const val = parseInt(cleaned, 10);
    return isNegative ? -val : val;
  };

  const revenueRow = GUV.rows.find((r) => r[0].includes('Umsatzerlöse')) || GUV.rows[3];
  const cogsRow = GUV.rows.find((r) => r[0].includes('Umsatzkosten')) || GUV.rows[4];
  const smRow = GUV.rows.find((r) => r[0].includes('Sales & Marketing')) || GUV.rows[6];
  const rdRow = GUV.rows.find((r) => r[0].includes('Forschung & Entwicklung')) || GUV.rows[7];
  const gaRow = GUV.rows.find((r) => r[0].includes('General & Administrative')) || GUV.rows[8];
  const ebitdaRow = GUV.rows.find((r) => r[0] === 'EBITDA') || GUV.rows[9];
  const lossRow = GUV.rows.find((r) => r[0].includes('Jahresfehlbetrag')) || GUV.rows[15];

  const periodIndices = GUV.headers.map((_, i) => i).filter((i) => i > 0);
  const periods = periodIndices.map((colIdx) => {
    const label = GUV.headers[colIdx];
    const revenueVal = parseEuro(revenueRow[colIdx]);
    const cogsVal = Math.abs(parseEuro(cogsRow[colIdx]));
    const smVal = Math.abs(parseEuro(smRow[colIdx]));
    const rdVal = Math.abs(parseEuro(rdRow[colIdx]));
    const gaVal = Math.abs(parseEuro(gaRow[colIdx]));
    const totalCostVal = cogsVal + smVal + rdVal + gaVal;
    const ebitdaText = ebitdaRow[colIdx];
    const lossText = lossRow[colIdx];

    return {
      label,
      revenueText: revenueRow[colIdx],
      revenueVal,
      totalCostText: `${totalCostVal.toLocaleString('de-DE')} €`,
      totalCostVal,
      ebitdaText,
      lossText,
    };
  });

  const firstYear = periods[0]?.label.match(/\d{4}/)?.[0] || periods[0]?.label || '';
  const lastYear = periods[periods.length - 1]?.label.match(/\d{4}/)?.[0] || periods[periods.length - 1]?.label || '';
  const yearRange = firstYear && lastYear ? `${firstYear} – ${lastYear}` : `${periods[0]?.label || ''} – ${periods[periods.length - 1]?.label || ''}`;

  const prevPeriod = periods.length >= 2 ? periods[periods.length - 2] : periods[0];
  const lastPeriod = periods[periods.length - 1];
  const lastPeriodName = lastPeriod?.label || '';
  const prevEbitda = prevPeriod?.ebitdaText || '';
  const lastEbitda = lastPeriod?.ebitdaText || '';

  // Dynamische Skala abgeleitet aus den berechneten Umsatz- und Gesamtkostenwerten
  const highestDataVal = Math.max(
    ...periods.map((p) => Math.max(p.revenueVal, p.totalCostVal)),
    50000
  );

  // Dynamische Schrittweite für 4-5 gleichmäßige Achsenintervalle
  const candidateSteps = [50000, 100000, 200000, 250000, 500000, 1000000];
  const targetStep = highestDataVal / 4;
  const tickStep = candidateSteps.find((s) => s >= targetStep * 0.8) || 200000;

  // Achsenstufen dynamisch generieren
  const numTicks = Math.max(2, Math.floor(highestDataVal / tickStep));
  const axisTicks = Array.from({ length: numTicks }, (_, i) => (i + 1) * tickStep);
  const maxVal = Math.max(highestDataVal * 1.1, (axisTicks[axisTicks.length - 1] || highestDataVal) * 1.1);

  const svgW = 600;
  const svgH = 220;
  const padX = 70;
  const padY = 30;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const getX = (index: number) => padX + (index / Math.max(1, periods.length - 1)) * plotW;
  const getY = (val: number) => padY + plotH - (val / maxVal) * plotH;

  const revPoints = periods.map((p, idx) => ({ x: getX(idx), y: getY(p.revenueVal) }));
  const costPoints = periods.map((p, idx) => ({ x: getX(idx), y: getY(p.totalCostVal) }));

  // Pfade
  const revPathD = revPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const costPathD = costPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  // Lücken-Polygon zwischen Kosten- und Umsatzlinie (dynamisch über alle Datenpunkte)
  const revReversedPath = [...revPoints].reverse().map((p) => `L ${p.x} ${p.y}`).join(' ');
  const gapPolygonD = `${costPathD} ${revReversedPath} Z`;

  return (
    <section
      className="facelift-revenue-cost-shoreline"
      aria-label="Ertragsufer GuV-Verlauf"
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
        .shoreline-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 900px) {
          .shoreline-cards-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 600px) {
          .facelift-revenue-cost-shoreline {
            padding: 12px 8px !important;
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
            ERTRAGSUFER GUV
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Umsatz- & Kostenverlauf mit sichtbarer Ergebnislücke
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
          Ertragsufer & Ergebnislücke ({yearRange})
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Entwicklung von Gesamtumsatz zu operativen Gesamtkosten. Die schraffierte Spanne visualisiert die Ergebnislücke (EBITDA), die sich im {lastPeriodName} von {prevEbitda} auf {lastEbitda} deutlich verengt.
        </p>
      </div>

      {/* Visuelles Ertragsufer (SVG) */}
      <div
        style={{
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--color-border)',
          padding: '12px 8px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '240px' }}
          role="img"
          aria-label="Diagramm: Ertragsufer Umsatz vs. Kosten"
        >
          <defs>
            <linearGradient id="gapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF7A3D" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00D9C6" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Horizontale Hilfslinien */}
          {axisTicks.map((level) => {
            const y = getY(level);
            return (
              <g key={level}>
                <line
                  x1={padX}
                  y1={y}
                  x2={svgW - padX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padX - 8}
                  y={y + 4}
                  fill="var(--color-text-muted)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {(level / 1000).toFixed(0)}k€
                </text>
              </g>
            );
          })}

          {/* Ergebnislücke Band */}
          <path d={gapPolygonD} fill="url(#gapGrad)" />

          {/* Kosten-Uferlinie */}
          <path
            d={costPathD}
            fill="none"
            stroke="var(--color-accent, #FF7A3D)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Umsatz-Uferlinie */}
          <path
            d={revPathD}
            fill="none"
            stroke="var(--color-primary, #00D9C6)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Punkte & Beschriftungen */}
          {periods.map((p, idx) => {
            const costPt = costPoints[idx];
            const revPt = revPoints[idx];

            return (
              <g key={p.label}>
                {/* Kosten-Punkt */}
                <circle
                  cx={costPt.x}
                  cy={costPt.y}
                  r="5"
                  fill="var(--color-accent, #FF7A3D)"
                  stroke="var(--color-surface)"
                  strokeWidth="2"
                />
                <text
                  x={costPt.x}
                  y={costPt.y - 10}
                  fill="var(--color-accent, #FF7A3D)"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {p.totalCostText}
                </text>

                {/* Umsatz-Punkt */}
                <circle
                  cx={revPt.x}
                  cy={revPt.y}
                  r="5"
                  fill="var(--color-primary, #00D9C6)"
                  stroke="var(--color-surface)"
                  strokeWidth="2"
                />
                <text
                  x={revPt.x}
                  y={revPt.y + 18}
                  fill="var(--color-primary, #00D9C6)"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {p.revenueText}
                </text>

                {/* X-Achse Beschriftung */}
                <text
                  x={revPt.x}
                  y={svgH - 6}
                  fill="var(--color-text)"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legende */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: 'var(--color-primary)', borderRadius: '2px' }} />
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Umsatzerlöse (Gesamtumsatz)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: 'var(--color-accent, #FF7A3D)', borderRadius: '2px' }} />
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Operative Gesamtkosten</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '10px', backgroundColor: 'rgba(255, 122, 61, 0.25)', borderRadius: '2px' }} />
            <span>Ergebnislücke (EBITDA)</span>
          </div>
        </div>
      </div>

      {/* 3 Detailkarten je Periode */}
      <div className="shoreline-cards-grid" role="region" aria-label="GuV-Periodenvergleich">
        {periods.map((p) => (
          <article
            key={p.label}
            style={{
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '14px', color: 'var(--color-text)' }}>{p.label}</strong>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--color-text-muted)',
                }}
              >
                GuV-Abschnitt
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Umsatzerlöse:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{p.revenueText}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Gesamtkosten:</span>
                <strong style={{ color: 'var(--color-accent, #FF7A3D)' }}>{p.totalCostText}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>EBITDA (Lücke):</span>
                <strong style={{ color: 'var(--color-warning, #FFB800)' }}>{p.ebitdaText}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Jahresfehlbetrag:</span>
                <strong style={{ color: 'var(--color-text)' }}>{p.lossText}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
