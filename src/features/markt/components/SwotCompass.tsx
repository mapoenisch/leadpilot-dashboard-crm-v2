import React, { useState } from 'react';
import { SWOT } from '../../../domain/marktData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';

export const SwotCompass: React.FC = () => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<
    'strengths' | 'weaknesses' | 'opportunities' | 'threats'
  >('strengths');

  // Handlungsorientierte Optionen, direkt aus den SWOT-Aussagen abgeleitet
  const quadrants = [
    {
      id: 'strengths' as const,
      code: 'S',
      title: 'Stärken',
      subtitle: 'Strengths · Interner Hebel',
      glyph: 'success' as const,
      tone: 'positive' as const,
      axisLabel: 'INTERN · STÄRKEN',
      actionHeading: 'Stärken im DACH-Markt gezielt nutzen',
      items: SWOT.strengths,
      actionTranslations: [
        'Time-to-Value (< 30 Minuten Setup) im Vertrieb als Kernvorteil positionieren',
        '100% DACH-Mittelstandsfokus (Maschinenbau, IT, Großhandel) vertiefen',
        '100% DSGVO-Konformität mit Hosting in Frankfurt am Main & EU-Modellen hervorheben',
        'Hohe Kundenzufriedenheit im Kernsegment (ARPA 520 €) sichern',
      ],
      borderCol: 'var(--color-primary)',
      bgCol: 'rgba(0, 217, 198, 0.05)',
    },
    {
      id: 'weaknesses' as const,
      code: 'W',
      title: 'Schwächen',
      subtitle: 'Weaknesses · Interne Hürde',
      glyph: 'challenge' as const,
      tone: 'attention' as const,
      axisLabel: 'INTERN · SCHÜTZEN',
      actionHeading: 'Interne Schwachstellen strukturell absichern',
      items: SWOT.weaknesses,
      actionTranslations: [
        'Account-Churn bei Kleinstkunden (2,8 % pro Monat) durch ICP-Fokussierung reduzieren',
        'Monatliche Burn Rate (25.750 €) steuern und Runway von 14 Monaten schützen',
        'Geringe Markenbekanntheit (< 0,1 % Marktanteil) schrittweise aufbauen',
        'CTO als Single Point of Failure für KI-Scoring Engine organisatorisch entlasten',
      ],
      borderCol: 'var(--color-error, #FF4D4D)',
      bgCol: 'rgba(255, 77, 77, 0.05)',
    },
    {
      id: 'opportunities' as const,
      code: 'O',
      title: 'Chancen',
      subtitle: 'Opportunities · Externes Potenzial',
      glyph: 'opportunity' as const,
      tone: 'positive' as const,
      axisLabel: 'EXTERN · STÄRKEN',
      actionHeading: 'Markchancen für Wachstum erschließen',
      items: SWOT.opportunities,
      actionTranslations: [
        'Großen Nachholbedarf bei der B2B-Vertriebsdigitalisierung im Mittelstand adressieren',
        'Steigende Nachfrage nach DSGVO-konformer Software ohne US-Direct-Access bedienen',
        'Partner- und Empfehlungskanal mit günstigstem CAC (492 €) gezielt skalieren',
        'Guided Trial Onboarding Flow zur Erhöhung der Trial-to-Paid Rate (18 % → 25 %) einführen',
      ],
      borderCol: 'var(--cyan-light, #7CEFE6)',
      bgCol: 'rgba(124, 239, 230, 0.05)',
    },
    {
      id: 'threats' as const,
      code: 'T',
      title: 'Risiken',
      subtitle: 'Threats · Externe Bedrohung',
      glyph: 'risk' as const,
      tone: 'attention' as const,
      axisLabel: 'EXTERN · SCHÜTZEN',
      actionHeading: 'Externe Risiken vorausschauend abfedern',
      items: SWOT.threats,
      actionTranslations: [
        'Eintritt US-amerikanischer Anbieter mit großem Marketingbudget durch Spezialisierung begegnen',
        'Verschärftem Preiskampf im B2B SaaS Einstiegssegment durch klaren Mehrwert standhalten',
        'Mögliche Verschlechterung der Gesamtwirtschaftslage im Maschinenbau beobachten',
      ],
      borderCol: 'var(--color-accent, #FF9900)',
      bgCol: 'rgba(255, 153, 0, 0.05)',
    },
  ];

  const activeQuadrantData = quadrants.find((q) => q.id === selectedQuadrant) || quadrants[0];

  // G39 Welle 2: Quadrantenfarben als Klassen-Ternaries (4 statische
  // Quadranten, Build-Zeit bekannt) — keine Laufzeit-Styles nötig.
  const quadBorderClass = (id: string) =>
    id === 'strengths'
      ? 'border-primary'
      : id === 'weaknesses'
        ? 'border-[var(--color-error,#FF4D4D)]'
        : id === 'opportunities'
          ? 'border-[var(--cyan-light,#7CEFE6)]'
          : 'border-[var(--color-accent,#FF9900)]';
  const quadBgClass = (id: string) =>
    id === 'strengths'
      ? 'bg-[rgba(0,217,198,0.05)]'
      : id === 'weaknesses'
        ? 'bg-[rgba(255,77,77,0.05)]'
        : id === 'opportunities'
          ? 'bg-[rgba(124,239,230,0.05)]'
          : 'bg-[rgba(255,153,0,0.05)]';
  const quadTextClass = (id: string) =>
    id === 'strengths'
      ? 'text-primary'
      : id === 'weaknesses'
        ? 'text-[var(--color-error,#FF4D4D)]'
        : id === 'opportunities'
          ? 'text-[var(--cyan-light,#7CEFE6)]'
          : 'text-[var(--color-accent,#FF9900)]';

  return (
    <section
      className="facelift-swot-compass box-border w-full rounded-lg border border-solid border-border bg-surface p-[var(--space-5)]"
      aria-label="Strategischer SWOT-Kompass"
    >
      {/* Header */}
      <div className="border-0 border-b border-solid border-border-soft flex flex-wrap items-center justify-between gap-[var(--space-3)] mb-[var(--space-5)] pb-[var(--space-4)]">
        <div>
          <div className="inline-flex items-center gap-[6px] rounded border border-solid border-[rgba(0,217,198,0.25)] bg-[rgba(0,217,198,0.1)] text-primary text-[0.6875rem] font-bold uppercase tracking-[0.06em] mb-[6px] px-[8px] py-[2px]">
            Strategische Steuerung
          </div>
          <h3 className="m-0 font-display text-[1.125rem] font-bold tracking-[0.01em] text-text">
            Strategischer SWOT-Kompass
          </h3>
          <p className="text-[0.8125rem] text-[var(--color-text-muted)] mt-[3px] mb-0 mr-0 ml-0">
            Vier Fachzeichen um das Entscheidungszentrum: Klare Orientierung auf den Achsen intern /
            extern und stärken / schützen.
          </p>
        </div>

        {/* Achsen-Legende */}
        <div className="flex flex-wrap gap-[8px] text-[0.75rem]">
          <span className="rounded border border-solid border-border bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] px-[8px] py-[3px]">
            Horizontal: <strong className="text-text">Intern ↔ Extern</strong>
          </span>
          <span className="rounded border border-solid border-border bg-[rgba(255,255,255,0.04)] text-[var(--color-text-muted)] px-[8px] py-[3px]">
            Vertikal: <strong className="text-text">Stärken ↕ Schützen</strong>
          </span>
        </div>
      </div>

      {/* Screenreader-Zusammenfassung */}
      <div className="sr-only">
        SWOT Kompass: Stärken (intern/stärken): Time-to-Value unter 30 Min Setup, 100%
        DACH-Mittelstand, DSGVO Frankfurt-Hosting, ARPA 520 Euro. Schwächen (intern/schützen): Churn
        2,8 %, Burn Rate 25.750 Euro, Markenbekanntheit unter 0,1 %, CTO Single Point of Failure.
        Chancen (extern/stärken): B2B Digitalisierungsnachholbedarf, DSGVO-Nachfrage ohne
        US-Direct-Access, Partnerkanal CAC 492 Euro, Trial Flow 18 % auf 25 %. Risiken
        (extern/schützen): US-Wettbewerb, Preiskampf Einstiegssegment,
        Maschinenbau-Gesamtwirtschaftslage.
      </div>

      {/* Kompass-Grid mit echten semantischen HTML-Buttons */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[var(--space-4)] relative">
        {quadrants.map((quadrant) => {
          const isSelected = selectedQuadrant === quadrant.id;

          return (
            <article
              key={quadrant.id}
              aria-labelledby={`swot-heading-${quadrant.id}`}
              className={`rounded-md border border-solid flex flex-col gap-[var(--space-3)] box-border p-[var(--space-4)] transition-[border-color_0.15s_ease,background-color_0.15s_ease] ${isSelected ? `${quadBorderClass(quadrant.id)} ${quadBgClass(quadrant.id)}` : 'border-border bg-[rgba(255,255,255,0.02)]'}`}
            >
              {/* Header der Karte mit Fachzeichen, Titel und Achsen-Badge */}
              <div className="flex items-center justify-between gap-[var(--space-2)] w-full">
                <div className="flex items-center gap-[8px]">
                  <div
                    className={`flex items-center justify-center rounded bg-[rgba(255,255,255,0.05)] w-[32px] h-[32px] border border-solid ${quadBorderClass(quadrant.id)}`}
                  >
                    <FaceliftGlyph name={quadrant.glyph} tone={quadrant.tone} size={18} />
                  </div>
                  <div>
                    <h4
                      id={`swot-heading-${quadrant.id}`}
                      className="m-0 font-display text-[0.9375rem] font-bold text-text"
                    >
                      {quadrant.title} ({quadrant.code})
                    </h4>
                    <div className="text-[0.6875rem] text-[var(--color-text-muted)]">
                      {quadrant.subtitle}
                    </div>
                  </div>
                </div>

                <span
                  className={`font-mono text-[0.625rem] font-bold tracking-[0.06em] rounded bg-[rgba(255,255,255,0.06)] px-[6px] py-[2px] ${quadTextClass(quadrant.id)}`}
                >
                  {quadrant.axisLabel}
                </span>
              </div>

              {/* Handlungsimpuls */}
              <div className="rounded border border-solid border-border-soft bg-[rgba(0,0,0,0.25)] w-full box-border px-[10px] py-[8px]">
                <div className="text-[0.6875rem] uppercase tracking-[0.04em] mb-[2px] text-[var(--color-text-muted)]">
                  Handlungsimpuls
                </div>
                <div className="text-[0.8125rem] font-semibold text-text">
                  {quadrant.actionHeading}
                </div>
              </div>

              {/* SWOT-Domainfakten */}
              <ul className="m-0 flex flex-col gap-[6px] pl-[16px] text-[0.8125rem] leading-[1.4] flex-1 text-text">
                {quadrant.items.map((item, idx) => (
                  <li key={idx} className="text-text">
                    {item}
                  </li>
                ))}
              </ul>

              {/* Echter semantischer Auswahlbutton */}
              <button
                type="button"
                onClick={() => setSelectedQuadrant(quadrant.id)}
                aria-pressed={isSelected}
                aria-label={`${quadrant.title} Handlungsoptionen fokussieren`}
                className={`inline-flex items-center justify-center gap-[6px] text-center cursor-pointer text-[0.8125rem] w-full rounded-md border border-solid mt-[var(--space-2)] px-[12px] py-[7px] transition-[background-color_0.15s_ease,border-color_0.15s_ease,color_0.15s_ease] ${isSelected ? `${quadBorderClass(quadrant.id)} bg-[rgba(0,217,198,0.15)] font-bold ${quadTextClass(quadrant.id)}` : 'border-border bg-[rgba(255,255,255,0.04)] font-medium text-text'}`}
              >
                {isSelected ? '✓ Handlungsoptionen aktiv' : `${quadrant.title} auswählen`}
              </button>
            </article>
          );
        })}
      </div>

      {/* Detailansicht mit Handlungsoptionen, mit aria-live="polite" */}
      {/* G39 Welle 2: Detailfarben hängen von der State-Selektion
          (find über Daten-Array) ab — als Klasse nicht darstellbar
          (Entscheidung 2). Nur Farb-Props im style, Rest Klassen. */}
      <div
        aria-live="polite"
        className="rounded-md mt-[var(--space-4)] p-[var(--space-4)] border border-solid bg-[rgba(0,0,0,0.25)]"
        // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (State-Selektion aus Daten), siehe Auftrag 055 Entscheidung 2
        style={{
          borderColor: activeQuadrantData.borderCol,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-2)] mb-[var(--space-3)]">
          <div className="flex items-center gap-[8px]">
            <span
              className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.06em]"
              // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (State-Selektion aus Daten), siehe Auftrag 055 Entscheidung 2
              style={{ color: activeQuadrantData.borderCol }}
            >
              Handlungsoptionen, aus der SWOT abgeleitet
            </span>
            <h4 className="m-0 font-display text-[0.9375rem] font-bold text-text">
              {activeQuadrantData.title}: {activeQuadrantData.actionHeading}
            </h4>
          </div>

          <span className="text-[0.75rem] text-[var(--color-text-muted)]">
            Achse: <strong className="text-text">{activeQuadrantData.axisLabel}</strong>
          </span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[var(--space-2)]">
          {activeQuadrantData.actionTranslations.map((action, aIdx) => (
            <div
              key={aIdx}
              className="rounded border border-solid border-border-soft bg-[rgba(255,255,255,0.02)] flex items-start gap-[8px] px-[10px] py-[8px]"
            >
              <span
                className="font-mono text-[0.75rem] font-bold leading-[1.2rem]"
                // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farbe (State-Selektion aus Daten), siehe Auftrag 055 Entscheidung 2
                style={{ color: activeQuadrantData.borderCol }}
              >
                0{aIdx + 1}
              </span>
              <span className="text-[0.8125rem] leading-[1.4] text-text">{action}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
