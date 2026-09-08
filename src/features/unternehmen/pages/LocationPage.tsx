import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { STANDORT } from '@/domain/unternehmenData';
import {
  MapPin,
  Maximize2,
  FileText,
  Coins,
  ShieldCheck,
  Home,
  Building,
  type LucideIcon,
} from 'lucide-react';

import heroImage from '../../../../assets/facelift/unternehmen/unternehmen-aussen-augustusplatz.png';
import receptionImage from '../../../../assets/facelift/unternehmen/unternehmen-innen-empfang.png';
import meetingImage from '../../../../assets/facelift/unternehmen/unternehmen-innen-besprechung.png';
import workspaceImage from '../../../../assets/facelift/unternehmen/unternehmen-innen-workspace.png';
import logoImage from '../../../../assets/logo/leadpilot-logo-full.png';

const DETAIL_ICONS: Record<string, LucideIcon> = {
  Standort: MapPin,
  Fläche: Maximize2,
  Mietvertrag: FileText,
  'Mietkosten 2025': Coins,
  Mietkaution: ShieldCheck,
  Eigentum: Home,
};

const DETAIL_STRUCTURAL_TAGS: readonly string[] = [
  'DETAIL 01 // STANDORT',
  'DETAIL 02 // MIETOBJEKT',
  'DETAIL 03 // VERTRAGSDATEN',
  'DETAIL 04 // OPEX',
  'DETAIL 05 // KAUTION',
  'DETAIL 06 // STATUS',
];

const SUB_STATIONS = [
  {
    id: 'empfang',
    title: 'Empfangsbereich',
    src: receptionImage,
    alt: 'Fiktive Visualisierung: Empfangsbereich der LeadPilot Geschäftsräume',
  },
  {
    id: 'besprechung',
    title: 'Besprechungsraum',
    src: meetingImage,
    alt: 'Fiktive Visualisierung: Besprechungsraum in den LeadPilot Geschäftsräumen',
  },
  {
    id: 'workspace',
    title: 'Arbeitsbereich',
    src: workspaceImage,
    alt: 'Fiktive Visualisierung: Arbeitsbereich in den LeadPilot Geschäftsräumen',
  },
];

