import React, { useMemo } from 'react';
import {
  getExecutiveCockpitKpis,
  getArrTrendData,
  getMrrTierData,
} from '@/domain/executiveCockpitData';
import { CockpitKpiRail } from './CockpitKpiRail';
import { CockpitPanel } from './CockpitPanel';
import { TeamHrSnapshot } from './TeamHrSnapshot';
import { RoadmapSnapshot } from './RoadmapSnapshot';
import { PipelineSnapshot } from './PipelineSnapshot';
import { ManagementChart } from '@/components/ui/charts/ManagementChart';
import { LiveKpiCard } from '@/components/liveKpi/LiveKpiCard';

export interface ExecutiveCockpitProps {
  liveKpiCard?: React.ReactNode;
}

export const ExecutiveCockpit: React.FC<ExecutiveCockpitProps> = ({ liveKpiCard }) => {
  const kpis = useMemo(() => getExecutiveCockpitKpis(), []);
  const arrTrendData = useMemo(() => getArrTrendData(), []);
  const mrrTierData = useMemo(() => getMrrTierData(), []);

  return (
    <div
      data-testid="executive-cockpit-root"
      // G39 Welle 1 (Auftrag 054, Block B): Container-Query-Root — die Grids
      // unten reagieren auf die eigene Breite (Sidebar ein-/ausgeblendet),
      // nicht auf den Viewport. Schwellen 1024/768 liefern an den
      // Nachweis-Viewports (1440/768/375) exakt das bisherige Layout.
      className="executive-cockpit-container @container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6, 24px)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        /* G39 Welle 1 (Auftrag 054, Block B): containerbasiert statt
           viewportbasiert. Die Spaltenzahlen steuern die Plugin-Klassen an
           den Grid-Elementen (mobile-first); hier nur, was per Utilities
           nicht sinnvoll geht: Mobile-Priorisierung (display:contents +
           order, Auftrag-037-Reihenfolge). */
        @container (max-width: 767px) {
          .executive-cockpit-container {
            display: flex !important;
            flex-direction: column !important;
          }
          .cockpit-grid-main,
          .cockpit-grid-ops,
          .cockpit-grid-sales {
            display: contents !important;
          }

          /* Verbindliche Reihenfolge für Mobile gem. Auftrag 037:
             1. Executive-KPIs
             2. Live-KPI-Status
             3. Finanzentwicklung & Portfolio
             4. Pipeline-Snapshot
             5. Team & HR
             6. Roadmap
          */
          .cockpit-slot-kpis     { order: 1; }
          .cockpit-slot-live     { order: 2; }
          .cockpit-slot-finance  { order: 3; }
          .cockpit-slot-mrr      { order: 4; }
          .cockpit-slot-pipeline { order: 5; }
          .cockpit-slot-team     { order: 6; }
          .cockpit-slot-roadmap  { order: 7; }
        }
      `}</style>

      {/* 1. Executive-KPI-Leiste (ARR, Umsatz, EBITDA, Kunden) */}
      <div className="cockpit-slot-kpis" style={{ width: '100%' }}>
        <CockpitKpiRail kpis={kpis} />
      </div>

      {/* 2. Hauptbereich: Finanzentwicklung & MRR-Verteilung */}
      <div className="cockpit-grid-main grid w-full gap-[var(--space-5)] grid-cols-1 @[1024px]:grid-cols-[1.6fr_1fr]">
        <div className="cockpit-slot-finance" style={{ minWidth: 0, width: '100%' }}>
          <CockpitPanel
            title="Finanzentwicklung & ARR-Trend"
            subtitle="Historischer Verlauf des Annual Recurring Revenue (2024–2025)"
            sourceLabel="Ebene A Baseline"
          >
            <ManagementChart
              data={arrTrendData}
              xKey="period"
              type="area"
              height={260}
              series={[
                {
                  key: 'arr',
                  name: 'ARR (Annual Recurring Revenue)',
                  color: '#00D9C6',
                  unit: '€',
                },
              ]}
              sourceLabel="Ebene A Baseline"
              tooltipValueFormatter={(val) => `${val.toLocaleString('de-DE')} €`}
            />
          </CockpitPanel>
        </div>

        <div className="cockpit-slot-mrr" style={{ minWidth: 0, width: '100%' }}>
          <CockpitPanel
            title="MRR-Verteilung nach Paketen"
            subtitle="Umsatzbeitrag nach Starter, Growth und Pro"
            sourceLabel="Stammdaten 2025"
          >
            <ManagementChart
              data={mrrTierData}
              xKey="tier"
              type="bar"
              height={260}
              series={[
                {
                  key: 'mrr',
                  name: 'Monatlicher Erlös (MRR)',
                  color: '#7CEFE6',
                  unit: '€',
                },
              ]}
              sourceLabel="Stammdaten 2025"
              tooltipValueFormatter={(val) => `${val.toLocaleString('de-DE')} €`}
            />
          </CockpitPanel>
        </div>
      </div>

      {/* 3. Operativer Überblick: Team/HR, Roadmap & Live-KPI Ebene C */}
      <div className="cockpit-grid-ops grid w-full gap-[var(--space-5)] grid-cols-1 @[768px]:grid-cols-2 @[1024px]:grid-cols-3">
        <div className="cockpit-slot-team" style={{ minWidth: 0, width: '100%' }}>
          <CockpitPanel
            title="Teamstruktur & HR-Snapshot"
            subtitle="10,0 FTE Bestand & identifizierte Engpässe"
            sourceLabel="Ebene A Baseline"
          >
            <TeamHrSnapshot />
          </CockpitPanel>
        </div>

        <div className="cockpit-slot-roadmap" style={{ minWidth: 0, width: '100%' }}>
          <CockpitPanel
            title="Produkt-Roadmap & Meilensteine"
            subtitle="Release-Historie und geplante Versionen"
            sourceLabel="Produkt-Plan 2026"
          >
            <RoadmapSnapshot />
          </CockpitPanel>
        </div>

        <div className="cockpit-ops-live cockpit-slot-live @[768px]:col-span-2 @[1024px]:col-span-1" style={{ minWidth: 0, width: '100%' }}>
          <CockpitPanel
            title="Live-KPI Telemetrie"
            subtitle="Isolierte Echtzeit-Projektion aus externem Feed"
            sourceLabel="Ebene C Live-Feed"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              {liveKpiCard || (
                <LiveKpiCard
                  kpiId="pipeline_coverage"
                  title="Live Pipeline Coverage"
                  description="Echtzeit-Deckungsgrad aus n8n-Live-Feed"
                  fallbackUnit="x"
                />
              )}
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.4,
                  padding: '10px 12px',
                  background: 'rgba(5, 18, 17, 0.5)',
                  border: '1px solid rgba(0, 217, 198, 0.1)',
                  borderRadius: '6px',
                  marginTop: 'auto',
                }}
              >
                <strong>Hinweis Ebene C:</strong> Echtzeit-Telemetrie wird über die sichere
                Projektionstabelle empfangen. Bei unkonfigurierter Testumgebung zeigt der Hook
                einen ehrlichen Offline-Status ohne Mock-Interpolation.
              </div>
            </div>
          </CockpitPanel>
        </div>
      </div>

      {/* 4. Vertriebsüberblick: Pipeline-Snapshot (aggregiert aus 40 realen CRM-Deals) */}
      <div className="cockpit-grid-sales grid w-full gap-[var(--space-5)] grid-cols-1">
        <div className="cockpit-slot-pipeline" style={{ minWidth: 0, width: '100%' }}>
          <CockpitPanel
            title="Vertriebspipeline Snapshot"
            subtitle="Struktur und Volumina aus 40 realen CRM-Deals"
            sourceLabel="CRM Baseline"
          >
            <PipelineSnapshot />
          </CockpitPanel>
        </div>
      </div>
    </div>
  );
};
