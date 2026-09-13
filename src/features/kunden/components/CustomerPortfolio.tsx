import React, { useState, useMemo } from 'react';
import { TOP10 } from '../../../domain/kundenData';
import { Table } from '../../../components/ui/Table';

interface ParsedCustomer {
  name: string;
  branche: string;
  mitarbeiter: number;
  paket: string;
  nutzer: number;
  arr: number;
  arrFormatted: string;
}

const BRANCHE_STYLES: Record<
  string,
  { color: string; symbol: string; shape: 'circle' | 'rect' | 'diamond' | 'triangle' }
> = {
  Maschinenbau: { color: '#00D9C6', symbol: '●', shape: 'circle' },
  'IT & Software': { color: '#7CEFE6', symbol: '■', shape: 'rect' },
  Großhandel: { color: '#FF7A3D', symbol: '◆', shape: 'diamond' },
  Agenturen: { color: '#FF9A66', symbol: '▲', shape: 'triangle' },
};

export const CustomerPortfolio: React.FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(true);

  // Parsing der TOP10-Zeilen
  const customers: ParsedCustomer[] = useMemo(() => {
    return TOP10.rows.map((r: string[]) => {
      const name = r[0];
      const branche = r[1];
      const mitarbeiter = parseInt(r[2], 10);
      const paket = r[3];
      const nutzer = parseInt(r[4], 10);
      const arr = parseInt(r[5].replace(/\./g, '').replace(' €', ''), 10);
      return { name, branche, mitarbeiter, paket, nutzer, arr, arrFormatted: r[5] };
    });
  }, []);

  // Tatsächliche Wertebereiche der Daten
  const actualMinNutzer = Math.min(...customers.map((c) => c.nutzer)); // 5
  const actualMaxNutzer = Math.max(...customers.map((c) => c.nutzer)); // 16
  const actualMinArr = Math.min(...customers.map((c) => c.arr)); // 2940
  const actualMaxArr = Math.max(...customers.map((c) => c.arr)); // 15360

  // Programmatisch gepolsterte Achsenbereiche
  const axisMinNutzer = Math.max(0, actualMinNutzer - 1); // 4
  const axisMaxNutzer = actualMaxNutzer + 2; // 18
  const axisMinArr = Math.max(0, Math.floor(actualMinArr / 1000) * 1000 - 1000); // 1000 oder 2000
  const axisMaxArr = Math.ceil(actualMaxArr / 1000) * 1000 + 1000; // 17000

  // SVG-Koordinaten
  const svgWidth = 840;
  const svgHeight = 440;
  const padLeft = 80;
  const padRight = 50;
  const padTop = 40;
  const padBottom = 60;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (nutzer: number) => {
    return padLeft + ((nutzer - axisMinNutzer) / (axisMaxNutzer - axisMinNutzer)) * plotWidth;
  };

  const getY = (arr: number) => {
    return padTop + plotHeight - ((arr - axisMinArr) / (axisMaxArr - axisMinArr)) * plotHeight;
  };

  // Y-Achsen Ticks (z. B. 4k, 8k, 12k, 16k)
  const yTicks = [4000, 8000, 12000, 16000].filter((v) => v >= axisMinArr && v <= axisMaxArr);
  // X-Achsen Ticks (z. B. 6, 9, 12, 15, 18)
  const xTicks = [6, 8, 10, 12, 14, 16, 18].filter((v) => v >= axisMinNutzer && v <= axisMaxNutzer);

  return (
    <section
      className="facelift-customer-portfolio box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)]"
      aria-label="Kundenportfolio Raumkarte"
    >
      {/* Header */}
      <div className="portfolio-header flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.05em] uppercase px-[8px] py-[2px]">
            PORTFOLIO-RAUMKARTE
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            2D-Portfolio nach ARR und aktiven Nutzern
          </span>
        </div>

        <h3 className="portfolio-heading m-0 font-display text-[1.25rem] font-bold text-text break-words [overflow-wrap:break-word]">
          {TOP10.title}
        </h3>

        <div className="flex gap-[8px] flex-wrap items-center text-[12px] text-[var(--color-text-muted)] [overflow-wrap:break-word] break-words">
          <span>
            Tatsächlicher Wertebereich:{' '}
            <strong>
              {actualMinNutzer}–{actualMaxNutzer} aktive Nutzer
            </strong>
          </span>
          <span>·</span>
          <span>
            <strong>
              {actualMinArr.toLocaleString('de-DE')}–{actualMaxArr.toLocaleString('de-DE')} € ARR
            </strong>
          </span>
          <span>·</span>
          <span>10 ICP-Referenzkunden (&lt; 200 MA)</span>
        </div>
      </div>

      {/* 2D-Raumkarte (SVG-Scatter-Diagramm) */}
      <div className="portfolio-canvas-container w-full rounded-md border border-solid border-[var(--color-border-soft,rgba(255,255,255,0.08))] bg-[rgba(0,0,0,0.25)] box-border overflow-x-auto p-[12px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="block w-full h-auto min-w-[500px]"
          role="img"
          aria-label="2D-Streudiagramm: ARR über aktive Nutzer für 10 Referenzkunden"
        >
          {/* Hintergrund-Gitter */}
          {yTicks.map((yVal) => {
            const y = getY(yVal);
            return (
              <g key={`grid-y-${yVal}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--color-text-muted)"
                  fontSize="11"
                  fontFamily="sans-serif"
                >
                  {yVal.toLocaleString('de-DE')} €
                </text>
              </g>
            );
          })}

          {xTicks.map((xVal) => {
            const x = getX(xVal);
            return (
              <g key={`grid-x-${xVal}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={svgHeight - padBottom}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={svgHeight - padBottom + 20}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize="11"
                  fontFamily="sans-serif"
                >
                  {xVal} Nutzer
                </text>
              </g>
            );
          })}

          {/* Achsenlinien */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={svgHeight - padBottom}
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          <line
            x1={padLeft}
            y1={svgHeight - padBottom}
            x2={svgWidth - padRight}
            y2={svgHeight - padBottom}
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />

          {/* Achsenbeschriftungen */}
          <text
            x={padLeft}
            y={padTop - 15}
            fill="var(--color-text)"
            fontSize="12"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            ↑ ARR (€)
          </text>
          <text
            x={svgWidth - padRight}
            y={svgHeight - padBottom + 38}
            textAnchor="end"
            fill="var(--color-text)"
            fontSize="12"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            Aktive Nutzer (Seats) →
          </text>

          {/* Datenpunkte für alle 10 Referenzkunden */}
          {customers.map((c, i) => {
            let cx = getX(c.nutzer);
            let cy = getY(c.arr);

            // Leichter Versatz für Punkte mit identischen Koordinaten (10 Nutzer, 10.680 €), damit alle Formen sichtbar sind
            if (c.name === 'Northwind GmbH') {
              cx -= 7;
              cy -= 5;
            } else if (c.name === 'Brightline Solutions') {
              cx += 7;
              cy -= 5;
            } else if (c.name === 'Hansa Automation') {
              cy += 7;
            }

            const style = BRANCHE_STYLES[c.branche] || {
              color: '#00D9C6',
              symbol: '●',
              shape: 'circle',
            };
            const isSelected = selectedCustomer === c.name;

            // Kollisionsfreie Label-Ausrichtung
            let labelX = cx;
            let labelY = cy - 14;
            let textAnchor: 'start' | 'middle' | 'end' = 'middle';

            if (c.name === 'Northwind GmbH') {
              labelX = cx - 12;
              labelY = cy - 14;
              textAnchor = 'end';
            } else if (c.name === 'Brightline Solutions') {
              labelX = cx + 12;
              labelY = cy - 14;
              textAnchor = 'start';
            } else if (c.name === 'Hansa Automation') {
              labelX = cx;
              labelY = cy + 24;
              textAnchor = 'middle';
            } else if (c.name === 'Delta Labs') {
              labelX = cx - 12;
              labelY = cy - 14;
              textAnchor = 'end';
            } else if (c.name === 'Kestrel Components') {
              labelX = cx + 14;
              labelY = cy + 18;
              textAnchor = 'start';
            } else if (c.name === 'Siegfried Precision') {
              labelX = cx - 12;
              labelY = cy - 14;
              textAnchor = 'end';
            } else if (c.name === 'Vektor Dynamics') {
              labelX = cx - 12;
              labelY = cy - 14;
              textAnchor = 'end';
            } else if (c.name === 'Fenwick Co.') {
              labelX = cx;
              labelY = cy + 22;
              textAnchor = 'middle';
            } else if (c.name === 'Konzett Systems') {
              labelX = cx - 12;
              labelY = cy + 18;
              textAnchor = 'end';
            } else if (c.name === 'Ocular Systems') {
              labelX = cx;
              labelY = cy + 22;
              textAnchor = 'middle';
            }

            return (
              <g
                key={c.name}
                className={`portfolio-point portfolio-point-${i} cursor-pointer`}
                onClick={() => setSelectedCustomer(isSelected ? null : c.name)}
              >
                {/* Fokus-/Hover-Ring */}
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="16"
                    fill="none"
                    stroke={style.color}
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Formcodierter Punkt */}
                {style.shape === 'circle' && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="8"
                    fill={style.color}
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                )}
                {style.shape === 'rect' && (
                  <rect
                    x={cx - 7}
                    y={cy - 7}
                    width="14"
                    height="14"
                    fill={style.color}
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                )}
                {style.shape === 'diamond' && (
                  <polygon
                    points={`${cx},${cy - 9} ${cx + 8},${cy} ${cx},${cy + 9} ${cx - 8},${cy}`}
                    fill={style.color}
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                )}
                {style.shape === 'triangle' && (
                  <polygon
                    points={`${cx},${cy - 9} ${cx + 8},${cy + 7} ${cx - 8},${cy + 7}`}
                    fill={style.color}
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                )}

                {/* Textlabel mit Kunde & ARR */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={textAnchor}
                  fill={isSelected ? '#FFF' : 'var(--color-text)'}
                  fontSize="11"
                  fontWeight={isSelected ? 'bold' : '600'}
                  fontFamily="sans-serif"
                >
                  {c.name} ({c.arrFormatted})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Form- & Farblegende (Nicht nur farbcodiert!) */}
      <div className="portfolio-legend flex justify-between items-center flex-wrap gap-[12px] rounded-[6px] border border-solid border-[var(--color-border-soft,rgba(255,255,255,0.06))] bg-[rgba(255,255,255,0.03)] text-[12px] px-[12px] py-[8px]">
        <div className="flex gap-[16px] flex-wrap items-center">
          <strong className="text-text">Legende Branchen:</strong>
          {Object.entries(BRANCHE_STYLES).map(([branche, s]) => (
            <div key={branche} className="flex items-center gap-[6px]">
              <span
                className="text-[14px] leading-[1]"
                // G39 Welle 2: Symbolfarbe aus Domain-Daten (BRANCHE_STYLES).
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Domain-Daten), siehe Auftrag 055 Entscheidung 2
                style={{ color: s.color }}
              >
                {s.symbol}
              </span>
              <span className="text-text">{branche}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.1)] cursor-pointer font-semibold text-[11.5px] text-primary px-[10px] py-[4px]"
        >
          {showTable ? 'Tabelle ausblenden' : 'Tabelle anzeigen'}
        </button>
      </div>

      {/* Bestehende Tabelle (bleibt verfügbar) */}
      {showTable && (
        <div className="portfolio-table-wrapper mt-[4px]">
          <Table
            columns={TOP10.headers.map((h: string, i: number) => ({ key: String(i), label: h }))}
            rows={TOP10.rows.map((r: string[]) => ({
              0: r[0],
              1: r[1],
              2: r[2],
              3: r[3],
              4: r[4],
              5: r[5],
            }))}
          />
        </div>
      )}
    </section>
  );
};
