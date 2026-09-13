import React from 'react';
import { GUV } from '../../../domain/finanzenData';

export const RevenueCostShoreline: React.FC = () => {
  const parseEuro = (s: string) => {
    const isNegative = s.includes('−') || s.includes('-');
    const cleaned = s.replace(/[^\d]/g, '');
    const val = parseInt(cleaned, 10);
    return isNegative ? -val : val;
  };

  const defaultGuvRow: string[] = [];
  const findGuvRow = (term: string, fallbackIdx: number): string[] => {
    return GUV.rows.find((r) => r[0]?.includes(term)) ?? GUV.rows[fallbackIdx] ?? defaultGuvRow;
  };

  const revenueRow = findGuvRow('Umsatzerlöse', 3);
  const cogsRow = findGuvRow('Umsatzkosten', 4);
  const smRow = findGuvRow('Sales & Marketing', 6);
  const rdRow = findGuvRow('Forschung & Entwicklung', 7);
  const gaRow = findGuvRow('General & Administrative', 8);
  const ebitdaRow = GUV.rows.find((r) => r[0] === 'EBITDA') ?? GUV.rows[9] ?? defaultGuvRow;
  const lossRow = findGuvRow('Jahresfehlbetrag', 15);

  const periodIndices = GUV.headers.map((_, i) => i).filter((i) => i > 0);
  const periods = periodIndices.map((colIdx) => {
    const label = GUV.headers[colIdx] ?? '';
    const revenueVal = parseEuro(revenueRow[colIdx] ?? '0');
    const cogsVal = Math.abs(parseEuro(cogsRow[colIdx] ?? '0'));
    const smVal = Math.abs(parseEuro(smRow[colIdx] ?? '0'));
    const rdVal = Math.abs(parseEuro(rdRow[colIdx] ?? '0'));
    const gaVal = Math.abs(parseEuro(gaRow[colIdx] ?? '0'));
    const totalCostVal = cogsVal + smVal + rdVal + gaVal;
    const ebitdaText = ebitdaRow[colIdx] ?? '';
    const lossText = lossRow[colIdx] ?? '';

    return {
      label,
      revenueText: revenueRow[colIdx] ?? '',
      revenueVal,
      totalCostText: `${totalCostVal.toLocaleString('de-DE')} €`,
      totalCostVal,
      ebitdaText,
      lossText,
    };
  });

  const firstPeriod = periods[0];
  const lastPeriodFromList = periods[periods.length - 1];
  const firstYear = firstPeriod?.label.match(/\d{4}/)?.[0] || firstPeriod?.label || '';
  const lastYear = lastPeriodFromList?.label.match(/\d{4}/)?.[0] || lastPeriodFromList?.label || '';
  const yearRange =
    firstYear && lastYear
      ? `${firstYear} – ${lastYear}`
      : `${firstPeriod?.label || ''} – ${lastPeriodFromList?.label || ''}`;

  const prevPeriod = periods.length >= 2 ? periods[periods.length - 2] : periods[0];
  const lastPeriod = periods[periods.length - 1];
  const lastPeriodName = lastPeriod?.label || '';
  const prevEbitda = prevPeriod?.ebitdaText || '';
  const lastEbitda = lastPeriod?.ebitdaText || '';

  // Dynamische Skala abgeleitet aus den berechneten Umsatz- und Gesamtkostenwerten
  const highestDataVal = Math.max(
    ...periods.map((p) => Math.max(p.revenueVal, p.totalCostVal)),
    50000,
  );

  // Dynamische Schrittweite für 4-5 gleichmäßige Achsenintervalle
  const candidateSteps = [50000, 100000, 200000, 250000, 500000, 1000000];
  const targetStep = highestDataVal / 4;
  const tickStep = candidateSteps.find((s) => s >= targetStep * 0.8) || 200000;

  // Achsenstufen dynamisch generieren
  const numTicks = Math.max(2, Math.floor(highestDataVal / tickStep));
  const axisTicks = Array.from({ length: numTicks }, (_, i) => (i + 1) * tickStep);
  const maxVal = Math.max(
    highestDataVal * 1.1,
    (axisTicks[axisTicks.length - 1] || highestDataVal) * 1.1,
  );

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
  const revPathD = revPoints.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
    '',
  );
  const costPathD = costPoints.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
    '',
  );

  // Lücken-Polygon zwischen Kosten- und Umsatzlinie (dynamisch über alle Datenpunkte)
  const revReversedPath = [...revPoints]
    .reverse()
    .map((p) => `L ${p.x} ${p.y}`)
    .join(' ');
  const gapPolygonD = `${costPathD} ${revReversedPath} Z`;

  return (
    <section
      className="facelift-revenue-cost-shoreline box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="Ertragsufer GuV-Verlauf"
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
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.05em] uppercase whitespace-normal px-[8px] py-[2px]">
            ERTRAGSUFER GUV
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Umsatz- & Kostenverlauf mit sichtbarer Ergebnislücke
          </span>
        </div>
        <h3 className="m-0 font-display font-bold text-text text-[clamp(1.1rem,4vw,1.25rem)] [overflow-wrap:anywhere]">
          Ertragsufer & Ergebnislücke ({yearRange})
        </h3>
        <p className="m-0 text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
          Entwicklung von Gesamtumsatz zu operativen Gesamtkosten. Die schraffierte Spanne
          visualisiert die Ergebnislücke (EBITDA), die sich im {lastPeriodName} von {prevEbitda} auf{' '}
          {lastEbitda} deutlich verengt.
        </p>
      </div>

      {/* Visuelles Ertragsufer (SVG) */}
      <div className="w-full rounded-md border border-solid border-border bg-[rgba(255,255,255,0.02)] box-border relative px-[8px] py-[12px]">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block w-full h-auto max-h-[240px]"
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
            if (!costPt || !revPt) return null;

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
        <div className="flex justify-center gap-[16px] flex-wrap mt-[8px] text-[11px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-[6px]">
            <span className="w-[12px] h-[3px] rounded-[2px] bg-primary" />
            <span className="font-semibold text-text">Umsatzerlöse (Gesamtumsatz)</span>
          </div>
          <div className="flex items-center gap-[6px]">
            <span className="w-[12px] h-[3px] rounded-[2px] bg-accent" />
            <span className="font-semibold text-text">Operative Gesamtkosten</span>
          </div>
          <div className="flex items-center gap-[6px]">
            <span className="w-[12px] h-[10px] rounded-[2px] bg-[rgba(255,122,61,0.25)]" />
            <span>Ergebnislücke (EBITDA)</span>
          </div>
        </div>
      </div>

      {/* 3 Detailkarten je Periode */}
      <div className="shoreline-cards-grid" role="region" aria-label="GuV-Periodenvergleich">
        {periods.map((p) => (
          <article
            key={p.label}
            className="rounded-md border border-solid border-border bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] p-[14px] flex flex-col gap-[10px] min-w-0"
          >
            <div className="flex justify-between items-center">
              <strong className="text-[14px] text-text">{p.label}</strong>
              <span className="text-[10px] font-semibold rounded bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)] px-[6px] py-[2px]">
                GuV-Abschnitt
              </span>
            </div>

            <div className="flex flex-col gap-[6px] text-[12px]">
              <div className="flex justify-between border-0 border-b border-solid border-border pb-[4px]">
                <span className="text-[var(--color-text-muted)]">Umsatzerlöse:</span>
                <strong className="text-primary">{p.revenueText}</strong>
              </div>
              <div className="flex justify-between border-0 border-b border-solid border-border pb-[4px]">
                <span className="text-[var(--color-text-muted)]">Gesamtkosten:</span>
                <strong className="text-accent">{p.totalCostText}</strong>
              </div>
              <div className="flex justify-between border-0 border-b border-solid border-border pb-[4px]">
                <span className="text-[var(--color-text-muted)]">EBITDA (Lücke):</span>
                <strong className="text-warning">{p.ebitdaText}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Jahresfehlbetrag:</span>
                <strong className="text-text">{p.lossText}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
