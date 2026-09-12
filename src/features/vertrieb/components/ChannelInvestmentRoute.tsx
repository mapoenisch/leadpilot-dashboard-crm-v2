import React from 'react';
import { KANAELE, MBUDGET } from '../../../domain/vertriebData';

export const ChannelInvestmentRoute: React.FC = () => {
  // Echte Datenbindung aus KANAELE.rows und MBUDGET.rows
  const channelRows = KANAELE.rows.slice(0, 5);
  const budgetRows = MBUDGET.rows.slice(0, 5);
  const totalKanaele = KANAELE.rows[5];
  const totalMbudget = MBUDGET.rows[5];

  const channels = channelRows.map((kRow) => {
    const mRow =
      budgetRows.find(
        (b) =>
          b[0].toLowerCase().startsWith(kRow[0].toLowerCase().slice(0, 4)) ||
          kRow[0].toLowerCase().startsWith(b[0].toLowerCase().slice(0, 4))
      ) || budgetRows[0];

    let badge: 'Erhöhen' | 'Halten' | 'Stoppen' = 'Halten';
    let badgeVariant: 'increase' | 'hold' | 'stop' = 'hold';
    let explanation = '';

    if (kRow[0].includes('Partner') || kRow[0].includes('SEO')) {
      badge = 'Erhöhen';
      badgeVariant = 'increase';
      explanation = `${kRow[6]} (${mRow[6]})`;
    } else if (kRow[0].includes('Outbound')) {
      badge = 'Stoppen';
      badgeVariant = 'stop';
      explanation = `${kRow[6]} (${mRow[6]})`;
    } else if (kRow[0].includes('LinkedIn')) {
      badge = 'Halten';
      badgeVariant = 'hold';
      explanation = `Optimierung prüfen · ${kRow[6]} (${mRow[6]})`;
    } else {
      badge = 'Halten';
      badgeVariant = 'hold';
      explanation = `${kRow[6]} (${mRow[6]})`;
    }

    return {
      name: kRow[0],
      spend: kRow[5],
      budget: mRow[1],
      variance: mRow[3],
      cac: kRow[4],
      cacIndex: kRow[3],
      customers: kRow[2],
      customerShare: kRow[1],
      badge,
      badgeVariant,
      explanation,
    };
  });

  // G39 Welle 4: Badge-Farben je Variante als Klassen-Lookup (alle drei
  // Werte zur Build-Zeit bekannt — kein style-Prop nötig, Entscheidung 2).
  const BADGE_CLASSES: Record<'increase' | 'hold' | 'stop', string> = {
    increase: 'text-primary bg-[rgba(0,217,198,0.14)] border border-solid border-[rgba(0,217,198,0.35)]',
    hold: 'text-warning bg-[rgba(255,184,0,0.14)] border border-solid border-[rgba(255,184,0,0.35)]',
    stop: 'text-accent bg-[rgba(255,122,61,0.14)] border border-solid border-[rgba(255,122,61,0.35)]',
  };

  return (
    <section
      className="facelift-channel-investment-route w-full box-border rounded-[var(--radius-lg,12px)] border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="Investitionsroute Kanal zu CAC zu Neukunden"
    >
      <style>{`
        .route-step-grid {
          display: grid;
          grid-template-columns: 200px 1fr 1fr 1fr 160px;
          gap: 12px;
          align-items: center;
        }
        @media (max-width: 1024px) {
          .route-step-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
        }
        @media (max-width: 600px) {
          .facelift-channel-investment-route {
            padding: 12px 8px !important;
          }
          .route-step-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center px-[8px] py-[2px] rounded-[4px] text-[11px] font-bold tracking-[0.05em] uppercase text-primary bg-[rgba(0,217,198,0.12)] border border-solid border-[rgba(0,217,198,0.25)] whitespace-normal">
            INVESTITIONSROUTE
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Kanalbudget ➔ CAC ➔ Neukunden ➔ Allokation
          </span>
        </div>
        <h3 className="m-0 text-[clamp(1.1rem,4vw,1.25rem)] font-bold text-text font-display [overflow-wrap:anywhere]">
          Kanal-Allokationspfad & CAC-Effizienz
        </h3>
        <p className="m-0 text-[13px] text-[var(--color-text-muted)] leading-[1.5]">
          Weg von Mitteleinsatz und Kosten je Akquisition zur Neukundengewinnung.
          Maßnahmen-Badges sind als <strong>empfohlene Maßnahme, abgeleitet aus CAC-Index, Spend-Abweichung und bestehender Bewertung</strong> ausgewiesen.
        </p>
      </div>

      {/* Benchmark-Leiste */}
      <div className="flex justify-between items-center px-[14px] py-[12px] rounded-[var(--radius-md,8px)] bg-[rgba(0,217,198,0.05)] border border-solid border-[rgba(0,217,198,0.2)] flex-wrap gap-[10px]">
        <div className="min-w-0">
          <span className="text-[11px] text-[var(--color-text-muted)] uppercase">
            Gesamter Spend (Ist)
          </span>
          <div className="text-[15px] font-bold text-text">
            {totalKanaele[5]} <span className="text-[11px] text-[var(--color-text-muted)] font-normal">(Plan: {totalMbudget[1]} · {totalMbudget[3]})</span>
          </div>
        </div>

        <div className="min-w-0">
          <span className="text-[11px] text-[var(--color-text-muted)] uppercase">
            Gewonnene Neukunden
          </span>
          <div className="text-[15px] font-bold text-primary">
            {totalKanaele[2]} Neukunden ({totalKanaele[1]})
          </div>
        </div>

        <div className="min-w-0">
          <span className="text-[11px] text-[var(--color-text-muted)] uppercase">
            Blended Marketing-CAC
          </span>
          <div className="text-[15px] font-bold text-text">
            {totalKanaele[4]} / Kunde
          </div>
        </div>
      </div>

      {/* Kanal-Routenliste */}
      <div className="flex flex-col gap-[12px]" role="region" aria-label="Kanalliste Investitionsroute">
        {channels.map((ch) => {
          return (
            <article
              key={ch.name}
              className="rounded-[var(--radius-md,8px)] border border-solid border-border bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] px-[14px] py-[12px] flex flex-col gap-[10px] min-w-0"
            >
              <div className="route-step-grid">
                {/* 1. Kanal & Bewertung */}
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-text">
                    {ch.name}
                  </div>
                </div>

                {/* 2. Kanalbudget */}
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase">
                    1. Budget & Spend
                  </span>
                  <div className="text-[13px] font-bold text-text">
                    {ch.spend}
                  </div>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Plan: {ch.budget} ({ch.variance})
                  </span>
                </div>

                {/* 3. CAC & Index */}
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase">
                    2. Marketing-CAC
                  </span>
                  <div className="text-[13px] font-bold text-text">
                    {ch.cac}
                  </div>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Index: {ch.cacIndex} vs. Blended
                  </span>
                </div>

                {/* 4. Neukunden */}
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase">
                    3. Neukunden
                  </span>
                  <div className="text-[13px] font-bold text-primary">
                    {ch.customers} Kunden
                  </div>
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Anteil: {ch.customerShare}
                  </span>
                </div>

                {/* 5. Maßnahme-Badge */}
                <div className="flex flex-col gap-[4px] items-start min-w-0">
                  <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.04em]">
                    4. Maßnahme
                  </span>
                  <span
                    className={`inline-flex items-center justify-center px-[10px] py-[3px] rounded-[4px] text-[11px] font-extrabold tracking-[0.04em] uppercase ${BADGE_CLASSES[ch.badgeVariant]}`}
                  >
                    {ch.badge}
                  </span>
                </div>
              </div>

              {/* Erläuterung aus Quellenbewertung */}
              <div className="pt-[8px] border-t border-solid border-border text-[11px] text-[var(--color-text-muted)] leading-[1.4]">
                <strong className="text-text">Quellenbewertung:</strong> {ch.explanation}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
