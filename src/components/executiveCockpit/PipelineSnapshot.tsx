import React from 'react';
import { usePipelineOverview } from '@/hooks/queries/usePipelineOverview';
import { formatManagementMetric } from '@/components/ui/charts/managementChartTheme';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { Layers, CheckCircle2, Clock } from 'lucide-react';

export const PipelineSnapshot: React.FC = () => {
  const { data: pipeline = null, isLoading: loading, isError, error } = usePipelineOverview();
  const errorMessage = isError
    ? error instanceof Error
      ? error.message
      : 'Fehler beim Laden der CRM-Deals'
    : null;

  if (loading) {
    return (
      <ManagementChartState
        type="loading"
        message="Lade Pipeline-Daten aus CRM-Baseline..."
        sourceLabel="Ebene A CRM Funnel Deals"
        height={220}
      />
    );
  }

  if (errorMessage) {
    return (
      <ManagementChartState
        type="error"
        message={`Integritätsfehler: ${errorMessage}`}
        sourceLabel="Ebene A CRM Funnel Deals"
        height={220}
      />
    );
  }

  if (!pipeline || pipeline.totalDeals === 0 || pipeline.stages.length === 0) {
    return (
      <ManagementChartState
        type="empty"
        message="Keine aktiven Deals in der CRM-Pipeline erfasst"
        sourceLabel="Ebene A CRM Funnel Deals"
        height={220}
      />
    );
  }

  return (
    <div data-testid="pipeline-snapshot" className="flex flex-col gap-[16px] w-full">
      {/* 3 Pipeline Kern-Kennzahlen */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[10px]">
        <div className="border border-solid border-[rgba(0,217,198,0.2)] rounded-[6px] bg-[rgba(0,217,198,0.05)] px-[12px] py-[10px]">
          <div className="flex items-center gap-[5px] text-[11px] text-[var(--color-text-muted)]">
            <Layers size={13} color="#00D9C6" />
            <span>Gesamt-Pipeline</span>
          </div>
          <div className="text-[18px] font-bold mt-[4px] text-[#00D9C6]">
            {formatManagementMetric(pipeline.totalVolume)}
          </div>
          <div className="text-[10.5px] text-[var(--color-text-muted)]">
            {pipeline.totalDeals} Deals erfasst
          </div>
        </div>

        <div className="border border-solid border-[rgba(124,239,230,0.2)] rounded-[6px] bg-[rgba(124,239,230,0.05)] px-[12px] py-[10px]">
          <div className="flex items-center gap-[5px] text-[11px] text-[var(--color-text-muted)]">
            <CheckCircle2 size={13} color="#7CEFE6" />
            <span>Gewonnen</span>
          </div>
          <div className="text-[18px] font-bold mt-[4px] text-[#7CEFE6]">
            {formatManagementMetric(pipeline.wonVolume)}
          </div>
          <div className="text-[10.5px] text-[var(--color-text-muted)]">Realisierter Umsatz</div>
        </div>

        <div className="border border-solid border-[rgba(255,255,255,0.08)] rounded-[6px] bg-[rgba(255,255,255,0.03)] px-[12px] py-[10px]">
          <div className="flex items-center gap-[5px] text-[11px] text-[var(--color-text-muted)]">
            <Clock size={13} color="#8FA3A1" />
            <span>In Verhandlung / Offen</span>
          </div>
          <div className="text-[18px] font-bold mt-[4px] text-[#FFFFFF]">
            {formatManagementMetric(pipeline.openVolume)}
          </div>
          <div className="text-[10.5px] text-[var(--color-text-muted)]">Aktive Opportunities</div>
        </div>
      </div>

      {/* Stage-Verteilung mit visuellen Progress-Balken */}
      <div className="flex flex-col gap-[8px]">
        <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--color-text-muted)]">
          Volumen nach Funnel-Stufe
        </div>

        {pipeline.stages.map((st) => (
          <div
            key={st.stage}
            className="border-0 flex flex-col gap-[4px] border-b border-solid border-[rgba(255,255,255,0.04)] px-0 py-[6px]"
          >
            <div className="flex justify-between items-center text-[12px]">
              <span className="font-semibold text-[#E2E8F0]">
                {st.stage}
                <span className="text-[11px] font-normal ml-[6px] text-[var(--color-text-muted)]">
                  ({st.count} {st.count === 1 ? 'Deal' : 'Deals'})
                </span>
              </span>
              <span className="font-bold text-[#00D9C6]">{formatManagementMetric(st.volume)}</span>
            </div>

            {/* Balken */}
            <div className="w-full h-[5px] rounded-[3px] overflow-hidden bg-[rgba(255,255,255,0.06)]">
              <div
                // G39 Welle 1: Balkenbreite aus Daten (sharePercent) — als
                // Klasse nicht darstellbar (Muster Auftrag 053 Nachtrag 2).
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Balkenbreite aus Daten), siehe Auftrag 054 Entscheidung 4
                style={{
                  width: `${Math.max(4, st.sharePercent)}%`,
                }}
                className="h-full rounded-[3px] bg-[linear-gradient(90deg,#00D9C6_0%,#7CEFE6_100%)]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
