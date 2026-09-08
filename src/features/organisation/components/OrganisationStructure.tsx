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
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        background: 'rgba(6, 22, 19, 0.65)',
        backdropFilter: 'var(--backdrop-blur-md)',
        WebkitBackdropFilter: 'var(--backdrop-blur-md)',
        overflow: 'hidden',
        padding: 'var(--space-6)',
      }}
    >
      {/* Rein dekorativer Backdrop-Layer mit WebP-Asset und tokenbasiertem Fallback */}
      <img
        src="/assets/organisation/team-structure-backdrop.webp"
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

      {/* Inhaltsebene über dem Backdrop */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-5)',
        }}
      >
        {/* Header / Titelzeile */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            paddingBottom: 'var(--space-3)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-primary)',
              }}
            >
              Organigramm · Ebene A
            </span>
            <h2
              style={{
                margin: '2px 0 0',
                fontSize: '17px',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                color: 'var(--color-text)',
              }}
            >
              Funktionale Organisation & Führungsspanne
            </h2>
          </div>
          <Badge variant="cyan">Stand: 31.12.2025</Badge>
        </div>

        {/* 1. Root Node: CEO / Ops */}
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '100%' }}>
            <OrganisationUnitCard unit={root} highlight />
          </div>
        </div>

        {/* Dekorative Verbindungslinien (nur Desktop / Tablet, rein visuell) */}
        <div
          className="organigram-connectors"
          aria-hidden="true"
          style={{
            width: '100%',
            maxWidth: '1080px',
            height: '28px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Vertikale Linie von Root nach unten */}
          <div
            style={{
              width: '2px',
              height: '14px',
              background: 'linear-gradient(to bottom, rgba(0, 217, 198, 0.6), rgba(0, 217, 198, 0.3))',
            }}
          />
          {/* Horizontale Querlinie über die 4 Funktionsbereiche */}
          <div
            style={{
              width: '80%',
              height: '2px',
              background: 'rgba(0, 217, 198, 0.3)',
            }}
          />
          {/* Vertikale Linien zu den 4 Spalten */}
          <div
            style={{
              width: '80%',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: '2px',
                  height: '12px',
                  background: 'rgba(0, 217, 198, 0.3)',
                }}
              />
            ))}
          </div>
        </div>

        {/* 2. Funktionsbereiche Grid */}
        <div
          className="organigram-grid"
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {units.map((unit) => (
            <OrganisationUnitCard key={unit.role} unit={unit} />
          ))}
        </div>

        {/* 3. Gesamtbestand Zusammenfassung */}
        <div style={{ width: '100%', marginTop: 'var(--space-2)' }}>
          <Card
            variant="glass"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
              background: 'rgba(0, 217, 198, 0.04)',
              border: '1px solid rgba(0, 217, 198, 0.25)',
              padding: 'var(--space-3) var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '15px',
                  color: 'var(--color-text)',
                }}
              >
                {total.role}
              </span>
              <Badge variant="cyan">{total.fte}</Badge>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {total.staffing}
            </span>
          </Card>
        </div>
      </div>
    </section>
  );
}
