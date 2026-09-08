import React from 'react';
import { getRoadmapSnapshot } from '@/domain/executiveCockpitData';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react';

export const RoadmapSnapshot: React.FC = () => {
  const { releases } = getRoadmapSnapshot();

  return (
    <div
      data-testid="roadmap-snapshot"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '6px',
      }}
    >
      {/* Szenisches, dekoratives Visual-Asset für räumliche Horizont- und Tiefenwirkung */}
      <img
        src="/assets/roadmap/roadmap-backdrop.webp"
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

      {/* Semantische Timeline-Ebene über dem szenischen Backdrop */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          paddingLeft: '8px',
        }}
      >
        {/* Vertikale Verbindungslinie */}
        <div
          style={{
            position: 'absolute',
            left: '19px',
            top: '8px',
            bottom: '12px',
            width: '2px',
            background: 'linear-gradient(180deg, #00D9C6 0%, rgba(0, 217, 198, 0.6) 60%, rgba(143, 163, 161, 0.3) 100%)',
            boxShadow: '0 0 10px rgba(0, 217, 198, 0.5)',
          }}
        />

        {releases.map((rel, idx) => {
          const isReleased = rel.status === 'Released';
          const isInDev = rel.status === 'In Entwicklung';
          const dotColor = isReleased ? '#00D9C6' : isInDev ? '#7CEFE6' : '#8FA3A1';
          const badgeBg = isReleased
            ? 'rgba(0, 217, 198, 0.15)'
            : isInDev
            ? 'rgba(124, 239, 230, 0.18)'
            : 'rgba(255, 255, 255, 0.08)';
          const badgeBorder = isReleased
            ? 'rgba(0, 217, 198, 0.3)'
            : isInDev
            ? 'rgba(124, 239, 230, 0.35)'
            : 'rgba(255, 255, 255, 0.15)';

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                position: 'relative',
              }}
            >
              {/* Dot Icon */}
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(5, 18, 17, 0.95)',
                  border: `2px solid ${dotColor}`,
                  boxShadow: `0 0 10px ${dotColor}66`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  zIndex: 2,
                }}
              >
                {isReleased ? (
                  <CheckCircle2 size={13} color="#00D9C6" />
                ) : isInDev ? (
                  <Sparkles size={12} color="#7CEFE6" />
                ) : (
                  <Clock size={12} color="#8FA3A1" />
                )}
              </div>

              {/* Release Box */}
              <div
                style={{
                  background: 'rgba(5, 20, 19, 0.45)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(0, 217, 198, 0.25)',
                  boxShadow: '0 0 14px rgba(0, 217, 198, 0.10)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#00D9C6' }}>
                      {rel.quarter}
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#FFFFFF' }}>
                      {rel.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      background: badgeBg,
                      border: `1px solid ${badgeBorder}`,
                      color: dotColor,
                    }}
                  >
                    {rel.status}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                  {rel.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
