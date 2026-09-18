import { PRICING } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';

// 067I / G54: Echte Preisseite statt WebP — genau eine h1,
// Tarife als Abschnitte mit Merkmalslisten, Preise aus Domäne.
export function PricingPage() {
  return (
    <div>
      <h1>Preismodell</h1>
      <p>{PRICING.title}: {String(PRICING.tiers.length)} Tarife mit Leistungsumfang.</p>
      <DataState status={PRICING.tiers.length > 0 ? 'ready' : 'empty'} emptyText="Keine Tarife erfasst.">
        {PRICING.tiers.map((tarif) => (
          <section key={tarif.name} aria-label={`Tarif ${tarif.name}`}>
            <h2>
              {tarif.name}: {tarif.price} {tarif.period}
            </h2>
            <p>{tarif.desc}</p>
            <ul>
              {tarif.features.map((merkmal) => (
                <li key={merkmal}>{merkmal}</li>
              ))}
            </ul>
          </section>
        ))}
      </DataState>
    </div>
  );
}
