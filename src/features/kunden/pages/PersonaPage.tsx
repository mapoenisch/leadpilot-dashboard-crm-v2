import { PERSONA } from '@/domain/kundenData';
import { DataState } from '@/components/ui/DataState';

// 067I / G53: Echte Persona-Seite statt WebP — genau eine h1,
// Stammdaten als Definitionsliste, Ziele und Hürden als Listen.
export function PersonaPage() {
  return (
    <div>
      <h1>Buyer Persona {PERSONA.name}</h1>
      <p>
        {PERSONA.role}, {String(PERSONA.age)} Jahre: {PERSONA.companyType}.
      </p>
      <DataState status="ready" emptyText="Keine Persona erfasst.">
        <section aria-label="Stammdaten">
          <h2>Stammdaten</h2>
          <dl>
            <div>
              <dt>Rolle</dt>
              <dd>{PERSONA.role}</dd>
            </div>
            <div>
              <dt>Paket-Fit</dt>
              <dd>{PERSONA.packageFit}</dd>
            </div>
          </dl>
          <p>{PERSONA.quote}</p>
        </section>
        <section aria-label="Ziele">
          <h2>Ziele</h2>
          <ul>
            {PERSONA.goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </section>
        <section aria-label="Hürden">
          <h2>Hürden</h2>
          <ul>
            {PERSONA.painPoints.map((pain) => (
              <li key={pain}>{pain}</li>
            ))}
          </ul>
        </section>
        <section aria-label="Kanäle">
          <h2>Kanäle</h2>
          <ul>
            {PERSONA.channels.map((channel) => (
              <li key={channel}>{channel}</li>
            ))}
          </ul>
        </section>
      </DataState>
    </div>
  );
}
