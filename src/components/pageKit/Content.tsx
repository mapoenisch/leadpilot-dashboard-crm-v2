import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Tone } from './Panel';

// Auftrag 068 / G66: Inhaltsbausteine — Aufzählung mit Farbpunkten,
// Schlüssel-Wert-Liste, Kennzahl-Kachel, Hinweisbox, Zitat.

export function ToneList({
  items,
  tone = 'cyan',
  compact = false,
}: {
  items: ReactNode[];
  tone?: Tone;
  compact?: boolean;
}) {
  return (
    <ul className="pk-list" data-tone={tone} data-compact={compact ? 'true' : undefined}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function KeyValueList({ rows }: { rows: Array<[ReactNode, ReactNode]> }) {
  return (
    <dl className="pk-kv">
      {rows.map(([key, value], index) => (
        <div className="pk-kv__row" key={index}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'cyan',
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="pk-stat" data-tone={tone}>
      <span className="pk-stat__label">{label}</span>
      <span className="pk-stat__value">{value}</span>
      {hint ? <span className="pk-stat__hint">{hint}</span> : null}
    </div>
  );
}

export function Callout({
  title,
  children,
  tone = 'orange',
  icon: Icon,
}: {
  title: ReactNode;
  children?: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
}) {
  return (
    <aside className="pk-callout" data-tone={tone}>
      {Icon ? (
        <span className="pk-icon" aria-hidden="true">
          <Icon size={24} strokeWidth={2} />
        </span>
      ) : null}
      <div>
        <p className="pk-callout__title">{title}</p>
        {children ? <p className="pk-callout__text">{children}</p> : null}
      </div>
    </aside>
  );
}

export function Quote({ children }: { children: ReactNode }) {
  return <blockquote className="pk-quote">{children}</blockquote>;
}
