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
  const mrrEnd = mrrData.length > 0 ? `${mrrData[mrrData.length - 1].toLocaleString('de-DE')} €` : '—';

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
      className="facelift-saas-motor"
      aria-label="SaaS-Motor KPI-Kreis"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5, 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5, 20px)',
        overflowWrap: 'anywhere',
      }}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--color-primary)',
              backgroundColor: 'rgba(0, 217, 198, 0.12)',
              border: '1px solid rgba(0, 217, 198, 0.25)',
              whiteSpace: 'normal',
            }}
          >
            SAAS-MOTOR
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            gerichtete Lesereihenfolge: ARPA ➔ CAC-Payback ➔ Retention ➔ MRR
          </span>
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 'clamp(1.1rem, 4vw, 1.25rem)',
            fontWeight: 700,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-display)',
            overflowWrap: 'anywhere',
          }}
        >
          SaaS-Wirtschaftsmotor: Kernkennzahlen im Verbund
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Zusammenführung der vier zentralen ökonomischen Hebel. Kantenbeschriftungen sind neutral und faktengebunden formuliert.
        </p>
      </div>

      {/* 4 Knoten (Nodes) */}
      <div className="motor-nodes-grid" role="region" aria-label="SaaS-Motor Knoten">
        {nodes.map((node) => (
          <article
            key={node.id}
            className="facelift-saas-motor-node"
            style={{
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border)',
              borderTop: `4px solid ${node.color}`,
              backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: node.color, textTransform: 'uppercase' }}>
                KNOTEN {node.step} VON 4
              </span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: node.color }} />
            </div>

            <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)', fontWeight: 700 }}>
              {node.title}
            </h4>

            {/* Primärwert */}
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: 0,
              }}
            >
              <strong style={{ fontSize: '16px', color: node.color }}>{node.primaryVal}</strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{node.primarySub}</span>
            </div>

            {/* Sekundärwert */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                paddingTop: '4px',
                borderTop: '1px solid var(--color-border)',
                flexWrap: 'wrap',
                gap: '4px',
              }}
            >
              <span>{node.secondarySub}:</span>
              <strong style={{ color: 'var(--color-text)' }}>{node.secondaryVal}</strong>
            </div>
          </article>
        ))}
      </div>

      {/* 4 Kanten (Edges mit neutralen Texten & Disclaimern) */}
      <div className="motor-edges-grid" role="region" aria-label="Kantenbeschreibungen des SaaS-Motors">
        {edges.map((edge, i) => (
          <div
            key={i}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: 700, flexWrap: 'wrap' }}>
              <span>KANTE {i + 1}:</span>
              <span style={{ color: 'var(--color-text)' }}>{edge.from}</span>
              <span>➔</span>
              <span style={{ color: 'var(--color-text)' }}>{edge.to}</span>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              {edge.text}
            </p>

            {edge.disclaimer && (
              <span
                style={{
                  fontSize: '10.5px',
                  color: 'var(--color-warning, #FFB800)',
                  fontStyle: 'italic',
                  marginTop: '2px',
                }}
              >
                ({edge.disclaimer})
              </span>
            )}
            {edge.isMath && (
              <span
                style={{
                  fontSize: '10.5px',
                  color: 'var(--color-primary)',
                  fontStyle: 'italic',
                  marginTop: '2px',
                }}
              >
                (Rechnerische Verknüpfung)
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
