import { TOP10 } from '@/domain/kundenData';
import { DataState } from '@/components/ui/DataState';
import { Chip, KitTable, PageHero, Panel } from '@/components/pageKit';

// 067I / G53: Echte Top-Kunden-Seite statt WebP — genau eine h1,
// Referenzkunden als semantische Tabelle, voll auswählbarer Text.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (07-top-10-kunden).
export function TopCustomersPage() {
  const rows = TOP10.rows.map((row) => ({
    kunde: <strong>{row[0] ?? ''}</strong>,
    branche: row[1] ?? '',
    mitarbeiter: <span className="pk-strong-tone">{row[2] ?? ''}</span>,
    paket: <Chip strong>{row[3] ?? ''}</Chip>,
    nutzer: <Chip tone="neutral">{row[4] ?? ''}</Chip>,
    arr: <strong>{row[5] ?? ''}</strong>,
  }));
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Kunden"
        title={TOP10.title}
        subtitle="Die wichtigsten B2B-Referenzkunden der LeadPilot GmbH."
        pills={['Key Accounts', `${String(TOP10.rows.length)} Referenzkunden`]}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Referenzkunden erfasst."
      >
        <Panel title="Referenzkunden" subtitle="Paket, Nutzer und ARR je Key Account" flush>
          <KitTable
            caption="Referenzkundentabelle"
            columns={[
              { key: 'kunde', label: TOP10.headers[0] ?? 'Kunde' },
              { key: 'branche', label: TOP10.headers[1] ?? 'Branche' },
              { key: 'mitarbeiter', label: TOP10.headers[2] ?? 'Mitarbeiter' },
              { key: 'paket', label: TOP10.headers[3] ?? 'Paket' },
              { key: 'nutzer', label: TOP10.headers[4] ?? 'Nutzer' },
              { key: 'arr', label: TOP10.headers[5] ?? 'ARR', align: 'right' },
            ]}
            rows={rows}
          />
        </Panel>
      </DataState>
    </div>
  );
}
