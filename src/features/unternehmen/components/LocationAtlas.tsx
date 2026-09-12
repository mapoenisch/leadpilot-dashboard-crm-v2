import React, { useState } from 'react';
import { STANDORT } from '../../../domain/unternehmenData';
import { Table } from '../../../components/ui/Table';

// Direkte ESM-Vite-Imports für garantierte Bundling- und Asset-Integrität
import heroImage from '../../../../assets/facelift/unternehmen/unternehmen-aussen-augustusplatz.png';
import meetingImage from '../../../../assets/facelift/unternehmen/unternehmen-innen-besprechung.png';
import workspaceImage from '../../../../assets/facelift/unternehmen/unternehmen-innen-workspace.png';
import receptionImage from '../../../../assets/facelift/unternehmen/unternehmen-innen-empfang.png';
import logoImage from '../../../../assets/logo/leadpilot-logo-full.png';

export const LocationAtlas: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  const subStations = [
    {
      id: 'empfang',
      title: 'Empfangsbereich',
      subtitle: 'Fiktive Innenansicht',
      src: receptionImage,
      alt: 'Fiktive Visualisierung: Empfangsbereich der LeadPilot Geschäftsräume in Leipzig',
    },
    {
      id: 'besprechung',
      title: 'Besprechungsraum',
      subtitle: 'Fiktive Innenansicht',
      src: meetingImage,
      alt: 'Fiktive Visualisierung: Besprechungsraum in den LeadPilot Geschäftsräumen',
    },
    {
      id: 'workspace',
      title: 'Arbeitsbereich',
      subtitle: 'Fiktive Innenansicht',
      src: workspaceImage,
      alt: 'Fiktive Visualisierung: Arbeitsbereich in den LeadPilot Geschäftsräumen',
    },
  ];

  return (
    <div className="facelift-location-atlas w-full box-border rounded-[var(--radius-lg)] border border-solid border-border bg-surface p-[var(--space-5)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)] mb-[var(--space-5)] pb-[var(--space-4)] border-b border-solid border-border-soft">
        <div>
          <div className="font-mono text-[0.6875rem] font-bold text-cyan-light uppercase tracking-[0.08em] mb-[2px]">
            Company Atlas • Standort Leipzig
          </div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold text-text tracking-[0.01em]">
            {STANDORT.title}
          </h3>
          <p className="mt-[2px] mr-0 mb-0 ml-0 text-[0.8125rem] text-[var(--color-text-muted)]">
            {STANDORT.address}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="location-atlas-details-table"
          aria-expanded={showTable}
          className="font-body text-[0.75rem] cursor-pointer rounded-md border border-solid border-border bg-transparent transition-[color_0.15s_ease,border-color_0.15s_ease] text-[var(--color-text-muted)] hover:text-text hover:border-primary px-[12px] py-[5px]"
        >
          {showTable ? 'Mietdetails verbergen' : 'Mietdetails anzeigen'}
        </button>
      </div>

      {/* GROSSES LEITBILD (HERO STATION) MIT GETRENNTER BILDUNTERSCHRIFT */}
      <div className="rounded-[var(--radius-md)] overflow-hidden bg-background-deep border border-solid border-border mb-[var(--space-4)]">
        {/* Bildbereich mit Overlays */}
        <div className="relative w-full aspect-[16/9] bg-surface overflow-hidden">
          <img
            src={heroImage}
            alt="Fiktive Visualisierung: Außenansicht des Unternehmenssitzes der LeadPilot GmbH am Augustusplatz in Leipzig"
            width={1672}
            height={941}
            fetchPriority="high"
            className="w-full h-full object-cover block"
          />

          {/* Overline-Label: FIKTIVE VISUALISIERUNG */}
          <div className="absolute top-[12px] left-[12px] bg-[rgba(6,22,19,0.92)] border border-solid border-[rgba(0,217,198,0.4)] rounded-[var(--radius-sm)] px-[8px] py-[3px] font-mono text-[0.625rem] font-bold text-cyan-light tracking-[0.08em] uppercase z-[2]">
            FIKTIVE VISUALISIERUNG
          </div>

          {/* Echtes LeadPilot-Logo als HTML-img-Overlay (dekorativ) */}
          <div className="absolute top-[12px] right-[12px] bg-[rgba(6,22,19,0.92)] border border-solid border-border-soft rounded-[var(--radius-sm)] px-[10px] py-[5px] flex items-center z-[2] shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
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

        {/* Bildunterschrift getrennt unter dem Bild (garantiert ohne Overlay-Kollision) */}
        <div className="px-[var(--space-4)] py-[var(--space-3)] bg-surface-raised border-t border-solid border-border-soft flex flex-wrap items-center justify-between gap-[var(--space-2)]">
          <div>
            <h4 className="m-0 font-display text-[0.9375rem] font-bold text-text">
              Unternehmenssitz Leipzig – Augustusplatz 9
            </h4>
            <p className="mt-[2px] mr-0 mb-0 ml-0 text-[0.75rem] text-[var(--color-text-muted)]">
              {STANDORT.address}
            </p>
          </div>

          <span className="text-[0.6875rem] font-mono px-[8px] py-[2px] rounded-full bg-cyan-a12 text-primary border border-solid border-[rgba(0,217,198,0.3)] font-semibold">
            {STANDORT.details[1][1]}
          </span>
        </div>
      </div>

      {/* DREI ERGÄNZENDE BILDSTATIONEN (GRID) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-[var(--space-4)] mb-[var(--space-5)]">
        {subStations.map((station) => (
          <div
            key={station.id}
            className="bg-background-deep rounded-[var(--radius-md)] border border-solid border-border-soft overflow-hidden flex flex-col"
          >
            {/* Bild mit Overlays */}
            <div className="relative aspect-[16/9] bg-surface overflow-hidden">
              <img
                src={station.src}
                alt={station.alt}
                width={1672}
                height={941}
                loading="lazy"
                className="w-full h-full object-cover block"
              />

              {/* Overline-Label */}
              <div className="absolute top-[10px] left-[10px] bg-[rgba(6,22,19,0.92)] border border-solid border-[rgba(0,217,198,0.35)] rounded-[var(--radius-sm)] px-[6px] py-[2px] font-mono text-[0.5625rem] font-bold text-cyan-light tracking-[0.06em] uppercase z-[2]">
                FIKTIVE VISUALISIERUNG
              </div>

              {/* Logo-Overlay (dekorativ) */}
              <div className="absolute top-[10px] right-[10px] bg-[rgba(6,22,19,0.92)] border border-solid border-border-soft rounded-[var(--radius-sm)] px-[6px] py-[3px] flex items-center z-[2]">
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

            {/* Bildbeschriftung mit neutralen Texten */}
            <div className="px-[var(--space-4)] py-[var(--space-3)]">
              <h5 className="m-0 font-display text-[0.875rem] font-semibold text-text">
                {station.title}
              </h5>
              <p className="mt-[2px] mr-0 mb-0 ml-0 text-[0.75rem] text-[var(--color-text-muted)]">
                {station.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* SCHLANKE FAKTENLEISTE (MIETOBJEKT-FAKTEN DIREKT AUS STANDORT.DETAILS) */}
      <div className="bg-background-deep rounded-[var(--radius-md)] border border-solid border-border-soft p-[var(--space-4)]">
        <div className="text-[0.6875rem] font-mono font-bold text-cyan-light uppercase tracking-[0.06em] mb-[var(--space-3)]">
          Mietobjekt-Fakten (Vertragsdaten)
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[var(--space-3)]">
          {STANDORT.details.map(([merkmal, wert]) => (
            <div
              key={merkmal}
              className="bg-surface rounded-[var(--radius-sm)] border border-solid border-border-soft p-[var(--space-3)] flex flex-col gap-[2px]"
            >
              <span className="text-[0.6875rem] text-[var(--color-text-muted)] font-body uppercase tracking-[0.04em]">
                {merkmal}
              </span>
              <span className="text-[0.8125rem] font-medium text-text leading-[1.35] break-words">
                {wert}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ausklappbare Detailtabelle */}
      {showTable && (
        <div
          id="location-atlas-details-table"
          className="mt-[var(--space-4)] pt-[var(--space-4)] border-t border-solid border-border"
        >
          <div className="mb-[var(--space-2)] text-[0.8125rem] text-[var(--color-text-muted)]">
            Vollständige Standortangaben (Tabellarische Detailansicht):
          </div>
          <Table
            columns={[
              { key: '0', label: 'Merkmal' },
              { key: '1', label: 'Details' },
            ]}
            rows={STANDORT.details.map((d) => ({ 0: d[0], 1: d[1] }))}
          />
        </div>
      )}
    </div>
  );
};
