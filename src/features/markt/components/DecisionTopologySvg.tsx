import React from 'react';

export interface DecisionTopologySvgProps {
  salesforceRow: string[];
  hubspotRow: string[];
  brevoRow: string[];
  zendeskRow: string[];
  pipedriveRow: string[];
  leadpilotRow: string[];
}

export const DecisionTopologySvg: React.FC<DecisionTopologySvgProps> = ({
  salesforceRow,
  hubspotRow,
  brevoRow,
  zendeskRow,
  pipedriveRow,
  leadpilotRow,
}) => {
  return (
    <div className="topology-desktop-view w-full rounded-md border border-solid border-border-soft bg-[#071015] box-border p-[var(--space-3)]">
      <svg
        viewBox="0 0 800 360"
        className="block w-full h-auto"
        role="img"
        aria-label="Wettbewerbs-Topografie nach Einführungsaufwand mit Zonen Enterprise Suite, Marketing/Service, Pipeline Tools und LeadPilot Hochebene"
      >
        <defs>
          <pattern id="topoGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth="1"
            />
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

          <marker
            id="topoRouteArrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
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
          <rect
            x="-65"
            y="-14"
            width="130"
            height="28"
            rx="14"
            fill="#141E26"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          <circle cx="-45" cy="0" r="4" fill="#A7B0BA" />
          <text
            x="-32"
            y="4"
            fill="var(--color-text)"
            fontSize="11"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="700"
          >
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
        <text
          x="180"
          y="210"
          fill="#FF9900"
          fontSize="9.5"
          fontFamily="var(--font-mono, monospace)"
        >
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
        <text
          x="560"
          y="200"
          fill="#A7B0BA"
          fontSize="9.5"
          fontFamily="var(--font-mono, monospace)"
        >
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
        <rect
          x="380"
          y="260"
          width="145"
          height="20"
          rx="4"
          fill="#00D9C6"
          fillOpacity="0.15"
          stroke="#00D9C6"
          strokeWidth="1"
        />
        <text
          x="386"
          y="274"
          fill="#00D9C6"
          fontSize="10"
          fontFamily="var(--font-mono, monospace)"
          fontWeight="700"
        >
          ★ Kürzeste Route (&lt; 30 Min)
        </text>

        {/* ZONE 1: Enterprise Suite Plateau */}
        <g>
          <polygon
            points="60,110 230,110 250,60 80,60"
            fill="url(#topoGradEnterprise)"
            stroke="#FF9900"
            strokeWidth="1.5"
          />
          <rect
            x="75"
            y="45"
            width="125"
            height="16"
            rx="3"
            fill="#141E26"
            stroke="#FF9900"
            strokeWidth="1"
          />
          <text
            x="80"
            y="57"
            fill="#FF9900"
            fontSize="9"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="700"
          >
            ▲ Höchste Aufwandsstufe
          </text>
          <text
            x="155"
            y="85"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="13"
            fontWeight="700"
            fontFamily="var(--font-display)"
          >
            Enterprise Suites
          </text>
          <text
            x="155"
            y="102"
            textAnchor="middle"
            fill="#A7B0BA"
            fontSize="10.5"
            fontFamily="var(--font-mono, monospace)"
          >
            {salesforceRow[0]} · {hubspotRow[0]}
          </text>
        </g>

        {/* ZONE 2: Marketing / Service Plateau */}
        <g>
          <polygon
            points="570,120 740,120 760,70 590,70"
            fill="url(#topoGradMarketing)"
            stroke="#A7B0BA"
            strokeWidth="1.5"
          />
          <rect
            x="585"
            y="55"
            width="130"
            height="16"
            rx="3"
            fill="#141E26"
            stroke="#A7B0BA"
            strokeWidth="1"
          />
          <text
            x="590"
            y="67"
            fill="#A7B0BA"
            fontSize="9"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="700"
          >
            ▲ Hohe Aufwandsstufe
          </text>
          <text
            x="665"
            y="95"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="13"
            fontWeight="700"
            fontFamily="var(--font-display)"
          >
            Marketing / Support
          </text>
          <text
            x="665"
            y="112"
            textAnchor="middle"
            fill="#A7B0BA"
            fontSize="10.5"
            fontFamily="var(--font-mono, monospace)"
          >
            {brevoRow[0]} · {zendeskRow[0]}
          </text>
        </g>

        {/* ZONE 3: Pipeline Tools */}
        <g>
          <polygon
            points="90,300 250,300 270,250 110,250"
            fill="url(#topoGradPipeline)"
            stroke="#7CEFE6"
            strokeWidth="1.5"
          />
          <rect
            x="105"
            y="235"
            width="135"
            height="16"
            rx="3"
            fill="#141E26"
            stroke="#7CEFE6"
            strokeWidth="1"
          />
          <text
            x="110"
            y="247"
            fill="#7CEFE6"
            fontSize="9"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="700"
          >
            ▲ Mittlere Aufwandsstufe
          </text>
          <text
            x="180"
            y="275"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="13"
            fontWeight="700"
            fontFamily="var(--font-display)"
          >
            Pipeline Tools
          </text>
          <text
            x="180"
            y="292"
            textAnchor="middle"
            fill="#A7B0BA"
            fontSize="10.5"
            fontFamily="var(--font-mono, monospace)"
          >
            {pipedriveRow[0]}
          </text>
        </g>

        {/* ZONE 4: LEADPILOT CYAN HOCHEBENE */}
        <g>
          <polygon
            points="440,260 670,260 700,185 470,185"
            fill="url(#topoGradLeadPilot)"
            stroke="#00D9C6"
            strokeWidth="2"
          />
          <rect
            x="460"
            y="170"
            width="175"
            height="20"
            rx="4"
            fill="#00D9C6"
            stroke="#004D40"
            strokeWidth="1"
          />
          <text
            x="468"
            y="184"
            fill="#071015"
            fontSize="10"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="800"
          >
            ★ B2B-MID-MARKET HOCHEBENE
          </text>
          <text
            x="570"
            y="215"
            textAnchor="middle"
            fill="#00D9C6"
            fontSize="15"
            fontWeight="800"
            fontFamily="var(--font-display)"
          >
            {leadpilotRow[0]}
          </text>
          <text
            x="570"
            y="234"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="11"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="600"
          >
            {leadpilotRow[2]}
          </text>
          <text x="570" y="250" textAnchor="middle" fill="rgba(255, 255, 255, 0.8)" fontSize="10">
            &lt; 30 Minuten Setup · Schnellste Time-to-Value
          </text>
        </g>
      </svg>
    </div>
  );
};
