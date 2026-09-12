import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { STANDORT } from '@/domain/unternehmenData';
import {
  MapPin,
  Maximize2,
  FileText,
  Coins,
  ShieldCheck,
  Home,
  Building,
  type LucideIcon,
} from 'lucide-react';

import heroImage from '../../../../assets/facelift/unternehmen/unternehmen-aussen-augustusplatz.png';
import receptionImage from '../../../../assets/facelift/unternehmen/unternehmen-innen-empfang.png';
import meetingImage from '../../../../assets/facelift/unternehmen/unternehmen-innen-besprechung.png';
import workspaceImage from '../../../../assets/facelift/unternehmen/unternehmen-innen-workspace.png';
import logoImage from '../../../../assets/logo/leadpilot-logo-full.png';

const DETAIL_ICONS: Record<string, LucideIcon> = {
  Standort: MapPin,
  Fläche: Maximize2,
  Mietvertrag: FileText,
  'Mietkosten 2025': Coins,
  Mietkaution: ShieldCheck,
  Eigentum: Home,
};

const DETAIL_STRUCTURAL_TAGS: readonly string[] = [
  'DETAIL 01 // STANDORT',
  'DETAIL 02 // MIETOBJEKT',
  'DETAIL 03 // VERTRAGSDATEN',
  'DETAIL 04 // OPEX',
  'DETAIL 05 // KAUTION',
  'DETAIL 06 // STATUS',
];

const SUB_STATIONS = [
  {
    id: 'empfang',
    title: 'Empfangsbereich',
    src: receptionImage,
    alt: 'Fiktive Visualisierung: Empfangsbereich der LeadPilot Geschäftsräume',
  },
  {
    id: 'besprechung',
    title: 'Besprechungsraum',
    src: meetingImage,
    alt: 'Fiktive Visualisierung: Besprechungsraum in den LeadPilot Geschäftsräumen',
  },
  {
    id: 'workspace',
    title: 'Arbeitsbereich',
    src: workspaceImage,
    alt: 'Fiktive Visualisierung: Arbeitsbereich in den LeadPilot Geschäftsräumen',
  },
];

