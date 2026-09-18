import { TOP10 } from '@/domain/kundenData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';

// 067I / G53: Echte Top-Kunden-Seite statt WebP — genau eine h1,
// Referenzkunden als semantische Tabelle, voll auswählbarer Text.
export function TopCustomersPage() {
  const rows = TOP10.rows.map((row) => ({
    kunde: row[0] ?? '',
    branche: row[1] ?? '',
    mitarbeiter: row[2] ?? '',
    paket: row[3] ?? '',
    nutzer: row[4] ?? '',
    arr: row[5] ?? '',
  }));
  return (
    <div>
      <h1>Top-Referenzkunden</h1>
      <p>
        {TOP10.title}: {String(TOP10.rows.length)} Referenzkunden mit Paket und ARR.
      </p>
      <DataState status={rows.length > 0 ? 'ready' : 'empty'} emptyText="Keine Referenzkunden erfasst.">
        <Table
          columns={[
            { key: 'kunde', label: TOP10.headers[0] ?? 'Kunde' },
            { key: 'branche', label: TOP10.headers[1] ?? 'Branche' },
            { key: 'mitarbeiter', label: TOP10.headers[2] ?? 'Mitarbeiter' },
            { key: 'paket', label: TOP10.headers[3] ?? 'Paket' },
            { key: 'nutzer', label: TOP10.headers[4] ?? 'Nutzer' },
            { key: 'arr', label: TOP10.headers[5] ?? 'ARR' },
          ]}
          rows={rows}
        />
      </DataState>
    </div>
  );
}
