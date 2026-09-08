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
      className="facelift-funnel-waterfall"
      aria-label="Funnel-Leckage-Wasserfall"
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
            FUNNEL-LECKAGE-WASSERFALL
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Rechnerischer Stufenverlust & verbleibendes Potenzial
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
          Konvertierungskaskade FY 2025
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
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
              style={{
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                minWidth: 0,
                overflowWrap: 'anywhere',
              }}
            >
              {/* Stufen-Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Stufe {idx + 1} ➔ {idx + 2}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 217, 198, 0.12)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {stage.conversionPercent.toFixed(1)} % Verbleib
                </span>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
                  {stage.name}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '2px' }}>
                  {stage.startCount.toLocaleString('de-DE')}
                </div>
              </div>

              {/* Visuelle Leckage-Leiste */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    height: '10px',
                    width: '100%',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                  title={`Verbleib: ${remainingWidth}, Verlust: ${lossWidth}`}
                >
                  <div
                    style={{
                      width: remainingWidth,
                      backgroundColor: 'var(--color-primary)',
                      height: '100%',
                    }}
                  />
                  <div
                    style={{
                      width: lossWidth,
                      backgroundColor: 'var(--color-accent, #FF7A3D)',
                      height: '100%',
                      opacity: 0.8,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    {stage.remainingCount.toLocaleString('de-DE')} weiter ({remainingWidth})
                  </span>
                  <span style={{ color: 'var(--color-accent, #FF7A3D)', fontWeight: 600 }}>
                    −{stage.lossCount.toLocaleString('de-DE')} Verlust ({lossWidth})
                  </span>
                </div>
              </div>

              {/* Übergangsziel & Quellconversion */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--color-border)',
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>➔ </span>
                  <span>Ziel: <strong style={{ color: 'var(--color-text)' }}>{stage.nextStageName}</strong></span>
                </div>
                {stage.sourceConversion && stage.sourceConversion !== '—' && (
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
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
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Ausgangsbasis Leads
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>
            {leadsRow[5]} Leads
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Ø {leadsRow[6]} Leads / Monat (FY 2025)
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid rgba(255, 122, 61, 0.25)',
            backgroundColor: 'rgba(255, 122, 61, 0.06)',
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-accent, #FF7A3D)', textTransform: 'uppercase', fontWeight: 600 }}>
            Rechnerischer Gesamtverlust
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-accent, #FF7A3D)', marginTop: '2px' }}>
            −{totalLoss.toLocaleString('de-DE')} Leads
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {totalLossPercent} % kumulierte Leckage über alle 4 Stufen
          </div>
        </div>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid rgba(0, 217, 198, 0.25)',
            backgroundColor: 'rgba(0, 217, 198, 0.06)',
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Gewonnene Neukunden
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
            {wonRow[5]} Neukunden (Won)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {totalConversionPercent} % End-Conversion (Ø {wonRow[6]} / Monat)
          </div>
        </div>
      </div>

      {/* Trial-to-Paid Potenzial als separate Note aus FUNNEL.note */}
      <div
        style={{
          padding: '12px',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid rgba(255, 184, 0, 0.3)',
          backgroundColor: 'rgba(255, 184, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 184, 0, 0.18)',
              color: 'var(--color-warning, #FFB800)',
              textTransform: 'uppercase',
            }}
          >
            POTENZIAL-ANMERKUNG
          </span>
          <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>
            {FUNNEL.note.title}
          </strong>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          {FUNNEL.note.paragraphs[0]}
        </p>
      </div>
    </section>
  );
};
