import React from 'react';
import { getTeamHrSnapshot } from '@/domain/executiveCockpitData';
import { Users, ShieldAlert } from 'lucide-react';

export const TeamHrSnapshot: React.FC = () => {
  const { structure, metrics, bottlenecks } = getTeamHrSnapshot();

  return (
    <div
      data-testid="team-hr-snapshot"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '6px',
      }}
    >
      {/* Szenisches, dekoratives Visual-Asset für räumliche Tiefenwirkung (G15-konform) */}
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
          opacity: 0.65,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Inhaltsebene über dem szenischen Backdrop */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
        }}
      >
        {/* Organigramm Struktur — Reines semantisches DOM mit Verbindungslinien */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
          }}
        >
          {/* CEO Root Node */}
          <div
            style={{
              background: 'rgba(5, 20, 19, 0.55)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(0, 217, 198, 0.45)',
              boxShadow: '0 0 20px rgba(0, 217, 198, 0.25)',
              borderRadius: '6px',
              padding: '10px 16px',
              textAlign: 'center',
              maxWidth: '320px',
              width: '100%',
            }}
          >
            <div style={{ fontSize: '11px', color: '#00D9C6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {structure.root.role} · {structure.root.fte}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginTop: '2px' }}>
              {structure.root.staffing}
            </div>
          </div>

          {/* Vertikale Verbindungslinie */}
          <div
            style={{
              width: '2px',
              height: '14px',
              background: 'linear-gradient(180deg, #00D9C6 0%, rgba(0, 217, 198, 0.4) 100%)',
              boxShadow: '0 0 8px rgba(0, 217, 198, 0.4)',
            }}
          />

          {/* 4 Fachbereiche Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '10px',
              width: '100%',
            }}
          >
            {structure.units.map((unit) => {
              const hasWarning = unit.staffing.includes('kritisch') || unit.staffing.includes('ausgereizt');
              const borderColor = hasWarning ? 'rgba(255, 122, 61, 0.4)' : 'rgba(0, 217, 198, 0.3)';
              const bgGlow = hasWarning ? 'rgba(255, 122, 61, 0.12)' : 'rgba(5, 20, 19, 0.50)';

              return (
                <div
                  key={unit.role}
                  style={{
                    background: bgGlow,
                    backdropFilter: 'blur(6px)',
                    border: `1px solid ${borderColor}`,
                    boxShadow: hasWarning ? '0 0 12px rgba(255, 122, 61, 0.15)' : '0 0 12px rgba(0, 217, 198, 0.10)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#FFFFFF' }}>
                      {unit.role}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: hasWarning ? '#FF7A3D' : '#00D9C6',
                        background: hasWarning ? 'rgba(255, 122, 61, 0.15)' : 'rgba(0, 217, 198, 0.12)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {unit.fte}
                    </span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                    {unit.staffing}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gesamtbestand Leiste */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(5, 18, 17, 0.55)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(0, 217, 198, 0.22)',
              borderRadius: '4px',
              marginTop: '2px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} color="#00D9C6" />
              <span>{structure.total.role}: <strong style={{ color: '#FFFFFF' }}>{structure.total.fte}</strong></span>
            </span>
            <span style={{ fontSize: '11px', color: '#00D9C6', fontWeight: 600 }}>
              {structure.total.staffing}
            </span>
          </div>
        </div>

        {/* HR-Metriken & Engpässe Split */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            borderTop: '1px solid rgba(0, 217, 198, 0.12)',
            paddingTop: '14px',
          }}
        >
          {/* Metriken */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'rgba(5, 20, 19, 0.50)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(0, 217, 198, 0.18)',
              borderRadius: '6px',
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Personal-Kennzahlen
            </div>
            {metrics.slice(2, 6).map((m) => (
              <div
                key={m.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11.5px',
                  padding: '4px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <span style={{ color: 'var(--color-text-muted)' }}>{m.label}</span>
                <span style={{ fontWeight: 600, color: '#E2E8F0', textAlign: 'right' }}>{m.val}</span>
              </div>
            ))}
          </div>

          {/* Kritische Engpässe */}
          <div
            style={{
              background: 'rgba(255, 122, 61, 0.08)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 122, 61, 0.3)',
              borderRadius: '6px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#FF7A3D',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <ShieldAlert size={14} />
              <span>Kritische Personal-Engpässe</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {bottlenecks.slice(0, 3).map((b, idx) => (
                <li key={idx} style={{ fontSize: '11px', color: '#FFD4C2', lineHeight: 1.35 }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
