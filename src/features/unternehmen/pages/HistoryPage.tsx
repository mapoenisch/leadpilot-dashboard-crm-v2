import { HISTORIE } from '@/domain/unternehmenData';
import { DataState } from '@/components/ui/DataState';

// 067I / G54: Echte Historien-Seite statt WebP — genau eine h1,
// Meilensteine als zeitlich geordnete Abschnitte.
export function HistoryPage() {
  return (
    <div>
      <h1>Gründung &amp; Entwicklung</h1>
      <p>{HISTORIE.title}: von der Gründung bis zum zweiten Marktjahr.</p>
      <DataState
        status={HISTORIE.events.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Historie erfasst."
      >
        <ol>
          {HISTORIE.events.map((ereignis) => (
            <li key={`${ereignis.date}-${ereignis.title}`}>
              <section aria-label={`${ereignis.date}: ${ereignis.title}`}>
                <h2>
                  {ereignis.date}: {ereignis.title}
                </h2>
                <p>{ereignis.desc}</p>
              </section>
            </li>
          ))}
        </ol>
      </DataState>
    </div>
  );
}
