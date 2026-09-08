import React, { useState } from 'react';
import { FUNKTION } from '../../../domain/produktData';

export const OperationsHub: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  // Vier Produktmodule unverändert aus FUNKTION.modules abgeleitet
  // mit knapper, sachlicher Ableitung des Vertriebsbezugs ohne neue Wirkversprechen
  const module0 = {
    badge: 'Modul 01 • Inbound',
    name: FUNKTION.modules[0].name,
    desc: FUNKTION.modules[0].desc,
    relation: 'Inbound-Erfassung: Automatische Lead-Aufnahme aus Webformularen, Messen, E-Mails und LinkedIn Ads.',
  };

  const module1 = {
    badge: 'Modul 02 • Scoring',
    name: FUNKTION.modules[1].name,
    desc: FUNKTION.modules[1].desc,
    relation: 'Priorisierung: Lead-Bewertung von 0 bis 100 nach Firmografie, ICP-Fit und Verhalten.',
  };

  const module2 = {
    badge: 'Modul 03 • Outreach',
    name: FUNKTION.modules[2].name,
    desc: FUNKTION.modules[2].desc,
    relation: 'Outreach-Automation: Automatisierte Outreach- und Follow-up-Reihen per E-Mail.',
  };

  const module3 = {
    badge: 'Modul 04 • Pipeline',
    name: FUNKTION.modules[3].name,
    desc: FUNKTION.modules[3].desc,
    relation: 'Statusübersicht: Tabellenansicht und Echtzeit-Tracking aller Leads nach Status.',
  };

  const pipelineStages = ['New', 'MQL', 'SQL', 'Hot', 'Won', 'Lost'];

  return (
    <div
      className="facelift-operations-hub"
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
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--cyan-light)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '2px',
            }}
          >
            Betriebszentrale • Architektur
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
            Produkt-Betriebszentrale: Pipeline-Cockpit & Kernmodule
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Zentrales Pipeline-Cockpit im Zentrum mit sichtbaren Verbindungen zu den vier Produktmodulen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="operations-hub-table"
          aria-expanded={showTable}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '5px 12px',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'color 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {showTable ? 'Modulübersicht verbergen' : 'Modulübersicht anzeigen'}
        </button>
      </div>

      {/* SEMANTISCHE STRUKTUR & ECHTE ZENTRALGRAFIK:
          Obere Module (01 & 02) → Sichtbare gerichtete SVG-Verbinder →
          Zentrales Cockpit (Betriebszentrale) → Sichtbare gerichtete SVG-Verbinder →
          Untere Module (03 & 04)
      */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        {/* OBERE REIHE: Modul 01 und Modul 02 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* Modul 01 */}
          <div
            data-testid="hub-module-0"
            data-hub-order="1"
            style={{
              backgroundColor: 'var(--color-bg-deep)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-soft)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--cyan-light)', textTransform: 'uppercase' }}>
                  {module0.badge}
                </span>
              </div>
              <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {module0.name}
              </h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                {module0.desc}
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--color-surface)', borderLeft: '3px solid var(--color-primary)', padding: 'var(--space-2) var(--space-3)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
              <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                Vertriebsbezug
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text)', lineHeight: 1.35 }}>
                {module0.relation}
              </div>
            </div>
          </div>

          {/* Modul 02 */}
          <div
            data-testid="hub-module-1"
            data-hub-order="2"
            style={{
              backgroundColor: 'var(--color-bg-deep)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-soft)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--cyan-light)', textTransform: 'uppercase' }}>
                  {module1.badge}
                </span>
              </div>
              <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {module1.name}
              </h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                {module1.desc}
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--color-surface)', borderLeft: '3px solid var(--color-primary)', padding: 'var(--space-2) var(--space-3)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
              <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                Vertriebsbezug
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text)', lineHeight: 1.35 }}>
                {module1.relation}
              </div>
            </div>
          </div>
        </div>

        {/* SICHTBARE GERICHTETE SVG-VERBINDUNGEN: OBERE MODULE → ZENTRUM (Ausschließlich aus Modulbeschreibungen abgeleitet) */}
        <div
          data-testid="hub-connector-top"
          className="hub-connector"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: '32px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700 }}>
            <span>Inbound-Leads erfassen</span>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
              <path d="M6 1v14M2 11l4 4 4-4" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700 }}>
            <span>Lead-Bewertung 0–100</span>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
              <path d="M6 1v14M2 11l4 4 4-4" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* ZENTRALER KNOTEN: PIPELINE-COCKPIT (BETRIEBSZENTRALE) */}
        <div
          data-testid="hub-center"
          data-hub-order="3"
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--color-primary)',
            padding: 'var(--space-4)',
            boxShadow: '0 0 24px rgba(0, 217, 198, 0.12)',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span
                style={{
                  backgroundColor: 'var(--cyan-a12)',
                  color: 'var(--color-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(0, 217, 198, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Zentraler Knotenpunkt
              </span>
              <h4
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.0625rem',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                }}
              >
                {FUNKTION.modules[3].name} (Betriebszentrale)
              </h4>
            </div>

            <div
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-primary)',
                fontWeight: 600,
              }}
            >
              Echtzeit-Kanban & Statusübersicht
            </div>
          </div>

          <p
            style={{
              margin: '0 0 var(--space-3)',
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.45,
            }}
          >
            {FUNKTION.modules[3].desc}
          </p>

          {/* Kanban-Phasenleiste des Cockpits */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(65px, 1fr))',
              gap: 'var(--space-2)',
              paddingTop: 'var(--space-2)',
              borderTop: '1px solid var(--color-border-soft)',
            }}
          >
            {pipelineStages.map((stage, idx) => (
              <div
                key={stage}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  padding: '6px 4px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.625rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '2px',
                  }}
                >
                  0{idx + 1}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: stage === 'Won' ? 'var(--color-primary)' : stage === 'Hot' ? 'var(--color-accent)' : 'var(--color-text)',
                  }}
                >
                  {stage}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SICHTBARE GERICHTETE SVG-VERBINDUNGEN: ZENTRUM → UNTERE MODULE (Ausschließlich aus Modulbeschreibungen abgeleitet) */}
        <div
          data-testid="hub-connector-bottom"
          className="hub-connector"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: '32px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700 }}>
            <span>Outreach- & Follow-up-Reihen</span>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
              <path d="M6 1v14M2 11l4 4 4-4" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700 }}>
            <span>Echtzeit-Kanban & Tabellenansicht</span>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
              <path d="M6 1v14M2 11l4 4 4-4" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* UNTERE REIHE: Modul 03 und Modul 04 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* Modul 03 */}
          <div
            data-testid="hub-module-2"
            data-hub-order="4"
            style={{
              backgroundColor: 'var(--color-bg-deep)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-soft)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--cyan-light)', textTransform: 'uppercase' }}>
                  {module2.badge}
                </span>
              </div>
              <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {module2.name}
              </h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                {module2.desc}
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--color-surface)', borderLeft: '3px solid var(--color-primary)', padding: 'var(--space-2) var(--space-3)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
              <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                Vertriebsbezug
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text)', lineHeight: 1.35 }}>
                {module2.relation}
              </div>
            </div>
          </div>

          {/* Modul 04 */}
          <div
            data-testid="hub-module-3"
            data-hub-order="5"
            style={{
              backgroundColor: 'var(--color-bg-deep)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-soft)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
            }}
          >
            <div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700, color: 'var(--cyan-light)', textTransform: 'uppercase' }}>
                  {module3.badge}
                </span>
              </div>
              <h4 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text)' }}>
                {module3.name}
              </h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.45 }}>
                {module3.desc}
              </p>
            </div>
            <div style={{ backgroundColor: 'var(--color-surface)', borderLeft: '3px solid var(--color-primary)', padding: 'var(--space-2) var(--space-3)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
              <div style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                Vertriebsbezug
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text)', lineHeight: 1.35 }}>
                {module3.relation}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ausklappbare Detail-Referenztabelle */}
      {showTable && (
        <div
          id="operations-hub-table"
          style={{
            marginTop: 'var(--space-5)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Vollständige Modulübersicht aus der Produkt-Konfiguration:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {FUNKTION.modules.map((m, idx) => (
              <div
                key={m.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  backgroundColor: 'var(--color-bg-deep)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-soft)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    padding: '2px 8px',
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  0{idx + 1}
                </div>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {m.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
