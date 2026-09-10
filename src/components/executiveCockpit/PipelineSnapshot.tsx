import React, { useEffect, useState } from 'react';
import { getPipelineOverview, PipelineOverview } from '@/domain/executiveCockpitData';
import { CRMRepository } from '@/services/db/crmRepository';
import { formatManagementMetric } from '@/components/ui/charts/managementChartTheme';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { Layers, CheckCircle2, Clock } from 'lucide-react';

export const PipelineSnapshot: React.FC = () => {
  const [pipeline, setPipeline] = useState<PipelineOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getPipelineOverview(CRMRepository)
      .then((data) => {
        if (isMounted) {
          setPipeline(data);
          setError(null);
        }
      })
      .catch((err) => {
        console.error('Fehler beim Laden des Pipeline-Snapshots:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden der CRM-Deals');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  if (error) {
    return (
      <ManagementChartState
        type="error"
        message={`Integritätsfehler: ${error}`}
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
    <div
      data-testid="pipeline-snapshot"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* 3 Pipeline Kern-Kennzahlen */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
        }}
      >
        <div
          style={{
            background: 'rgba(0, 217, 198, 0.05)',
            border: '1px solid rgba(0, 217, 198, 0.2)',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Layers size={13} color="#00D9C6" />
            <span>Gesamt-Pipeline</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#00D9C6', marginTop: '4px' }}>
            {formatManagementMetric(pipeline.totalVolume)}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
            {pipeline.totalDeals} Deals erfasst
          </div>
        </div>

        <div
          style={{
            background: 'rgba(124, 239, 230, 0.05)',
            border: '1px solid rgba(124, 239, 230, 0.2)',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <CheckCircle2 size={13} color="#7CEFE6" />
            <span>Gewonnen</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#7CEFE6', marginTop: '4px' }}>
            {formatManagementMetric(pipeline.wonVolume)}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
            Realisierter Umsatz
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} color="#8FA3A1" />
            <span>In Verhandlung / Offen</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
            {formatManagementMetric(pipeline.openVolume)}
          </div>
          <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
            Aktive Opportunities
          </div>
        </div>
      </div>

      {/* Stage-Verteilung mit visuellen Progress-Balken */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Volumen nach Funnel-Stufe
        </div>

        {pipeline.stages.map((st) => (
          <div
            key={st.stage}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '6px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ fontWeight: 600, color: '#E2E8F0' }}>
                {st.stage}
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginLeft: '6px', fontWeight: 400 }}>
                  ({st.count} {st.count === 1 ? 'Deal' : 'Deals'})
                </span>
              </span>
              <span style={{ fontWeight: 700, color: '#00D9C6' }}>
                {formatManagementMetric(st.volume)}
              </span>
            </div>

            {/* Balken */}
            <div
              style={{
                width: '100%',
                height: '5px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.max(4, st.sharePercent)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00D9C6 0%, #7CEFE6 100%)',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
