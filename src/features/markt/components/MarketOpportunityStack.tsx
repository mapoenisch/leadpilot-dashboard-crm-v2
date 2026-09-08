import React, { useState } from 'react';
import { MARKT } from '../../../domain/marktData';
import { Table } from '../../../components/ui/Table';

export const MarketOpportunityStack: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  // Exakte dynamische Ableitung aus MARKT.overview:
  // [0] ['Europa Cloud-CRM-Markt (2026)', '14,23 Mrd. USD (CAGR 5,23 %, Prognose 18,36 Mrd. USD bis 2031)']
  // [1] ['Deutschland Einzelmarkt', 'Größter CRM-Einzelmarkt Europas mit 24,4 % Marktanteil (2025)']
  // [2] ['LeadPilot Marktanteil', '< 0,1 % (Fokus auf Nische B2B-Mittelstand)']
  // [3] ['Digitale Reichweite 2025', '1.400 LinkedIn-Follower · 620 Newsletter-Abos · 2.900 Web-Besucher/Monat · DA 14']
  const rowEuropa = MARKT.overview[0];
  const rowDeutschland = MARKT.overview[1];
  const rowLeadPilot = MARKT.overview[2];
  const rowReichweite = MARKT.overview[3];

  // Dynamische Zerlegung der Werte ohne Hartcodierung
  // rowEuropa: '14,23 Mrd. USD' aus '14,23 Mrd. USD (CAGR...'
  const europaVal = rowEuropa[1].split(' (')[0];
  // rowLeadPilot: '< 0,1 %' und 'Fokus auf Nische B2B-Mittelstand' aus '< 0,1 % (Fokus auf Nische B2B-Mittelstand)'
  const leadpilotVal = rowLeadPilot[1].split(' (')[0];
  const leadpilotFokus = rowLeadPilot[1].includes('(')
    ? rowLeadPilot[1].substring(rowLeadPilot[1].indexOf('(') + 1, rowLeadPilot[1].lastIndexOf(')'))
    : rowLeadPilot[1];

  // rowReichweite: '1.400 LinkedIn-Follower · 620 Newsletter-Abos · 2.900 Web-Besucher/Monat · DA 14'
  const reichweiteParts = rowReichweite[1].split(' · ');
  const webBesucherPart = reichweiteParts.find((p) => p.includes('Web-Besucher')) || reichweiteParts[2] || rowReichweite[1];
  const kanaelePart = reichweiteParts.filter((p) => !p.includes('Web-Besucher')).join(' · ');

  const stackLayers = [
    {
      step: '01',
      badge: 'Marktvolumen',
      title: `${rowEuropa[0]} & ${rowDeutschland[0]}`,
      primaryLabel: rowEuropa[0],
      primaryValue: europaVal,
      detailContext: rowEuropa[1],
      secondaryLabel: rowDeutschland[0],
      secondaryValue: rowDeutschland[1],
      color: 'var(--color-primary)',
      accentBg: 'rgba(0, 217, 198, 0.06)',
      accentBorder: 'rgba(0, 217, 198, 0.28)',
    },
    {
      step: '02',
      badge: 'Adressierbarer Fokusmarkt',
      title: `${rowLeadPilot[0]} & ${leadpilotFokus}`,
      primaryLabel: rowLeadPilot[0],
      primaryValue: leadpilotVal,
      detailContext: rowLeadPilot[1],
      secondaryLabel: 'Segmentfokus',
      secondaryValue: leadpilotFokus,
      color: 'var(--cyan-light, #7CEFE6)',
      accentBg: 'rgba(124, 239, 230, 0.06)',
      accentBorder: 'rgba(124, 239, 230, 0.28)',
    },
    {
      step: '03',
      badge: 'Erreichte Aufmerksamkeit',
      title: rowReichweite[0],
      primaryLabel: rowReichweite[0],
      primaryValue: webBesucherPart,
      detailContext: rowReichweite[1],
      secondaryLabel: 'Kanäle & Sichtbarkeit',
      secondaryValue: kanaelePart,
      color: 'var(--color-accent, #FF9900)',
      accentBg: 'rgba(255, 153, 0, 0.06)',
      accentBorder: 'rgba(255, 153, 0, 0.28)',
    },
  ];

  return (
    <section
      className="facelift-market-opportunity-stack"
      aria-label="Chancenstapel Marktpotenzial"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5)',
        overflowWrap: 'anywhere',
      }}
    >
      <style>{`
        @media (max-width: 600px) {
          .facelift-market-opportunity-stack {
            padding: 12px 10px !important;
          }
          .market-stack-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border-soft)',
        }}
      >
        <div>
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
            Marktanalyse DACH
          </div>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '0.01em',
            }}
          >
            Chancenstapel Marktpotenzial
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Marktvolumen → adressierbarer Fokusmarkt → erreichte Aufmerksamkeit (direkt aus MARKT.overview).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="market-stack-table"
          aria-expanded={showTable}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: showTable ? 'var(--color-surface-hover)' : 'transparent',
            color: 'var(--color-text)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
        >
          {showTable ? 'Tabelle ausblenden' : 'Detailtabelle einblenden'}
        </button>
      </div>

      {/* Visueller Chancenstapel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {stackLayers.map((layer, idx) => (
          <div
            key={layer.step}
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${layer.accentBorder}`,
              backgroundColor: layer.accentBg,
              padding: 'var(--space-4)',
              transition: 'border-color 0.15s ease',
              minWidth: 0,
              boxSizing: 'border-box',
              overflowWrap: 'anywhere',
            }}
          >
            {/* Kopf der Schicht */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-3)',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${layer.accentBorder}`,
                    color: layer.color,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {layer.step}
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: layer.color,
                  }}
                >
                  {layer.badge}
                </span>
              </div>
              <h4
                style={{
                  margin: 0,
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-display)',
                  overflowWrap: 'anywhere',
                }}
              >
                {layer.title}
              </h4>
            </div>

            {/* Hauptkennzahl & Wert */}
            <div
              className="market-stack-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                gap: 'var(--space-3)',
                alignItems: 'center',
                marginBottom: 'var(--space-3)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--color-border-soft)',
                minWidth: 0,
                boxSizing: 'border-box',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    letterSpacing: '0.04em',
                    marginBottom: '2px',
                  }}
                >
                  {layer.primaryLabel}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '1.375rem',
                    fontWeight: 700,
                    color: layer.color,
                    lineHeight: 1.2,
                  }}
                >
                  {layer.primaryValue}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {layer.detailContext}
                </div>
              </div>
            </div>

            {/* Spezifischer Detailwert aus MARKT.overview */}
            <div
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--color-border-soft)',
                minWidth: 0,
                boxSizing: 'border-box',
                overflowWrap: 'anywhere',
              }}
            >
              <div
                style={{
                  fontSize: '0.6875rem',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  letterSpacing: '0.04em',
                  marginBottom: '2px',
                }}
              >
                {layer.secondaryLabel}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text)', fontWeight: 500 }}>
                {layer.secondaryValue}
              </div>
            </div>

            {/* Verbinder nach unten */}
            {idx < stackLayers.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  width: '24px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-muted)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 2v8m0 0l-3-3m3 3l3-3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Aufklappbare Original-Tabelle */}
      {showTable && (
        <div
          id="market-stack-table"
          style={{
            marginTop: 'var(--space-4)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border-soft)',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Referenztabelle (MARKT.overview)
          </div>
          <Table
            columns={[
              { key: '0', label: 'Markt-Segment' },
              { key: '1', label: 'Potenzial & Daten' },
            ]}
            rows={MARKT.overview.map((o: string[]) => ({ 0: o[0], 1: o[1] }))}
          />
        </div>
      )}

      {/* Fußzeile / Methodischer Nachweis */}
      <div
        style={{
          marginTop: 'var(--space-4)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--color-border-soft)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>
          Basisdaten: <strong style={{ color: 'var(--color-text)' }}>Marktlage & Cloud-CRM DACH</strong> (Marktanalyse 2025/2026)
        </span>
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.6875rem' }}>
          DE-Anteil: 24,4 % · LeadPilot: &lt; 0,1 %
        </span>
      </div>
    </section>
  );
};
