import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Table, Eye, EyeOff } from 'lucide-react';
import type { MonthlyProjectionPoint } from '../services/whatIfModel';

export interface WhatIfProjectionChartProps {
  data: MonthlyProjectionPoint[];
}

function formatEuroShort(val: number): string {
  if (Math.abs(val) >= 1000000) {
    return `${(val / 1000000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`;
  }
  if (Math.abs(val) >= 1000) {
    return `${Math.round(val / 1000).toLocaleString('de-DE')} k€`;
  }
  return `${Math.round(val).toLocaleString('de-DE')} €`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomProjectionTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const whatIfItem = payload.find((p) => p.name.includes('What-If'));
  const baseItem = payload.find((p) => p.name.includes('Baseline'));
  const whatIfVal = Number(whatIfItem?.value) || 0;
  const baseVal = Number(baseItem?.value) || 0;
  const delta = whatIfVal - baseVal;

  return (
    <div className="min-w-[180px] rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-100 shadow-2xl">
      <div className="mb-1.5 font-semibold text-slate-400">{label}</div>
      <div className="mb-1 flex justify-between gap-4">
        <span className="text-[#00D9C6]">What-If ARR:</span>
        <span className="font-semibold">{whatIfVal.toLocaleString('de-DE')} €</span>
      </div>
      <div className="mb-1 flex justify-between gap-4">
        <span className="text-slate-400">Baseline Plan:</span>
        <span>{baseVal.toLocaleString('de-DE')} €</span>
      </div>
      <div
        className={`mt-1 flex justify-between gap-4 border-t border-slate-800 pt-1 font-semibold ${
          delta >= 0 ? 'text-emerald-400' : 'text-[#FF7A3D]'
        }`}
      >
        <span>Delta:</span>
        <span>
          {delta >= 0 ? '+' : ''}
          {delta.toLocaleString('de-DE')} €
        </span>
      </div>
    </div>
  );
};

export const WhatIfProjectionChart: React.FC<WhatIfProjectionChartProps> = ({ data }) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="what-if-chart-wrapper w-full" data-testid="what-if-projection-chart">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-text-muted">
          12-Monats-Verlauf: Baseline (Plan 2026) vs. Sensitivitäts-Projektion
        </span>
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

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatEuroShort}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomProjectionTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />
            <Line
              type="monotone"
              dataKey="baselineArr"
              name="Baseline Plan-ARR"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, stroke: '#94a3b8' }}
            />
            <Line
              type="monotone"
              dataKey="whatIfArr"
              name="What-If Projektion"
              stroke="#00D9C6"
              strokeWidth={3}
              dot={{ r: 3, fill: '#00D9C6' }}
              activeDot={{ r: 6, fill: '#00D9C6', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showTable && (
        <div
          data-testid="what-if-projection-table"
          className="mt-4 max-h-56 overflow-x-auto rounded-md border border-border"
        >
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-text font-semibold">
                <th className="px-2.5 py-1.5 font-semibold">Monat</th>
                <th className="px-2.5 py-1.5 font-semibold">Baseline ARR</th>
                <th className="px-2.5 py-1.5 font-semibold">What-If ARR</th>
                <th className="px-2.5 py-1.5 font-semibold">Delta</th>
                <th className="px-2.5 py-1.5 font-semibold">Kunden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {data.map((row) => (
                <tr key={row.month} className="hover:bg-surface-raised/40">
                  <td className="px-2.5 py-1.5 font-semibold text-text">{row.monthLabel}</td>
                  <td className="px-2.5 py-1.5 text-text-muted">
                    {row.baselineArr.toLocaleString('de-DE')} €
                  </td>
                  <td className="px-2.5 py-1.5 font-semibold text-[#00D9C6]">
                    {row.whatIfArr.toLocaleString('de-DE')} €
                  </td>
                  <td
                    className={`px-2.5 py-1.5 font-semibold ${
                      row.deltaArr >= 0 ? 'text-emerald-400' : 'text-[#FF7A3D]'
                    }`}
                  >
                    {row.deltaArr >= 0 ? '+' : ''}
                    {row.deltaArr.toLocaleString('de-DE')} €
                  </td>
                  <td className="px-2.5 py-1.5 text-text">{row.customers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
