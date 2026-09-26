import type { ReactNode } from 'react';
import { CheckCircle2, type LucideIcon } from 'lucide-react';
import type { Tone } from './Panel';

// Auftrag 068 / G66: Inhaltsbausteine — Aufzählung mit Farbpunkten,
// Schlüssel-Wert-Liste, Kennzahl-Kachel, Hinweisbox, Zitat.

/** „22 % (4 Zugänge …)“ → Wert und Nebenangabe getrennt darstellen (Text bleibt vollständig). */
export function splitValueHint(text: string): [string, string | undefined] {
  const match = /^(.*?)\s*\((.+)\)$/.exec(text);
  return match ? [match[1] ?? text, match[2]] : [text, undefined];
}

export interface RowItem {
  key: string;
  title: ReactNode;
  chip?: ReactNode;
  text?: ReactNode;
  aside?: ReactNode;
  tone?: Tone;
}

/** Zeilenliste im Vorlagenstil (Kapazitäten, Meilensteine): Titel, Chip, Text, rechte Markierung. */
export function RowList({ items, label }: { items: RowItem[]; label: string }) {
  return (
    <ul className="pk-rows" aria-label={label}>
      {items.map((item) => (
        <li className="pk-row" key={item.key} data-tone={item.tone ?? 'cyan'}>
          <span className="pk-row__head">
            <strong className="pk-row__title">{item.title}</strong>
            {item.chip ?? null}
          </span>
          {item.text ? <span className="pk-row__text">{item.text}</span> : null}
          {item.aside ? <span className="pk-row__aside">{item.aside}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function ToneList({
  items,
  tone = 'cyan',
  compact = false,
  marker = 'bar',
}: {
  items: ReactNode[];
  tone?: Tone;
  compact?: boolean;
  /** Leuchtbalken (Standard) oder Häkchen (USPs, Leistungsumfang). */
  marker?: 'bar' | 'check';
}) {
  return (
    <ul
      className="pk-list"
      data-tone={tone}
      data-compact={compact ? 'true' : undefined}
      data-marker={marker}
    >
      {items.map((item, index) => (
        <li key={index}>
          {marker === 'check' ? (
            <CheckCircle2 className="pk-list__check" size={18} aria-hidden="true" />
          ) : null}
          {item}
        </li>
      ))}
    </ul>
  );
}

export interface FeatureItem {
  title: string;
  text: ReactNode;
  icon: LucideIcon;
}

/** Einträge mit Icon-Kachel, Titel (h3) und Text — Erfolge, Herausforderungen, Funktionen. */
export function FeatureList({ items, tone = 'cyan' }: { items: FeatureItem[]; tone?: Tone }) {
  return (
    <ul className="pk-features" data-tone={tone}>
      {items.map(({ title, text, icon: Icon }) => (
        <li className="pk-feature" key={title}>
          <span className="pk-icon" aria-hidden="true">
            <Icon size={24} strokeWidth={2} />
          </span>
          <div className="pk-feature__body">
            <h3 className="pk-feature__title">{title}</h3>
            <p className="pk-feature__text">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function KeyValueList({
  rows,
  lead = false,
}: {
  rows: Array<[ReactNode, ReactNode]>;
  /** Merkmale in Markenfarbe (Registerdaten, Verträge). */
  lead?: boolean;
}) {
  return (
    <dl className="pk-kv" data-lead={lead ? 'true' : undefined}>
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
  icon: Icon,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  /** Runde Icon-Kachel links (KPI-Raster wie Unit Economics). */
  icon?: LucideIcon;
}) {
  const body = (
    <>
      <span className="pk-stat__label">{label}</span>
      <span className="pk-stat__value">{value}</span>
      {hint ? <span className="pk-stat__hint">{hint}</span> : null}
    </>
  );
  if (!Icon) {
    return (
      <div className="pk-stat" data-tone={tone}>
        {body}
      </div>
    );
  }
  return (
    <div className="pk-stat" data-tone={tone} data-with-icon="true">
      <span className="pk-icon" data-shape="round" aria-hidden="true">
        <Icon size={24} strokeWidth={2} />
      </span>
      <div className="pk-stat__body">{body}</div>
    </div>
  );
}

export function Callout({
  title,
  children,
  paragraphs,
  tone = 'orange',
  icon: Icon,
  headingLevel,
}: {
  title: ReactNode;
  children?: ReactNode;
  /** Mehrere Absätze, je als eigenes <p>. */
  paragraphs?: string[];
  tone?: Tone;
  icon?: LucideIcon;
  /** Titel als echte Überschrift (Hinweis ist eigener Abschnitt der Seite). */
  headingLevel?: 2 | 3;
}) {
  const Title = headingLevel === 2 ? 'h2' : headingLevel === 3 ? 'h3' : 'p';
  return (
    <aside
      className="pk-callout"
      data-tone={tone}
      aria-label={typeof title === 'string' ? title : undefined}
    >
      {Icon ? (
        <span className="pk-icon" aria-hidden="true">
          <Icon size={24} strokeWidth={2} />
        </span>
      ) : null}
      <div>
        <Title className="pk-callout__title">{title}</Title>
        {children ? <p className="pk-callout__text">{children}</p> : null}
        {paragraphs?.map((absatz) => (
          <p className="pk-callout__text" key={absatz}>
            {absatz}
          </p>
        ))}
      </div>
    </aside>
  );
}

export function Quote({ children }: { children: ReactNode }) {
  return <blockquote className="pk-quote">{children}</blockquote>;
}
