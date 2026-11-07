import React from 'react';
import type { TileOverview } from '../../data/dashboardData';

export const PrintOverviewCard: React.FC<{ overview: TileOverview }> = ({ overview }) => {
  if (overview.kind === 'team_hr') {
    const { metrics, structure, bottlenecks } = overview.data;
    return (
      <div data-testid="print-overview-team-hr" className="space-y-2 text-left">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Team-Kennzahlen
          </span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {metrics.slice(0, 4).map((m) => (
              <div key={m.label} className="text-[11px] leading-tight">
                <span className="text-slate-500">{m.label}: </span>
                <strong className="text-slate-800">{m.val}</strong>
              </div>
            ))}
          </div>
        </div>
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Teamstruktur ({structure.total.fte} gesamt)
          </span>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-700">
            {structure.units.slice(0, 4).map((u) => (
              <span key={u.role}>
                <span className="text-slate-500">{u.role}:</span>{' '}
                <strong className="text-slate-800">{u.fte}</strong>
              </span>
            ))}
          </div>
        </div>
        {bottlenecks.length > 0 && (
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-0.5">
              Engpässe &amp; Maßnahmen
            </span>
            <ul className="list-disc list-inside text-[10px] text-slate-700 space-y-0.5">
              {bottlenecks.slice(0, 2).map((b) => (
                <li key={b} className="truncate">
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (overview.kind === 'roadmap') {
    return (
      <div data-testid="print-overview-roadmap" className="space-y-1.5 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Geplante Releases &amp; Roadmap
        </span>
        <div className="space-y-1">
          {overview.data.releases.slice(0, 4).map((r) => (
            <div
              key={`${r.quarter}-${r.title}`}
              className="flex justify-between items-baseline text-[11px] border-b border-slate-50 pb-0.5 last:border-0"
            >
              <div className="min-w-0 pr-2">
                <strong className="text-slate-900">{r.quarter}</strong>:{' '}
                <span className="text-slate-700">{r.title}</span>
                <span className="block text-[10px] text-slate-400 truncate">{r.desc}</span>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (overview.kind === 'meilensteine') {
    return (
      <div data-testid="print-overview-meilensteine" className="space-y-1.5 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          Unternehmensmeilensteine
        </span>
        <div className="space-y-1">
          {overview.data.slice(0, 4).map((ev) => (
            <div
              key={`${ev.date}-${ev.title}`}
              className="flex justify-between items-baseline text-[11px]"
            >
              <span className="text-slate-800 font-medium pr-2 truncate">{ev.title}</span>
              <span className="shrink-0 font-mono text-[10px] text-slate-500">{ev.date}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="print-overview-live-aktivitaet" className="space-y-1 text-left">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
        Live-Aktivitätsstrom
      </span>
      <div className="space-y-1">
        {overview.data.slice(0, 4).map((item) => (
          <div key={item.kpiId} className="flex justify-between items-baseline text-[11px]">
            <span className="text-slate-700">{item.kpiId}</span>
            <span className="font-mono font-semibold text-slate-900">
              {item.value} {item.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
