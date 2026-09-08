import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { LiveKpiCard } from './LiveKpiCard';
import { StreamingAreaChart } from './StreamingAreaChart';
import { LiveArrMixDonut } from './LiveArrMixDonut';
import { LiveFunnelBarChart } from './LiveFunnelBarChart';
import { LiveActivityFeed } from './LiveActivityFeed';

export interface LivePerformanceSectionProps {
  className?: string;
}

export const LivePerformanceSection = React.memo(function LivePerformanceSection({
  className,
}: LivePerformanceSectionProps) {
  return (
    <section
      data-testid="live-performance-section"
      className={
        className
          ? `${className} live-performance-stage live-performance-surface`
          : 'live-performance-stage live-performance-surface'
      }
      aria-label="Live Performance Bereich (Ebene C)"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5, 24px)',
        width: '100%',
        minWidth: 0,
      }}
    >
      {/* Prominenter Abschnittskopf mit Eyebrow, Display-Titel und Referenz-Hierarchie */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(0, 242, 254, 0.18)',
          paddingBottom: '16px',
        }}
      >
        <div>
          <div
            style={{
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Ebene C · Echtzeit-Steuerung</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2
              style={{
                color: 'var(--color-text)',
                fontFamily: 'var(--font-display)',
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#00f2fe',
                  boxShadow: '0 0 10px #00f2fe, 0 0 3px #00f2fe',
                  flexShrink: 0,
                }}
              />
              Live Performance
            </h2>
            <Badge variant="cyan" style={{ fontSize: '10.5px', padding: '3px 10px', letterSpacing: '0.02em' }}>
              Ebene C · bestätigte Live-Ist-Daten
            </Badge>
          </div>

          <p
            style={{
              color: 'var(--color-text-dim)',
              fontSize: '12px',
              lineHeight: 1.5,
              margin: '6px 0 0',
              maxWidth: '680px',
            }}
          >
            Bestätigte Echtzeit-Ist-Daten aus n8n und Supabase Live-Feed (12 zertifizierte Katalog-KPIs).
            Unveränderliche historische Baseline und Szenarien folgen als Ebene A und B darunter.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', alignSelf: 'center' }}>
          <Badge variant="mint" style={{ fontSize: '10px', padding: '3px 8px' }}>
            Realtime Stream
          </Badge>
          <Badge variant="neutral" style={{ fontSize: '10px', padding: '3px 8px' }}>
            Multi-KPI Pipeline
          </Badge>
        </div>
      </div>

      {/* 12-Spalten-Grid (Desktop) / Einspaltig gestapelt (Tablet/Mobile) */}
      <div className="live-performance-grid">
        {/* Reihe 1: Die 3 Kern-Karten (je 4 Spalten auf Desktop) */}
        <div className="live-performance-col-4" style={{ minWidth: 0 }}>
          <LiveKpiCard
            kpiId="arr"
            title="Live ARR"
            description="Jährlich wiederkehrender Umsatz (Realtime)"
            fallbackUnit="€"
          />
        </div>

        <div className="live-performance-col-4" style={{ minWidth: 0 }}>
          <LiveKpiCard
            kpiId="mrr"
            title="Live MRR"
            description="Monatlich wiederkehrender Umsatz (Realtime)"
            fallbackUnit="€"
          />
        </div>

        <div className="live-performance-col-4" style={{ minWidth: 0 }}>
          <LiveKpiCard
            kpiId="pipeline_coverage"
            title="Live Pipeline Coverage"
            description="Pipeline-Deckungsfaktor (Realtime)"
            fallbackUnit="x"
          />
        </div>

        {/* Reihe 2: ARR-Graph (8 Spalten) und ARR-Mix (4 Spalten) */}
        <div className="live-performance-col-8" style={{ minWidth: 0 }}>
          <StreamingAreaChart />
        </div>

        <div className="live-performance-col-4" style={{ minWidth: 0 }}>
          <LiveArrMixDonut />
        </div>

        {/* Reihe 3: Funnel (8 Spalten) und Activity Feed (4 Spalten) */}
        <div className="live-performance-col-8" style={{ minWidth: 0 }}>
          <LiveFunnelBarChart />
        </div>

        <div className="live-performance-col-4" style={{ minWidth: 0 }}>
          <LiveActivityFeed />
        </div>
      </div>
    </section>
  );
});
