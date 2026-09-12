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
      className="facelift-organisation-scaffold box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="Organisationsgerüst und Headcount-Entwicklung"
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
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.05em] uppercase whitespace-normal px-[8px] py-[2px]">
            ORGANISATIONSGERÜST
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Zeitreihe {firstQuarter} bis {lastQuarter} & funktionale Bausteine
          </span>
        </div>
        <h3 className="m-0 font-display font-bold text-text text-[clamp(1.1rem,4vw,1.25rem)] [overflow-wrap:anywhere]">
          Headcount-Entwicklung & Organisationsgerüst
        </h3>
        <p className="m-0 text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
          Personalaufbau von {firstFte} ({firstQuarter}) auf {lastFte} ({lastQuarter}) über {timelineData.length} Quartale. Die Bausteine zeigen die funktionale Kapazitätsverteilung zum Stichtag.
        </p>
      </div>

      {/* 1. Teil: Zeitreihe (Quartalsverlauf) */}
      <div className="rounded-md border border-solid border-border bg-[rgba(255,255,255,0.02)] box-border px-[8px] py-[12px]">
        <div className="flex justify-between items-center flex-wrap gap-[4px] mb-[6px] px-[8px]">
          <span className="text-[11px] font-bold uppercase text-primary">
            ZEITREIHE: QUARTALSVERLAUF (FTE)
          </span>
          <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
            {firstQuarter}: {firstFte} ➔ {lastQuarter}: {lastFte}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block w-full h-auto max-h-[160px]"
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
        <div className="mb-[10px]">
          <span className="text-[11px] font-bold uppercase text-[var(--color-text-muted)]">
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
                className={`scaffold-card rounded-md border border-solid flex flex-col justify-between min-w-0 box-border p-[12px] ${isHighlight ? 'border-[rgba(255,122,61,0.4)] bg-[rgba(255,122,61,0.04)]' : 'border-border bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))]'}`}
                // G39 Welle 3: Kartenhöhe aus FTE-Daten (berechnet) — als
                // Klasse nicht darstellbar (Entscheidung 2).
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (FTE-proportionale Höhe), siehe Auftrag 056 Entscheidung 2
                style={{
                  minHeight: `${blockHeight}px`,
                }}
              >
                <div>
                  <div className="flex justify-between items-start gap-[6px] flex-wrap">
                    <strong className="text-[13px] text-text [overflow-wrap:anywhere]">
                      {role}
                    </strong>
                    <span className={`font-mono text-[13px] font-bold whitespace-nowrap ${isHighlight ? 'text-accent' : 'text-primary'}`}>
                      {fteStr}
                    </span>
                  </div>
                </div>

                <div className="mt-[8px]">
                  {/* Visuelle Stufenblöcke (1 Block je 0,5–1 FTE) */}
                  <div className="flex gap-[4px] mb-[8px] flex-wrap">
                    {Array.from({ length: Math.round(fteNum) }).map((_, bIdx) => (
                      <div
                        key={bIdx}
                        className={`flex-[1_1_12px] h-[8px] rounded-[2px] ${isHighlight ? 'bg-accent' : 'bg-primary'}`}
                        // G39 Welle 3: Verlauf-Transparenz aus Blockindex
                        // (berechnet) — als Klasse nicht darstellbar.
                        // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Wert (berechnete Opacity), siehe Auftrag 056 Entscheidung 2
                        style={{
                          opacity: 0.35 + (bIdx + 1) * 0.15,
                        }}
                      />
                    ))}
                  </div>

                  <p className="m-0 text-[11px] leading-[1.4] text-[var(--color-text-muted)] [overflow-wrap:anywhere]">
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
        <div className="rounded-md border border-solid border-border bg-[rgba(0,217,198,0.04)] flex justify-between items-center flex-wrap gap-[8px] min-w-0 px-[16px] py-[12px]">
          <div className="flex items-center gap-[10px] flex-wrap">
            <strong className="text-[13px] text-text">{totalRow[0]}</strong>
            <span className="font-mono text-[12px] font-bold rounded bg-[rgba(0,217,198,0.12)] text-primary px-[8px] py-[2px]">
              {totalRow[1]}
            </span>
          </div>
          <div className="font-mono text-[12px] text-[var(--color-text-muted)]">
            {totalRow[2]}
          </div>
        </div>
      )}
    </section>
  );
};
