import { BarChart3, Target } from 'lucide-react';
import { SLA } from '@/domain/vertriebData';
import { DataState } from '@/components/ui/DataState';
import { Grid, KitTable, PageHero, type Tone } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import '../vertriebSeiten.css';

// 067I / G53: Echte SLA-Seite statt WebP — genau eine h1,
// Übergabepunkt als Tabelle, Pflichten beider Seiten als Listen.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (02-sla-marketing-sales).
// Auftrag 096 (Paket G2, Welle 3): sichtbar ausgeliefert (HTML_PAGES). Wie im Original-WebP:
// Übergabetabelle ohne eigene Kopfzeile, Pflichten-Karten mit runder 3D-Kugel links.
function PflichtKarte({
  title,
  tone,
  icon: Icon,
  items,
}: {
  title: string;
  tone: Tone;
  icon: typeof Target;
  items: string[];
}) {
  return (
    <section className="pk-panel vs-pflicht" data-tone={tone} aria-label={title}>
      <span className="vs-kugel" aria-hidden="true">
        <Icon size={44} strokeWidth={2.2} />
      </span>
      <div className="vs-pflicht__text">
        <h2 className="vs-pflicht__titel">{title}</h2>
        <ul className="vs-punkte">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SlaPageHtml() {
  const uebergabe = SLA.handoff.rows.map((row) => ({
    merkmal: row[0] ?? '',
    angabe: row[1] ?? '',
  }));
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="sales-sla">
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
        <section
          className="pk-panel"
          data-tone="cyan"
          data-flush="true"
          aria-label={SLA.handoff.title}
        >
          <KitTable
            caption={SLA.handoff.title}
            leadColumn
            columns={[
              { key: 'merkmal', label: SLA.handoff.headers[0] ?? 'Merkmal' },
              { key: 'angabe', label: SLA.handoff.headers[1] ?? 'Angabe' },
            ]}
            rows={uebergabe}
          />
        </section>
        <Grid cols="2">
          <PflichtKarte
            title="Marketing Pflichten"
            tone="cyan"
            icon={Target}
            items={SLA.marketing}
          />
          <PflichtKarte title="Sales Pflichten" tone="orange" icon={BarChart3} items={SLA.sales} />
        </Grid>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function SlaPage() {
  return (
    <ImagePage page="sales-sla">
      <SlaPageHtml />
    </ImagePage>
  );
}
