import { IDEE } from '@/domain/unternehmenData';
import { DataState } from '@/components/ui/DataState';

// 067I / G54: Echte Ideen-Seite statt WebP — genau eine h1,
// These als Absätze, Alleinstellungsmerkmale als Liste.
export function IdeaPage() {
  return (
    <div>
      <h1>Geschäftsidee</h1>
      <p>
        {IDEE.title}: {IDEE.subtitle}
      </p>
      <DataState status={IDEE.paragraphs.length > 0 ? 'ready' : 'empty'} emptyText="Keine Geschäftsidee erfasst.">
        {IDEE.paragraphs.map((absatz) => (
          <p key={absatz}>{absatz}</p>
        ))}
        <section aria-label="Alleinstellungsmerkmale">
          <h2>Alleinstellungsmerkmale</h2>
          <ul>
            {IDEE.usps.map((usp) => (
              <li key={usp}>{usp}</li>
            ))}
          </ul>
        </section>
      </DataState>
    </div>
  );
}
