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
      className="executive-cockpit-container"
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
        .cockpit-grid-main {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: var(--space-5, 20px);
          width: 100%;
        }

        .cockpit-grid-ops {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: var(--space-5, 20px);
          width: 100%;
        }

        .cockpit-grid-sales {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-5, 20px);
          width: 100%;
        }

        /* 768px Tablet Breakpoint: 2 Spalten */
        @media (max-width: 1024px) and (min-width: 768px) {
          .cockpit-grid-main {
            grid-template-columns: 1fr;
          }
          .cockpit-grid-ops {
            grid-template-columns: 1fr 1fr;
          }
          .cockpit-ops-live {
            grid-column: span 2;
          }
        }

        /* 375px Mobile Breakpoint: 1 Spalte mit strikter Priorisierung */
        @media (max-width: 767px) {
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
      <div className="cockpit-grid-main">
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
      <div className="cockpit-grid-ops">
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

        <div className="cockpit-ops-live cockpit-slot-live" style={{ minWidth: 0, width: '100%' }}>
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
      <div className="cockpit-grid-sales">
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
