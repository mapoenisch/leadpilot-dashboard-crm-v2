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
    <div
      className="facelift-location-atlas"
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
            Company Atlas • Standort Leipzig
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
            {STANDORT.title}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            {STANDORT.address}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="location-atlas-details-table"
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
          {showTable ? 'Mietdetails verbergen' : 'Mietdetails anzeigen'}
        </button>
      </div>

      {/* GROSSES LEITBILD (HERO STATION) MIT GETRENNTER BILDUNTERSCHRIFT */}
      <div
        style={{
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg-deep)',
          border: '1px solid var(--color-border)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {/* Bildbereich mit Overlays */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            backgroundColor: 'var(--color-surface)',
            overflow: 'hidden',
          }}
        >
          <img
            src={heroImage}
            alt="Fiktive Visualisierung: Außenansicht des Unternehmenssitzes der LeadPilot GmbH am Augustusplatz in Leipzig"
            width={1672}
            height={941}
            fetchPriority="high"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Overline-Label: FIKTIVE VISUALISIERUNG */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              backgroundColor: 'rgba(6, 22, 19, 0.92)',
              border: '1px solid rgba(0, 217, 198, 0.4)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: 'var(--cyan-light)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              zIndex: 2,
            }}
          >
            FIKTIVE VISUALISIERUNG
          </div>

          {/* Echtes LeadPilot-Logo als HTML-img-Overlay (dekorativ) */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: 'rgba(6, 22, 19, 0.92)',
              border: '1px solid var(--color-border-soft)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              display: 'flex',
              alignItems: 'center',
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            }}
          >
            <img
              src={logoImage}
              alt=""
              aria-hidden="true"
              width={2431}
              height={1093}
              style={{
                height: '18px',
                width: 'auto',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* Bildunterschrift getrennt unter dem Bild (garantiert ohne Overlay-Kollision) */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-surface-raised)',
            borderTop: '1px solid var(--color-border-soft)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
          }}
        >
          <div>
            <h4
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: 'var(--color-text)',
              }}
            >
              Unternehmenssitz Leipzig – Augustusplatz 9
            </h4>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {STANDORT.address}
            </p>
          </div>

          <span
            style={{
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--cyan-a12)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(0, 217, 198, 0.3)',
              fontWeight: 600,
            }}
          >
            {STANDORT.details[1][1]}
          </span>
        </div>
      </div>

      {/* DREI ERGÄNZENDE BILDSTATIONEN (GRID) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
        }}
      >
        {subStations.map((station) => (
          <div
            key={station.id}
            style={{
              backgroundColor: 'var(--color-bg-deep)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-soft)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Bild mit Overlays */}
            <div
              style={{
                position: 'relative',
                aspectRatio: '16 / 9',
                backgroundColor: 'var(--color-surface)',
                overflow: 'hidden',
              }}
            >
              <img
                src={station.src}
                alt={station.alt}
                width={1672}
                height={941}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* Overline-Label */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  backgroundColor: 'rgba(6, 22, 19, 0.92)',
                  border: '1px solid rgba(0, 217, 198, 0.35)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5625rem',
                  fontWeight: 700,
                  color: 'var(--cyan-light)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  zIndex: 2,
                }}
              >
                FIKTIVE VISUALISIERUNG
              </div>

              {/* Logo-Overlay (dekorativ) */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: 'rgba(6, 22, 19, 0.92)',
                  border: '1px solid var(--color-border-soft)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '3px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: 2,
                }}
              >
                <img
                  src={logoImage}
                  alt=""
                  aria-hidden="true"
                  width={2431}
                  height={1093}
                  style={{
                    height: '14px',
                    width: 'auto',
                    display: 'block',
                  }}
                />
              </div>
            </div>

            {/* Bildbeschriftung mit neutralen Texten */}
            <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
              <h5
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                }}
              >
                {station.title}
              </h5>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                {station.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* SCHLANKE FAKTENLEISTE (MIETOBJEKT-FAKTEN DIREKT AUS STANDORT.DETAILS) */}
      <div
        style={{
          backgroundColor: 'var(--color-bg-deep)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-soft)',
          padding: 'var(--space-4)',
        }}
      >
        <div
          style={{
            fontSize: '0.6875rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--cyan-light)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 'var(--space-3)',
          }}
        >
          Mietobjekt-Fakten (Vertragsdaten)
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          {STANDORT.details.map(([merkmal, wert]) => (
            <div
              key={merkmal}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-soft)',
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {merkmal}
              </span>
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                }}
              >
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
          style={{
            marginTop: 'var(--space-4)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div style={{ marginBottom: 'var(--space-2)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
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
