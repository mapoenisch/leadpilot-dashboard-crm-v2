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
          ? `${className} live-performance-stage live-performance-surface flex flex-col gap-[var(--space-5,24px)] w-full min-w-0`
          : 'live-performance-stage live-performance-surface flex flex-col gap-[var(--space-5,24px)] w-full min-w-0'
      }
      aria-label="Live Performance Bereich (Ebene C)"
    >
      {/* Prominenter Abschnittskopf mit Eyebrow, Display-Titel und Referenz-Hierarchie */}
      <div className="border-0 flex items-start justify-between flex-wrap gap-[12px] border-b border-solid border-[rgba(0,242,254,0.18)] pb-[16px]">
        <div>
          <div className="flex items-center gap-[6px] font-mono text-[11px] font-bold tracking-[0.12em] uppercase mb-[6px] text-primary">
            <span>Ebene C · Echtzeit-Steuerung</span>
          </div>

          <div className="flex items-center gap-[12px] flex-wrap">
            <h2 className="m-0 font-display text-[26px] font-bold tracking-[-0.02em] leading-[1.15] text-text flex items-center gap-[10px]">
              <span className="inline-block w-[9px] h-[9px] rounded-full shrink-0 bg-[#00f2fe] shadow-[0_0_10px_#00f2fe,0_0_3px_#00f2fe]" />
              Live Performance
            </h2>
            <Badge variant="cyan" style={{ fontSize: '10.5px', padding: '3px 10px', letterSpacing: '0.02em' }}>
              Ebene C · bestätigte Live-Ist-Daten
            </Badge>
          </div>

          <p className="text-[12px] leading-[1.5] mt-[6px] mb-0 mr-0 ml-0 max-w-[680px] text-[var(--color-text-dim)]">
            Bestätigte Echtzeit-Ist-Daten aus n8n und Supabase Live-Feed (12 zertifizierte Katalog-KPIs).
            Unveränderliche historische Baseline und Szenarien folgen als Ebene A und B darunter.
          </p>
        </div>

        <div className="flex items-center gap-[8px] flex-wrap self-center">
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
        <div className="live-performance-col-4 min-w-0">
          <LiveKpiCard
            kpiId="arr"
            title="Live ARR"
            description="Jährlich wiederkehrender Umsatz (Realtime)"
            fallbackUnit="€"
          />
        </div>

        <div className="live-performance-col-4 min-w-0">
          <LiveKpiCard
            kpiId="mrr"
            title="Live MRR"
            description="Monatlich wiederkehrender Umsatz (Realtime)"
            fallbackUnit="€"
          />
        </div>

        <div className="live-performance-col-4 min-w-0">
          <LiveKpiCard
            kpiId="pipeline_coverage"
            title="Live Pipeline Coverage"
            description="Pipeline-Deckungsfaktor (Realtime)"
            fallbackUnit="x"
          />
        </div>

        {/* Reihe 2: ARR-Graph (8 Spalten) und ARR-Mix (4 Spalten) */}
        <div className="live-performance-col-8 min-w-0">
          <StreamingAreaChart />
        </div>

        <div className="live-performance-col-4 min-w-0">
          <LiveArrMixDonut />
        </div>

        {/* Reihe 3: Funnel (8 Spalten) und Activity Feed (4 Spalten) */}
        <div className="live-performance-col-8 min-w-0">
          <LiveFunnelBarChart />
        </div>

        <div className="live-performance-col-4 min-w-0">
          <LiveActivityFeed />
        </div>
      </div>
    </section>
  );
});
