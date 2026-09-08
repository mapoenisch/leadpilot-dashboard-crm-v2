import React, { useState } from 'react';
import { PROFILE_ROWS } from '../../../domain/execData';
import { Table } from '../../../components/ui/Table';

interface FieldItem {
  label: string;
  value: string;
}

export const CompanyRegisterCard: React.FC = () => {
  const [showRawTable, setShowRawTable] = useState(false);

  // Werte ausschließlich aus PROFILE_ROWS ableiten
  const getProfileValue = (label: string): string => {
    const row = PROFILE_ROWS.find(([k]) => k.toLowerCase() === label.toLowerCase());
    return row ? row[1] : '';
  };

  const firmenname = getProfileValue('Firmenname');
  const handelsregister = getProfileValue('Handelsregister');
  const gruendungsdatum = getProfileValue('Gründungsdatum');

  const identitaet: FieldItem[] = [
    { label: 'Firmenname', value: getProfileValue('Firmenname') },
    { label: 'Gegenstand des Unternehmens', value: getProfileValue('Gegenstand des Unternehmens') },
    { label: 'Sitz & Adresse', value: getProfileValue('Sitz & Adresse') },
  ];

  const stammdaten: FieldItem[] = [
    { label: 'Stammkapital', value: getProfileValue('Stammkapital') },
    { label: 'Gesellschafter', value: getProfileValue('Gesellschafter') },
    { label: 'Geschäftsführung', value: getProfileValue('Geschäftsführung') },
  ];

  const recht: FieldItem[] = [
    { label: 'Rechtsform', value: getProfileValue('Rechtsform') },
    { label: 'Handelsregister', value: getProfileValue('Handelsregister') },
    { label: 'Gründungsdatum', value: getProfileValue('Gründungsdatum') },
  ];

  return (
    <div
      className="facelift-company-register"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Registerkarten-Kopf */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-5)',
          backgroundColor: 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary)',
              boxShadow: 'var(--shadow-glow-cyan)',
            }}
          />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                letterSpacing: '0.02em',
              }}
            >
              Firmenakte {firmenname}
            </div>
            {handelsregister && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px',
                }}
              >
                {handelsregister}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowRawTable(!showRawTable)}
          aria-controls="company-register-raw-table"
          aria-expanded={showRawTable}
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
          {showRawTable ? 'Detailtabelle verbergen' : 'Detailtabelle anzeigen'}
        </button>
      </div>

      {/* Drei Fachgruppen (Responsive Grid: Desktop 3 Spalten -> Tablet 2 -> Mobile 1) */}
      <div
        style={{
          padding: 'var(--space-5)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: 'var(--space-5)',
          alignItems: 'stretch',
        }}
      >
        {/* Gruppe 1: Identität */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-soft)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              paddingBottom: 'var(--space-2)',
              borderBottom: '1px solid var(--color-border-soft)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'var(--color-text)',
              letterSpacing: '0.01em',
            }}
          >
            Identität & Zweck
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {identitaet.map((item) => (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gruppe 2: Stammdaten */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-soft)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              paddingBottom: 'var(--space-2)',
              borderBottom: '1px solid var(--color-border-soft)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'var(--color-text)',
              letterSpacing: '0.01em',
            }}
          >
            Stammdaten & Kapital
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {stammdaten.map((item) => (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gruppe 3: Recht & Beurkundung */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-deep)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-soft)',
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              paddingBottom: 'var(--space-2)',
              borderBottom: '1px solid var(--color-border-soft)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'var(--color-text)',
              letterSpacing: '0.01em',
            }}
          >
            Recht & Beurkundung
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recht.map((item) => (
              <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    lineHeight: 1.4,
                    wordBreak: 'break-word',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subtile dokumentenartige Verbindung zwischen Stammdaten, Recht und Beurkundung */}
      <div
        style={{
          margin: '0 var(--space-5) var(--space-4)',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8M6 2v8" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Beurkundung: {gruendungsdatum}
        </span>
        <span style={{ color: 'var(--cyan-light)' }}>
          {handelsregister}
        </span>
      </div>

      {/* Ausklappbare Detailtabelle als Fallback */}
      {showRawTable && (
        <div
          id="company-register-raw-table"
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: 'var(--space-4) var(--space-5)',
            backgroundColor: 'var(--color-bg-deep)',
          }}
        >
          <div style={{ marginBottom: 'var(--space-3)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Vollständige Stammdaten (Tabellen-Referenzansicht):
          </div>
          <Table
            columns={[
              { key: '0', label: 'Merkmal' },
              { key: '1', label: 'Angabe' },
            ]}
            rows={PROFILE_ROWS.map((r) => ({ 0: r[0], 1: r[1] }))}
          />
        </div>
      )}
    </div>
  );
};
