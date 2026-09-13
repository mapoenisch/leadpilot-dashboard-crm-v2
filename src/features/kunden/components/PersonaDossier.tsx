import React from 'react';
import { BUYER_PERSONA_VOLKER } from '../../../domain/personaData';

export const PersonaDossier: React.FC = () => {
  const p = BUYER_PERSONA_VOLKER;

  return (
    <article
      className="facelift-persona-dossier box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)]"
      aria-label={`Entscheider-Dossier: ${p.name}`}
    >
      {/* Dossier Header mit Profil-Karte */}
      <div className="persona-header border-0 border-b border-solid border-[var(--color-border-soft,rgba(255,255,255,0.06))] flex justify-between items-start flex-wrap gap-[var(--space-3,12px)] pb-[var(--space-4,16px)]">
        <div className="flex gap-[14px] items-center">
          {/* Avatar-Badge */}
          <div className="flex items-center justify-center shrink-0 rounded-[10px] border border-solid border-[rgba(0,217,198,0.3)] bg-[rgba(0,217,198,0.12)] font-display text-[18px] font-extrabold text-primary w-[48px] h-[48px]">
            V
          </div>
          <div>
            <div className="flex items-center gap-[8px] flex-wrap">
              <span className="text-[11px] font-bold uppercase rounded bg-[rgba(0,217,198,0.15)] text-primary px-[6px] py-[2px]">
                ENTSCHEIDER-DOSSIER
              </span>
              <span className="text-[12px] text-[var(--color-text-muted)]">
                {p.age} Jahre · {p.role}
              </span>
            </div>
            <h3 className="persona-heading font-display text-[1.25rem] font-bold text-text mt-[4px] mb-0 mr-0 ml-0">
              {p.name}
            </h3>
          </div>
        </div>

        {/* Paket-Fit Badge */}
        <div className="rounded-[6px] border border-solid border-[rgba(255,154,102,0.25)] bg-[rgba(255,154,102,0.08)] text-[12px] leading-[1.35] max-w-[380px] text-accent px-[12px] py-[6px]">
          <strong className="block text-[11px] uppercase tracking-[0.04em]">Paket-Fit</strong>
          {p.packageFit}
        </div>
      </div>

      {/* Unternehmenskontext */}
      <div className="persona-company-context flex items-center gap-[8px] flex-wrap rounded-[6px] border border-solid border-[var(--color-border-soft,rgba(255,255,255,0.06))] bg-[rgba(255,255,255,0.03)] text-[13px] text-[var(--color-text-muted)] px-[12px] py-[8px]">
        <span className="font-semibold text-text">Referenzumfeld:</span>
        <span>{p.companyType}</span>
      </div>

      {/* Zitat */}
      <blockquote className="persona-quote m-0 italic text-[13.5px] leading-[1.45] border-0 border-l-[3px] border-solid border-l-primary bg-[rgba(0,217,198,0.05)] text-primary rounded-[0_var(--radius-sm,4px)_var(--radius-sm,4px)_0] px-[14px] py-[12px]">
        {p.quote}
      </blockquote>

      {/* 2-Spalten-Raster: Ziele vs. Schmerzpunkte */}
      <div className="persona-goals-pains-grid grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[var(--space-4,16px)]">
        {/* Ziele */}
        <div className="persona-goals-card rounded-md border border-solid border-[rgba(0,217,198,0.2)] bg-[rgba(0,217,198,0.03)] p-[var(--space-4,16px)] flex flex-col gap-[10px]">
          <div className="flex items-center gap-[8px]">
            <span className="w-[8px] h-[8px] rounded-full bg-primary" />
            <strong className="text-[13.5px] tracking-[0.02em] text-primary">
              Strategische Vertriebsziele
            </strong>
          </div>
          <ul className="m-0 flex flex-col gap-[8px] pl-[18px] text-[13px] leading-[1.4] text-text">
            {p.goals.map((goal, i) => (
              <li key={i}>{goal}</li>
            ))}
          </ul>
        </div>

        {/* Schmerzpunkte */}
        <div className="persona-pains-card rounded-md border border-solid border-[rgba(255,122,61,0.2)] bg-[rgba(255,122,61,0.04)] p-[var(--space-4,16px)] flex flex-col gap-[10px]">
          <div className="flex items-center gap-[8px]">
            <span className="w-[8px] h-[8px] rounded-full bg-accent" />
            <strong className="text-[13.5px] tracking-[0.02em] text-accent">
              Schmerzpunkte im Alltag (Pain Points)
            </strong>
          </div>
          <ul className="m-0 flex flex-col gap-[8px] pl-[18px] text-[13px] leading-[1.4] text-text">
            {p.painPoints.map((pain, i) => (
              <li key={i}>{pain}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Genutzte Kanäle */}
      <div className="persona-channels-row border-0 border-t border-solid border-[var(--color-border-soft,rgba(255,255,255,0.06))] flex items-center gap-[10px] flex-wrap pt-[var(--space-2,8px)]">
        <span className="text-[12px] font-semibold text-[var(--color-text-muted)]">
          Informations- & Kontaktkanäle:
        </span>
        <div className="flex gap-[8px] flex-wrap">
          {p.channels.map((ch, i) => (
            <span
              key={i}
              className="text-[12px] rounded border border-solid border-[var(--color-border-soft,rgba(255,255,255,0.08))] bg-[rgba(255,255,255,0.05)] text-text px-[8px] py-[3px]"
            >
              {ch}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
};
