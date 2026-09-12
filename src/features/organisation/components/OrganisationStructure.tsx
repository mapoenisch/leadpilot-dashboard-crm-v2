import React from 'react';
import { getOrganisationStructure } from '@/domain/organisationData';
import { OrganisationUnitCard } from './OrganisationUnitCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function OrganisationStructure() {
  const { root, units, total } = getOrganisationStructure();

  return (
    <section
      aria-label="Organisationsstruktur LeadPilot"
      // G39 Welle 3: backdrop-blur-md absichtlich KEINE Klasse —
      // --backdrop-blur-md existiert nicht (ungültiger Wert = kein Filter,
      // Effekt erhalten statt Blur hinzuzufügen).
      className="relative rounded-lg border border-solid border-border bg-[rgba(6,22,19,0.65)] overflow-hidden p-[var(--space-6)]"
    >
      {/* Rein dekorativer Backdrop-Layer mit WebP-Asset und tokenbasiertem Fallback */}
      <img
        src="/assets/organisation/team-structure-backdrop.webp"
        alt=""
        aria-hidden="true"
        width={1600}
        height={900}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover opacity-[0.35] pointer-events-none z-0"
      />

      {/* Inhaltsebene über dem Backdrop */}
      <div className="relative z-[1] flex flex-col items-center gap-[var(--space-5)]">
        {/* Header / Titelzeile */}
        <div className="border-0 border-b border-solid border-[rgba(255,255,255,0.07)] w-full flex items-center justify-between flex-wrap gap-[var(--space-2)] pb-[var(--space-3)]">
          <div>
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-primary">
              Organigramm · Ebene A
            </span>
            <h2 className="font-display text-[17px] font-semibold text-text mt-[2px] mb-0 mr-0 ml-0">
              Funktionale Organisation & Führungsspanne
            </h2>
          </div>
          <Badge variant="cyan">Stand: 31.12.2025</Badge>
        </div>

        {/* 1. Root Node: CEO / Ops */}
        <div className="w-full max-w-[420px] flex justify-center">
          <div className="w-full">
            <OrganisationUnitCard unit={root} highlight />
          </div>
        </div>

        {/* Dekorative Verbindungslinien (nur Desktop / Tablet, rein visuell) */}
        <div
          className="organigram-connectors w-full max-w-[1080px] h-[28px] relative flex flex-col items-center"
          aria-hidden="true"
        >
          {/* Vertikale Linie von Root nach unten */}
          <div className="w-[2px] h-[14px] bg-[linear-gradient(to_bottom,rgba(0,217,198,0.6),rgba(0,217,198,0.3))]" />
          {/* Horizontale Querlinie über die 4 Funktionsbereiche */}
          <div className="w-[80%] h-[2px] bg-[rgba(0,217,198,0.3)]" />
          {/* Vertikale Linien zu den 4 Spalten */}
          <div className="w-[80%] flex justify-between">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-[2px] h-[12px] bg-[rgba(0,217,198,0.3)]" />
            ))}
          </div>
        </div>

        {/* 2. Funktionsbereiche Grid */}
        <div className="organigram-grid w-full grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[var(--space-4)]">
          {units.map((unit) => (
            <OrganisationUnitCard key={unit.role} unit={unit} />
          ))}
        </div>

        {/* 3. Gesamtbestand Zusammenfassung */}
        <div className="w-full mt-[var(--space-2)]">
          <Card
            variant="glass"
            // G39 Welle 3: nutzt den Block-A className-Merge (Aufrufer
            // ergänzt, tailwind-merge lässt Override gewinnen).
            className="flex items-center justify-between flex-wrap gap-[var(--space-3)] border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.04)] px-[var(--space-4)] py-[var(--space-3)]"
          >
            <div className="flex items-center gap-[var(--space-3)] flex-wrap">
              <span className="font-display font-semibold text-[15px] text-text">
                {total.role}
              </span>
              <Badge variant="cyan">{total.fte}</Badge>
            </div>
            <span className="text-[13px] text-[var(--color-text-muted)]">
              {total.staffing}
            </span>
          </Card>
        </div>
      </div>
    </section>
  );
}
