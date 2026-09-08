import React from 'react';
import { BILANZ } from '../../../domain/finanzenData';

export const CapitalCut: React.FC = () => {
  const parseVal = (s: string) => {
    const cleaned = s.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
  };

  const totalAktivaRow = BILANZ.aktiva.find((r) => r[0].includes('Gesamtaktiva')) || BILANZ.aktiva[8];
  const totalPassivaRow = BILANZ.passiva.find((r) => r[0].includes('Gesamtpassiva')) || BILANZ.passiva[11];
  const totalBilanzVal = parseVal(totalAktivaRow[1]); // 479000

  // Aktiva Hauptpositionen
  const anlageRow = BILANZ.aktiva[0]; // A. Anlagevermögen
  const umlaufRow = BILANZ.aktiva[3]; // B. Umlaufvermögen
  const rapAktivaRow = BILANZ.aktiva[7]; // C. RAP

  const aktivaSections = [
    {
      title: anlageRow[0],
      amountText: anlageRow[1],
      val: parseVal(anlageRow[1]),
      share: ((parseVal(anlageRow[1]) / totalBilanzVal) * 100).toFixed(1).replace('.', ','),
      color: '#00D9C6',
      subItems: [BILANZ.aktiva[1], BILANZ.aktiva[2]],
    },
    {
      title: umlaufRow[0],
      amountText: umlaufRow[1],
      val: parseVal(umlaufRow[1]),
      share: ((parseVal(umlaufRow[1]) / totalBilanzVal) * 100).toFixed(1).replace('.', ','),
      color: '#7CEFE6',
      subItems: [BILANZ.aktiva[4], BILANZ.aktiva[5], BILANZ.aktiva[6]],
    },
    {
      title: rapAktivaRow[0],
      amountText: rapAktivaRow[1],
      val: parseVal(rapAktivaRow[1]),
      share: ((parseVal(rapAktivaRow[1]) / totalBilanzVal) * 100).toFixed(1).replace('.', ','),
      color: '#A7B0BA',
      subItems: [],
    },
  ];

  // Passiva Hauptpositionen
  const ekRow = BILANZ.passiva[0]; // A. Eigenkapital
  const rueckRow = BILANZ.passiva[5]; // B. Rückstellungen
  const verbRow = BILANZ.passiva[6]; // C. Verbindlichkeiten
  const rapPassivaRow = BILANZ.passiva[10]; // D. RAP

  const passivaSections = [
    {
      title: ekRow[0],
      amountText: ekRow[1],
      val: parseVal(ekRow[1]),
      share: ((parseVal(ekRow[1]) / totalBilanzVal) * 100).toFixed(1).replace('.', ','),
      color: '#00D9C6',
      subItems: [BILANZ.passiva[1], BILANZ.passiva[2], BILANZ.passiva[3], BILANZ.passiva[4]],
    },
    {
      title: rueckRow[0],
      amountText: rueckRow[1],
      val: parseVal(rueckRow[1]),
      share: ((parseVal(rueckRow[1]) / totalBilanzVal) * 100).toFixed(1).replace('.', ','),
      color: '#FFB800',
      subItems: [],
    },
    {
      title: verbRow[0],
      amountText: verbRow[1],
      val: parseVal(verbRow[1]),
      share: ((parseVal(verbRow[1]) / totalBilanzVal) * 100).toFixed(1).replace('.', ','),
      color: '#FF7A3D',
      subItems: [BILANZ.passiva[7], BILANZ.passiva[8], BILANZ.passiva[9]],
    },
    {
      title: rapPassivaRow[0],
      amountText: rapPassivaRow[1],
      val: parseVal(rapPassivaRow[1]),
      share: ((parseVal(rapPassivaRow[1]) / totalBilanzVal) * 100).toFixed(1).replace('.', ','),
      color: '#A7B0BA',
      subItems: [],
    },
  ];

  return (
    <section
      className="facelift-capital-cut"
      aria-label="Kapital-Schnitt Mittelverwendung und Finanzierung"
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
        .capital-cut-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 900px) {
          .capital-cut-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        @media (max-width: 600px) {
          .facelift-capital-cut {
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
            KAPITAL-SCHNITT
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Mittelverwendung (Aktiva) ↔ Finanzierung (Passiva)
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
          Bilanzschnitt: Herkunft & Verwendung der Mittel (GJ 2025)
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Gleichwertige Gegenüberstellung von investiertem Vermögen und Kapitalstruktur bei einer Bilanzsumme von {totalAktivaRow[1]}.
        </p>
      </div>

      {/* 2 Gleichwertige Hälften */}
      <div className="capital-cut-grid" role="region" aria-label="Mittelverwendung und Finanzierung">
        {/* LINKE HÄLFTE: Mittelverwendung (Aktiva) */}
        <article
          style={{
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            borderTop: '4px solid var(--color-primary)',
            backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                LINKE HÄLFTE
              </span>
              <h4 style={{ margin: '2px 0 0', fontSize: '15px', color: 'var(--color-text)', fontWeight: 700 }}>
                Mittelverwendung (Aktiva)
              </h4>
            </div>
            <strong style={{ fontSize: '16px', color: 'var(--color-primary)' }}>
              {totalAktivaRow[1]}
            </strong>
          </div>

          {/* Proportionaler Balken */}
          <div style={{ display: 'flex', height: '12px', width: '100%', borderRadius: '6px', overflow: 'hidden' }}>
            {aktivaSections.map((sec) => (
              <div
                key={sec.title}
                style={{
                  width: `${(sec.val / totalBilanzVal) * 100}%`,
                  backgroundColor: sec.color,
                  height: '100%',
                }}
                title={`${sec.title}: ${sec.amountText} (${sec.share} %)`}
              />
            ))}
          </div>

          {/* Positionsliste */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {aktivaSections.map((sec) => (
              <div
                key={sec.title}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sec.color }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>{sec.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{sec.amountText}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>({sec.share} %)</span>
                  </div>
                </div>

                {sec.subItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '14px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {sec.subItems.map((sub, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{sub[0].trim()}</span>
                        <span>{sub[1]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>

        {/* RECHTE HÄLFTE: Finanzierung (Passiva) */}
        <article
          style={{
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border)',
            borderTop: '4px solid var(--color-accent, #FF7A3D)',
            backgroundColor: 'var(--color-surface-subtle, rgba(255, 255, 255, 0.02))',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--color-accent, #FF7A3D)', fontWeight: 700, textTransform: 'uppercase' }}>
                RECHTE HÄLFTE
              </span>
              <h4 style={{ margin: '2px 0 0', fontSize: '15px', color: 'var(--color-text)', fontWeight: 700 }}>
                Finanzierung (Passiva)
              </h4>
            </div>
            <strong style={{ fontSize: '16px', color: 'var(--color-accent, #FF7A3D)' }}>
              {totalPassivaRow[1]}
            </strong>
          </div>

          {/* Proportionaler Balken */}
          <div style={{ display: 'flex', height: '12px', width: '100%', borderRadius: '6px', overflow: 'hidden' }}>
            {passivaSections.map((sec) => (
              <div
                key={sec.title}
                style={{
                  width: `${(sec.val / totalBilanzVal) * 100}%`,
                  backgroundColor: sec.color,
                  height: '100%',
                }}
                title={`${sec.title}: ${sec.amountText} (${sec.share} %)`}
              />
            ))}
          </div>

          {/* Positionsliste */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {passivaSections.map((sec) => (
              <div
                key={sec.title}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: sec.color }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>{sec.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>{sec.amountText}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>({sec.share} %)</span>
                  </div>
                </div>

                {sec.subItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '14px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {sec.subItems.map((sub, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{sub[0].trim()}</span>
                        <span>{sub[1]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
};
