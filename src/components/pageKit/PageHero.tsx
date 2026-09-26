import type { ReactNode } from 'react';

// Auftrag 068 / G66: Seitenkopf der Inhaltsseiten nach v2.2.0-Vorlage —
// Eyebrow (Bereich), genau eine h1, Untertitel, Pills (erste aktiv leuchtend).
export interface PageHeroProps {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  pills?: string[];
  /** Pills rechts neben dem Titel (z. B. Registerangaben). */
  asidePills?: string[];
}

export function Pill({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span className="pk-pill" data-active={active ? 'true' : undefined}>
      {children}
    </span>
  );
}

export function PageHero({ eyebrow, title, subtitle, pills = [], asidePills = [] }: PageHeroProps) {
  return (
    <header className="pk-hero" data-testid="page-hero">
      <div className="pk-hero__text">
        <p className="pk-eyebrow">{eyebrow}</p>
        <h1 className="pk-title">{title}</h1>
        {subtitle ? <p className="pk-subtitle">{subtitle}</p> : null}
        {pills.length > 0 ? (
          <div className="pk-pills">
            {pills.map((pill, index) => (
              <Pill key={pill} active={index === 0}>
                {pill}
              </Pill>
            ))}
          </div>
        ) : null}
      </div>
      {asidePills.length > 0 ? (
        <div className="pk-pills">
          {asidePills.map((pill, index) => (
            <Pill key={pill} active={index === asidePills.length - 1}>
              {pill}
            </Pill>
          ))}
        </div>
      ) : null}
    </header>
  );
}
