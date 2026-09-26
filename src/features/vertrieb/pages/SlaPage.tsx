import { BarChart3, Target } from 'lucide-react';
import { SLA } from '@/domain/vertriebData';
import { DataState } from '@/components/ui/DataState';
import { Grid, KitTable, PageHero, Panel, ToneList } from '@/components/pageKit';

// 067I / G53: Echte SLA-Seite statt WebP — genau eine h1,
// Übergabepunkt als Tabelle, Pflichten beider Seiten als Listen.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (02-sla-marketing-sales).
export function SlaPage() {
  const uebergabe = SLA.handoff.rows.map((row) => ({
    merkmal: row[0] ?? '',
    angabe: row[1] ?? '',
  }));
  return (
    <div className="pk-page">
      <PageHero
        eyebrow="Vertrieb & Marketing"
        title="SLA Marketing & Sales"
        subtitle={SLA.handoff.title}
        pills={['Service Level Agreement', 'Lead-Handoff Matrix']}
      />
      <DataState
        status={uebergabe.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine SLA-Regeln erfasst."
      >
        <Panel title={SLA.handoff.title} flush>
          <KitTable
            caption={SLA.handoff.title}
            leadColumn
            columns={[
              { key: 'merkmal', label: SLA.handoff.headers[0] ?? 'Merkmal' },
              { key: 'angabe', label: SLA.handoff.headers[1] ?? 'Angabe' },
            ]}
            rows={uebergabe}
          />
        </Panel>
        <Grid cols="2">
          <Panel title="Marketing Pflichten" icon={Target} toneTitle>
            <ToneList items={SLA.marketing} />
          </Panel>
          <Panel title="Sales Pflichten" tone="orange" icon={BarChart3} toneTitle>
            <ToneList items={SLA.sales} tone="orange" />
          </Panel>
        </Grid>
      </DataState>
    </div>
  );
}