export function LocationPage() {
  return (
    <div
      className="unternehmen-v2-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}
    >
      <SectionHeader
        eyebrow="Unternehmen · Standort"
        title={STANDORT.title}
        description={STANDORT.address}
      />

      {/* GROSSES LEITBILD (HERO STATION): AUSSENANSICHT AUGUSTUSPLATZ */}
      <div
        style={{
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: '#04100F',
          border: '1px solid rgba(0, 217, 198, 0.35)',
          boxShadow: '0 12px 40px -8px rgba(0, 0, 0, 0.5), 0 0 24px rgba(0, 217, 198, 0.12)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            backgroundColor: '#081C1A',
            overflow: 'hidden',
          }}
        >
          <img
            src={heroImage}
            alt="Fiktive Visualisierung: Außenansicht des Unternehmenssitzes am Augustusplatz in Leipzig"
            width={1672}
            height={941}
            fetchPriority="high"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />

          {/* Overline-Label: FIKTIVE VISUALISIERUNG */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              backgroundColor: 'rgba(3, 12, 11, 0.92)',
              border: '1px solid rgba(0, 217, 198, 0.45)',
              borderRadius: '4px',
              padding: '4px 9px',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: '#00D9C6',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              zIndex: 2,
            }}
          >
            FIKTIVE VISUALISIERUNG
          </div>

          {/* LeadPilot-Logo-Overlay (dekorativ) */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              backgroundColor: 'rgba(3, 12, 11, 0.92)',
              border: '1px solid rgba(0, 217, 198, 0.3)',
              borderRadius: '4px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              zIndex: 2,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
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

        {/* Bildunterschrift / Headerzeile */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'rgba(6, 22, 20, 0.95)',
            borderTop: '1px solid rgba(0, 217, 198, 0.2)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: '16px',
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              Unternehmenssitz · Augustusplatz 9
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#9BB2B0' }}>
              {STANDORT.address}
            </p>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '3px 9px',
              borderRadius: '4px',
              backgroundColor: 'rgba(0, 217, 198, 0.1)',
              color: '#00D9C6',
              border: '1px solid rgba(0, 217, 198, 0.3)',
              fontWeight: 700,
            }}
          >
            MIETOBJEKT
          </span>
        </div>
      </div>

      {/* DREI INNENANSICHTEN (GRID) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: '16px',
        }}
      >
        {SUB_STATIONS.map((station) => (
          <div
            key={station.id}
            style={{
              backgroundColor: '#04100F',
              borderRadius: '8px',
              border: '1px solid rgba(0, 217, 198, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                backgroundColor: '#081C1A',
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
                  height: 'auto',
                  display: 'block',
                }}
              />

              {/* Overline-Label */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  backgroundColor: 'rgba(3, 12, 11, 0.92)',
                  border: '1px solid rgba(0, 217, 198, 0.4)',
                  borderRadius: '3px',
                  padding: '3px 7px',
                  fontFamily: 'monospace',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  color: '#00D9C6',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  zIndex: 2,
                }}
              >
                FIKTIVE VISUALISIERUNG
              </div>

              {/* Logo-Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: 'rgba(3, 12, 11, 0.92)',
                  border: '1px solid rgba(0, 217, 198, 0.25)',
                  borderRadius: '3px',
                  padding: '4px 8px',
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

            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(6, 22, 20, 0.95)',
                borderTop: '1px solid rgba(0, 217, 198, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-display, sans-serif)',
                }}
              >
                {station.title}
              </h4>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: 'var(--color-text-muted)',
                }}
              >
                FIKTIV
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* HEADQUARTERS STANDORT-FLÄCHE (MIT DEKORATIVEM GRID-BACKDROP DAHINTER) */}
      <div
        data-testid="location-headquarters"
        className="unternehmen-v2-hq-panel"
        style={{
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 217, 198, 0.35)',
          boxShadow: '0 12px 40px -8px rgba(0, 0, 0, 0.5), 0 0 24px rgba(0, 217, 198, 0.12)',
          background: 'linear-gradient(135deg, rgba(8, 28, 26, 0.95) 0%, rgba(4, 16, 15, 0.92) 100%)',
        }}
      >
        {/* Ergänzender dekorativer Koordinaten-/Grundriss-Hintergrund */}
        <img
          src="/assets/unternehmen/location-grid-backdrop.webp"
          alt=""
          aria-hidden="true"
          width={1600}
          height={900}
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.35,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* DOM-Inhaltsebene über dem Backdrop */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* Top Status-Bar mit neutralen Strukturkennzeichnungen */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00D9C6',
                  boxShadow: '0 0 8px #00D9C6',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#00D9C6', fontFamily: 'monospace' }}>
                HEADQUARTERS // STANDORTDATEN
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                fontFamily: 'monospace',
                background: 'rgba(0, 217, 198, 0.08)',
                border: '1px solid rgba(0, 217, 198, 0.2)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              VERTRAGSDATEN
            </div>
          </div>

          {/* Address Block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: 'rgba(0, 217, 198, 0.12)',
                border: '1px solid rgba(0, 217, 198, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00D9C6',
                boxShadow: '0 0 16px rgba(0, 217, 198, 0.2)',
                flexShrink: 0,
              }}
            >
              <Building size={22} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                OFFIZIELLE ANSCHRIFT
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-display, sans-serif)',
                  letterSpacing: '-0.01em',
                }}
              >
                {STANDORT.address}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* 6 STRUKTURIERTE TECHNISCHE DATEN-PANELS AUS STANDORT.details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#00D9C6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Vertrags- & Mietparameter
            </div>
            <h3
              style={{
                margin: '2px 0 0',
                fontSize: '18px',
                fontWeight: 700,
                color: '#FFFFFF',
                fontFamily: 'var(--font-display, sans-serif)',
              }}
            >
              Standortdetails & Mietdaten
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
            6 KENNDATENSÄTZE
          </span>
        </div>

        <div
          className="unternehmen-v2-details-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {STANDORT.details.map(([key, val], idx) => {
            const Icon = DETAIL_ICONS[key] || Building;
            const tag = DETAIL_STRUCTURAL_TAGS[idx] || `DETAIL 0${idx + 1}`;

            return (
              <div
                key={key}
                className="unternehmen-v2-detail-card"
                style={{
                  background: 'linear-gradient(180deg, rgba(7, 24, 22, 0.85) 0%, rgba(4, 16, 15, 0.9) 100%)',
                  border: '1px solid rgba(0, 217, 198, 0.22)',
                  boxShadow: '0 6px 24px -4px rgba(0, 0, 0, 0.4), 0 0 12px rgba(0, 217, 198, 0.06)',
                  borderRadius: '8px',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  position: 'relative',
                  backdropFilter: 'blur(8px)',
                  transition: 'border-color 0.2s ease, transform 0.2s ease',
                }}
              >
                {/* Top: Icon & Tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '6px',
                      background: 'rgba(0, 217, 198, 0.08)',
                      border: '1px solid rgba(0, 217, 198, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00D9C6',
                    }}
                  >
                    <Icon size={17} />
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#7CEFE6',
                      background: 'rgba(0, 217, 198, 0.08)',
                      border: '1px solid rgba(0, 217, 198, 0.2)',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {tag}
                  </span>
                </div>

                {/* Key */}
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {key}
                </div>

                {/* Value */}
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    lineHeight: 1.5,
                  }}
                >
                  {val}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
