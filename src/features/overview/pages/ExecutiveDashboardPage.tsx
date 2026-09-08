import React from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { HERO, EXEC_KPIS_1, EXEC_KPIS_2, CHART_ARR } from '@/domain/execData';
import { ExecutiveCockpit } from '@/components/executiveCockpit';
import { LivePerformanceSection } from '@/components/liveKpi/LivePerformanceSection';

// Hinweis: LiveKpiCard (u.a. pipeline_coverage) ist nun gebündelt in LivePerformanceSection eingebunden.

export function ExecutiveDashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6, 24px)', width: '100%' }}>
      {/* Page Header mit klarer Zeitebenenkennzeichnung */}
      <SectionHeader
        eyebrow={HERO.eyebrow}
        title="Executive Cockpit V2"
        description={`Integrierte Unternehmenssteuerung: Finanzielle Baseline (${EXEC_KPIS_1.length + EXEC_KPIS_2.length} KPIs, ${CHART_ARR.labels.length} Quartale), operative Einheiten und Ebene-C-Echtzeitfeed.`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2, 8px)', flexWrap: 'wrap' }}>
            <Badge variant="cyan">Ebene A Baseline</Badge>
            <Badge variant="neutral">Stand: 31.12.2025</Badge>
            <Badge variant="orange">Ebene C Realtime</Badge>
          </div>
        }
      />

      {/* Auftrag 042: Ebene C Live Performance Surface als führende Ebene vor Ebene A */}
      <LivePerformanceSection />

      {/* Integriertes V2-Führungscockpit ohne frühere Einzelkarte */}
      <ExecutiveCockpit />
    </div>
  );
}
