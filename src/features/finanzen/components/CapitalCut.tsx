import React from 'react';
import { BILANZ } from '../../../domain/finanzenData';

export const CapitalCut: React.FC = () => {
  const parseVal = (s: string) => {
    const cleaned = s.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
  };

  const totalAktivaRow =
    BILANZ.aktiva.find((r) => r[0].includes('Gesamtaktiva')) || BILANZ.aktiva[8];
  const totalPassivaRow =
    BILANZ.passiva.find((r) => r[0].includes('Gesamtpassiva')) || BILANZ.passiva[11];
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
      className="facelift-capital-cut box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-5,20px)] [overflow-wrap:anywhere]"
      aria-label="Kapital-Schnitt Mittelverwendung und Finanzierung"
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
      <div className="flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.05em] uppercase whitespace-normal px-[8px] py-[2px]">
            KAPITAL-SCHNITT
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Mittelverwendung (Aktiva) ↔ Finanzierung (Passiva)
          </span>
        </div>
        <h3 className="m-0 font-display font-bold text-text text-[clamp(1.1rem,4vw,1.25rem)] [overflow-wrap:anywhere]">
          Bilanzschnitt: Herkunft & Verwendung der Mittel (GJ 2025)
        </h3>
        <p className="m-0 text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
          Gleichwertige Gegenüberstellung von investiertem Vermögen und Kapitalstruktur bei einer
          Bilanzsumme von {totalAktivaRow[1]}.
        </p>
      </div>

      {/* 2 Gleichwertige Hälften */}
      <div
        className="capital-cut-grid"
        role="region"
        aria-label="Mittelverwendung und Finanzierung"
      >
        {/* LINKE HÄLFTE: Mittelverwendung (Aktiva) */}
        <article className="rounded-md border border-solid border-border border-t-4 border-t-primary bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] p-[14px] flex flex-col gap-[12px] min-w-0">
          <div className="flex justify-between items-center flex-wrap gap-[6px]">
            <div>
              <span className="text-[10px] font-bold uppercase text-primary">LINKE HÄLFTE</span>
              <h4 className="mt-[2px] mb-0 mr-0 ml-0 text-[15px] font-bold text-text">
                Mittelverwendung (Aktiva)
              </h4>
            </div>
            <strong className="text-[16px] text-primary">{totalAktivaRow[1]}</strong>
          </div>

          {/* Proportionaler Balken */}
          <div className="flex w-full h-[12px] rounded-[6px] overflow-hidden">
            {aktivaSections.map((sec) => (
              <div
                key={sec.title}
                // G39 Welle 2: Segmentbreite und -farbe aus Bilanzdaten —
                // als Klasse nicht darstellbar (Entscheidung 2).
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie/Farbe (Bilanzanteile), siehe Auftrag 055 Entscheidung 2
                style={{
                  width: `${(sec.val / totalBilanzVal) * 100}%`,
                  backgroundColor: sec.color,
                }}
                className="h-full"
                title={`${sec.title}: ${sec.amountText} (${sec.share} %)`}
              />
            ))}
          </div>

          {/* Positionsliste */}
          <div className="flex flex-col gap-[8px]">
            {aktivaSections.map((sec) => (
              <div
                key={sec.title}
                className="rounded-[6px] border border-solid border-border bg-[rgba(255,255,255,0.02)] flex flex-col gap-[4px] min-w-0 px-[10px] py-[8px]"
              >
                <div className="flex justify-between items-center flex-wrap gap-[4px]">
                  <div className="flex items-center gap-[6px]">
                    <span
                      className="w-[8px] h-[8px] rounded-full"
                      // G39 Welle 2: Punktfarbe aus Bilanzdaten (Entscheidung 2).
                      // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Bilanzposition), siehe Auftrag 055 Entscheidung 2
                      style={{ backgroundColor: sec.color }}
                    />
                    <span className="text-[12px] font-semibold text-text">{sec.title}</span>
                  </div>
                  <div className="flex items-center gap-[6px]">
                    <strong className="text-[13px] text-text">{sec.amountText}</strong>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      ({sec.share} %)
                    </span>
                  </div>
                </div>

                {sec.subItems.length > 0 && (
                  <div className="flex flex-col gap-[2px] pl-[14px] text-[11px] text-[var(--color-text-muted)]">
                    {sec.subItems.map((sub, i) => (
                      <div key={i} className="flex justify-between">
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
        <article className="rounded-md border border-solid border-border border-t-4 border-t-accent bg-[var(--color-surface-subtle,rgba(255,255,255,0.02))] p-[14px] flex flex-col gap-[12px] min-w-0">
          <div className="flex justify-between items-center flex-wrap gap-[6px]">
            <div>
              <span className="text-[10px] font-bold uppercase text-accent">RECHTE HÄLFTE</span>
              <h4 className="mt-[2px] mb-0 mr-0 ml-0 text-[15px] font-bold text-text">
                Finanzierung (Passiva)
              </h4>
            </div>
            <strong className="text-[16px] text-accent">{totalPassivaRow[1]}</strong>
          </div>

          {/* Proportionaler Balken */}
          <div className="flex w-full h-[12px] rounded-[6px] overflow-hidden">
            {passivaSections.map((sec) => (
              <div
                key={sec.title}
                // G39 Welle 2: Segmentbreite und -farbe aus Bilanzdaten —
                // als Klasse nicht darstellbar (Entscheidung 2).
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Geometrie/Farbe (Bilanzanteile), siehe Auftrag 055 Entscheidung 2
                style={{
                  width: `${(sec.val / totalBilanzVal) * 100}%`,
                  backgroundColor: sec.color,
                }}
                className="h-full"
                title={`${sec.title}: ${sec.amountText} (${sec.share} %)`}
              />
            ))}
          </div>

          {/* Positionsliste */}
          <div className="flex flex-col gap-[8px]">
            {passivaSections.map((sec) => (
              <div
                key={sec.title}
                className="rounded-[6px] border border-solid border-border bg-[rgba(255,255,255,0.02)] flex flex-col gap-[4px] min-w-0 px-[10px] py-[8px]"
              >
                <div className="flex justify-between items-center flex-wrap gap-[4px]">
                  <div className="flex items-center gap-[6px]">
                    <span
                      className="w-[8px] h-[8px] rounded-full"
                      // G39 Welle 2: Punktfarbe aus Bilanzdaten (Entscheidung 2).
                      // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Bilanzposition), siehe Auftrag 055 Entscheidung 2
                      style={{ backgroundColor: sec.color }}
                    />
                    <span className="text-[12px] font-semibold text-text">{sec.title}</span>
                  </div>
                  <div className="flex items-center gap-[6px]">
                    <strong className="text-[13px] text-text">{sec.amountText}</strong>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      ({sec.share} %)
                    </span>
                  </div>
                </div>

                {sec.subItems.length > 0 && (
                  <div className="flex flex-col gap-[2px] pl-[14px] text-[11px] text-[var(--color-text-muted)]">
                    {sec.subItems.map((sub, i) => (
                      <div key={i} className="flex justify-between">
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
