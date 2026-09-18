import { BSC } from '@/domain/strategieData';
import { DataState } from '@/components/ui/DataState';

// 067I / G52: Echte Balanced-Scorecard-Seite statt WebP — genau eine h1,
// vier Perspektiven mit Kennzahlen als Definitionsliste.
export function BalancedScorecardPage() {
  return (
    <div>
      <h1>Balanced Scorecard</h1>
      <p>{BSC.title}: Vier Perspektiven mit den Steuerungskennzahlen des Geschäftsjahres.</p>
      <DataState
        status={BSC.perspectives.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Scorecard-Perspektiven erfasst."
      >
        <section aria-label="Perspektiven">
        <dl>
          {BSC.perspectives.map((perspective) => (
            <div key={perspective.name}>
              <dt>{perspective.name}</dt>
              <dd>{perspective.kpis}</dd>
            </div>
          ))}
        </dl>
        </section>
      </DataState>
    </div>
  );
}
