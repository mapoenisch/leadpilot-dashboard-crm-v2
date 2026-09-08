import React from 'react';
import { SEGMENTE, CHART_SEGMENT } from '../../../domain/kundenData';

export const RevenueStaircase: React.FC = () => {
  // Sortiert für den kumulativen Treppenaufbau von klein nach groß:
  // Agenturen (42.000 €) -> Großhandel (78.960 €) -> IT/Software (112.320 €) -> Maschinenbau (178.560 €)
  const steps = [
    {
      name: 'Agenturen',
      branche: SEGMENTE.rows[3].branche,
      anteil: SEGMENTE.rows[3].anteil, // 15 %
      kunden: '10 Kunden',
      arr: CHART_SEGMENT.datasets[0].data[3], // 42000
      color: CHART_SEGMENT.datasets[0].colors[3], // #FF9A66
      kumuliertArr: 42000,
    },
    {
      name: 'Großhandel',
      branche: SEGMENTE.rows[2].branche,
      anteil: SEGMENTE.rows[2].anteil, // 21 %
      kunden: '14 Kunden',
      arr: CHART_SEGMENT.datasets[0].data[2], // 78960
      color: CHART_SEGMENT.datasets[0].colors[2], // #FF7A3D
      kumuliertArr: 42000 + 78960, // 120960
    },
    {
      name: 'IT / Software',
      branche: SEGMENTE.rows[1].branche,
      anteil: SEGMENTE.rows[1].anteil, // 27 %
      kunden: '18 Kunden',
      arr: CHART_SEGMENT.datasets[0].data[1], // 112320
      color: CHART_SEGMENT.datasets[0].colors[1], // #7CEFE6
      kumuliertArr: 120960 + 112320, // 233280
    },
    {
      name: 'Maschinenbau',
      branche: SEGMENTE.rows[0].branche,
      anteil: SEGMENTE.rows[0].anteil, // 36 %
      kunden: '24 Kunden',
      arr: CHART_SEGMENT.datasets[0].data[0], // 178560
      color: CHART_SEGMENT.datasets[0].colors[0], // #00D9C6
      kumuliertArr: 233280 + 178560, // 411840
    },
  ];

  const totalArr = 411840;

  return (
    <section
      className="facelift-revenue-staircase"
      aria-label="Umsatz-Staffel Branchensegmente"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-4, 16px) var(--space-5, 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4, 16px)',
        overflowWrap: 'anywhere',
      }}
    >
      <style>{`
        @media (max-width: 600px) {
          .facelift-revenue-staircase {
            padding: 12px 10px !important;
          }
          .staircase-steps-container {
            grid-template-columns: 1fr !important;
          }
          .staircase-step-card {
            padding: 10px 8px !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="staircase-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--color-primary)',
                backgroundColor: 'rgba(0, 217, 198, 0.12)',
                border: '1px solid rgba(0, 217, 198, 0.25)',
              }}
            >
              UMSATZ-STAFFEL
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Kumulativer ARR-Stufenaufbau der Branchensegmente
            </span>
          </div>
          <h4
            className="staircase-heading"
            style={{
              margin: '4px 0 0',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Stufenweiser Aufbau des Gesamt-ARR (411.840 €)
          </h4>
        </div>

        <div
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: 'rgba(0, 217, 198, 0.08)',
            border: '1px solid rgba(0, 217, 198, 0.25)',
            textAlign: 'right',
          }}
        >
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)' }}>Gesamtsumme ARR</span>
          <strong style={{ fontSize: '15px', color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
            411.840 €
          </strong>
        </div>
      </div>

      {/* Visuelle Treppen-Staffel (4 Stufen mit Stufenhöhe und Fortschrittsbalken) */}
      <div
        className="staircase-steps-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '12px',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {steps.map((step, idx) => {
          const stepPercent = Math.round((step.kumuliertArr / totalArr) * 100);

          return (
            <div
              key={idx}
              className={`staircase-step-card staircase-step-${idx + 1}`}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: `1px solid ${step.color}40`,
                borderTop: `3px solid ${step.color}`,
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxSizing: 'border-box',
                minWidth: 0,
                overflowWrap: 'anywhere',
              }}
            >
              {/* Stufen-Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: `${step.color}20`,
                    color: step.color,
                  }}
                >
                  Stufe 0{idx + 1}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Kundenanteil: {step.anteil}
                </span>
              </div>

              {/* Name & Kunden */}
              <div>
                <h5 style={{ margin: '2px 0 0', fontSize: '13.5px', color: 'var(--color-text)', fontWeight: 700 }}>
                  {step.name}
                </h5>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {step.kunden}
                </span>
              </div>

              {/* Segmentbeitrag */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px', paddingTop: '4px', borderTop: '1px solid var(--color-border-soft, rgba(255, 255, 255, 0.06))' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Segmentbeitrag:</span>
                <strong style={{ fontSize: '13px', color: step.color }}>
                  +{step.arr.toLocaleString('de-DE')} €
                </strong>
              </div>

              {/* Kumulierter ARR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Kumulierter ARR:</span>
                <strong style={{ fontSize: '14px', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                  {step.kumuliertArr.toLocaleString('de-DE')} €
                </strong>
              </div>

              {/* Fortschrittsbalken zum Gesamt-ARR */}
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  marginTop: '2px',
                }}
              >
                <div
                  style={{
                    width: `${stepPercent}%`,
                    height: '100%',
                    backgroundColor: step.color,
                    borderRadius: '2px',
                  }}
                />
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                {stepPercent} % vom Gesamt-ARR
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
