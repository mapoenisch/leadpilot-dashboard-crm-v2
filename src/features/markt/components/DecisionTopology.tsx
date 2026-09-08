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
      className="facelift-decision-topology"
      aria-label="Isometrische Entscheidungs-Topografie"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5)',
      }}
    >
      {/* Header */}
      <div
        className="topology-header"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border-soft)',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="topology-title-block" style={{ minWidth: 0, flex: '1 1 200px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(0, 217, 198, 0.1)',
              border: '1px solid rgba(0, 217, 198, 0.25)',
              color: 'var(--color-primary)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            Entscheidungs-Topografie
          </div>
          <h3
            className="topology-heading"
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '0.01em',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Wettbewerbs-Topografie nach Einführungsaufwand
          </h3>
          <p
            style={{
              margin: '3px 0 0',
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Isometrische Topografie: Kürzeste Route zur Nutzbarkeit auf der B2B-Mid-Market-Hochebene.
          </p>
        </div>

        {/* Höhenlegende & Pflichtaussage */}
        <div
          className="topology-legend-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          <div
            className="topology-height-legend"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px 8px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--color-border)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>▲ Höhenlegende:</span>
            <span>Einführungsaufwand</span>
          </div>
          <span
            className="topology-disclaimer"
            style={{
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Keine Darstellung von Marktanteilen.
          </span>
        </div>
      </div>

      {/* Screenreader-Zusammenfassung */}
      <div className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        Topografischer Vergleich nach Einführungsaufwand:
        Enterprise Suites (Salesforce, HubSpot): Höchster Einführungsaufwand (qualitative Einordnung).
        Marketing- und Service-Systeme (Brevo, Zendesk): Höherer Einführungsaufwand für B2B-Sales (qualitative Einordnung).
        Pipeline Tools (Pipedrive): Mittlerer Einführungsaufwand (qualitative Einordnung).
        LeadPilot: B2B-Mid-Market-Hochebene mit kürzester Route zur Nutzbarkeit in unter 30 Minuten Setup.
        Hinweis: Keine Darstellung von Marktanteilen.
      </div>

      {/* Desktop / Tablet Ansicht (> 600px): Vollständig lesbares, responsives SVG ohne horizontales Abschneiden */}
      <div
        className="topology-desktop-view"
        style={{
          width: '100%',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#071015',
          border: '1px solid var(--color-border-soft)',
          padding: 'var(--space-3)',
          boxSizing: 'border-box',
        }}
      >
        <svg
          viewBox="0 0 800 360"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
          }}
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
      <div
        className="topology-mobile-view"
        style={{
          display: 'none',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        <div
          className="topology-card topology-card-leadpilot"
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(0, 217, 198, 0.12)',
            border: '2px solid var(--color-primary)',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4px 8px',
              marginBottom: '4px',
              minWidth: 0,
              width: '100%',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              ★ Kürzeste Route zur Nutzbarkeit
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-primary)',
                fontWeight: 700,
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              &lt; 30 Minuten Setup
            </span>
          </div>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            LeadPilot Hochebene (B2B-Mid-Market)
          </div>
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              marginTop: '2px',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {leadpilotRow[4]}
          </div>
        </div>

        <div
          className="topology-card topology-card-pipeline"
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--color-border)',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4px 8px',
              marginBottom: '4px',
              minWidth: 0,
              width: '100%',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--cyan-light)',
                textTransform: 'uppercase',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              ▲ Mittlere Aufwandsstufe
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-text-muted)',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              Qualitative Einordnung
            </span>
          </div>
          <div
            style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Pipeline Tools ({pipedriveRow[0]})
          </div>
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              marginTop: '2px',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {pipedriveRow[3]} · Differenzierung: {pipedriveRow[4]}
          </div>
        </div>

        <div
          className="topology-card topology-card-marketing"
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--color-border)',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4px 8px',
              marginBottom: '4px',
              minWidth: 0,
              width: '100%',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              ▲ Hohe Aufwandsstufe
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-text-muted)',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              Qualitative Einordnung
            </span>
          </div>
          <div
            style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Marketing / Support ({brevoRow[0]}, {zendeskRow[0]})
          </div>
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              marginTop: '2px',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {brevoRow[3]} · {zendeskRow[3]}
          </div>
        </div>

        <div
          className="topology-card topology-card-enterprise"
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 153, 0, 0.4)',
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '4px 8px',
              marginBottom: '4px',
              minWidth: 0,
              width: '100%',
            }}
          >
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--color-accent)',
                textTransform: 'uppercase',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              ▲ Höchste Aufwandsstufe
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-accent)',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              Qualitative Einordnung
            </span>
          </div>
          <div
            style={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            Enterprise Suites ({salesforceRow[0]}, {hubspotRow[0]})
          </div>
          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              marginTop: '2px',
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
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
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: 'var(--space-4)',
          marginBottom: 'var(--space-3)',
        }}
      >
        {zones.map((zone) => {
          const isSelected = selectedZone === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => setSelectedZone(zone.id)}
              aria-pressed={isSelected}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isSelected ? (zone.isLeadPilot ? 'var(--color-primary)' : 'var(--color-accent)') : 'var(--color-border)'}`,
                backgroundColor: isSelected
                  ? zone.isLeadPilot
                    ? 'rgba(0, 217, 198, 0.15)'
                    : 'rgba(255, 153, 0, 0.15)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: 'var(--color-text)',
                fontSize: '0.8125rem',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              }}
            >
              {zone.isLeadPilot ? '★ ' : ''}
              {zone.name}
            </button>
          );
        })}
      </div>

      {/* Detailkarte der selektierten Zone */}
      <div
        style={{
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${activeZoneData.isLeadPilot ? 'var(--color-primary)' : 'var(--color-border)'}`,
          backgroundColor: activeZoneData.isLeadPilot ? 'rgba(0, 217, 198, 0.05)' : 'rgba(255, 255, 255, 0.02)',
          padding: 'var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: activeZoneData.isLeadPilot ? 'rgba(0, 217, 198, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                color: activeZoneData.isLeadPilot ? 'var(--color-primary)' : 'var(--color-text)',
              }}
            >
              {activeZoneData.category}
            </span>
            <h4
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {activeZoneData.name} ({activeZoneData.providers.join(', ')})
            </h4>
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono, monospace)',
              color: activeZoneData.isLeadPilot ? 'var(--color-primary)' : 'var(--color-accent)',
              fontWeight: 600,
            }}
          >
            Aufwand: {activeZoneData.effortClassification}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-3)',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--color-border-soft)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Topografische Route
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text)' }}>
              {activeZoneData.routeDescription}
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--color-border-soft)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
              Differenzierung LeadPilot
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              {activeZoneData.differentiation}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
