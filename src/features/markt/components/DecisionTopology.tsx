import React, { useState } from 'react';
import { WETTBEWERB } from '../../../domain/marktData';
import { DecisionTopologySvg } from './DecisionTopologySvg';

interface CompetitorZone {
  id: string;
  name: string;
  category:
    'Enterprise Suite' | 'Marketing / Service' | 'Pipeline Tools' | 'B2B Mid-Market Hochebene';
  providers: string[];
  effortClassification: string; // Qualitative Einordnung
  routeDescription: string;
  differentiation: string;
  weakness: string;
  isLeadPilot?: boolean;
}

export const DecisionTopology: React.FC = () => {
  // Ableitung der Zonen direkt aus WETTBEWERB.rows:
  const brevoRow = WETTBEWERB.rows.find((r) => r[0] === 'Brevo') || WETTBEWERB.rows[0];
  const zendeskRow = WETTBEWERB.rows.find((r) => r[0] === 'Zendesk') || WETTBEWERB.rows[1];
  const hubspotRow = WETTBEWERB.rows.find((r) => r[0] === 'HubSpot') || WETTBEWERB.rows[2];
  const salesforceRow = WETTBEWERB.rows.find((r) => r[0] === 'Salesforce') || WETTBEWERB.rows[3];
  const pipedriveRow = WETTBEWERB.rows.find((r) => r[0] === 'Pipedrive') || WETTBEWERB.rows[4];
  const leadpilotRow = WETTBEWERB.rows.find((r) => r[0] === 'LeadPilot') || WETTBEWERB.rows[5];

  const zones: CompetitorZone[] = [
    {
      id: 'enterprise',
      name: 'Enterprise Suites',
      category: 'Enterprise Suite',
      providers: [salesforceRow[0], hubspotRow[0]],
      effortClassification: 'Höchster Einführungsaufwand (qualitative Einordnung)',
      routeDescription: 'Steile Einführungsebene: ' + salesforceRow[3] + ' · ' + hubspotRow[3],
      differentiation: salesforceRow[4] + ' · ' + hubspotRow[4],
      weakness: salesforceRow[3] + ' / ' + hubspotRow[3],
    },
    {
      id: 'marketing_service',
      name: 'Marketing- & Service-Systeme',
      category: 'Marketing / Service',
      providers: [brevoRow[0], zendeskRow[0]],
      effortClassification: 'Höherer Einführungsaufwand für B2B-Sales (qualitative Einordnung)',
      routeDescription: 'Abweichender Fokus: ' + brevoRow[2] + ' & ' + zendeskRow[2],
      differentiation: brevoRow[4] + ' · ' + zendeskRow[4],
      weakness: brevoRow[3] + ' · ' + zendeskRow[3],
    },
    {
      id: 'pipeline_tools',
      name: 'Pipeline Tools',
      category: 'Pipeline Tools',
      providers: [pipedriveRow[0]],
      effortClassification: 'Mittlerer Einführungsaufwand (qualitative Einordnung)',
      routeDescription: 'Fokus: ' + pipedriveRow[2] + ' (' + pipedriveRow[3] + ')',
      differentiation: pipedriveRow[4],
      weakness: pipedriveRow[3],
    },
    {
      id: 'leadpilot',
      name: 'LeadPilot Hochebene',
      category: 'B2B Mid-Market Hochebene',
      providers: [leadpilotRow[0]],
      effortClassification: '< 30 Minuten Setup',
      routeDescription: 'Kürzeste Route zur Nutzbarkeit: ' + leadpilotRow[2],
      differentiation: leadpilotRow[4],
      weakness: leadpilotRow[3],
      isLeadPilot: true,
    },
  ];

  const [selectedZone, setSelectedZone] = useState<string>('leadpilot');
  const activeZoneData = zones.find((z) => z.id === selectedZone) || zones[3];

  return (
    <section
      className="facelift-decision-topology box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5)]"
      aria-label="Isometrische Entscheidungs-Topografie"
    >
      {/* Header */}
      <div className="topology-header border-0 border-b border-solid border-border-soft flex flex-wrap items-start justify-between gap-[var(--space-3)] min-w-0 w-full box-border mb-[var(--space-4)] pb-[var(--space-4)]">
        <div className="topology-title-block min-w-0 flex-[1_1_200px]">
          <div className="inline-flex items-center gap-[6px] rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.1)] text-primary text-[0.6875rem] font-bold uppercase tracking-[0.06em] mb-[6px] px-[8px] py-[2px]">
            Entscheidungs-Topografie
          </div>
          <h3 className="topology-heading m-0 font-display text-[1.125rem] font-bold tracking-[0.01em] text-text min-w-0 [overflow-wrap:anywhere] break-words">
            Wettbewerbs-Topografie nach Einführungsaufwand
          </h3>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] min-w-0 [overflow-wrap:anywhere] break-words mt-[3px] mb-0 mr-0 ml-0">
            Isometrische Topografie: Kürzeste Route zur Nutzbarkeit auf der
            B2B-Mid-Market-Hochebene.
          </p>
        </div>

        {/* Höhenlegende & Pflichtaussage */}
        <div className="topology-legend-container flex flex-col items-start gap-[4px] min-w-0 max-w-full">
          <div className="topology-height-legend inline-flex items-center flex-wrap gap-x-[8px] gap-y-[6px] rounded border border-solid border-border bg-[rgba(255,255,255,0.04)] text-[0.75rem] font-semibold text-text min-w-0 [overflow-wrap:anywhere] break-words px-[10px] py-[4px]">
            <span className="text-accent">▲ Höhenlegende:</span>
            <span>Einführungsaufwand</span>
          </div>
          <span className="topology-disclaimer text-[0.6875rem] italic min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]">
            Keine Darstellung von Marktanteilen.
          </span>
        </div>
      </div>

      {/* Screenreader-Zusammenfassung */}
      <div className="sr-only">
        Topografischer Vergleich nach Einführungsaufwand: Enterprise Suites (Salesforce, HubSpot):
        Höchster Einführungsaufwand (qualitative Einordnung). Marketing- und Service-Systeme (Brevo,
        Zendesk): Höherer Einführungsaufwand für B2B-Sales (qualitative Einordnung). Pipeline Tools
        (Pipedrive): Mittlerer Einführungsaufwand (qualitative Einordnung). LeadPilot:
        B2B-Mid-Market-Hochebene mit kürzester Route zur Nutzbarkeit in unter 30 Minuten Setup.
        Hinweis: Keine Darstellung von Marktanteilen.
      </div>

      {/* Desktop / Tablet Ansicht (> 600px): Vollständig lesbares, responsives SVG ohne horizontales Abschneiden */}
      <DecisionTopologySvg
        salesforceRow={salesforceRow}
        hubspotRow={hubspotRow}
        brevoRow={brevoRow}
        zendeskRow={zendeskRow}
        pipedriveRow={pipedriveRow}
        leadpilotRow={leadpilotRow}
      />

      {/* Mobile-Topografie (Vertikal gestapelte Topografiestufen für kleine Bildschirme, ohne horizontales Scrollen) */}
      <div className="topology-mobile-view hidden flex-col gap-[var(--space-2)] w-full min-w-0 box-border">
        <div className="topology-card topology-card-leadpilot rounded-md border-2 border-solid border-primary bg-[rgba(0,217,198,0.12)] min-w-0 w-full box-border px-[12px] py-[10px]">
          <div className="flex items-baseline justify-between flex-wrap gap-x-[8px] gap-y-[4px] mb-[4px] min-w-0 w-full">
            <span className="text-[0.6875rem] font-extrabold uppercase tracking-[0.06em] min-w-0 [overflow-wrap:anywhere] break-words text-primary">
              ★ Kürzeste Route zur Nutzbarkeit
            </span>
            <span className="font-mono text-[0.75rem] font-bold min-w-0 [overflow-wrap:anywhere] break-words whitespace-normal text-primary">
              &lt; 30 Minuten Setup
            </span>
          </div>
          <div className="font-display text-[1rem] font-bold text-text min-w-0 [overflow-wrap:anywhere] break-words">
            LeadPilot Hochebene (B2B-Mid-Market)
          </div>
          <div className="text-[0.8125rem] mt-[2px] min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]">
            {leadpilotRow[4]}
          </div>
        </div>

        <div className="topology-card topology-card-pipeline rounded-md border border-solid border-border bg-[rgba(255,255,255,0.02)] min-w-0 w-full box-border px-[12px] py-[10px]">
          <div className="flex items-baseline justify-between flex-wrap gap-x-[8px] gap-y-[4px] mb-[4px] min-w-0 w-full">
            <span className="text-[0.6875rem] font-bold uppercase min-w-0 [overflow-wrap:anywhere] break-words text-[var(--cyan-light)]">
              ▲ Mittlere Aufwandsstufe
            </span>
            <span className="font-mono text-[0.75rem] min-w-0 [overflow-wrap:anywhere] break-words whitespace-normal text-[var(--color-text-muted)]">
              Qualitative Einordnung
            </span>
          </div>
          <div className="font-display text-[0.9375rem] font-bold text-text min-w-0 [overflow-wrap:anywhere] break-words">
            Pipeline Tools ({pipedriveRow[0]})
          </div>
          <div className="text-[0.8125rem] mt-[2px] min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]">
            {pipedriveRow[3]} · Differenzierung: {pipedriveRow[4]}
          </div>
        </div>

        <div className="topology-card topology-card-marketing rounded-md border border-solid border-border bg-[rgba(255,255,255,0.02)] min-w-0 w-full box-border px-[12px] py-[10px]">
          <div className="flex items-baseline justify-between flex-wrap gap-x-[8px] gap-y-[4px] mb-[4px] min-w-0 w-full">
            <span className="text-[0.6875rem] font-bold uppercase min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]">
              ▲ Hohe Aufwandsstufe
            </span>
            <span className="font-mono text-[0.75rem] min-w-0 [overflow-wrap:anywhere] break-words whitespace-normal text-[var(--color-text-muted)]">
              Qualitative Einordnung
            </span>
          </div>
          <div className="font-display text-[0.9375rem] font-bold text-text min-w-0 [overflow-wrap:anywhere] break-words">
            Marketing / Support ({brevoRow[0]}, {zendeskRow[0]})
          </div>
          <div className="text-[0.8125rem] mt-[2px] min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]">
            {brevoRow[3]} · {zendeskRow[3]}
          </div>
        </div>

        <div className="topology-card topology-card-enterprise rounded-md border border-solid border-[rgba(255,153,0,0.4)] bg-[rgba(255,255,255,0.02)] min-w-0 w-full box-border px-[12px] py-[10px]">
          <div className="flex items-baseline justify-between flex-wrap gap-x-[8px] gap-y-[4px] mb-[4px] min-w-0 w-full">
            <span className="text-[0.6875rem] font-bold uppercase min-w-0 [overflow-wrap:anywhere] break-words text-accent">
              ▲ Höchste Aufwandsstufe
            </span>
            <span className="font-mono text-[0.75rem] min-w-0 [overflow-wrap:anywhere] break-words whitespace-normal text-accent">
              Qualitative Einordnung
            </span>
          </div>
          <div className="font-display text-[0.9375rem] font-bold text-text min-w-0 [overflow-wrap:anywhere] break-words">
            Enterprise Suites ({salesforceRow[0]}, {hubspotRow[0]})
          </div>
          <div className="text-[0.8125rem] mt-[2px] min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]">
            {salesforceRow[3]} · {hubspotRow[3]}
          </div>
        </div>
      </div>

      {/* Responsive Style Switcher für Desktop vs. Mobile */}
      <style>{`
        @media (max-width: 600px) {
          .facelift-decision-topology {
            padding: 6px 8px !important;
          }
          .topology-desktop-view {
            display: none !important;
          }
          .topology-mobile-view {
            display: flex !important;
            gap: 4px !important;
          }
          .topology-header {
            margin-bottom: 4px !important;
            padding-bottom: 4px !important;
            gap: 4px !important;
          }
          .topology-heading {
            font-size: 1rem !important;
          }
          .topology-card {
            padding: 5px 8px !important;
          }
        }
      `}</style>

      {/* Echte HTML-Auswahlbuttons für Zonen */}
      <div className="flex flex-wrap gap-[8px] mt-[var(--space-4)] mb-[var(--space-3)]">
        {zones.map((zone) => {
          const isSelected = selectedZone === zone.id;
          // G39 Welle 2: Auswahl-Farben aus Build-Zeit-bekannten Werten →
          // Klassen-Ternaries (kein Laufzeitwert, Entscheidung 2).
          const zoneBorderClass = !isSelected
            ? 'border-border'
            : zone.isLeadPilot
              ? 'border-primary'
              : 'border-accent';
          const zoneBgClass = !isSelected
            ? 'bg-[rgba(255,255,255,0.03)]'
            : zone.isLeadPilot
              ? 'bg-[rgba(0,217,198,0.15)]'
              : 'bg-[rgba(255,153,0,0.15)]';
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => setSelectedZone(zone.id)}
              aria-pressed={isSelected}
              className={`rounded-md border border-solid text-[0.8125rem] text-text cursor-pointer transition-[color_0.15s_ease,border-color_0.15s_ease] px-[12px] py-[6px] ${isSelected ? 'font-bold' : 'font-medium'} ${zoneBorderClass} ${zoneBgClass}`}
            >
              {zone.isLeadPilot ? '★ ' : ''}
              {zone.name}
            </button>
          );
        })}
      </div>

      {/* Detailkarte der selektierten Zone */}
      <div
        className={`rounded-md border border-solid p-[var(--space-4)] ${activeZoneData.isLeadPilot ? 'border-primary bg-[rgba(0,217,198,0.05)]' : 'border-border bg-[rgba(255,255,255,0.02)]'}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)] mb-[var(--space-2)]">
          <div className="flex items-center gap-[8px]">
            <span
              className={`text-[0.6875rem] font-bold uppercase tracking-[0.06em] rounded px-[8px] py-[2px] ${activeZoneData.isLeadPilot ? 'bg-[rgba(0,217,198,0.2)] text-primary' : 'bg-[rgba(255,255,255,0.08)] text-text'}`}
            >
              {activeZoneData.category}
            </span>
            <h4 className="m-0 font-display text-[1rem] font-bold text-text">
              {activeZoneData.name} ({activeZoneData.providers.join(', ')})
            </h4>
          </div>

          <div
            className={`font-mono text-[0.75rem] font-semibold ${activeZoneData.isLeadPilot ? 'text-primary' : 'text-accent'}`}
          >
            Aufwand: {activeZoneData.effortClassification}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[var(--space-3)] mt-[var(--space-3)]">
          <div className="rounded border border-solid border-border-soft bg-[rgba(0,0,0,0.2)] px-[12px] py-[10px]">
            <div className="text-[0.6875rem] uppercase mb-[4px] text-[var(--color-text-muted)]">
              Topografische Route
            </div>
            <div className="text-[0.8125rem] text-text">{activeZoneData.routeDescription}</div>
          </div>

          <div className="rounded border border-solid border-border-soft bg-[rgba(0,0,0,0.2)] px-[12px] py-[10px]">
            <div className="text-[0.6875rem] uppercase mb-[4px] text-[var(--color-text-muted)]">
              Differenzierung LeadPilot
            </div>
            <div className="text-[0.8125rem] font-semibold text-primary">
              {activeZoneData.differentiation}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
