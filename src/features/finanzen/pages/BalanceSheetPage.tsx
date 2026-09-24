import { BILANZ } from '@/domain/finanzenData';
import { Table } from '@/components/ui/Table';
import { DataState } from '@/components/ui/DataState';

// 067I / G52: Echte Bilanz-Seite statt WebP — genau eine h1, Aktiva und
// Passiva als semantische Tabellen mit übereinstimmender Bilanzsumme.
export function BalanceSheetPage() {
  const aktiva = BILANZ.aktiva.map((row) => ({ position: row[0] ?? '', betrag: row[1] ?? '' }));
  const passiva = BILANZ.passiva.map((row) => ({ position: row[0] ?? '', betrag: row[1] ?? '' }));
  const bilanzSumme = BILANZ.aktiva[BILANZ.aktiva.length - 1]?.[1] ?? '';
  const ready = aktiva.length > 0 && passiva.length > 0;
  return (
    <div>
      <h1>Bilanz &amp; SaaS KPIs</h1>
      <p>
        Bilanz der LeadPilot GmbH zum Geschäftsjahresende: Aktiva und Passiva mit Bilanzsumme{' '}
        {bilanzSumme}.
      </p>
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Keine Bilanzpositionen erfasst.">
        <section aria-label="Aktiva">
          <h2>Aktiva</h2>
          <Table
            columns={[
              { key: 'position', label: 'Position' },
              { key: 'betrag', label: 'Betrag' },
            ]}
            rows={aktiva}
          />
        </section>
        <section aria-label="Passiva">
          <h2>Passiva</h2>
          <Table
            columns={[
              { key: 'position', label: 'Position' },
              { key: 'betrag', label: 'Betrag' },
            ]}
            rows={passiva}
          />
        </section>
      </DataState>
    </div>
  );
}
