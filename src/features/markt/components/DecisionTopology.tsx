import React, { useState } from 'react';
import { WETTBEWERB } from '../../../domain/marktData';

interface CompetitorZone {
  id: string;
  name: string;
  category: 'Enterprise Suite' | 'Marketing / Service' | 'Pipeline Tools' | 'B2B Mid-Market Hochebene';
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
            Isometrische Topografie: Kürzeste Route zur Nutzbarkeit auf der B2B-Mid-Market-Hochebene.
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
        Topografischer Vergleich nach Einführungsaufwand:
        Enterprise Suites (Salesforce, HubSpot): Höchster Einführungsaufwand (qualitative Einordnung).
        Marketing- und Service-Systeme (Brevo, Zendesk): Höherer Einführungsaufwand für B2B-Sales (qualitative Einordnung).
        Pipeline Tools (Pipedrive): Mittlerer Einführungsaufwand (qualitative Einordnung).
        LeadPilot: B2B-Mid-Market-Hochebene mit kürzester Route zur Nutzbarkeit in unter 30 Minuten Setup.
        Hinweis: Keine Darstellung von Marktanteilen.
      </div>

      {/* Desktop / Tablet Ansicht (> 600px): Vollständig lesbares, responsives SVG ohne horizontales Abschneiden */}
      <div className="topology-desktop-view w-full rounded-md border border-solid border-border-soft bg-[#071015] box-border p-[var(--space-3)]">
        <svg
          viewBox="0 0 800 360"
          className="block w-full h-auto" 
          role="img"
          aria-label="Wettbewerbs-Topografie nach Einführungsaufwand mit Zonen Enterprise Suite, Marketing/Service, Pipeline Tools und LeadPilot Hochebene"
        >
          <defs>
            <pattern id="topoGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
            </pattern>

            <linearGradient id="topoGradEnterprise" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF9900" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF9900" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="topoGradMarketing" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#A7B0BA" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#A7B0BA" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="topoGradPipeline" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7CEFE6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7CEFE6" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="topoGradLeadPilot" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00D9C6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00D9C6" stopOpacity="0.1" />
            </linearGradient>

            <marker id="topoRouteArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#00D9C6" />
            </marker>
          </defs>

          {/* Hintergrund-Raster */}
          <rect width="800" height="360" fill="url(#topoGridPattern)" />

          {/* Höhenschichtlinien (Höhe = Einführungsaufwand) */}
          <g opacity="0.35" stroke="rgba(255, 255, 255, 0.12)" fill="none" strokeWidth="1">
            <ellipse cx="150" cy="70" rx="130" ry="55" strokeDasharray="3 3" />
            <ellipse cx="650" cy="80" rx="120" ry="50" strokeDasharray="3 3" />
            <ellipse cx="170" cy="260" rx="110" ry="45" strokeDasharray="3 3" />
            <ellipse cx="540" cy="240" rx="160" ry="65" />
          </g>

          {/* Ausgangsbasis */}
          <g transform="translate(360, 320)">
            <rect x="-65" y="-14" width="130" height="28" rx="14" fill="#141E26" stroke="var(--color-border)" strokeWidth="1.5" />
            <circle cx="-45" cy="0" r="4" fill="#A7B0BA" />
            <text x="-32" y="4" fill="var(--color-text)" fontSize="11" fontFamily="var(--font-mono, monospace)" fontWeight="700">
              Ausgangsbasis
            </text>
          </g>

          {/* Pfad 1: Hoher Einführungsaufwand zu Enterprise Suites */}
          <path
            d="M 330 310 C 240 280 180 180 150 115"
            fill="none"
            stroke="#FF9900"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <text x="180" y="210" fill="#FF9900" fontSize="9.5" fontFamily="var(--font-mono, monospace)">
            ▲ Höchster Einführungsaufwand
          </text>

          {/* Pfad 2: Höherer Aufwand zu Marketing / Service */}
          <path
            d="M 430 310 C 500 280 620 200 650 125"
            fill="none"
            stroke="#A7B0BA"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <text x="560" y="200" fill="#A7B0BA" fontSize="9.5" fontFamily="var(--font-mono, monospace)">
            ▲ Höherer Einführungsaufwand
          </text>

