import React from 'react';
import { FUNNEL, MBUDGET, PLANUNG } from '../../../domain/vertriebData';

export const BudgetTargetLadder: React.FC = () => {
  // Echte Datenbindung zur Laufzeit ausschließlich aus vertriebData.ts
  const budgetRow = MBUDGET.rows[5]; // Gesamt
  const leadsRow = FUNNEL.rows[0];
  const mqlRow = FUNNEL.rows[1];
  const sqlRow = FUNNEL.rows[2];
  const testsRow = FUNNEL.rows[3];
  const angeboteRow = FUNNEL.rows[4];
  const wonRow = FUNNEL.rows[5];

  // Budgetplanung aus PLANUNG.chartPlanbudget
  const planData = PLANUNG.chartPlanbudget.datasets[0].data;
  const h2Data = planData.slice(0, 5);
  const h2Sum = h2Data.reduce((a, b) => a + b, 0); // 15.125 €
  const jan27Val = planData[5]; // 4.250 €
  const totalPlanSum = planData.reduce((a, b) => a + b, 0); // 19.375 €

  // Ziel-KPIs aus PLANUNG.chartPlankpi
  // labels: ['Neukunden/Mon.', 'Marketing-CAC (€/10)', 'Trial-to-Paid (%)', 'Churn/Mon. (%)', 'KI-Scoring (%)']
  const kpiBasis = PLANUNG.chartPlankpi.datasets[0].data;
  const kpiTarget = PLANUNG.chartPlankpi.datasets[1].data;

  const targetCustomersMo = kpiTarget[0]; // 8
  const basisCustomersMo = kpiBasis[0]; // 4
  const targetCacEuro = Math.round(kpiTarget[1] * 10); // 720 €
  const basisCacEuro = Math.round(kpiBasis[1] * 10); // 862 €
  const basisTrialToPaid = kpiBasis[2]; // 18
  const targetTrialToPaid = kpiTarget[2]; // 24
  const basisKiScoring = kpiBasis[4]; // 47
  const targetKiScoring = kpiTarget[4]; // 65

  const rungs = [
    {
      step: 1,
      title: 'Budget & Mitteleinsatz',
      badge: 'Mitteleinsatz',
      metricCurrent: `${budgetRow[2]} Spend`,
      metricCurrentSub: `Plan 2025: ${budgetRow[1]} (${budgetRow[3]})`,
      metricTarget: `${totalPlanSum.toLocaleString('de-DE')} € Gesamt`,
      metricTargetSub: `Aug.–Dez. 26: ${h2Sum.toLocaleString('de-DE')} € · Jan. 27: ${jan27Val.toLocaleString('de-DE')} €`,
      conversionOrRule: `Ziel-CAC Jan. 2027: ${targetCacEuro} € (vs. ${basisCacEuro} € Basis)`,
    },
    {
      step: 2,
      title: 'MQL (Marketing Qualified)',
      badge: 'Qualifizierung',
      metricCurrent: `${mqlRow[5]} MQL`,
      metricCurrentSub: `Ø ${mqlRow[6]} qualifizierte Leads / Monat`,
      metricTarget: 'Skalierung im Plan',
      metricTargetSub: `Ziel: KI-Scoring ${targetKiScoring} % (vs. ${basisKiScoring} % Basis)`,
      conversionOrRule: `${mqlRow[7]} (aus ${leadsRow[5]} Leads gesamt)`,
    },
    {
      step: 3,
      title: 'SQL (Sales Qualified)',
      badge: 'Vertriebsübergabe',
      metricCurrent: `${sqlRow[5]} SQL`,
      metricCurrentSub: `Ø ${sqlRow[6]} Demo-fähige Leads / Monat`,
      metricTarget: 'Erhöhte Demo-Dichte',
      metricTargetSub: `Trial-to-Paid: ${targetTrialToPaid} % (vs. ${basisTrialToPaid} % Basis)`,
      conversionOrRule: `${sqlRow[7]} (aus ${mqlRow[5]} MQL)`,
    },
    {
      step: 4,
      title: 'Neukunden (Ertrag)',
      badge: 'Abschluss',
      metricCurrent: `${wonRow[5]} Neukunden`,
      metricCurrentSub: `Ø ${wonRow[6]} Neukunden / Monat (FY 2025)`,
      metricTarget: `${targetCustomersMo} Neukunden / Monat`,
      metricTargetSub: `Ziel Jan. 2027 (Basis: ${basisCustomersMo} / Monat)`,
      conversionOrRule: `${wonRow[7]} aus ${angeboteRow[5]} Angeboten`,
    },
  ];

  return (
    <section
      className="facelift-budget-target-ladder"
      aria-label="Budget-zu-Ziel-Leiter"
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
        .ladder-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1024px) {
          .ladder-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
        }
        @media (max-width: 600px) {
          .facelift-budget-target-ladder {
            padding: 12px 8px !important;
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
            BUDGET-ZU-ZIEL-LEITER
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Prüfbare Kette: Budget ➔ MQL ➔ SQL ➔ Neukunden
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
          Wachstumspfad: Mitteleinsatz bis Neukundenabschluss
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Durchgängige Nachverfolgung der Zielkette vom Marketing-Spend über qualifizierte Kontakte bis zum Neukundenwachstum auf {targetCustomersMo} Abschlüsse/Monat im Januar 2027.
        </p>
      </div>

      {/* Leiter-Stufen */}
      <div className="ladder-grid" role="region" aria-label="Stufen der Ziel-Leiter">
        {rungs.map((rung) => (
          <article
            key={rung.step}
            style={{
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              position: 'relative',
              minWidth: 0,
            }}
          >
            {/* Sprossen-Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  letterSpacing: '0.04em',
                }}
              >
                SPROSSE {rung.step} VON 4
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {rung.badge}
              </span>
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)', fontWeight: 700 }}>
                {rung.title}
              </h4>
            </div>

            {/* Ist 2025 Block */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Ist FY 2025
              </span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                {rung.metricCurrent}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {rung.metricCurrentSub}
              </span>
            </div>

            {/* Ziel Jan. 2027 Block */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(0, 217, 198, 0.06)',
                border: '1px solid rgba(0, 217, 198, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Zielplanung Jan. 2027
              </span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                {rung.metricTarget}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {rung.metricTargetSub}
              </span>
            </div>

            {/* Conversion / Kriterium */}
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '10px',
                borderTop: '1px solid var(--color-border)',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: 'var(--color-text)' }}>Verknüpfung:</strong> {rung.conversionOrRule}
            </div>
          </article>
        ))}
      </div>

      {/* Parallele Testversionen-/Self-Service-Notiz (außerhalb der linearen Kette) */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: '16px' }}>ℹ️</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          <strong style={{ fontSize: '12px', color: 'var(--color-text)' }}>
            Parallele Testversionen (Self-Service)
          </strong>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Im FY 2025 wurden {testsRow[5]} Testversionen gestartet (Ø {testsRow[6]} / Monat, {testsRow[7]}). Da dieser Wert parallel zum vertrieblichen Qualifizierungspfad ({sqlRow[5]} SQL) verläuft und Self-Service-Nutzer einschließt, wird er als flankierender Zufluss geführt und nicht als serielle Stufe zwischen SQL und Angeboten eingeordnet.
          </span>
        </div>
      </div>
    </section>
  );
};
