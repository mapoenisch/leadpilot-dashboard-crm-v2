import type { ReactNode } from 'react';

// 067I / G52: Zugängliche Diagramm-Zusammenfassung — jede Visualisierung
// trägt eine textliche Zusammenfassung (Screenreader + auswählbar), die
// Balkenliste bleibt als echte Liste lesbar (kein Canvas-Only).
export interface AccessibleChartSummaryProps {
  title: string;
  summary: string;
  children?: ReactNode;
}

export function AccessibleChartSummary({ title, summary, children }: AccessibleChartSummaryProps) {
  return (
    <figure data-testid="chart-summary">
      <figcaption>
        <strong>{title}</strong>
        <p>{summary}</p>
      </figcaption>
      {children}
    </figure>
  );
}

export interface BarItem {
  label: string;
  /** Numerischer Wert für die Balkenlänge. */
  value: number;
  /** Anzeigetext (z. B. formatierte Währung). */
  display: string;
}

export function ChartBarList({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 0) || 1;
  return (
    <ul>
      {items.map((item) => (
        <li key={item.label}>
          <span>{item.label}</span>{' '}
          <meter min={0} max={max} value={Math.max(0, item.value)}>
            {item.display}
          </meter>{' '}
          <span>{item.display}</span>
        </li>
      ))}
    </ul>
  );
}
