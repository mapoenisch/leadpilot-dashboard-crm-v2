import { SWOT } from '@/domain/marktData';
import { DataState } from '@/components/ui/DataState';

// 067I / G53: Echte SWOT-Seite statt WebP — genau eine h1,
// vier Quadranten als Abschnitte mit Listen, voll auswählbarer Text.
const quadranten: Array<[string, string[]]> = [
  ['Stärken', SWOT.strengths],
  ['Schwächen', SWOT.weaknesses],
  ['Chancen', SWOT.opportunities],
  ['Risiken', SWOT.threats],
];

export function SwotPage() {
  const ready = quadranten.some(([, items]) => items.length > 0);
  return (
    <div>
      <h1>SWOT-Analyse</h1>
      <p>{SWOT.title}: Stärken, Schwächen, Chancen und Risiken im Überblick.</p>
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Keine SWOT-Inhalte erfasst.">
        {quadranten.map(([titel, items]) => (
          <section key={titel} aria-label={titel}>
            <h2>{titel}</h2>
            <ul>
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </DataState>
    </div>
  );
}
