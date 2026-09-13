import React from 'react';
import { UNIT, CHART_MRR26 } from '../../../domain/finanzenData';

export const SaasMotor: React.FC = () => {
  // Echte Datenbindung zur Laufzeit aus UNIT.metrics und CHART_MRR26
  const flCac = UNIT.metrics.find((m) => m.label.includes('Fully-Loaded CAC'))?.val || '—';
  const mktCac = UNIT.metrics.find((m) => m.label === 'Marketing-CAC')?.val || '—';
  const dbCustomer = UNIT.metrics.find((m) => m.label.includes('Deckungsbeitrag'))?.val || '—';
  const payback = UNIT.metrics.find((m) => m.label.includes('CAC-Payback'))?.val || '—';
  const paybackDativ = payback !== '—' && payback.endsWith('e') ? `${payback}n` : payback;
  const nrr = UNIT.metrics.find((m) => m.label.includes('Net Retention Rate'))?.val || '—';
  const grr = UNIT.metrics.find((m) => m.label.includes('Gross Retention Rate'))?.val || '—';
  const ltv = UNIT.metrics.find((m) => m.label.includes('LTV (Lifetime Value)'))?.val || '—';
  const margin = UNIT.metrics.find((m) => m.label.includes('Bruttomarge'))?.val || '—';

  const mrrData = CHART_MRR26.datasets[0]?.data || [];
  const mrrStart = mrrData[0] !== undefined ? `${mrrData[0].toLocaleString('de-DE')} €` : '—';
  const lastMrr = mrrData[mrrData.length - 1];
  const mrrEnd = lastMrr !== undefined ? `${lastMrr.toLocaleString('de-DE')} €` : '—';

  const nodes = [
    {
      id: 'arpa',
      step: 1,
      title: 'ARPA & Deckungsbeitrag',
      primaryVal: dbCustomer,
      primarySub: 'Deckungsbeitrag je Kunde/Monat',
      secondaryVal: margin,
      secondarySub: 'Bruttomarge (FY 2025)',
      color: '#00D9C6',
    },
    {
      id: 'payback',
      step: 2,
      title: 'CAC-Payback',
      primaryVal: payback,
      primarySub: 'Amortisation (Fully Loaded)',
      secondaryVal: flCac,
      secondarySub: `Fully-Loaded CAC (Marketing: ${mktCac})`,
      color: '#7CEFE6',
    },
    {
      id: 'retention',
      step: 3,
      title: 'Kunden-Retention',
      primaryVal: nrr,
      primarySub: 'Net Retention Rate (NRR)',
      secondaryVal: grr,
      secondarySub: 'Gross Retention Rate (GRR)',
      color: '#FFB800',
    },
    {
      id: 'mrr',
      step: 4,
      title: 'Wiederkehrender MRR',
      primaryVal: `${mrrStart} ➔ ${mrrEnd}`,
      primarySub: 'Monatlicher Erlösverlauf 2026',
      secondaryVal: ltv,
      secondarySub: 'LTV (Lifetime Value)',
      color: '#FF7A3D',
    },
  ];

  const edges = [
    {
      from: 'ARPA & Deckungsbeitrag',
      to: 'CAC-Payback',
      text: `Fully-Loaded CAC (${flCac}) und Deckungsbeitrag je Kunde/Monat (${dbCustomer}) werden im Payback von ${paybackDativ} zusammengeführt.`,
      isMath: true,
    },
    {
      from: 'CAC-Payback',
      to: 'Kunden-Retention',
      text: `CAC-Payback (${payback}) und Retention (NRR ${nrr}, GRR ${grr}) spiegeln Kundenlebenszyklus wider.`,
      disclaimer: 'KPI-Zusammenhang, keine nachgewiesene Kausalität',
      isMath: false,
    },
    {
      from: 'Kunden-Retention',
      to: 'Wiederkehrender MRR',
      text: `Retention-Raten (NRR ${nrr}, GRR ${grr}) und monatliche MRR-Entwicklung (${mrrStart} bis ${mrrEnd}) nebeneinandergestellt.`,
      disclaimer: 'KPI-Zusammenhang, keine nachgewiesene Kausalität',
      isMath: false,
    },
    {
      from: 'Wiederkehrender MRR',
      to: 'ARPA & Deckungsbeitrag',
      text: `MRR-Projektion und Deckungsbeitrag je Kunde/Monat (${dbCustomer}) beschreiben die Erlösbasis des Kundenstamms.`,
      disclaimer: 'KPI-Zusammenhang, keine nachgewiesene Kausalität',
      isMath: false,
    },
  ];

  return (
    <section
      className="facelift-saas-motor box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="SaaS-Motor KPI-Kreis"
    >
      <style>{`
        .motor-nodes-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .motor-edges-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (max-width: 1024px) {
          .motor-nodes-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .motor-edges-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 600px) {
          .facelift-saas-motor {
            padding: 12px 8px !important;
          }
          .motor-nodes-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.05em] uppercase whitespace-normal px-[8px] py-[2px]">
            SAAS-MOTOR
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            gerichtete Lesereihenfolge: ARPA ➔ CAC-Payback ➔ Retention ➔ MRR
          </span>
        </div>
        <h3 className="m-0 font-display font-bold text-text text-[clamp(1.1rem,4vw,1.25rem)] [overflow-wrap:anywhere]">
          SaaS-Wirtschaftsmotor: Kernkennzahlen im Verbund
        </h3>
        <p className="m-0 text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
          Zusammenführung der vier zentralen ökonomischen Hebel. Kantenbeschriftungen sind neutral
          und faktengebunden formuliert.
        </p>
      </div>

      {/* 4 Knoten (Nodes) */}
      <div className="motor-nodes-grid" role="region" aria-label="SaaS-Motor Knoten">
        {nodes.map((node) => (
          <article
            key={node.id}
            className="facelift-saas-motor-node rounded-md border border-solid border-border bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] p-[14px] flex flex-col gap-[10px] min-w-0 border-t-4"
            // G39 Welle 2: Oberkante in Knotenfarbe (Daten-Config) — als
            // Klasse nicht darstellbar (Entscheidung 2).
            // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Knotenfarbe aus Daten), siehe Auftrag 055 Entscheidung 2
            style={{ borderTopColor: node.color }}
          >
            <div className="flex justify-between items-center flex-wrap gap-[4px]">
              <span
                className="text-[10px] font-bold uppercase"
                // G39 Welle 2: Labelfarbe = Knotenfarbe (Daten).
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Knotenfarbe aus Daten), siehe Auftrag 055 Entscheidung 2
                style={{ color: node.color }}
              >
                KNOTEN {node.step} VON 4
              </span>
              <span
                className="w-[8px] h-[8px] rounded-full"
                // G39 Welle 2: Punktfarbe = Knotenfarbe (Daten).
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Knotenfarbe aus Daten), siehe Auftrag 055 Entscheidung 2
                style={{ backgroundColor: node.color }}
              />
            </div>

            <h4 className="m-0 text-[14px] font-bold text-text">{node.title}</h4>

            {/* Primärwert */}
            <div className="rounded-[6px] border border-solid border-border bg-[rgba(255,255,255,0.03)] flex flex-col gap-[2px] min-w-0 px-[10px] py-[8px]">
              <strong
                className="text-[16px]"
                // G39 Welle 2: Wertfarbe = Knotenfarbe (Daten).
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Knotenfarbe aus Daten), siehe Auftrag 055 Entscheidung 2
                style={{ color: node.color }}
              >
                {node.primaryVal}
              </strong>
              <span className="text-[11px] text-[var(--color-text-muted)]">{node.primarySub}</span>
            </div>

            {/* Sekundärwert */}
            <div className="border-0 border-t border-solid border-border flex justify-between items-baseline flex-wrap gap-[4px] text-[11px] pt-[4px] text-[var(--color-text-muted)]">
              <span>{node.secondarySub}:</span>
              <strong className="text-text">{node.secondaryVal}</strong>
            </div>
          </article>
        ))}
      </div>

      {/* 4 Kanten (Edges mit neutralen Texten & Disclaimern) */}
      <div
        className="motor-edges-grid"
        role="region"
        aria-label="Kantenbeschreibungen des SaaS-Motors"
      >
        {edges.map((edge, i) => (
          <div
            key={i}
            className="rounded-md border border-solid border-border bg-[rgba(255,255,255,0.02)] flex flex-col gap-[6px] min-w-0 px-[14px] py-[12px]"
          >
            <div className="flex items-center gap-[6px] flex-wrap text-[11px] font-bold text-primary">
              <span>KANTE {i + 1}:</span>
              <span className="text-text">{edge.from}</span>
              <span>➔</span>
              <span className="text-text">{edge.to}</span>
            </div>

            <p className="m-0 text-[12px] leading-[1.4] text-[var(--color-text-muted)]">
              {edge.text}
            </p>

            {edge.disclaimer && (
              <span className="text-[10.5px] italic mt-[2px] text-warning">
                ({edge.disclaimer})
              </span>
            )}
            {edge.isMath && (
              <span className="text-[10.5px] italic mt-[2px] text-primary">
                (Rechnerische Verknüpfung)
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
