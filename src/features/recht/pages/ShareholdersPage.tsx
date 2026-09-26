import { GESELLSCHAFTER } from '@/domain/rechtData';
import { DataState } from '@/components/ui/DataState';
import { Chip, KitTable, Meter, PageHero, Panel } from '@/components/pageKit';

// 067I / G52: Echte Gesellschafter-Seite statt WebP — genau eine h1,
// Gesellschafterliste als semantische Tabelle mit Summenzeile.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (08-gesellschafterliste).
const prozent = (text: string | undefined): number =>
  Number((text ?? '0').replace('%', '').replace(',', '.').trim()) || 0;

export function ShareholdersPage() {
  const rows = GESELLSCHAFTER.rows.map((row) => ({
    name: row[0] ?? '',
    anteil: row[1] ?? '',
    stimmen: (
      <span className="pk-meter-cell">
        <Chip strong>{row[2] ?? ''}</Chip>
        <Meter value={prozent(row[2])} />
      </span>
    ),
  }));
  const summenzeile = GESELLSCHAFTER.rows[GESELLSCHAFTER.rows.length - 1];
  const summeStimmen = summenzeile?.[2] ?? '';
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Recht & Gründung"
        title="Gesellschafterliste"
        subtitle={`Gesellschafter der LeadPilot GmbH mit Geschäftsanteilen und Stimmrechten, Summe ${summeStimmen}.`}
        pills={['Gesellschafterliste', `Stammkapital ${summenzeile?.[1] ?? ''}`]}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Gesellschafter erfasst."
      >
        <Panel title="Gesellschaftertabelle" flush>
          <KitTable
            caption="Gesellschafter mit Nennbetrag und Stimmrechtsanteil"
            leadColumn
            highlightRows={[rows.length - 1]}
            columns={[
              { key: 'name', label: GESELLSCHAFTER.headers[0] ?? 'Gesellschafter' },
              { key: 'anteil', label: GESELLSCHAFTER.headers[1] ?? 'Anteil' },
              { key: 'stimmen', label: GESELLSCHAFTER.headers[2] ?? 'Stimmen' },
            ]}
            rows={rows}
          />
        </Panel>
      </DataState>
    </div>
  );
}