          {/* Pfad 3: Kürzeste Route zur LeadPilot Hochebene */}
          <path
            d="M 380 305 Q 430 270 480 250"
            fill="none"
            stroke="#00D9C6"
            strokeWidth="3"
            markerEnd="url(#topoRouteArrow)"
          />
          <rect x="380" y="260" width="145" height="20" rx="4" fill="#00D9C6" fillOpacity="0.15" stroke="#00D9C6" strokeWidth="1" />
          <text x="386" y="274" fill="#00D9C6" fontSize="10" fontFamily="var(--font-mono, monospace)" fontWeight="700">
            ★ Kürzeste Route (&lt; 30 Min)
          </text>

          {/* ZONE 1: Enterprise Suite Plateau */}
          <g>
            <polygon points="60,110 230,110 250,60 80,60" fill="url(#topoGradEnterprise)" stroke="#FF9900" strokeWidth="1.5" />
            <rect x="75" y="45" width="125" height="16" rx="3" fill="#141E26" stroke="#FF9900" strokeWidth="1" />
            <text x="80" y="57" fill="#FF9900" fontSize="9" fontFamily="var(--font-mono, monospace)" fontWeight="700">
              ▲ Höchste Aufwandsstufe
            </text>
            <text x="155" y="85" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="700" fontFamily="var(--font-display)">
              Enterprise Suites
            </text>
            <text x="155" y="102" textAnchor="middle" fill="#A7B0BA" fontSize="10.5" fontFamily="var(--font-mono, monospace)">
              {salesforceRow[0]} · {hubspotRow[0]}
            </text>
          </g>

          {/* ZONE 2: Marketing / Service Plateau */}
          <g>
            <polygon points="570,120 740,120 760,70 590,70" fill="url(#topoGradMarketing)" stroke="#A7B0BA" strokeWidth="1.5" />
            <rect x="585" y="55" width="130" height="16" rx="3" fill="#141E26" stroke="#A7B0BA" strokeWidth="1" />
            <text x="590" y="67" fill="#A7B0BA" fontSize="9" fontFamily="var(--font-mono, monospace)" fontWeight="700">
              ▲ Hohe Aufwandsstufe
            </text>
            <text x="665" y="95" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="700" fontFamily="var(--font-display)">
              Marketing / Support
            </text>
            <text x="665" y="112" textAnchor="middle" fill="#A7B0BA" fontSize="10.5" fontFamily="var(--font-mono, monospace)">
              {brevoRow[0]} · {zendeskRow[0]}
            </text>
          </g>

          {/* ZONE 3: Pipeline Tools */}
          <g>
            <polygon points="90,300 250,300 270,250 110,250" fill="url(#topoGradPipeline)" stroke="#7CEFE6" strokeWidth="1.5" />
            <rect x="105" y="235" width="135" height="16" rx="3" fill="#141E26" stroke="#7CEFE6" strokeWidth="1" />
            <text x="110" y="247" fill="#7CEFE6" fontSize="9" fontFamily="var(--font-mono, monospace)" fontWeight="700">
              ▲ Mittlere Aufwandsstufe
            </text>
            <text x="180" y="275" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="700" fontFamily="var(--font-display)">
              Pipeline Tools
            </text>
            <text x="180" y="292" textAnchor="middle" fill="#A7B0BA" fontSize="10.5" fontFamily="var(--font-mono, monospace)">
              {pipedriveRow[0]}
            </text>
          </g>

          {/* ZONE 4: LEADPILOT CYAN HOCHEBENE */}
          <g>
            <polygon points="440,260 670,260 700,185 470,185" fill="url(#topoGradLeadPilot)" stroke="#00D9C6" strokeWidth="2" />
            <rect x="460" y="170" width="175" height="20" rx="4" fill="#00D9C6" stroke="#004D40" strokeWidth="1" />
            <text x="468" y="184" fill="#071015" fontSize="10" fontFamily="var(--font-mono, monospace)" fontWeight="800">
              ★ B2B-MID-MARKET HOCHEBENE
            </text>
            <text x="570" y="215" textAnchor="middle" fill="#00D9C6" fontSize="15" fontWeight="800" fontFamily="var(--font-display)">
              {leadpilotRow[0]}
            </text>
            <text x="570" y="234" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontFamily="var(--font-mono, monospace)" fontWeight="600">
              {leadpilotRow[2]}
            </text>
            <text x="570" y="250" textAnchor="middle" fill="rgba(255, 255, 255, 0.8)" fontSize="10">
              &lt; 30 Minuten Setup · Schnellste Time-to-Value
            </text>
          </g>
        </svg>
      </div>

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

