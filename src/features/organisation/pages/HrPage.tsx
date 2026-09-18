import { HR } from '@/domain/organisationData';
import { DataState } from '@/components/ui/DataState';

// 067I / G55: Echte HR-Seite statt WebP — genau eine h1,
// Personalkennzahlen als Definitionsliste, voll auswählbarer Text.
export function HrPage() {
  return (
    <div>
      <h1>HR-Kennzahlen</h1>
      <p>Personalökonomie der LeadPilot GmbH: Bestand, Fluktuation und Kosten je FTE.</p>
      <DataState status={HR.metrics.length > 0 ? 'ready' : 'empty'} emptyText="Keine HR-Kennzahlen erfasst.">
        <section aria-label="Personalkennzahlen">
        <dl>
          {HR.metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.val}</dd>
            </div>
          ))}
        </dl>
        </section>
      </DataState>
    </div>
  );
}
