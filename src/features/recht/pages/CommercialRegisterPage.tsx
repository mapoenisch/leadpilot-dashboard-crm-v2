import { HANDELSREGISTER } from '@/domain/rechtData';
import { DataState } from '@/components/ui/DataState';
import { KeyValueList, PageHero, Panel } from '@/components/pageKit';

// 067I / G52: Echte Handelsregister-Seite statt WebP — genau eine h1,
// Registerdaten als Definitionsliste.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (09-handelsregister).
export function CommercialRegisterPage() {
  const gericht = HANDELSREGISTER.details[0]?.[1] ?? '';
  const registernummer = HANDELSREGISTER.details[1]?.[1] ?? '';
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Recht & Gründung"
        title={HANDELSREGISTER.title}
        subtitle={`${gericht}, ${registernummer}.`}
        pills={['Handelsregister B', 'Registerauszug']}
      />
      <DataState
        status={HANDELSREGISTER.details.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Registerdaten erfasst."
      >
        <Panel title="Registerdaten">
          <KeyValueList
            lead
            rows={HANDELSREGISTER.details.map((detail) => [detail[0] ?? '', detail[1] ?? ''])}
          />
        </Panel>
      </DataState>
    </div>
  );
}
