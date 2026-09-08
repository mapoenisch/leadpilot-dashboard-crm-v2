import React, { useState } from 'react';
import { SWOT } from '../../../domain/marktData';
import { FaceliftGlyph } from '../../../components/facelift/FaceliftGlyph';

export const SwotCompass: React.FC = () => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<'strengths' | 'weaknesses' | 'opportunities' | 'threats'>('strengths');

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

  return (
    <section
      className="facelift-swot-compass"
      aria-label="Strategischer SWOT-Kompass"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        padding: 'var(--space-5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border-soft)',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(0, 217, 198, 0.1)',
              border: '1px solid rgba(0, 217, 198, 0.25)',
              color: 'var(--color-primary)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            Strategische Steuerung
          </div>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '0.01em',
            }}
          >
            Strategischer SWOT-Kompass
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
            Vier Fachzeichen um das Entscheidungszentrum: Klare Orientierung auf den Achsen intern / extern und stärken / schützen.
          </p>
        </div>

        {/* Achsen-Legende */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.75rem',
          }}
        >
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            Horizontal: <strong style={{ color: 'var(--color-text)' }}>Intern ↔ Extern</strong>
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            Vertikal: <strong style={{ color: 'var(--color-text)' }}>Stärken ↕ Schützen</strong>
          </span>
        </div>
      </div>

      {/* Screenreader-Zusammenfassung */}
      <div className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        SWOT Kompass:
        Stärken (intern/stärken): Time-to-Value unter 30 Min Setup, 100% DACH-Mittelstand, DSGVO Frankfurt-Hosting, ARPA 520 Euro.
        Schwächen (intern/schützen): Churn 2,8 %, Burn Rate 25.750 Euro, Markenbekanntheit unter 0,1 %, CTO Single Point of Failure.
        Chancen (extern/stärken): B2B Digitalisierungsnachholbedarf, DSGVO-Nachfrage ohne US-Direct-Access, Partnerkanal CAC 492 Euro, Trial Flow 18 % auf 25 %.
        Risiken (extern/schützen): US-Wettbewerb, Preiskampf Einstiegssegment, Maschinenbau-Gesamtwirtschaftslage.
      </div>

      {/* Kompass-Grid mit echten semantischen HTML-Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
          position: 'relative',
        }}
      >
        {quadrants.map((quadrant) => {
          const isSelected = selectedQuadrant === quadrant.id;

          return (
            <article
              key={quadrant.id}
              aria-labelledby={`swot-heading-${quadrant.id}`}
              style={{
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isSelected ? quadrant.borderCol : 'var(--color-border)'}`,
                backgroundColor: isSelected ? quadrant.bgCol : 'rgba(255, 255, 255, 0.02)',
                padding: 'var(--space-4)',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                boxSizing: 'border-box',
              }}
            >
              {/* Header der Karte mit Fachzeichen, Titel und Achsen-Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-2)',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${quadrant.borderCol}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FaceliftGlyph name={quadrant.glyph} tone={quadrant.tone} size={18} />
                  </div>
                  <div>
                    <h4
                      id={`swot-heading-${quadrant.id}`}
                      style={{
                        margin: 0,
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {quadrant.title} ({quadrant.code})
                    </h4>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                      {quadrant.subtitle}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.625rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: quadrant.borderCol,
                  }}
                >
                  {quadrant.axisLabel}
                </span>
              </div>

              {/* Handlungsimpuls */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--color-border-soft)',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    letterSpacing: '0.04em',
                    marginBottom: '2px',
                  }}
                >
                  Handlungsimpuls
                </div>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                  }}
                >
                  {quadrant.actionHeading}
                </div>
              </div>

              {/* SWOT-Domainfakten */}
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.8125rem',
                  color: 'var(--color-text)',
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
                {quadrant.items.map((item, idx) => (
                  <li key={idx} style={{ color: 'var(--color-text)' }}>
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
                style={{
                  marginTop: 'var(--space-2)',
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isSelected ? quadrant.borderCol : 'var(--color-border)'}`,
                  backgroundColor: isSelected ? 'rgba(0, 217, 198, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSelected ? quadrant.borderCol : 'var(--color-text)',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isSelected ? '✓ Handlungsoptionen aktiv' : `${quadrant.title} auswählen`}
              </button>
            </article>
          );
        })}
      </div>

      {/* Detailansicht mit Handlungsoptionen, mit aria-live="polite" */}
      <div
        aria-live="polite"
        style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          border: `1px solid ${activeQuadrantData.borderCol}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: activeQuadrantData.borderCol,
                letterSpacing: '0.06em',
              }}
            >
              Handlungsoptionen, aus der SWOT abgeleitet
            </span>
            <h4
              style={{
                margin: 0,
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {activeQuadrantData.title}: {activeQuadrantData.actionHeading}
            </h4>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Achse: <strong style={{ color: 'var(--color-text)' }}>{activeQuadrantData.axisLabel}</strong>
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-2)',
          }}
        >
          {activeQuadrantData.actionTranslations.map((action, aIdx) => (
            <div
              key={aIdx}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--color-border-soft)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <span
                style={{
                  color: activeQuadrantData.borderCol,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.75rem',
                  lineHeight: '1.2rem',
                }}
              >
                0{aIdx + 1}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text)', lineHeight: 1.4 }}>
                {action}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
