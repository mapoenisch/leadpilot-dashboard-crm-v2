import { VALUE } from '@/domain/unternehmenData';
import { DataState } from '@/components/ui/DataState';

// 067I / G54: Echte Value-Proposition-Seite statt WebP — genau eine h1,
// Kernbotschaft plus Nutzenversprechen als Abschnitte.
export function ValuePropositionPage() {
  return (
    <div>
      <h1>Value Proposition</h1>
      <p>{VALUE.title}: Positionierung der LeadPilot GmbH am B2B-Markt.</p>
      <DataState
        status={VALUE.coreBenefits.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Value Proposition erfasst."
      >
        <p>{VALUE.heroStatement}</p>
        {VALUE.coreBenefits.map((nutzen) => (
          <section key={nutzen.title} aria-label={nutzen.title}>
            <h2>{nutzen.title}</h2>
            <p>{nutzen.desc}</p>
          </section>
        ))}
      </DataState>
    </div>
  );
}
