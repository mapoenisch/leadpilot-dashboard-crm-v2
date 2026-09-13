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
    { label: '10,20 %', num: 10.2 },
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
      className="facelift-segment-fields box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5,20px)] flex flex-col gap-[var(--space-4,16px)]"
      aria-label="Segment-Felder ARR-Verteilung"
    >
      {/* Header */}
      <div className="segment-header flex flex-col gap-[6px]">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="inline-flex items-center rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.12)] text-primary text-[11px] font-bold tracking-[0.05em] uppercase px-[8px] py-[2px]">
            HINGUCKER-GRAFIK · TREEMAP
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Segment-Felder nach ARR-Flächengröße (Basis: 411.840 € Gesamt-ARR)
          </span>
        </div>

        <h3 className="segment-heading m-0 font-display text-[1.25rem] font-bold text-text">
          {SEGMENTE.title}
        </h3>

        <div className="flex gap-[12px] flex-wrap items-center text-[12px] text-[var(--color-text-muted)]">
          <span>
            Flächengrößen = <strong>ARR-Umsatzbeitrag (100 %)</strong>
          </span>
          <span>·</span>
          <span>
            Prozentwerte = <strong>Kundenanteil (Summe 99 % gerundet)</strong>
          </span>
        </div>
      </div>

      {/* Große Hingucker-Flächengrafik (Treemap-Aufbau) */}
      <div className="segment-treemap-container w-full min-h-[360px] box-border grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-[12px] rounded-md p-[4px]">
        {/* Linke Spalte (53,55 %): Maschinenbau (43,35 %) + Agenturen (10,20 %) */}
        <div className="flex flex-col gap-[12px] min-w-0">
          {/* Maschinenbau: 43,35 % ARR */}
          <button
            type="button"
            className={`segment-field segment-field-maschinenbau flex flex-col justify-between text-left cursor-pointer box-border min-w-0 rounded-[8px] border-solid p-[16px] transition-[all_0.15s_ease] [overflow-wrap:anywhere] min-h-[190px] ${selectedIdx === 0 ? 'border-2 border-[#00D9C6]' : 'border border-[rgba(0,217,198,0.3)]'} bg-[rgba(0,217,198,0.08)] flex-[43.35_1_0%]`}
            onClick={() => setSelectedIdx(selectedIdx === 0 ? null : 0)}
          >
            <div>
              <div className="flex justify-between items-start flex-wrap gap-[6px]">
                <span className="text-[11px] font-bold uppercase text-[#00D9C6] bg-[rgba(0,217,198,0.15)] rounded px-[6px] py-[2px]">
                  ARR-Fläche: {segments[0].arrShare}
                </span>
                <span className="text-[11.5px] font-semibold text-[var(--color-text-muted)]">
                  Kundenanteil: {segments[0].kundenAnteil}
                </span>
              </div>
              <h4 className="font-bold text-[#00D9C6] text-[1.1rem] mt-[8px] mb-[2px] mx-0">
                {segments[0].name}
              </h4>
              <p className="m-0 text-[12px] leading-[1.35] text-[var(--color-text-muted)]">
                {segments[0].charakter}
              </p>
            </div>
            <div className="border-0 border-t border-solid border-[rgba(0,217,198,0.15)] flex justify-between items-end flex-wrap gap-[6px] pt-[8px]">
              <div>
                <span className="block text-[11px] text-[var(--color-text-muted)]">
                  Segment-ARR
                </span>
                <strong className="font-display text-[1.25rem] text-text">
                  {segments[0].arrFormatted}
                </strong>
              </div>
              <span className="text-[12px] font-semibold text-[#00D9C6]">
                {segments[0].kundenCount}
              </span>
            </div>
          </button>

          {/* Agenturen: 10,20 % ARR */}
          <button
            type="button"
            className={`segment-field segment-field-agenturen flex flex-col justify-between text-left cursor-pointer box-border min-w-0 rounded-[8px] border-solid px-[16px] py-[12px] transition-[all_0.15s_ease] [overflow-wrap:anywhere] min-h-[110px] ${selectedIdx === 3 ? 'border-2 border-[#FF9A66]' : 'border border-[rgba(255,154,102,0.3)]'} bg-[rgba(255,154,102,0.08)] flex-[10.20_1_0%]`}
            onClick={() => setSelectedIdx(selectedIdx === 3 ? null : 3)}
          >
            <div>
              <div className="flex justify-between items-start flex-wrap gap-[6px]">
                <span className="text-[11px] font-bold uppercase text-[#FF9A66] bg-[rgba(255,154,102,0.15)] rounded px-[6px] py-[2px]">
                  ARR-Fläche: {segments[3].arrShare}
                </span>
                <span className="text-[11.5px] font-semibold text-[var(--color-text-muted)]">
                  Kundenanteil: {segments[3].kundenAnteil}
                </span>
              </div>
              <h4 className="font-bold text-[#FF9A66] text-[0.95rem] mt-[4px] mb-[2px] mx-0">
                {segments[3].name}
              </h4>
            </div>
            <div className="border-0 border-t border-solid border-[rgba(255,154,102,0.15)] flex justify-between items-end flex-wrap gap-[6px] pt-[6px]">
              <div>
                <span className="block text-[10.5px] text-[var(--color-text-muted)]">
                  Segment-ARR
                </span>
                <strong className="font-display text-[1.05rem] text-text">
                  {segments[3].arrFormatted}
                </strong>
              </div>
              <span className="text-[11.5px] font-semibold text-[#FF9A66]">
                {segments[3].kundenCount}
              </span>
            </div>
          </button>
        </div>

        {/* Rechte Spalte (46,44 %): IT / Software (27,27 %) + Großhandel (19,17 %) */}
        <div className="flex flex-col gap-[12px] min-w-0">
          {/* IT / Software: 27,27 % ARR */}
          <button
            type="button"
            className={`segment-field segment-field-it-software flex flex-col justify-between text-left cursor-pointer box-border min-w-0 rounded-[8px] border-solid p-[16px] transition-[all_0.15s_ease] [overflow-wrap:anywhere] min-h-[150px] ${selectedIdx === 1 ? 'border-2 border-[#7CEFE6]' : 'border border-[rgba(124,239,230,0.3)]'} bg-[rgba(124,239,230,0.08)] flex-[27.27_1_0%]`}
            onClick={() => setSelectedIdx(selectedIdx === 1 ? null : 1)}
          >
            <div>
              <div className="flex justify-between items-start flex-wrap gap-[6px]">
                <span className="text-[11px] font-bold uppercase text-[#7CEFE6] bg-[rgba(124,239,230,0.15)] rounded px-[6px] py-[2px]">
                  ARR-Fläche: {segments[1].arrShare}
                </span>
                <span className="text-[11.5px] font-semibold text-[var(--color-text-muted)]">
                  Kundenanteil: {segments[1].kundenAnteil}
                </span>
              </div>
              <h4 className="font-bold text-[#7CEFE6] text-[1.05rem] mt-[6px] mb-[2px] mx-0">
                {segments[1].name}
              </h4>
              <p className="m-0 text-[12px] leading-[1.35] text-[var(--color-text-muted)]">
                {segments[1].charakter}
              </p>
            </div>
            <div className="border-0 border-t border-solid border-[rgba(124,239,230,0.15)] flex justify-between items-end flex-wrap gap-[6px] pt-[8px]">
              <div>
                <span className="block text-[11px] text-[var(--color-text-muted)]">
                  Segment-ARR
                </span>
                <strong className="font-display text-[1.2rem] text-text">
                  {segments[1].arrFormatted}
                </strong>
              </div>
              <span className="text-[12px] font-semibold text-[#7CEFE6]">
                {segments[1].kundenCount}
              </span>
            </div>
          </button>

          {/* Großhandel: 19,17 % ARR */}
          <button
            type="button"
            className={`segment-field segment-field-grosshandel flex flex-col justify-between text-left cursor-pointer box-border min-w-0 rounded-[8px] border-solid px-[16px] py-[14px] transition-[all_0.15s_ease] [overflow-wrap:anywhere] min-h-[130px] ${selectedIdx === 2 ? 'border-2 border-[#FF7A3D]' : 'border border-[rgba(255,122,61,0.3)]'} bg-[rgba(255,122,61,0.08)] flex-[19.17_1_0%]`}
            onClick={() => setSelectedIdx(selectedIdx === 2 ? null : 2)}
          >
            <div>
              <div className="flex justify-between items-start flex-wrap gap-[6px]">
                <span className="text-[11px] font-bold uppercase text-[#FF7A3D] bg-[rgba(255,122,61,0.15)] rounded px-[6px] py-[2px]">
                  ARR-Fläche: {segments[2].arrShare}
                </span>
                <span className="text-[11.5px] font-semibold text-[var(--color-text-muted)]">
                  Kundenanteil: {segments[2].kundenAnteil}
                </span>
              </div>
              <h4 className="font-bold text-[#FF7A3D] text-[1.05rem] mt-[6px] mb-[2px] mx-0">
                {segments[2].name}
              </h4>
              <p className="m-0 text-[12px] leading-[1.35] text-[var(--color-text-muted)]">
                {segments[2].charakter}
              </p>
            </div>
            <div className="border-0 border-t border-solid border-[rgba(255,122,61,0.15)] flex justify-between items-end flex-wrap gap-[6px] pt-[6px]">
              <div>
                <span className="block text-[11px] text-[var(--color-text-muted)]">
                  Segment-ARR
                </span>
                <strong className="font-display text-[1.15rem] text-text">
                  {segments[2].arrFormatted}
                </strong>
              </div>
              <span className="text-[12px] font-semibold text-[#FF7A3D]">
                {segments[2].kundenCount}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Legende */}
      <div className="segment-legend flex justify-between items-start flex-wrap gap-[10px] border-0 border-t border-solid border-border-soft pt-[var(--space-2,8px)] text-[12px] min-w-0">
        <div className="flex gap-[12px] flex-wrap min-w-0">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="flex items-start gap-[6px] min-w-0 [overflow-wrap:anywhere] break-words"
            >
              <span
                className="w-[10px] h-[10px] rounded-[2px] shrink-0 mt-[4px]"
                // G39 Welle 2: Legenden-Punktfarbe aus Domain-Daten
                // (CHART_SEGMENT-Farbpalette) — als Klasse nicht darstellbar.
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (Domain-Daten), siehe Auftrag 055 Entscheidung 2
                style={{ backgroundColor: seg.color }}
              />
              <div className="min-w-0 [overflow-wrap:anywhere] break-words">
                <span className="block text-text [overflow-wrap:anywhere] break-words">
                  {seg.name}
                </span>
                <strong className="block text-[11px] text-[var(--color-text-muted)] [overflow-wrap:anywhere] break-words">
                  {seg.arrShare} ARR ({seg.arrFormatted})
                </strong>
              </div>
            </div>
          ))}
        </div>
        <div className="italic min-w-0 [overflow-wrap:anywhere] break-words text-[var(--color-text-muted)]">
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
