import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

// Auftrag 068 / G66: Leucht-Panel der Inhaltsseiten. Ton steuert Rahmen,
// Leuchten, Icon-Kachel und (optional) Titelfarbe — wie die Vorlagen.
export type Tone = 'cyan' | 'red' | 'orange' | 'mint' | 'neutral';

export interface PanelProps {
  title: ReactNode;
  /** Klartext-Name für die Landmarke, falls title kein String ist. */
  label?: string;
  tone?: Tone;
  icon?: LucideIcon;
  subtitle?: ReactNode;
  /** Statuspunkt-Badge direkt am Titel („● Vertriebsanalyse 2025“). */
  badge?: string;
  /** Chip rechts im Kopf („ERREICHT“, „47 JAHRE – HEAD OF SALES“). */
  chip?: string;
  chipTone?: Tone;
  /** Titel in Tonfarbe (SWOT, Persona). */
  toneTitle?: boolean;
  /** Ohne Innenabstand (für randlose Tabellen). */
  flush?: boolean;
  headingLevel?: 2 | 3;
  className?: string;
  children?: ReactNode;
}

export function Chip({
  children,
  tone = 'cyan',
  strong = false,
}: {
  children: ReactNode;
  tone?: Tone;
  strong?: boolean;
}) {
  return (
    <span className="pk-chip" data-tone={tone} data-strong={strong ? 'true' : undefined}>
      {children}
    </span>
  );
}

export function Panel({
  title,
  label,
  tone = 'cyan',
  icon: Icon,
  subtitle,
  badge,
  chip,
  chipTone,
  toneTitle = false,
  flush = false,
  headingLevel = 2,
  className = '',
  children,
}: PanelProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const ariaLabel = label ?? (typeof title === 'string' ? title : undefined);
  return (
    <section
      className={`pk-panel ${className}`}
      data-tone={tone}
      data-flush={flush ? 'true' : undefined}
      data-tone-title={toneTitle ? 'true' : undefined}
      aria-label={ariaLabel}
      data-testid="page-panel"
    >
      <div className="pk-panel__head">
        <div className="pk-panel__heading">
          {Icon ? (
            <span className="pk-icon" aria-hidden="true">
              <Icon size={24} strokeWidth={2} />
            </span>
          ) : null}
          <div className="pk-panel__titles">
            <Heading className="pk-panel__title">
              {title}
              {badge ? <span className="pk-badge">{badge}</span> : null}
            </Heading>
            {subtitle ? <p className="pk-panel__subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {chip ? <Chip tone={chipTone ?? tone}>{chip}</Chip> : null}
      </div>
      {children}
    </section>
  );
}

export function Grid({
  cols = '2',
  children,
}: {
  cols?: '2' | '3' | '4' | 'wide-left';
  children: ReactNode;
}) {
  return (
    <div className="pk-grid" data-cols={cols}>
      {children}
    </div>
  );
}
