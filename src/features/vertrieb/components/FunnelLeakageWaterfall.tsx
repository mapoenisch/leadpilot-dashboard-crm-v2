import React from 'react';
import { FUNNEL } from '../../../domain/vertriebData';

export const FunnelLeakageWaterfall: React.FC = () => {
  const parseCount = (s: string) => parseInt(s.replace(/\./g, '').replace(/[^0-9]/g, ''), 10);

  // Echte Datenbindung zur Laufzeit aus FUNNEL.rows
  const leadsRow = FUNNEL.rows[0];
  const mqlRow = FUNNEL.rows[1];
  const sqlRow = FUNNEL.rows[2];
  const angeboteRow = FUNNEL.rows[4];
  const wonRow = FUNNEL.rows[5];

  const leadsCount = parseCount(leadsRow[5]);
  const mqlCount = parseCount(mqlRow[5]);
  const sqlCount = parseCount(sqlRow[5]);
  const angeboteCount = parseCount(angeboteRow[5]);
  const wonCount = parseCount(wonRow[5]);

  const stages = [
    {
      id: 'leads-to-mql',
      name: leadsRow[0],
      startCount: leadsCount,
      remainingCount: mqlCount,
      lossCount: leadsCount - mqlCount,
      lossPercent: ((leadsCount - mqlCount) / leadsCount) * 100,
      conversionPercent: (mqlCount / leadsCount) * 100,
      nextStageName: mqlRow[0],
      sourceConversion: mqlRow[7],
    },
    {
      id: 'mql-to-sql',
      name: mqlRow[0],
      startCount: mqlCount,
      remainingCount: sqlCount,
      lossCount: mqlCount - sqlCount,
      lossPercent: ((mqlCount - sqlCount) / mqlCount) * 100,
      conversionPercent: (sqlCount / mqlCount) * 100,
      nextStageName: sqlRow[0],
      sourceConversion: sqlRow[7],
    },
    {
      id: 'sql-to-angebote',
      name: sqlRow[0],
      startCount: sqlCount,
      remainingCount: angeboteCount,
      lossCount: sqlCount - angeboteCount,
      lossPercent: ((sqlCount - angeboteCount) / sqlCount) * 100,
      conversionPercent: (angeboteCount / sqlCount) * 100,
      nextStageName: angeboteRow[0],
      sourceConversion: angeboteRow[7],
    },
    {
      id: 'angebote-to-won',
      name: angeboteRow[0],
      startCount: angeboteCount,
      remainingCount: wonCount,
      lossCount: angeboteCount - wonCount,
      lossPercent: ((angeboteCount - wonCount) / angeboteCount) * 100,
      conversionPercent: (wonCount / angeboteCount) * 100,
      nextStageName: wonRow[0],
      sourceConversion: wonRow[7],
    },
  ];

  const totalLoss = leadsCount - wonCount;
  const totalLossPercent = ((totalLoss / leadsCount) * 100).toFixed(2).replace('.', ',');
  const totalConversionPercent = ((wonCount / leadsCount) * 100).toFixed(2).replace('.', ',');

  return (
    <section
      className="facelift-funnel-waterfall w-full box-border rounded-[var(--radius-lg,12px)] border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="Funnel-Leckage-Wasserfall"
    >
      <style>{`
        .waterfall-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .waterfall-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 900px) {
          .waterfall-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .waterfall-summary-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 600px) {
          .facelift-funnel-waterfall {
            padding: 12px 8px !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center px-[8px] py-[2px] rounded-[4px] text-[11px] font-bold tracking-[0.05em] uppercase text-primary bg-[rgba(0,217,198,0.12)] border border-solid border-[rgba(0,217,198,0.25)] whitespace-normal">
            FUNNEL-LECKAGE-WASSERFALL
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Rechnerischer Stufenverlust & verbleibendes Potenzial
          </span>
        </div>
        <h3 className="m-0 text-[clamp(1.1rem,4vw,1.25rem)] font-bold text-text font-display [overflow-wrap:anywhere]">
          Konvertierungskaskade FY 2025
        </h3>
        <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.5]">
          Stufenweiser Übergang von {leadsRow[5]} erfassten Leads bis zu den {wonRow[5]} gewonnenen Neukunden.
          Rechnerischer Gesamtverlust: −{totalLoss.toLocaleString('de-DE')} Leads über alle Stufen.
        </p>
      </div>

      {/* Waterfall Kaskade */}
      <div className="waterfall-grid" role="region" aria-label="Stufenweiser Wasserfall">
        {stages.map((stage, idx) => {
          const lossWidth = `${stage.lossPercent.toFixed(1)}%`;
          const remainingWidth = `${stage.conversionPercent.toFixed(1)}%`;

          return (
            <article
              key={stage.id}
              className="rounded-[var(--radius-md,8px)] border border-solid border-border bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] p-[12px] flex flex-col gap-[12px] relative min-w-0 [overflow-wrap:anywhere]"
            >
              {/* Stufen-Header */}
              <div className="flex justify-between items-start gap-[8px] flex-wrap">
                <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.04em]">
                  Stufe {idx + 1} ➔ {idx + 2}
                </span>
                <span className="text-[11px] font-semibold px-[6px] py-[1px] rounded-[4px] bg-[rgba(0,217,198,0.12)] text-primary">
                  {stage.conversionPercent.toFixed(1)} % Verbleib
                </span>
              </div>

              <div>
                <div className="text-[13px] font-bold text-text">
                  {stage.name}
                </div>
                <div className="text-[18px] font-extrabold text-primary mt-[2px]">
                  {stage.startCount.toLocaleString('de-DE')}
                </div>
              </div>

              {/* Visuelle Leckage-Leiste */}
              <div className="flex flex-col gap-[6px]">
                <div
                  className="flex h-[10px] w-full rounded-[5px] overflow-hidden bg-[rgba(255,255,255,0.05)]"
                  title={`Verbleib: ${remainingWidth}, Verlust: ${lossWidth}`}
                >
                  <div
                    className="h-full bg-primary"
                    // G39 Welle 4: Segmentbreite aus Funnel-Daten berechnet —
                    // als Klasse nicht darstellbar (Entscheidung 2).
                    // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Stufen-Prozente aus Funnel-Daten), siehe Auftrag 057 Entscheidung 2
                    style={{ width: remainingWidth }}
                  />
                  <div
                    className="h-full bg-accent opacity-80"
                    // G39 Welle 4: Segmentbreite aus Funnel-Daten berechnet —
                    // als Klasse nicht darstellbar (Entscheidung 2).
                    // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie (Stufen-Prozente aus Funnel-Daten), siehe Auftrag 057 Entscheidung 2
                    style={{ width: lossWidth }}
                  />
                </div>
                <div className="flex flex-col gap-[2px] text-[11px] text-[var(--color-text-muted)]">
                  <span className="text-primary font-semibold">
                    {stage.remainingCount.toLocaleString('de-DE')} weiter ({remainingWidth})
                  </span>
                  <span className="text-accent font-semibold">
                    −{stage.lossCount.toLocaleString('de-DE')} Verlust ({lossWidth})
                  </span>
                </div>
              </div>

              {/* Übergangsziel & Quellconversion */}
              <div className="mt-auto pt-[8px] border-t border-solid border-border text-[11px] text-[var(--color-text-muted)] flex flex-col gap-[4px]">
                <div>
                  <span className="text-primary font-bold">➔ </span>
                  <span>Ziel: <strong className="text-text">{stage.nextStageName}</strong></span>
                </div>
                {stage.sourceConversion && stage.sourceConversion !== '—' && (
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    Quelle: {stage.sourceConversion}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Zusammenfassung & Summenabgleich */}
      <div className="waterfall-summary-grid">
        <div className="px-[14px] py-[12px] rounded-[var(--radius-md,8px)] border border-solid border-border bg-[rgba(255,255,255,0.02)] min-w-0">
          <div className="text-[11px] text-[var(--color-text-muted)] uppercase">
            Ausgangsbasis Leads
          </div>
          <div className="text-[18px] font-bold text-text mt-[2px]">
            {leadsRow[5]} Leads
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)] mt-[2px]">
            Ø {leadsRow[6]} Leads / Monat (FY 2025)
          </div>
        </div>

        <div className="px-[14px] py-[12px] rounded-[var(--radius-md,8px)] border border-solid border-[rgba(255,122,61,0.25)] bg-[rgba(255,122,61,0.06)] min-w-0">
          <div className="text-[11px] text-accent uppercase font-semibold">
            Rechnerischer Gesamtverlust
          </div>
          <div className="text-[18px] font-bold text-accent mt-[2px]">
            −{totalLoss.toLocaleString('de-DE')} Leads
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)] mt-[2px]">
            {totalLossPercent} % kumulierte Leckage über alle 4 Stufen
          </div>
        </div>

        <div className="px-[14px] py-[12px] rounded-[var(--radius-md,8px)] border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.06)] min-w-0">
          <div className="text-[11px] text-primary uppercase font-semibold">
            Gewonnene Neukunden
          </div>
          <div className="text-[18px] font-bold text-primary mt-[2px]">
            {wonRow[5]} Neukunden (Won)
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)] mt-[2px]">
            {totalConversionPercent} % End-Conversion (Ø {wonRow[6]} / Monat)
          </div>
        </div>
      </div>

      {/* Trial-to-Paid Potenzial als separate Note aus FUNNEL.note */}
      <div className="p-[12px] rounded-[var(--radius-md,8px)] border border-solid border-[rgba(255,184,0,0.3)] bg-[rgba(255,184,0,0.06)] flex flex-col gap-[6px] min-w-0">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="text-[11px] font-bold px-[6px] py-[2px] rounded-[4px] bg-[rgba(255,184,0,0.18)] text-warning uppercase">
            POTENZIAL-ANMERKUNG
          </span>
          <strong className="text-[13px] text-text">
            {FUNNEL.note.title}
          </strong>
        </div>
        <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.5]">
          {FUNNEL.note.paragraphs[0]}
        </p>
      </div>
    </section>
  );
};
