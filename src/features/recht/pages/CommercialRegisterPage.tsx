import { HANDELSREGISTER } from '@/domain/rechtData';
import { DataState } from '@/components/ui/DataState';

// 067I / G52: Echte Handelsregister-Seite statt WebP — genau eine h1,
// Registerdaten als Definitionsliste.
export function CommercialRegisterPage() {
  const gericht = HANDELSREGISTER.details[0]?.[1] ?? '';
  const registernummer = HANDELSREGISTER.details[1]?.[1] ?? '';
  return (
    <div>
      <h1>Handelsregister</h1>
      <p>
        {HANDELSREGISTER.title}: {gericht}, {registernummer}.
      </p>
      <DataState
        status={HANDELSREGISTER.details.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Registerdaten erfasst."
      >
        <section aria-label="Registerdaten">
        <dl>
          {HANDELSREGISTER.details.map((detail) => (
            <div key={detail[0]}>
              <dt>{detail[0]}</dt>
              <dd>{detail[1]}</dd>
            </div>
          ))}
        </dl>
        </section>
      </DataState>
    </div>
  );
}