export function LocationPage() {
  return (
    <div className="unternehmen-v2-container flex flex-col gap-[28px] w-full">
      <SectionHeader
        eyebrow="Unternehmen · Standort"
        title={STANDORT.title}
        description={STANDORT.address}
      />

      {/* GROSSES LEITBILD (HERO STATION): AUSSENANSICHT AUGUSTUSPLATZ */}
      <div className="rounded-[10px] overflow-hidden bg-[#04100F] border border-solid border-[rgba(0,217,198,0.35)] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5),0_0_24px_rgba(0,217,198,0.12)]">
        <div className="relative w-full bg-[#081C1A] overflow-hidden">
          <img
            src={heroImage}
            alt="Fiktive Visualisierung: Außenansicht des Unternehmenssitzes am Augustusplatz in Leipzig"
            width={1672}
            height={941}
            fetchPriority="high"
            className="w-full h-auto block"
          />

          {/* Overline-Label: FIKTIVE VISUALISIERUNG */}
          <div className="absolute top-[14px] left-[14px] bg-[rgba(3,12,11,0.92)] border border-solid border-[rgba(0,217,198,0.45)] rounded-[4px] px-[9px] py-[4px] font-mono text-[11px] font-bold text-[#00D9C6] tracking-[0.08em] uppercase z-[2]">
            FIKTIVE VISUALISIERUNG
          </div>

          {/* LeadPilot-Logo-Overlay (dekorativ) */}
          <div className="absolute top-[14px] right-[14px] bg-[rgba(3,12,11,0.92)] border border-solid border-[rgba(0,217,198,0.3)] rounded-[4px] px-[12px] py-[6px] flex items-center z-[2] shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
            <img
              src={logoImage}
              alt=""
              aria-hidden="true"
              width={2431}
              height={1093}
              className="h-[18px] w-auto block"
            />
          </div>
        </div>

        {/* Bildunterschrift / Headerzeile */}
        <div className="px-[24px] py-[16px] bg-[rgba(6,22,20,0.95)] border-t border-solid border-t-[rgba(0,217,198,0.2)] flex flex-wrap items-center justify-between gap-[12px]">
          <div>
            <h3 className="m-0 font-display text-[16px] font-bold text-[#FFFFFF]">
              Unternehmenssitz · Augustusplatz 9
            </h3>
            <p className="mt-[3px] mr-0 mb-0 ml-0 text-[13px] text-[#9BB2B0]">
              {STANDORT.address}
            </p>
          </div>

          <span className="text-[11px] font-mono px-[9px] py-[3px] rounded-[4px] bg-[rgba(0,217,198,0.1)] text-[#00D9C6] border border-solid border-[rgba(0,217,198,0.3)] font-bold">
            MIETOBJEKT
          </span>
        </div>
      </div>

      {/* DREI INNENANSICHTEN (GRID) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-[16px]">
        {SUB_STATIONS.map((station) => (
          <div
            key={station.id}
            className="bg-[#04100F] rounded-[8px] border border-solid border-[rgba(0,217,198,0.25)] overflow-hidden flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
          >
            <div className="relative w-full bg-[#081C1A] overflow-hidden">
              <img
                src={station.src}
                alt={station.alt}
                width={1672}
                height={941}
                loading="lazy"
                className="w-full h-auto block"
              />

              {/* Overline-Label */}
              <div className="absolute top-[10px] left-[10px] bg-[rgba(3,12,11,0.92)] border border-solid border-[rgba(0,217,198,0.4)] rounded-[3px] px-[7px] py-[3px] font-mono text-[9.5px] font-bold text-[#00D9C6] tracking-[0.06em] uppercase z-[2]">
                FIKTIVE VISUALISIERUNG
              </div>

              {/* Logo-Overlay */}
              <div className="absolute top-[10px] right-[10px] bg-[rgba(3,12,11,0.92)] border border-solid border-[rgba(0,217,198,0.25)] rounded-[3px] px-[8px] py-[4px] flex items-center z-[2]">
                <img
                  src={logoImage}
                  alt=""
                  aria-hidden="true"
                  width={2431}
                  height={1093}
                  className="h-[14px] w-auto block"
                />
              </div>
            </div>

            <div className="px-[16px] py-[12px] bg-[rgba(6,22,20,0.95)] border-t border-solid border-t-[rgba(0,217,198,0.15)] flex items-center justify-between">
              <h4 className="m-0 text-[13.5px] font-semibold text-[#FFFFFF] font-display">
                {station.title}
              </h4>
              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                FIKTIV
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* HEADQUARTERS STANDORT-FLÄCHE (MIT DEKORATIVEM GRID-BACKDROP DAHINTER) */}
      <div
        data-testid="location-headquarters"
        className="unternehmen-v2-hq-panel relative rounded-[10px] overflow-hidden border border-solid border-[rgba(0,217,198,0.35)] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.5),0_0_24px_rgba(0,217,198,0.12)] bg-[linear-gradient(135deg,rgba(8,28,26,0.95)_0%,rgba(4,16,15,0.92)_100%)]"
      >
        {/* Ergänzender dekorativer Koordinaten-/Grundriss-Hintergrund */}
        <img
          src="/assets/unternehmen/location-grid-backdrop.webp"
          alt=""
          aria-hidden="true"
          width={1600}
          height={900}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.35] pointer-events-none z-0"
        />

        {/* DOM-Inhaltsebene über dem Backdrop */}
        <div className="relative z-[1] px-[28px] py-[24px] flex flex-col gap-[16px] backdrop-blur-[4px]">
          {/* Top Status-Bar mit neutralen Strukturkennzeichnungen */}
          <div className="flex justify-between items-center flex-wrap gap-[8px]">
            <div className="flex items-center gap-[8px]">
              <span className="inline-block w-[8px] h-[8px] rounded-full bg-[#00D9C6] shadow-[0_0_8px_#00D9C6]" />
              <span className="text-[11px] font-bold tracking-[0.08em] text-[#00D9C6] font-mono">
                HEADQUARTERS // STANDORTDATEN
              </span>
            </div>
            <div className="flex items-center text-[11px] text-[var(--color-text-muted)] font-mono bg-[rgba(0,217,198,0.08)] border border-solid border-[rgba(0,217,198,0.2)] px-[8px] py-[2px] rounded-[4px]">
              VERTRAGSDATEN
            </div>
          </div>

          {/* Address Block */}
          <div className="flex items-center gap-[16px] flex-wrap">
            <div className="w-[44px] h-[44px] rounded-[8px] bg-[rgba(0,217,198,0.12)] border border-solid border-[rgba(0,217,198,0.4)] flex items-center justify-center text-[#00D9C6] shadow-[0_0_16px_rgba(0,217,198,0.2)] shrink-0">
              <Building size={22} />
            </div>

            <div className="flex flex-col gap-[2px]">
              <div className="text-[11px] text-[var(--color-text-muted)] font-mono">
                OFFIZIELLE ANSCHRIFT
              </div>
              <h3 className="m-0 text-[20px] font-bold text-[#FFFFFF] font-display tracking-[-0.01em]">
                {STANDORT.address}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* 6 STRUKTURIERTE TECHNISCHE DATEN-PANELS AUS STANDORT.details */}
      <div className="flex flex-col gap-[14px]">
        <div className="flex justify-between items-baseline">
          <div>
            <div className="text-[11px] font-bold text-[#00D9C6] tracking-[0.08em] uppercase">
              Vertrags- & Mietparameter
            </div>
            <h3 className="mt-[2px] mr-0 mb-0 ml-0 text-[18px] font-bold text-[#FFFFFF] font-display">
              Standortdetails & Mietdaten
            </h3>
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
            6 KENNDATENSÄTZE
          </span>
        </div>

        <div className="unternehmen-v2-details-grid grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[16px]">
          {STANDORT.details.map(([key, val], idx) => {
            const Icon = DETAIL_ICONS[key] || Building;
            const tag = DETAIL_STRUCTURAL_TAGS[idx] || `DETAIL 0${idx + 1}`;

            return (
              <div
                key={key}
                className="unternehmen-v2-detail-card bg-[linear-gradient(180deg,rgba(7,24,22,0.85)_0%,rgba(4,16,15,0.9)_100%)] border border-solid border-[rgba(0,217,198,0.22)] shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),0_0_12px_rgba(0,217,198,0.06)] rounded-[8px] px-[20px] py-[18px] flex flex-col gap-[10px] relative backdrop-blur-[8px] transition-[border-color_0.2s_ease,transform_0.2s_ease]"
              >
                {/* Top: Icon & Tag */}
                <div className="flex justify-between items-center">
                  <div className="w-[34px] h-[34px] rounded-[6px] bg-[rgba(0,217,198,0.08)] border border-solid border-[rgba(0,217,198,0.25)] flex items-center justify-center text-[#00D9C6]">
                    <Icon size={17} />
                  </div>
                  <span className="text-[10px] font-bold text-[#7CEFE6] bg-[rgba(0,217,198,0.08)] border border-solid border-[rgba(0,217,198,0.2)] px-[7px] py-[2px] rounded-[4px] font-mono">
                    {tag}
                  </span>
                </div>

                {/* Key */}
                <div className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.04em]">
                  {key}
                </div>

                {/* Value */}
                <div className="text-[13.5px] font-semibold text-[#FFFFFF] leading-[1.5]">
                  {val}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
