import React, { useState } from 'react';
import { MARKT } from '../../../domain/marktData';
import { Table } from '../../../components/ui/Table';

export const MarketOpportunityStack: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  // Exakte dynamische Ableitung aus MARKT.overview:
  // [0] ['Europa Cloud-CRM-Markt (2026)', '14,23 Mrd. USD (CAGR 5,23 %, Prognose 18,36 Mrd. USD bis 2031)']
  // [1] ['Deutschland Einzelmarkt', 'Größter CRM-Einzelmarkt Europas mit 24,4 % Marktanteil (2025)']
  // [2] ['LeadPilot Marktanteil', '< 0,1 % (Fokus auf Nische B2B-Mittelstand)']
  // [3] ['Digitale Reichweite 2025', '1.400 LinkedIn-Follower · 620 Newsletter-Abos · 2.900 Web-Besucher/Monat · DA 14']
  const rowEuropa = MARKT.overview[0];
  const rowDeutschland = MARKT.overview[1];
  const rowLeadPilot = MARKT.overview[2];
  const rowReichweite = MARKT.overview[3];

  // Dynamische Zerlegung der Werte ohne Hartcodierung
  // rowEuropa: '14,23 Mrd. USD' aus '14,23 Mrd. USD (CAGR...'
  const europaVal = rowEuropa[1].split(' (')[0];
  // rowLeadPilot: '< 0,1 %' und 'Fokus auf Nische B2B-Mittelstand' aus '< 0,1 % (Fokus auf Nische B2B-Mittelstand)'
  const leadpilotVal = rowLeadPilot[1].split(' (')[0];
  const leadpilotFokus = rowLeadPilot[1].includes('(')
    ? rowLeadPilot[1].substring(rowLeadPilot[1].indexOf('(') + 1, rowLeadPilot[1].lastIndexOf(')'))
    : rowLeadPilot[1];

  // rowReichweite: '1.400 LinkedIn-Follower · 620 Newsletter-Abos · 2.900 Web-Besucher/Monat · DA 14'
  const reichweiteParts = rowReichweite[1].split(' · ');
  const webBesucherPart =
    reichweiteParts.find((p) => p.includes('Web-Besucher')) ||
    reichweiteParts[2] ||
    rowReichweite[1];
  const kanaelePart = reichweiteParts.filter((p) => !p.includes('Web-Besucher')).join(' · ');

  const stackLayers = [
    {
      step: '01',
      badge: 'Marktvolumen',
      title: `${rowEuropa[0]} & ${rowDeutschland[0]}`,
      primaryLabel: rowEuropa[0],
      primaryValue: europaVal,
      detailContext: rowEuropa[1],
      secondaryLabel: rowDeutschland[0],
      secondaryValue: rowDeutschland[1],
      color: 'var(--color-primary)',
      accentBg: 'rgba(0, 217, 198, 0.06)',
      accentBorder: 'rgba(0, 217, 198, 0.28)',
    },
    {
      step: '02',
      badge: 'Adressierbarer Fokusmarkt',
      title: `${rowLeadPilot[0]} & ${leadpilotFokus}`,
      primaryLabel: rowLeadPilot[0],
      primaryValue: leadpilotVal,
      detailContext: rowLeadPilot[1],
      secondaryLabel: 'Segmentfokus',
      secondaryValue: leadpilotFokus,
      color: 'var(--cyan-light, #7CEFE6)',
      accentBg: 'rgba(124, 239, 230, 0.06)',
      accentBorder: 'rgba(124, 239, 230, 0.28)',
    },
    {
      step: '03',
      badge: 'Erreichte Aufmerksamkeit',
      title: rowReichweite[0],
      primaryLabel: rowReichweite[0],
      primaryValue: webBesucherPart,
      detailContext: rowReichweite[1],
      secondaryLabel: 'Kanäle & Sichtbarkeit',
      secondaryValue: kanaelePart,
      color: 'var(--color-accent, #FF9900)',
      accentBg: 'rgba(255, 153, 0, 0.06)',
      accentBorder: 'rgba(255, 153, 0, 0.28)',
    },
  ];

  // G39 Welle 2: Schichtfarben als Klassen-Ternaries (3 statische
  // Schichten, Build-Zeit bekannt) — keine Laufzeit-Styles nötig.
  const layerColorClass = (idx: number) =>
    idx === 0
      ? 'text-primary'
      : idx === 1
        ? 'text-[var(--cyan-light,#7CEFE6)]'
        : 'text-[var(--color-accent,#FF9900)]';
  const layerBgClass = (idx: number) =>
    idx === 0
      ? 'bg-[rgba(0,217,198,0.06)]'
      : idx === 1
        ? 'bg-[rgba(124,239,230,0.06)]'
        : 'bg-[rgba(255,153,0,0.06)]';
  const layerBorderClass = (idx: number) =>
    idx === 0
      ? 'border-[rgba(0,217,198,0.28)]'
      : idx === 1
        ? 'border-[rgba(124,239,230,0.28)]'
        : 'border-[rgba(255,153,0,0.28)]';

  return (
    <section
      className="facelift-market-opportunity-stack box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5)] [overflow-wrap:anywhere]"
      aria-label="Chancenstapel Marktpotenzial"
    >
      <style>{`
        @media (max-width: 600px) {
          .facelift-market-opportunity-stack {
            padding: 12px 10px !important;
          }
          .market-stack-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)] border-0 border-b border-solid border-border-soft mb-[var(--space-5)] pb-[var(--space-4)]">
        <div>
          <div className="inline-flex items-center gap-[6px] rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.1)] text-primary text-[0.6875rem] font-bold uppercase tracking-[0.06em] mb-[6px] px-[8px] py-[2px]">
            Marktanalyse DACH
          </div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold tracking-[0.01em] text-text">
            Chancenstapel Marktpotenzial
          </h3>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-[3px] mb-0 mr-0 ml-0">
            Marktvolumen → adressierbarer Fokusmarkt → erreichte Aufmerksamkeit (direkt aus
            MARKT.overview).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="market-stack-table"
          aria-expanded={showTable}
          className={`inline-flex items-center gap-[6px] rounded-md border border-solid border-border text-[0.8125rem] font-semibold cursor-pointer transition-[color_0.15s_ease,border-color_0.15s_ease] text-text px-[12px] py-[6px] ${showTable ? 'bg-[var(--color-surface-hover)]' : 'bg-transparent'}`}
        >
          {showTable ? 'Tabelle ausblenden' : 'Detailtabelle einblenden'}
        </button>
      </div>

      {/* Visueller Chancenstapel */}
      <div className="flex flex-col gap-[var(--space-4)]">
        {stackLayers.map((layer, idx) => (
          <div
            key={layer.step}
            className={`relative rounded-md border border-solid min-w-0 box-border [overflow-wrap:anywhere] p-[var(--space-4)] transition-[border-color_0.15s_ease] ${layerBorderClass(idx)} ${layerBgClass(idx)}`}
          >
            {/* Kopf der Schicht */}
            <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)] min-w-0 mb-[var(--space-3)]">
              <div className="flex items-center gap-[8px] min-w-0 flex-wrap">
                <span
                  className={`inline-flex items-center justify-center shrink-0 rounded font-mono text-[0.75rem] font-bold w-[24px] h-[24px] border ${layerBorderClass(idx)} ${layerColorClass(idx)} bg-[rgba(255,255,255,0.05)]`}
                >
                  {layer.step}
                </span>
                <span
                  className={`text-[0.6875rem] font-bold uppercase tracking-[0.06em] ${layerColorClass(idx)}`}
                >
                  {layer.badge}
                </span>
              </div>
              <h4 className="m-0 font-display text-[0.9375rem] font-semibold text-text [overflow-wrap:anywhere]">
                {layer.title}
              </h4>
            </div>

            {/* Hauptkennzahl & Wert */}
            <div className="market-stack-grid grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-[var(--space-3)] items-center border border-solid border-border-soft rounded bg-[rgba(0,0,0,0.25)] min-w-0 box-border mb-[var(--space-3)] p-[var(--space-3)]">
              <div>
                <div className="text-[0.6875rem] uppercase tracking-[0.04em] mb-[2px] text-[var(--color-text-muted)]">
                  {layer.primaryLabel}
                </div>
                <div
                  className={`font-mono text-[1.375rem] font-bold leading-[1.2] ${layerColorClass(idx)}`}
                >
                  {layer.primaryValue}
                </div>
                <div className="text-[0.75rem] mt-[4px] text-[var(--color-text-muted)]">
                  {layer.detailContext}
                </div>
              </div>
            </div>

            {/* Spezifischer Detailwert aus MARKT.overview */}
            <div className="border border-solid border-border-soft rounded bg-[rgba(255,255,255,0.02)] min-w-0 box-border [overflow-wrap:anywhere] px-[10px] py-[8px]">
              <div className="text-[0.6875rem] uppercase tracking-[0.04em] mb-[2px] text-[var(--color-text-muted)]">
                {layer.secondaryLabel}
              </div>
              <div className="text-[0.8125rem] font-medium text-text">{layer.secondaryValue}</div>
            </div>

            {/* Verbinder nach unten */}
            {idx < stackLayers.length - 1 && (
              <div
                aria-hidden="true"
                className="absolute z-[2] flex items-center justify-center w-[24px] h-[14px] text-[var(--color-text-muted)] left-1/2 -translate-x-1/2 -bottom-[14px]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 2v8m0 0l-3-3m3 3l3-3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Aufklappbare Original-Tabelle */}
      {showTable && (
        <div
          id="market-stack-table"
          className="border-0 border-t border-solid border-border-soft mt-[var(--space-4)] pt-[var(--space-4)]"
        >
          <div className="text-[0.75rem] font-bold uppercase tracking-[0.06em] mb-[var(--space-2)] text-[var(--color-text-muted)]">
            Referenztabelle (MARKT.overview)
          </div>
          <Table
            columns={[
              { key: '0', label: 'Markt-Segment' },
              { key: '1', label: 'Potenzial & Daten' },
            ]}
            rows={MARKT.overview.map((o: string[]) => ({ 0: o[0], 1: o[1] }))}
          />
        </div>
      )}

      {/* Fußzeile / Methodischer Nachweis */}
      <div className="border-0 border-t border-solid border-border-soft flex flex-wrap items-center justify-between gap-[var(--space-2)] text-[0.75rem] mt-[var(--space-4)] pt-[var(--space-3)] text-[var(--color-text-muted)]">
        <span>
          Basisdaten: <strong className="text-text">Marktlage & Cloud-CRM DACH</strong>{' '}
          (Marktanalyse 2025/2026)
        </span>
        <span className="font-mono text-[0.6875rem]">
          DE-Anteil: 24,4 % · LeadPilot: &lt; 0,1 %
        </span>
      </div>
    </section>
  );
};
