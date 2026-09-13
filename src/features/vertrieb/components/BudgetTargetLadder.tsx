import React from 'react';
import { FUNNEL, MBUDGET, PLANUNG } from '../../../domain/vertriebData';

type BudgetRow = [string, string, string, string, string, string, string];
type FunnelRow = [string, string, string, string, string, string, string, string];

const fallbackBudget: BudgetRow = ['', '', '', '', '', '', ''];
const fallbackFunnel: FunnelRow = ['', '', '', '', '', '', '', ''];

export const BudgetTargetLadder: React.FC = () => {
  // Echte Datenbindung zur Laufzeit ausschließlich aus vertriebData.ts
  const budgetRow: BudgetRow = (MBUDGET.rows[5] as BudgetRow | undefined) ?? fallbackBudget;
  const leadsRow: FunnelRow = (FUNNEL.rows[0] as FunnelRow | undefined) ?? fallbackFunnel;
  const mqlRow: FunnelRow = (FUNNEL.rows[1] as FunnelRow | undefined) ?? fallbackFunnel;
  const sqlRow: FunnelRow = (FUNNEL.rows[2] as FunnelRow | undefined) ?? fallbackFunnel;
  const testsRow: FunnelRow = (FUNNEL.rows[3] as FunnelRow | undefined) ?? fallbackFunnel;
  const angeboteRow: FunnelRow = (FUNNEL.rows[4] as FunnelRow | undefined) ?? fallbackFunnel;
  const wonRow: FunnelRow = (FUNNEL.rows[5] as FunnelRow | undefined) ?? fallbackFunnel;

  // Budgetplanung aus PLANUNG.chartPlanbudget
  const planData: [number, number, number, number, number, number] = (PLANUNG.chartPlanbudget
    .datasets[0]?.data ?? [0, 0, 0, 0, 0, 0]) as [number, number, number, number, number, number];
  const h2Data = planData.slice(0, 5);
  const h2Sum = h2Data.reduce((a, b) => a + b, 0); // 15.125 €
  const jan27Val = planData[5]; // 4.250 €
  const totalPlanSum = planData.reduce((a, b) => a + b, 0); // 19.375 €

  // Ziel-KPIs aus PLANUNG.chartPlankpi
  // labels: ['Neukunden/Mon.', 'Marketing-CAC (€/10)', 'Trial-to-Paid (%)', 'Churn/Mon. (%)', 'KI-Scoring (%)']
  const kpiBasis: [number, number, number, number, number] = (PLANUNG.chartPlankpi.datasets[0]
    ?.data ?? [0, 0, 0, 0, 0]) as [number, number, number, number, number];
  const kpiTarget: [number, number, number, number, number] = (PLANUNG.chartPlankpi.datasets[1]
    ?.data ?? [0, 0, 0, 0, 0]) as [number, number, number, number, number];

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
      className="facelift-budget-target-ladder w-full box-border rounded-[var(--radius-lg,12px)] border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="Budget-zu-Ziel-Leiter"
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
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center px-[8px] py-[2px] rounded-[4px] text-[11px] font-bold tracking-[0.05em] uppercase text-primary bg-[rgba(0,217,198,0.12)] border border-solid border-[rgba(0,217,198,0.25)] whitespace-normal">
            BUDGET-ZU-ZIEL-LEITER
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Prüfbare Kette: Budget ➔ MQL ➔ SQL ➔ Neukunden
          </span>
        </div>
        <h3 className="m-0 text-[clamp(1.1rem,4vw,1.25rem)] font-bold text-text font-display [overflow-wrap:anywhere]">
          Wachstumspfad: Mitteleinsatz bis Neukundenabschluss
        </h3>
        <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.5]">
          Durchgängige Nachverfolgung der Zielkette vom Marketing-Spend über qualifizierte Kontakte
          bis zum Neukundenwachstum auf {targetCustomersMo} Abschlüsse/Monat im Januar 2027.
        </p>
      </div>

      {/* Leiter-Stufen */}
      <div className="ladder-grid" role="region" aria-label="Stufen der Ziel-Leiter">
        {rungs.map((rung) => (
          <article
            key={rung.step}
            className="rounded-[var(--radius-md,8px)] border border-solid border-border bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] p-[14px] flex flex-col gap-[12px] relative min-w-0"
          >
            {/* Sprossen-Header */}
            <div className="flex justify-between items-center flex-wrap gap-[4px]">
              <span className="text-[11px] font-bold text-primary tracking-[0.04em]">
                SPROSSE {rung.step} VON 4
              </span>
              <span className="text-[10px] font-semibold px-[6px] py-[2px] rounded-[4px] bg-[rgba(255,255,255,0.06)] text-[var(--color-text-muted)] uppercase">
                {rung.badge}
              </span>
            </div>

            <div>
              <h4 className="m-0 text-[14px] text-text font-bold">{rung.title}</h4>
            </div>

            {/* Ist 2025 Block */}
            <div className="px-[12px] py-[10px] rounded-[6px] bg-[rgba(255,255,255,0.03)] border border-solid border-border flex flex-col gap-[2px] min-w-0">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold">
                Ist FY 2025
              </span>
              <span className="text-[15px] font-bold text-text">{rung.metricCurrent}</span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {rung.metricCurrentSub}
              </span>
            </div>

            {/* Ziel Jan. 2027 Block */}
            <div className="px-[12px] py-[10px] rounded-[6px] bg-[rgba(0,217,198,0.06)] border border-solid border-[rgba(0,217,198,0.25)] flex flex-col gap-[2px] min-w-0">
              <span className="text-[10px] text-primary uppercase font-semibold">
                Zielplanung Jan. 2027
              </span>
              <span className="text-[15px] font-bold text-primary">{rung.metricTarget}</span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {rung.metricTargetSub}
              </span>
            </div>

            {/* Conversion / Kriterium */}
            <div className="mt-auto pt-[10px] border-t border-solid border-border text-[11px] text-[var(--color-text-muted)] leading-[1.4]">
              <strong className="text-text">Verknüpfung:</strong> {rung.conversionOrRule}
            </div>
          </article>
        ))}
      </div>

      {/* Parallele Testversionen-/Self-Service-Notiz (außerhalb der linearen Kette) */}
      <div className="px-[14px] py-[12px] rounded-[var(--radius-md,8px)] border border-solid border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] flex items-start gap-[10px] min-w-0">
        <span className="text-[16px]">ℹ️</span>
        <div className="flex flex-col gap-[3px] min-w-0">
          <strong className="text-[12px] text-text">Parallele Testversionen (Self-Service)</strong>
          <span className="text-[12px] text-[var(--color-text-muted)] leading-[1.4]">
            Im FY 2025 wurden {testsRow[5]} Testversionen gestartet (Ø {testsRow[6]} / Monat,{' '}
            {testsRow[7]}). Da dieser Wert parallel zum vertrieblichen Qualifizierungspfad (
            {sqlRow[5]} SQL) verläuft und Self-Service-Nutzer einschließt, wird er als flankierender
            Zufluss geführt und nicht als serielle Stufe zwischen SQL und Angeboten eingeordnet.
          </span>
        </div>
      </div>
    </section>
  );
};
