import { BILANZ } from '@/domain/finanzenData';
import { DataState } from '@/components/ui/DataState';
import { Grid, KitTable, PageHero, Panel } from '@/components/pageKit';

// 067I / G52: Echte Bilanz-Seite statt WebP — genau eine h1, Aktiva und
// Passiva als semantische Tabellen mit übereinstimmender Bilanzsumme.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (06-bilanz-saas).
const spalten = [
  { key: 'position', label: 'Position' },
  { key: 'betrag', label: 'Betrag', align: 'right' as const },
];

export function BalanceSheetPage() {
  const aktiva = BILANZ.aktiva.map((row) => ({ position: row[0] ?? '', betrag: row[1] ?? '' }));
  const passiva = BILANZ.passiva.map((row) => ({ position: row[0] ?? '', betrag: row[1] ?? '' }));
  const bilanzSumme = BILANZ.aktiva[BILANZ.aktiva.length - 1]?.[1] ?? '';
  const ready = aktiva.length > 0 && passiva.length > 0;
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Finanzen"
        title="Bilanz & SaaS KPIs"
        subtitle={`Bilanz der LeadPilot GmbH zum Geschäftsjahresende: Aktiva und Passiva mit Bilanzsumme ${bilanzSumme}.`}
        pills={['Bilanz 31.12.2025', 'HGB-Jahresabschluss']}
      />
      <DataState status={ready ? 'ready' : 'empty'} emptyText="Keine Bilanzpositionen erfasst.">
        <Grid cols="2">
          <Panel title="Aktiva" tone="cyan" toneTitle chip="Mittelverwendung" flush>
            <KitTable
              caption="Aktiva mit Bilanzsumme"
              highlightRows={[aktiva.length - 1]}
              columns={spalten}
              rows={aktiva}
            />
          </Panel>
          <Panel title="Passiva" tone="orange" toneTitle chip="Mittelherkunft" flush>
            <KitTable
              caption="Passiva mit Bilanzsumme"
              accentRows={[passiva.length - 1]}
              columns={spalten}
              rows={passiva}
            />
          </Panel>
        </Grid>
      </DataState>
    </div>
  );
}