          <div
            className="flex items-baseline justify-between flex-wrap gap-x-[8px] gap-y-[4px] mb-[4px] min-w-0 w-full"
          >
            <span
              className="text-[0.6875rem] font-bold uppercase min-w-0 [overflow-wrap:anywhere] break-words text-[var(--cyan-light)]"
            >
              ▲ Mittlere Aufwandsstufe
            </span>
            <span
              className="font-mono text-[0.75rem] min-w-0 [overflow-wrap:anywhere] break-words whitespace-normal text-[var(--color-text-muted)]"
            >
              Qualitative Einordnung
            </span>
          </div>
          <div
            className="font-display text-[0.9375rem] font-bold text-text min-w-0 [overflow-wrap:anywhere] break-words"
          >
            Pipeline Tools ({pipedriveRow[0]})
          </div>
          <div
            className="text-[0.8125rem] mt-[2px] min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]"
          >
            {pipedriveRow[3]} · Differenzierung: {pipedriveRow[4]}
          </div>
        </div>

        <div className="topology-card topology-card-marketing rounded-md border border-solid border-border bg-[rgba(255,255,255,0.02)] min-w-0 w-full box-border px-[12px] py-[10px]">

          <div
            className="flex items-baseline justify-between flex-wrap gap-x-[8px] gap-y-[4px] mb-[4px] min-w-0 w-full"
          >
            <span
              className="text-[0.6875rem] font-bold uppercase min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]"
            >
              ▲ Hohe Aufwandsstufe
            </span>
            <span
              className="font-mono text-[0.75rem] min-w-0 [overflow-wrap:anywhere] break-words whitespace-normal text-[var(--color-text-muted)]"
            >
              Qualitative Einordnung
            </span>
          </div>
          <div
            className="font-display text-[0.9375rem] font-bold text-text min-w-0 [overflow-wrap:anywhere] break-words"
          >
            Marketing / Support ({brevoRow[0]}, {zendeskRow[0]})
          </div>
          <div
            className="text-[0.8125rem] mt-[2px] min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]"
          >
            {brevoRow[3]} · {zendeskRow[3]}
          </div>
        </div>

        <div className="topology-card topology-card-enterprise rounded-md border border-solid border-[rgba(255,153,0,0.4)] bg-[rgba(255,255,255,0.02)] min-w-0 w-full box-border px-[12px] py-[10px]">

          <div
            className="flex items-baseline justify-between flex-wrap gap-x-[8px] gap-y-[4px] mb-[4px] min-w-0 w-full"
          >
            <span
              className="text-[0.6875rem] font-bold uppercase min-w-0 [overflow-wrap:anywhere] break-words text-accent"
            >
              ▲ Höchste Aufwandsstufe
            </span>
            <span
              className="font-mono text-[0.75rem] min-w-0 [overflow-wrap:anywhere] break-words whitespace-normal text-accent"
            >
              Qualitative Einordnung
            </span>
          </div>
          <div
            className="font-display text-[0.9375rem] font-bold text-text min-w-0 [overflow-wrap:anywhere] break-words"
          >
            Enterprise Suites ({salesforceRow[0]}, {hubspotRow[0]})
          </div>
          <div
            className="text-[0.8125rem] mt-[2px] min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]"
          >
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

          <div className={`font-mono text-[0.75rem] font-semibold ${activeZoneData.isLeadPilot ? 'text-primary' : 'text-accent'}`}>
            Aufwand: {activeZoneData.effortClassification}
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[var(--space-3)] mt-[var(--space-3)]">
          <div className="rounded border border-solid border-border-soft bg-[rgba(0,0,0,0.2)] px-[12px] py-[10px]">
            <div className="text-[0.6875rem] uppercase mb-[4px] text-[var(--color-text-muted)]">
              Topografische Route
            </div>
            <div className="text-[0.8125rem] text-text">
              {activeZoneData.routeDescription}
            </div>
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
