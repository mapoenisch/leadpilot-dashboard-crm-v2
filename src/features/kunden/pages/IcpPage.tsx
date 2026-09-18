import { ICP } from '@/domain/kundenData';
import { DataState } from '@/components/ui/DataState';

// 067I / G53: Echte ICP-Seite statt WebP — genau eine h1,
// Firmografie als Definitionsliste, Trigger und Ausschlüsse als Listen.
export function IcpPage() {
  const ready = ICP.firmografie.length > 0;
  return (
    <div>
      <h1>Ideal Customer Profile</h1>
      <p>{ICP.title}: Firmografie, Kaufsignale und Ausschlusskriterien.</p>
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Kein Ideal Customer Profile erfasst.">
        <section aria-label="Firmografie">
          <h2>Firmografie</h2>
          <dl>
            {ICP.firmografie.map((item) => (
              <div key={item.key}>
                <dt>{item.key}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-label="Kaufsignale">
          <h2>Kaufsignale</h2>
          <ul>
            {ICP.triggers.map((trigger) => (
              <li key={trigger}>{trigger}</li>
            ))}
          </ul>
        </section>
        <section aria-label="Ausschlusskriterien">
          <h2>Ausschlusskriterien</h2>
          <ul>
            {ICP.exclusion.map((kriterium) => (
              <li key={kriterium}>{kriterium}</li>
            ))}
          </ul>
        </section>
      </DataState>
    </div>
  );
}
