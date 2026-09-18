import { FUNKTION } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';

// 067I / G54: Echte Funktions-Seite statt WebP — genau eine h1,
// Produktmodule als Abschnitte, voll auswählbarer Text.
export function FeaturesPage() {
  return (
    <div>
      <h1>Produkt &amp; Funktionsweise</h1>
      <p>{FUNKTION.title}: die vier Module der LeadPilot-Plattform.</p>
      <DataState
        status={FUNKTION.modules.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Produktmodule erfasst."
      >
        {FUNKTION.modules.map((modul) => (
          <section key={modul.name} aria-label={modul.name}>
            <h2>{modul.name}</h2>
            <p>{modul.desc}</p>
          </section>
        ))}
      </DataState>
    </div>
  );
}
