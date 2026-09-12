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
      className="facelift-revenue-staircase box-border w-full rounded-lg border border-solid border-border bg-surface px-[var(--space-5,20px)] py-[var(--space-4,16px)] flex flex-col gap-[var(--space-4,16px)] [overflow-wrap:anywhere]"
      aria-label="Umsatz-Staffel Branchensegmente"
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
      <div className="staircase-header flex justify-between items-start flex-wrap gap-[8px]">
        <div>
          <div className="flex items-center gap-[8px] flex-wrap">
            <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.04em] uppercase px-[8px] py-[2px]">
              UMSATZ-STAFFEL
            </span>
            <span className="text-[12px] text-[var(--color-text-muted)]">
              Kumulativer ARR-Stufenaufbau der Branchensegmente
            </span>
          </div>
          <h4 className="staircase-heading font-display text-[1.05rem] font-bold text-text mt-[4px] mb-0 mr-0 ml-0">
            Stufenweiser Aufbau des Gesamt-ARR (411.840 €)
          </h4>
        </div>

        <div className="rounded-[6px] border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.08)] text-right px-[10px] py-[4px]">
          <span className="block text-[11px] text-[var(--color-text-muted)]">Gesamtsumme ARR</span>
          <strong className="font-display text-[15px] text-primary">
            411.840 €
          </strong>
        </div>
      </div>

      {/* Visuelle Treppen-Staffel (4 Stufen mit Stufenhöhe und Fortschrittsbalken) */}
      <div className="staircase-steps-container grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-[12px] min-w-0 box-border">
        {steps.map((step, idx) => {
          const stepPercent = Math.round((step.kumuliertArr / totalArr) * 100);

          return (
            <div
              key={idx}
              className={`staircase-step-card staircase-step-${idx + 1} rounded-[8px] bg-surface flex flex-col gap-[8px] box-border min-w-0 [overflow-wrap:anywhere] px-[14px] py-[12px]`}
              // G39 Welle 2: Kartenrahmen in Stufenfarbe (Domain-Daten) —
              // als Klasse nicht darstellbar (Entscheidung 2).
              // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Stufenfarbe aus Daten), siehe Auftrag 055 Entscheidung 2
              style={{
                border: `1px solid ${step.color}40`,
                borderTop: `3px solid ${step.color}`,
              }}
            >
              {/* Stufen-Header */}
              <div className="flex justify-between items-center flex-wrap gap-[4px]">
                <span
                  className="text-[11px] font-bold rounded px-[6px] py-[2px]"
                  // G39 Welle 2: Badge in Stufenfarbe (Domain-Daten).
                  // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Stufenfarbe aus Daten), siehe Auftrag 055 Entscheidung 2
                  style={{
                    backgroundColor: `${step.color}20`,
                    color: step.color,
                  }}
                >
                  Stufe 0{idx + 1}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Kundenanteil: {step.anteil}
                </span>
              </div>

              {/* Name & Kunden */}
              <div>
                <h5 className="font-bold text-[13.5px] text-text mt-[2px] mb-0 mr-0 ml-0">
                  {step.name}
                </h5>
                <span className="text-[12px] text-[var(--color-text-muted)]">
                  {step.kunden}
                </span>
              </div>

              {/* Segmentbeitrag */}
              <div className="border-0 border-t border-solid border-[var(--color-border-soft,rgba(255,255,255,0.06))] flex justify-between items-baseline flex-wrap gap-[4px] pt-[4px]">
                <span className="text-[11px] text-[var(--color-text-muted)]">Segmentbeitrag:</span>
                <strong
                  className="text-[13px]"
                  // G39 Welle 2: Wert in Stufenfarbe (Domain-Daten).
                  // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Stufenfarbe aus Daten), siehe Auftrag 055 Entscheidung 2
                  style={{ color: step.color }}
                >
                  +{step.arr.toLocaleString('de-DE')} €
                </strong>
              </div>

              {/* Kumulierter ARR */}
              <div className="flex justify-between items-baseline flex-wrap gap-[4px]">
                <span className="text-[11px] text-[var(--color-text-muted)]">Kumulierter ARR:</span>
                <strong className="font-display text-[14px] text-text">
                  {step.kumuliertArr.toLocaleString('de-DE')} €
                </strong>
              </div>

              {/* Fortschrittsbalken zum Gesamt-ARR */}
              <div className="w-full h-[4px] rounded-[2px] overflow-hidden mt-[2px] bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-full rounded-[2px]"
                  // G39 Welle 2: Balkenbreite (berechnet) + Farbe (Daten).
                  // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie/Farbe (kumulierter Anteil), siehe Auftrag 055 Entscheidung 2
                  style={{
                    width: `${stepPercent}%`,
                    backgroundColor: step.color,
                  }}
                />
              </div>
              <span className="text-[10.5px] text-right text-[var(--color-text-muted)]">
                {stepPercent} % vom Gesamt-ARR
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
