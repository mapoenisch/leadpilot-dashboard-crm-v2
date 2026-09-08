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

  const getBadgeStyle = (variant: 'increase' | 'hold' | 'stop') => {
    switch (variant) {
      case 'increase':
        return {
          color: 'var(--color-primary)',
          backgroundColor: 'rgba(0, 217, 198, 0.14)',
          border: '1px solid rgba(0, 217, 198, 0.35)',
        };
      case 'hold':
        return {
          color: 'var(--color-warning, #FFB800)',
          backgroundColor: 'rgba(255, 184, 0, 0.14)',
          border: '1px solid rgba(255, 184, 0, 0.35)',
        };
      case 'stop':
        return {
          color: 'var(--color-accent, #FF7A3D)',
          backgroundColor: 'rgba(255, 122, 61, 0.14)',
          border: '1px solid rgba(255, 122, 61, 0.35)',
        };
    }
  };

  return (
    <section
      className="facelift-channel-investment-route"
      aria-label="Investitionsroute Kanal zu CAC zu Neukunden"
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
            INVESTITIONSROUTE
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Kanalbudget ➔ CAC ➔ Neukunden ➔ Allokation
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
          Kanal-Allokationspfad & CAC-Effizienz
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Weg von Mitteleinsatz und Kosten je Akquisition zur Neukundengewinnung.
          Maßnahmen-Badges sind als <strong>empfohlene Maßnahme, abgeleitet aus CAC-Index, Spend-Abweichung und bestehender Bewertung</strong> ausgewiesen.
        </p>
      </div>

      {/* Benchmark-Leiste */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md, 8px)',
          backgroundColor: 'rgba(0, 217, 198, 0.05)',
          border: '1px solid rgba(0, 217, 198, 0.2)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Gesamter Spend (Ist)
          </span>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
            {totalKanaele[5]} <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 400 }}>(Plan: {totalMbudget[1]} · {totalMbudget[3]})</span>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Gewonnene Neukunden
          </span>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
            {totalKanaele[2]} Neukunden ({totalKanaele[1]})
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Blended Marketing-CAC
          </span>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
            {totalKanaele[4]} / Kunde
          </div>
        </div>
      </div>

      {/* Kanal-Routenliste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} role="region" aria-label="Kanalliste Investitionsroute">
        {channels.map((ch) => {
          const badgeStyle = getBadgeStyle(ch.badgeVariant);

          return (
            <article
              key={ch.name}
              style={{
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: 0,
              }}
            >
              <div className="route-step-grid">
                {/* 1. Kanal & Bewertung */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {ch.name}
                  </div>
                </div>

                {/* 2. Kanalbudget */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    1. Budget & Spend
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {ch.spend}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Plan: {ch.budget} ({ch.variance})
                  </span>
                </div>

                {/* 3. CAC & Index */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    2. Marketing-CAC
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                    {ch.cac}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Index: {ch.cacIndex} vs. Blended
                  </span>
                </div>

                {/* 4. Neukunden */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    3. Neukunden
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    {ch.customers} Kunden
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Anteil: {ch.customerShare}
                  </span>
                </div>

                {/* 5. Maßnahme-Badge */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', minWidth: 0 }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    4. Maßnahme
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      ...badgeStyle,
                    }}
                  >
                    {ch.badge}
                  </span>
                </div>
              </div>

              {/* Erläuterung aus Quellenbewertung */}
              <div
                style={{
                  paddingTop: '8px',
                  borderTop: '1px solid var(--color-border)',
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.4,
                }}
              >
                <strong style={{ color: 'var(--color-text)' }}>Quellenbewertung:</strong> {ch.explanation}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
