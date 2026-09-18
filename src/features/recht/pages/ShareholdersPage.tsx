import { GESELLSCHAFTER } from '@/domain/rechtData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';

// 067I / G52: Echte Gesellschafter-Seite statt WebP — genau eine h1,
// Gesellschafterliste als semantische Tabelle mit Summenzeile.
export function ShareholdersPage() {
  const rows = GESELLSCHAFTER.rows.map((row) => ({
    name: row[0] ?? '',
    anteil: row[1] ?? '',
    stimmen: row[2] ?? '',
  }));
  return (
    <div>
      <h1>Gesellschafterliste</h1>
      <p>
        Gesellschafter der LeadPilot GmbH mit Geschäftsanteilen und Stimmrechten, Summe 100,0 Prozent.
      </p>
      <DataState status={rows.length > 0 ? 'ready' : 'empty'} emptyText="Keine Gesellschafter erfasst.">
        <Table
          columns={[
            { key: 'name', label: GESELLSCHAFTER.headers[0] ?? 'Gesellschafter' },
            { key: 'anteil', label: GESELLSCHAFTER.headers[1] ?? 'Anteil' },
            { key: 'stimmen', label: GESELLSCHAFTER.headers[2] ?? 'Stimmen' },
          ]}
          rows={rows}
        />
      </DataState>
    </div>
  );
}
