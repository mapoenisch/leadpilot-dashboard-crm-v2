import React from 'react';
import { getTeamHrSnapshot } from '@/domain/executiveCockpitData';
import { Users, ShieldAlert } from 'lucide-react';

export const TeamHrSnapshot: React.FC = () => {
  const { structure, metrics, bottlenecks } = getTeamHrSnapshot();

  return (
    <div
      data-testid="team-hr-snapshot"
      className="flex flex-col gap-[16px] w-full relative overflow-hidden rounded-[6px]"
    >
      {/* Szenisches, dekoratives Visual-Asset für räumliche Tiefenwirkung (G15-konform) */}
      <img
        src="/assets/organisation/team-structure-backdrop.webp"
        alt=""
        aria-hidden="true"
        width={1600}
        height={900}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-[0.65] pointer-events-none z-0"
      />

      {/* Inhaltsebene über dem szenischen Backdrop */}
      <div className="relative z-[1] flex flex-col gap-[16px] w-full">
        {/* Organigramm Struktur — Reines semantisches DOM mit Verbindungslinien */}
        <div className="flex flex-col items-center gap-[10px] w-full">
          {/* CEO Root Node */}
          <div className="text-center rounded-[6px] border border-solid border-[rgba(0,217,198,0.45)] bg-[rgba(5,20,19,0.55)] backdrop-blur-[6px] shadow-[0_0_20px_rgba(0,217,198,0.25)] max-w-[320px] w-full px-[16px] py-[10px]">
            <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#00D9C6]">
              {structure.root.role} · {structure.root.fte}
            </div>
            <div className="text-[13px] font-semibold mt-[2px] text-[#FFFFFF]">
              {structure.root.staffing}
            </div>
          </div>

          {/* Vertikale Verbindungslinie */}
          <div className="w-[2px] h-[14px] bg-[linear-gradient(180deg,#00D9C6_0%,rgba(0,217,198,0.4)_100%)] shadow-[0_0_8px_rgba(0,217,198,0.4)]" />

          {/* 4 Fachbereiche Grid */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-[10px] w-full">
            {structure.units.map((unit) => {
              const hasWarning = unit.staffing.includes('kritisch') || unit.staffing.includes('ausgereizt');
              // G39 Welle 1: Warn-Farben aus Build-Zeit-bekannten Werten →
              // Klassen-Ternaries (Muster Auftrag 053 Nachtrag 2), kein style.
              const cardClass = hasWarning
                ? 'border-[rgba(255,122,61,0.4)] bg-[rgba(255,122,61,0.12)] shadow-[0_0_12px_rgba(255,122,61,0.15)]'
                : 'border-[rgba(0,217,198,0.3)] bg-[rgba(5,20,19,0.50)] shadow-[0_0_12px_rgba(0,217,198,0.10)]';
              const fteClass = hasWarning
                ? 'text-[#FF7A3D] bg-[rgba(255,122,61,0.15)]'
                : 'text-[#00D9C6] bg-[rgba(0,217,198,0.12)]';

              return (
                <div
                  key={unit.role}
                  className={`flex flex-col justify-between gap-[6px] rounded-[6px] border border-solid backdrop-blur-[6px] px-[12px] py-[10px] ${cardClass}`}
                >
                  <div className="flex justify-between items-start gap-[4px]">
                    <span className="text-[11.5px] font-semibold text-[#FFFFFF]">
                      {unit.role}
                    </span>
                    <span className={`text-[10.5px] font-bold rounded-[3px] whitespace-nowrap px-[5px] py-[1px] ${fteClass}`}>
                      {unit.fte}
                    </span>
                  </div>
                  <div className="text-[10.5px] leading-[1.35] text-[var(--color-text-muted)]">
                    {unit.staffing}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gesamtbestand Leiste */}
          <div className="flex justify-between items-center w-full border border-solid border-[rgba(0,217,198,0.22)] rounded-[4px] bg-[rgba(5,18,17,0.55)] backdrop-blur-[6px] mt-[2px] px-[12px] py-[8px]">
            <span className="flex items-center gap-[6px] text-[11px] text-[var(--color-text-muted)]">
              <Users size={13} color="#00D9C6" />
              <span>{structure.total.role}: <strong className="text-[#FFFFFF]">{structure.total.fte}</strong></span>
            </span>
            <span className="text-[11px] font-semibold text-[#00D9C6]">
              {structure.total.staffing}
            </span>
          </div>
        </div>

        {/* HR-Metriken & Engpässe Split */}
        <div className="border-0 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[12px] border-t border-solid border-[rgba(0,217,198,0.12)] pt-[14px]">
          {/* Metriken */}
          <div className="flex flex-col gap-[6px] border border-solid border-[rgba(0,217,198,0.18)] rounded-[6px] bg-[rgba(5,20,19,0.50)] backdrop-blur-[6px] px-[12px] py-[10px]">
            <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--color-text-muted)]">
              Personal-Kennzahlen
            </div>
            {metrics.slice(2, 6).map((m) => (
              <div
                key={m.label}
                className="border-0 flex justify-between items-center text-[11.5px] border-b border-solid border-[rgba(255,255,255,0.04)] px-0 py-[4px]"
              >
                <span className="text-[var(--color-text-muted)]">{m.label}</span>
                <span className="font-semibold text-right text-[#E2E8F0]">{m.val}</span>
              </div>
            ))}
          </div>

          {/* Kritische Engpässe */}
          <div className="flex flex-col gap-[6px] border border-solid border-[rgba(255,122,61,0.3)] rounded-[6px] bg-[rgba(255,122,61,0.08)] backdrop-blur-[6px] px-[12px] py-[10px]">
            <div className="flex items-center gap-[5px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#FF7A3D]">
              <ShieldAlert size={14} />
              <span>Kritische Personal-Engpässe</span>
            </div>
            <ul className="m-0 flex flex-col gap-[4px] pl-[16px]">
              {bottlenecks.slice(0, 3).map((b, idx) => (
                <li key={idx} className="text-[11px] leading-[1.35] text-[#FFD4C2]">
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
