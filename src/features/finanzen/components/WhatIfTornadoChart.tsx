import React, { useState } from 'react';
import { Table, Eye, EyeOff, ArrowRightLeft } from 'lucide-react';
import type { TornadoLeverItem } from '../services/whatIfModel';

export interface WhatIfTornadoChartProps {
  items: TornadoLeverItem[];
}

function formatEuro(val: number): string {
  const prefix = val > 0 ? '+' : '';
  if (Math.abs(val) >= 1000) {
    return `${prefix}${Math.round(val / 1000).toLocaleString('de-DE')} k€`;
  }
  return `${prefix}${Math.round(val).toLocaleString('de-DE')} €`;
}

export const WhatIfTornadoChart: React.FC<WhatIfTornadoChartProps> = ({ items }) => {
  const [showTable, setShowTable] = useState(false);

  // Maximale Auslenkung zur Skalierung der Balkenbreite (0 bis 100%)
  const maxDelta = Math.max(
    ...items.map((it) =>
      Math.max(Math.abs(it.favorableArrDelta), Math.abs(it.unfavorableArrDelta)),
    ),
    1000,
  );

  return (
    <div className="what-if-tornado-wrapper w-full" data-testid="what-if-tornado-chart">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft size={14} className="text-[#00D9C6]" aria-hidden="true" />
          <span className="text-xs text-text-muted">
            Sensitivitäts-Tornado (ARR-Delta bei ±20 % Hebel-Veränderung)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded border border-border bg-transparent px-2 py-1 text-[11px] text-text-muted hover:text-text cursor-pointer"
          aria-expanded={showTable}
          aria-label={showTable ? 'Tabelle verbergen' : 'Wertetabelle einblenden'}
        >
          <Table size={13} aria-hidden="true" />
          {showTable ? (
            <EyeOff size={13} aria-hidden="true" />
          ) : (
            <Eye size={13} aria-hidden="true" />
          )}
          <span>{showTable ? 'Tabelle verbergen' : 'Wertetabelle'}</span>
        </button>
      </div>

      {/* Tornado Diagramm-Container */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-slate-900/40 p-3.5">
        {/* Kopf-Legende */}
        <div className="grid grid-cols-[140px_1fr_2px_1fr] border-b border-border/80 pb-1.5 text-[11px] text-text-muted">
          <span>Hebel</span>
          <span className="pr-3 text-right text-[#FF7A3D]">◀ Ungünstiger Fall (Downside)</span>
          <span className="bg-slate-600" />
          <span className="pl-3 text-emerald-400">Günstiger Fall (Upside) ▶</span>
        </div>

        {items.map((item) => {
          const unfavWidthPercent = Math.max(
            8,
            Math.min(100, Math.round((Math.abs(item.unfavorableArrDelta) / maxDelta) * 100)),
          );
          const favWidthPercent = Math.max(
            8,
            Math.min(100, Math.round((Math.abs(item.favorableArrDelta) / maxDelta) * 100)),
          );

          return (
            <div
              key={item.key}
              data-testid={`tornado-row-${item.key}`}
              className="grid grid-cols-[140px_1fr_2px_1fr] items-center text-xs"
            >
              {/* Spalte 1: Label und aktueller Wert */}
              <div className="flex flex-col pr-2">
                <span className="font-semibold text-text">{item.label}</span>
                <span className="text-[11px] text-text-muted">
                  Ist: {item.currentValue.toLocaleString('de-DE')} {item.unit}
                </span>
              </div>

              {/* Spalte 2: Ungünstiger Balken (nach links) via SVG ohne Inline-Styles */}
              <div
                title={`Ungünstig (${item.unfavorableChange} → ${item.unfavorableValue.toLocaleString('de-DE')} ${item.unit}): ${formatEuro(item.unfavorableArrDelta)}`}
                className="relative flex h-6 items-center justify-end pr-1.5"
              >
                <svg
                  className="h-5 w-full"
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={`grad-unfav-${item.key}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF7A3D" />
                      <stop offset="100%" stopColor="#FF9A66" />
                    </linearGradient>
                  </defs>
                  <rect
                    x={100 - unfavWidthPercent}
                    y={0}
                    width={unfavWidthPercent}
                    height={20}
                    rx={3}
                    fill={`url(#grad-unfav-${item.key})`}
                  />
                </svg>
                <span className="pointer-events-none absolute right-3 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow-sm">
                  <span className="text-[10px] font-normal opacity-90">
                    ({item.unfavorableChange})
                  </span>
                  <span>{formatEuro(item.unfavorableArrDelta)}</span>
                </span>
              </div>

              {/* Spalte 3: Mittel-Achse (0-Linie) */}
              <div className="h-full w-[2px] bg-slate-600" />

              {/* Spalte 4: Günstiger Balken (nach rechts) via SVG ohne Inline-Styles */}
              <div
                title={`Günstig (${item.favorableChange} → ${item.favorableValue.toLocaleString('de-DE')} ${item.unit}): ${formatEuro(item.favorableArrDelta)}`}
                className="relative flex h-6 items-center justify-start pl-1.5"
              >
                <svg
                  className="h-5 w-full"
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={`grad-fav-${item.key}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00D9C6" />
                      <stop offset="100%" stopColor="#3DDC97" />
                    </linearGradient>
                  </defs>
                  <rect
                    x={0}
                    y={0}
                    width={favWidthPercent}
                    height={20}
                    rx={3}
                    fill={`url(#grad-fav-${item.key})`}
                  />
                </svg>
                <span className="pointer-events-none absolute left-3 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                  <span>{formatEuro(item.favorableArrDelta)}</span>
                  <span className="text-[10px] font-normal opacity-90">
                    ({item.favorableChange})
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {showTable && (
        <div
          data-testid="what-if-tornado-table"
          className="mt-4 overflow-x-auto rounded-md border border-border"
        >
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-text font-semibold">
                <th className="px-2.5 py-1.5 font-semibold">Hebel</th>
                <th className="px-2.5 py-1.5 font-semibold">Aktueller Wert</th>
                <th className="px-2.5 py-1.5 font-semibold">Ungünstiger Fall (Downside)</th>
                <th className="px-2.5 py-1.5 font-semibold">Günstiger Fall (Upside)</th>
                <th className="px-2.5 py-1.5 font-semibold">Hebel-Spannweite (Swing)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {items.map((row) => (
                <tr key={row.key} className="hover:bg-surface-raised/40">
                  <td className="px-2.5 py-1.5 font-semibold text-text">{row.label}</td>
                  <td className="px-2.5 py-1.5 text-text">
                    {row.currentValue.toLocaleString('de-DE')} {row.unit}
                  </td>
                  <td className="px-2.5 py-1.5 text-[#FF7A3D]">
                    {formatEuro(row.unfavorableArrDelta)} ({row.unfavorableChange} →{' '}
                    {row.unfavorableValue.toLocaleString('de-DE')} {row.unit})
                  </td>
                  <td className="px-2.5 py-1.5 text-emerald-400">
                    {formatEuro(row.favorableArrDelta)} ({row.favorableChange} →{' '}
                    {row.favorableValue.toLocaleString('de-DE')} {row.unit})
                  </td>
                  <td className="px-2.5 py-1.5 font-semibold text-[#00D9C6]">
                    {formatEuro(row.swing)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
