import React, { useState } from 'react';
import { SEGMENTE, CHART_SEGMENT } from '../../../domain/kundenData';

export const SegmentFields: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Exakte ARR-Werte aus CHART_SEGMENT
  // [178560, 112320, 78960, 42000]
  const arrValues = CHART_SEGMENT.datasets[0].data;
  const totalArr = arrValues.reduce((sum, val) => sum + val, 0); // 411.840 €

  // Exakte mathematische ARR-Flächengrößen (gemäß Vorgabe 43,35 %, 27,27 %, 19,17 %, 10,20 %)
  const arrShares = [
    { label: '43,35 %', num: 43.35 },
    { label: '27,27 %', num: 27.27 },
    { label: '19,17 %', num: 19.17 },
    { label: '10,20 %', num: 10.20 },
  ];

  // Kundenanteile aus SEGMENTE.rows (36 %, 27 %, 21 %, 15 % -> Summe 99 %)
  // rows:
  // [0] { branche: 'Maschinenbau / Industrie', anteil: '36 %', charakter: '24 Kunden · Hohe Ticketgrößen, 20-100 MA, Sweet Spot' }
  // [1] { branche: 'IT / Software', anteil: '27 %', charakter: '18 Kunden · Hohe Digitalaffinität, schnelle Kaufentscheidung' }
  // [2] { branche: 'Großhandel', anteil: '21 %', charakter: '14 Kunden · Hohes Lead-Volumen, klare SLA-Anforderungen' }
  // [3] { branche: 'Agenturen', anteil: '15 %', charakter: '10 Kunden · Kurze Sales-Cycles, direkte Entscheider-Ebene' }

  const segments = SEGMENTE.rows.map((row, idx) => {
    const arr = arrValues[idx];
    const arrShare = arrShares[idx];
    const color = CHART_SEGMENT.datasets[0].colors[idx];
    const kundenCount = row.charakter.split(' · ')[0]; // z. B. "24 Kunden"

    return {
      name: row.branche,
      arr,
      arrFormatted: `${arr.toLocaleString('de-DE')} €`,
      arrShare: arrShare.label,
      arrShareNum: arrShare.num,
      kundenAnteil: row.anteil,
      kundenCount,
      charakter: row.charakter,
      color,
    };
  });

  return (
    <section
      className="facelift-segment-fields"
      aria-label="Segment-Felder ARR-Verteilung"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5, 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4, 16px)',
      }}
    >
      {/* Header */}
      <div className="segment-header" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
            }}
          >
            HINGUCKER-GRAFIK · TREEMAP
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Segment-Felder nach ARR-Flächengröße (Basis: 411.840 € Gesamt-ARR)
          </span>
        </div>

        <h3
          className="segment-heading"
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {SEGMENTE.title}
        </h3>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          <span>Flächengrößen = <strong>ARR-Umsatzbeitrag (100 %)</strong></span>
          <span>·</span>
          <span>Prozentwerte = <strong>Kundenanteil (Summe 99 % gerundet)</strong></span>
        </div>
      </div>

      {/* Große Hingucker-Flächengrafik (Treemap-Aufbau) */}
      <div
        className="segment-treemap-container"
        style={{
          width: '100%',
          minHeight: '360px',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
          gap: '12px',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '4px',
        }}
      >
        {/* Linke Spalte (53,55 %): Maschinenbau (43,35 %) + Agenturen (10,20 %) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Maschinenbau: 43,35 % ARR */}
          <button
            type="button"
            className="segment-field segment-field-maschinenbau"
            onClick={() => setSelectedIdx(selectedIdx === 0 ? null : 0)}
            style={{
              flex: '43.35 1 0%',
              minHeight: '190px',
              backgroundColor: 'rgba(0, 217, 198, 0.08)',
              border: selectedIdx === 0 ? '2px solid #00D9C6' : '1px solid rgba(0, 217, 198, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'left',
              cursor: 'pointer',
              boxSizing: 'border-box',
              minWidth: 0,
              overflowWrap: 'anywhere',
              transition: 'all 0.15s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#00D9C6',
                    backgroundColor: 'rgba(0, 217, 198, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  ARR-Fläche: {segments[0].arrShare}
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Kundenanteil: {segments[0].kundenAnteil}
                </span>
              </div>
              <h4 style={{ margin: '8px 0 2px', fontSize: '1.1rem', color: '#00D9C6', fontWeight: 700 }}>
                {segments[0].name}
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                {segments[0].charakter}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(0, 217, 198, 0.15)' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)' }}>Segment-ARR</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                  {segments[0].arrFormatted}
                </strong>
              </div>
              <span style={{ fontSize: '12px', color: '#00D9C6', fontWeight: 600 }}>
                {segments[0].kundenCount}
              </span>
            </div>
          </button>

          {/* Agenturen: 10,20 % ARR */}
          <button
            type="button"
            className="segment-field segment-field-agenturen"
            onClick={() => setSelectedIdx(selectedIdx === 3 ? null : 3)}
            style={{
              flex: '10.20 1 0%',
              minHeight: '110px',
              backgroundColor: 'rgba(255, 154, 102, 0.08)',
              border: selectedIdx === 3 ? '2px solid #FF9A66' : '1px solid rgba(255, 154, 102, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'left',
              cursor: 'pointer',
              boxSizing: 'border-box',
              minWidth: 0,
              overflowWrap: 'anywhere',
              transition: 'all 0.15s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#FF9A66',
                    backgroundColor: 'rgba(255, 154, 102, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  ARR-Fläche: {segments[3].arrShare}
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Kundenanteil: {segments[3].kundenAnteil}
                </span>
              </div>
              <h4 style={{ margin: '4px 0 2px', fontSize: '0.95rem', color: '#FF9A66', fontWeight: 700 }}>
                {segments[3].name}
              </h4>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255, 154, 102, 0.15)' }}>
              <div>
                <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--color-text-muted)' }}>Segment-ARR</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                  {segments[3].arrFormatted}
                </strong>
              </div>
              <span style={{ fontSize: '11.5px', color: '#FF9A66', fontWeight: 600 }}>
                {segments[3].kundenCount}
              </span>
            </div>
          </button>
        </div>

        {/* Rechte Spalte (46,44 %): IT / Software (27,27 %) + Großhandel (19,17 %) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* IT / Software: 27,27 % ARR */}
          <button
            type="button"
            className="segment-field segment-field-it-software"
            onClick={() => setSelectedIdx(selectedIdx === 1 ? null : 1)}
            style={{
              flex: '27.27 1 0%',
              minHeight: '150px',
              backgroundColor: 'rgba(124, 239, 230, 0.08)',
              border: selectedIdx === 1 ? '2px solid #7CEFE6' : '1px solid rgba(124, 239, 230, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'left',
              cursor: 'pointer',
              boxSizing: 'border-box',
              minWidth: 0,
              overflowWrap: 'anywhere',
              transition: 'all 0.15s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#7CEFE6',
                    backgroundColor: 'rgba(124, 239, 230, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  ARR-Fläche: {segments[1].arrShare}
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Kundenanteil: {segments[1].kundenAnteil}
                </span>
              </div>
              <h4 style={{ margin: '6px 0 2px', fontSize: '1.05rem', color: '#7CEFE6', fontWeight: 700 }}>
                {segments[1].name}
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                {segments[1].charakter}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '6px', paddingTop: '8px', borderTop: '1px solid rgba(124, 239, 230, 0.15)' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)' }}>Segment-ARR</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                  {segments[1].arrFormatted}
                </strong>
              </div>
              <span style={{ fontSize: '12px', color: '#7CEFE6', fontWeight: 600 }}>
                {segments[1].kundenCount}
              </span>
            </div>
          </button>

          {/* Großhandel: 19,17 % ARR */}
          <button
            type="button"
            className="segment-field segment-field-grosshandel"
            onClick={() => setSelectedIdx(selectedIdx === 2 ? null : 2)}
            style={{
              flex: '19.17 1 0%',
              minHeight: '130px',
              backgroundColor: 'rgba(255, 122, 61, 0.08)',
              border: selectedIdx === 2 ? '2px solid #FF7A3D' : '1px solid rgba(255, 122, 61, 0.3)',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'left',
              cursor: 'pointer',
              boxSizing: 'border-box',
              minWidth: 0,
              overflowWrap: 'anywhere',
              transition: 'all 0.15s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#FF7A3D',
                    backgroundColor: 'rgba(255, 122, 61, 0.15)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  ARR-Fläche: {segments[2].arrShare}
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Kundenanteil: {segments[2].kundenAnteil}
                </span>
              </div>
              <h4 style={{ margin: '6px 0 2px', fontSize: '1.05rem', color: '#FF7A3D', fontWeight: 700 }}>
                {segments[2].name}
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                {segments[2].charakter}
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255, 122, 61, 0.15)' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)' }}>Segment-ARR</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
                  {segments[2].arrFormatted}
                </strong>
              </div>
              <span style={{ fontSize: '12px', color: '#FF7A3D', fontWeight: 600 }}>
                {segments[2].kundenCount}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Legende */}
      <div
        className="segment-legend"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '10px',
          paddingTop: 'var(--space-2, 8px)',
          borderTop: '1px solid var(--color-border-soft, rgba(255, 255, 255, 0.06))',
          fontSize: '12px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', minWidth: 0 }}>
          {segments.map((seg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                minWidth: 0,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: seg.color, marginTop: '4px', flexShrink: 0 }} />
              <div style={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                <span style={{ color: 'var(--color-text)', display: 'block', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{seg.name}</span>
                <strong style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '11px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {seg.arrShare} ARR ({seg.arrFormatted})
                </strong>
              </div>
            </div>
          ))}
        </div>
        <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          Summe Segment-ARR: {totalArr.toLocaleString('de-DE')} €
        </div>
      </div>

      {/* Responsive Styles für Mobile */}
      <style>{`
        @media (max-width: 600px) {
          .facelift-segment-fields {
            padding: 14px 10px !important;
          }
          .segment-heading {
            font-size: 1.05rem !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            hyphens: auto !important;
          }
          .segment-treemap-container {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .segment-field {
            min-height: 120px !important;
            padding: 12px 8px !important;
          }
        }
      `}</style>
    </section>
  );
};
