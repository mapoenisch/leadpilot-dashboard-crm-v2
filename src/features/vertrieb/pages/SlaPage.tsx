import { SLA } from '@/domain/vertriebData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';

// 067I / G53: Echte SLA-Seite statt WebP — genau eine h1,
// Übergabepunkt als Tabelle, Pflichten beider Seiten als Listen.
export function SlaPage() {
  const uebergabe = SLA.handoff.rows.map((row) => ({
    merkmal: row[0] ?? '',
    angabe: row[1] ?? '',
  }));
  return (
    <div>
      <h1>SLA Marketing &amp; Sales</h1>
      <p>{SLA.handoff.title}: Zuständigkeiten an der Übergabe von MQL zu SQL.</p>
      <DataState
        status={uebergabe.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine SLA-Regeln erfasst."
      >
        <section aria-label={SLA.handoff.title}>
          <h2>{SLA.handoff.title}</h2>
          <Table
            columns={[
              { key: 'merkmal', label: SLA.handoff.headers[0] ?? 'Merkmal' },
              { key: 'angabe', label: SLA.handoff.headers[1] ?? 'Angabe' },
            ]}
            rows={uebergabe}
          />
        </section>
        <section aria-label="Pflichten Marketing">
          <h2>Pflichten Marketing</h2>
          <ul>
            {SLA.marketing.map((pflicht) => (
              <li key={pflicht}>{pflicht}</li>
            ))}
          </ul>
        </section>
        <section aria-label="Pflichten Sales">
          <h2>Pflichten Sales</h2>
          <ul>
            {SLA.sales.map((pflicht) => (
              <li key={pflicht}>{pflicht}</li>
            ))}
          </ul>
        </section>
      </DataState>
    </div>
  );
}
