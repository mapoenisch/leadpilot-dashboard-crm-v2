import { MARKT } from '@/domain/marktData';
import { DataState } from '@/components/ui/DataState';

// 067I / G53: Echte Marktübersicht statt WebP — genau eine h1,
// Marktlage-Kennzahlen als Definitionsliste, voll auswählbarer Text.
export function MarketOverviewPage() {
  return (
    <div>
      <h1>Marktlage DACH</h1>
      <p>{MARKT.title}: Marktvolumen, Marktanteile und digitale Reichweite der LeadPilot GmbH.</p>
      <DataState status={MARKT.overview.length > 0 ? 'ready' : 'empty'} emptyText="Keine Marktdaten erfasst.">
        <section aria-label="Marktkennzahlen">
        <dl>
          {MARKT.overview.map((row) => (
            <div key={row[0]}>
              <dt>{row[0]}</dt>
              <dd>{row[1]}</dd>
            </div>
          ))}
        </dl>
        </section>
      </DataState>
    </div>
  );
}
