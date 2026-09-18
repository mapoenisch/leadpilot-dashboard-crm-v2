import { SATZUNG } from '@/domain/rechtData';
import { DataState } from '@/components/ui/DataState';

// 067I / G52: Echte Satzungs-Seite statt WebP — genau eine h1, Paragraphen als
// Abschnitte mit Überschriften, voll auswählbarer Text.
export function ArticlesPage() {
  return (
    <div>
      <h1>Satzung LeadPilot GmbH</h1>
      <p>{SATZUNG.title}: Die folgenden Paragraphen geben den Gesellschaftsvertrag auszugsweise wieder.</p>
      <DataState status={SATZUNG.sections.length > 0 ? 'ready' : 'empty'} emptyText="Keine Satzungsinhalte erfasst.">
        {SATZUNG.sections.map((section) => (
          <section key={section[0]} aria-label={section[0]}>
            <h2>{section[0]}</h2>
            <p>{section[1]}</p>
          </section>
        ))}
      </DataState>
    </div>
  );
}
