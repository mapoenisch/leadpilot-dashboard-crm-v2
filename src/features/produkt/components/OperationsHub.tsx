import React, { useState } from 'react';
import { FUNKTION } from '../../../domain/produktData';

export const OperationsHub: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  const mod0 = FUNKTION.modules[0] ?? { name: '', desc: '' };
  const mod1 = FUNKTION.modules[1] ?? { name: '', desc: '' };
  const mod2 = FUNKTION.modules[2] ?? { name: '', desc: '' };
  const mod3 = FUNKTION.modules[3] ?? { name: '', desc: '' };

  // Vier Produktmodule unverändert aus FUNKTION.modules abgeleitet
  // mit knapper, sachlicher Ableitung des Vertriebsbezugs ohne neue Wirkversprechen
  const module0 = {
    badge: 'Modul 01 • Inbound',
    name: mod0.name,
    desc: mod0.desc,
    relation:
      'Inbound-Erfassung: Automatische Lead-Aufnahme aus Webformularen, Messen, E-Mails und LinkedIn Ads.',
  };

  const module1 = {
    badge: 'Modul 02 • Scoring',
    name: mod1.name,
    desc: mod1.desc,
    relation:
      'Priorisierung: Lead-Bewertung von 0 bis 100 nach Firmografie, ICP-Fit und Verhalten.',
  };

  const module2 = {
    badge: 'Modul 03 • Outreach',
    name: mod2.name,
    desc: mod2.desc,
    relation: 'Outreach-Automation: Automatisierte Outreach- und Follow-up-Reihen per E-Mail.',
  };

  const module3 = {
    badge: 'Modul 04 • Pipeline',
    name: mod3.name,
    desc: mod3.desc,
    relation: 'Statusübersicht: Tabellenansicht und Echtzeit-Tracking aller Leads nach Status.',
  };

  const pipelineStages = ['New', 'MQL', 'SQL', 'Hot', 'Won', 'Lost'];

  return (
    <div className="facelift-operations-hub box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5)]">
      {/* Header */}
      <div className="border-0 border-b border-solid border-border-soft flex flex-wrap items-center justify-between gap-[var(--space-3)] mb-[var(--space-5)] pb-[var(--space-4)]">
        <div>
          <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] mb-[2px] text-[var(--cyan-light)]">
            Betriebszentrale • Architektur
          </div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold tracking-[0.01em] text-text">
            Produkt-Betriebszentrale: Pipeline-Cockpit & Kernmodule
          </h3>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-[2px] mb-0 mr-0 ml-0">
            Zentrales Pipeline-Cockpit im Zentrum mit sichtbaren Verbindungen zu den vier
            Produktmodulen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          aria-controls="operations-hub-table"
          aria-expanded={showTable}
          className="font-body text-[0.75rem] cursor-pointer rounded-md border border-solid border-border bg-transparent transition-[color_0.15s_ease,border-color_0.15s_ease] text-[var(--color-text-muted)] hover:text-text hover:border-primary px-[12px] py-[5px]"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-text)';
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {showTable ? 'Modulübersicht verbergen' : 'Modulübersicht anzeigen'}
        </button>
      </div>

      {/* SEMANTISCHE STRUKTUR & ECHTE ZENTRALGRAFIK:
          Obere Module (01 & 02) → Sichtbare gerichtete SVG-Verbinder →
          Zentrales Cockpit (Betriebszentrale) → Sichtbare gerichtete SVG-Verbinder →
          Untere Module (03 & 04)
      */}
      <div className="flex flex-col gap-[var(--space-3)]">
        {/* OBERE REIHE: Modul 01 und Modul 02 */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-[var(--space-4)]">
          {/* Modul 01 */}
          <div
            data-testid="hub-module-0"
            data-hub-order="1"
            className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]"
          >
            <div>
              <div className="mb-[var(--space-2)]">
                <span className="font-mono text-[0.625rem] font-bold uppercase text-[var(--cyan-light)]">
                  {module0.badge}
                </span>
              </div>
              <h4 className="m-0 mb-[var(--space-2)] font-display text-[0.9375rem] font-bold text-text">
                {module0.name}
              </h4>
              <p className="m-0 text-[0.75rem] leading-[1.45] text-[var(--color-text-muted)]">
                {module0.desc}
              </p>
            </div>
            <div className="border-0 border-l-[3px] border-solid border-l-primary bg-surface rounded-[0_var(--radius-sm)_var(--radius-sm)_0] px-[var(--space-3)] py-[var(--space-2)]">
              <div className="font-mono text-[0.625rem] font-bold uppercase mb-[2px] text-primary">
                Vertriebsbezug
              </div>
              <div className="text-[0.6875rem] leading-[1.35] text-text">{module0.relation}</div>
            </div>
          </div>

          {/* Modul 02 */}
          <div
            data-testid="hub-module-1"
            data-hub-order="2"
            className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]"
          >
            <div>
              <div className="mb-[var(--space-2)]">
                <span className="font-mono text-[0.625rem] font-bold uppercase text-[var(--cyan-light)]">
                  {module1.badge}
                </span>
              </div>
              <h4 className="m-0 mb-[var(--space-2)] font-display text-[0.9375rem] font-bold text-text">
                {module1.name}
              </h4>
              <p className="m-0 text-[0.75rem] leading-[1.45] text-[var(--color-text-muted)]">
                {module1.desc}
              </p>
            </div>
            <div className="border-0 border-l-[3px] border-solid border-l-primary bg-surface rounded-[0_var(--radius-sm)_var(--radius-sm)_0] px-[var(--space-3)] py-[var(--space-2)]">
              <div className="font-mono text-[0.625rem] font-bold uppercase mb-[2px] text-primary">
                Vertriebsbezug
              </div>
              <div className="text-[0.6875rem] leading-[1.35] text-text">{module1.relation}</div>
            </div>
          </div>
        </div>

        {/* SICHTBARE GERICHTETE SVG-VERBINDUNGEN: OBERE MODULE → ZENTRUM (Ausschließlich aus Modulbeschreibungen abgeleitet) */}
        <div
          data-testid="hub-connector-top"
          className="hub-connector flex items-center justify-around h-[32px] relative"
        >
          <div className="flex items-center gap-[6px] font-mono text-[0.625rem] font-bold text-primary">
            <span>Inbound-Leads erfassen</span>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
              <path
                d="M6 1v14M2 11l4 4 4-4"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex items-center gap-[6px] font-mono text-[0.625rem] font-bold text-primary">
            <span>Lead-Bewertung 0–100</span>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
              <path
                d="M6 1v14M2 11l4 4 4-4"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* ZENTRALER KNOTEN: PIPELINE-COCKPIT (BETRIEBSZENTRALE) */}
        <div
          data-testid="hub-center"
          data-hub-order="3"
          className="rounded-md border-2 border-solid border-primary bg-background-deep shadow-[0_0_24px_rgba(0,217,198,0.12)] relative p-[var(--space-4)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)] mb-[var(--space-3)]">
            <div className="flex items-center gap-[var(--space-2)]">
              <span className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.06em] rounded border border-solid border-[rgba(0,217,198,0.4)] bg-cyan-a12 text-primary px-[8px] py-[2px]">
                Zentraler Knotenpunkt
              </span>
              <h4 className="m-0 font-display text-[1.0625rem] font-bold text-text">
                {mod3.name} (Betriebszentrale)
              </h4>
            </div>

            <div className="font-mono text-[0.6875rem] font-semibold text-primary">
              Echtzeit-Kanban & Statusübersicht
            </div>
          </div>

          <p className="m-0 mb-[var(--space-3)] text-[0.8125rem] leading-[1.45] text-[var(--color-text-muted)]">
            {mod3.desc}
          </p>

          {/* Kanban-Phasenleiste des Cockpits */}
          <div className="border-0 border-t border-solid border-border-soft grid grid-cols-[repeat(auto-fit,minmax(65px,1fr))] gap-[var(--space-2)] pt-[var(--space-2)]">
            {pipelineStages.map((stage, idx) => (
              <div
                key={stage}
                className="rounded border border-solid border-border bg-surface text-center px-[4px] py-[6px]"
              >
                <div className="font-mono text-[0.625rem] mb-[2px] text-[var(--color-text-muted)]">
                  0{idx + 1}
                </div>
                <div
                  className={`font-display text-[0.75rem] font-bold ${stage === 'Won' ? 'text-primary' : stage === 'Hot' ? 'text-accent' : 'text-text'}`}
                >
                  {stage}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SICHTBARE GERICHTETE SVG-VERBINDUNGEN: ZENTRUM → UNTERE MODULE (Ausschließlich aus Modulbeschreibungen abgeleitet) */}
        <div
          data-testid="hub-connector-bottom"
          className="hub-connector flex items-center justify-around h-[32px] relative"
        >
          <div className="flex items-center gap-[6px] font-mono text-[0.625rem] font-bold text-primary">
            <span>Outreach- & Follow-up-Reihen</span>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
              <path
                d="M6 1v14M2 11l4 4 4-4"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex items-center gap-[6px] font-mono text-[0.625rem] font-bold text-primary">
            <span>Echtzeit-Kanban & Tabellenansicht</span>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
              <path
                d="M6 1v14M2 11l4 4 4-4"
                stroke="var(--color-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* UNTERE REIHE: Modul 03 und Modul 04 */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-[var(--space-4)]">
          {/* Modul 03 */}
          <div
            data-testid="hub-module-2"
            data-hub-order="4"
            className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]"
          >
            <div>
              <div className="mb-[var(--space-2)]">
                <span className="font-mono text-[0.625rem] font-bold uppercase text-[var(--cyan-light)]">
                  {module2.badge}
                </span>
              </div>
              <h4 className="m-0 mb-[var(--space-2)] font-display text-[0.9375rem] font-bold text-text">
                {module2.name}
              </h4>
              <p className="m-0 text-[0.75rem] leading-[1.45] text-[var(--color-text-muted)]">
                {module2.desc}
              </p>
            </div>
            <div className="border-0 border-l-[3px] border-solid border-l-primary bg-surface rounded-[0_var(--radius-sm)_var(--radius-sm)_0] px-[var(--space-3)] py-[var(--space-2)]">
              <div className="font-mono text-[0.625rem] font-bold uppercase mb-[2px] text-primary">
                Vertriebsbezug
              </div>
              <div className="text-[0.6875rem] leading-[1.35] text-text">{module2.relation}</div>
            </div>
          </div>

          {/* Modul 04 */}
          <div
            data-testid="hub-module-3"
            data-hub-order="5"
            className="rounded-md border border-solid border-border-soft bg-background-deep p-[var(--space-4)] flex flex-col justify-between gap-[var(--space-3)]"
          >
            <div>
              <div className="mb-[var(--space-2)]">
                <span className="font-mono text-[0.625rem] font-bold uppercase text-[var(--cyan-light)]">
                  {module3.badge}
                </span>
              </div>
              <h4 className="m-0 mb-[var(--space-2)] font-display text-[0.9375rem] font-bold text-text">
                {module3.name}
              </h4>
              <p className="m-0 text-[0.75rem] leading-[1.45] text-[var(--color-text-muted)]">
                {module3.desc}
              </p>
            </div>
            <div className="border-0 border-l-[3px] border-solid border-l-primary bg-surface rounded-[0_var(--radius-sm)_var(--radius-sm)_0] px-[var(--space-3)] py-[var(--space-2)]">
              <div className="font-mono text-[0.625rem] font-bold uppercase mb-[2px] text-primary">
                Vertriebsbezug
              </div>
              <div className="text-[0.6875rem] leading-[1.35] text-text">{module3.relation}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ausklappbare Detail-Referenztabelle */}
      {showTable && (
        <div
          id="operations-hub-table"
          className="border-0 border-t border-solid border-border flex flex-col gap-[var(--space-3)] mt-[var(--space-5)] pt-[var(--space-4)]"
        >
          <div className="text-[0.8125rem] text-[var(--color-text-muted)]">
            Vollständige Modulübersicht aus der Produkt-Konfiguration:
          </div>
          <div className="flex flex-col gap-[var(--space-2)]">
            {FUNKTION.modules.map((m, idx) => (
              <div
                key={m.name}
                className="flex items-center gap-[var(--space-3)] rounded border border-solid border-border-soft bg-background-deep p-[var(--space-3)]"
              >
                <div className="font-mono text-[0.75rem] font-bold rounded bg-surface px-[8px] py-[2px] text-primary">
                  0{idx + 1}
                </div>
                <div>
                  <div className="text-[0.8125rem] font-semibold text-text">{m.name}</div>
                  <div className="text-[0.75rem] text-[var(--color-text-muted)]">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
