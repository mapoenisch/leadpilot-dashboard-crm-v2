import { WETTBEWERB, CHART_WETTBEWERB } from '@/domain/marktData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, Chip, KitTable, PageHero, Panel } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { GroupedDepthColumns } from '@/features/vertrieb/components/GroupedDepthColumns';
import '../marktSeiten.css';

// 067I / G53: Echte Wettbewerbsseite statt WebP — genau eine h1,
// Anbietervergleich als semantische Tabelle, Marktanteile mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (02-wettbewerbslandschaft).
// Auftrag 098 (Paket G2, Welle 5): sichtbar ausgeliefert (HTML_PAGES). Marktanteile als
// 3D-Säulen wie im Original-WebP, LeadPilot orange. Anteile gelten für Europa (Faktenblatt
// v1.2 §11, Entscheidung D6), daher „Europa“ statt „Europa/DACH“ in Titel und Diagramm.
const ORANGE = 'var(--orange)';
const CYAN = 'var(--color-primary)';

function formatAnteil(value: number): string {
  return `${value.toLocaleString('de-DE')} %`;
}

function CompetitionPageHtml() {
  const eigene = WETTBEWERB.rows.findIndex((row) => row[0] === 'LeadPilot');
  const rows = WETTBEWERB.rows.map((row, index) => ({
    anbieter: row[0] ?? '',
    anteil: row[1] ?? '',
    fokus: row[2] ?? '',
    schwachstelle: (
      <Chip tone={index === eigene ? 'orange' : index === 0 ? 'cyan' : 'neutral'}>
        {row[3] ?? ''}
      </Chip>
    ),
    differenzierung: row[4] ?? '',
  }));
  const daten = CHART_WETTBEWERB.datasets[0]?.data ?? [];
  const anteil = (index: number): string => formatAnteil(daten[index] ?? 0);
  const summary =
    `${CHART_WETTBEWERB.labels[0]} führt mit ${anteil(0)}, ` +
    `gefolgt von ${CHART_WETTBEWERB.labels[1]} mit ${anteil(1)} und ` +
    `${CHART_WETTBEWERB.labels[2]} mit ${anteil(2)}.`;
  // Der eigene Marktanteil ist in den Daten als Obergrenze geführt (< 0,1 %).
  const eigeneSaeule = CHART_WETTBEWERB.labels.indexOf('LeadPilot');
  const labels = CHART_WETTBEWERB.labels.map((label, index) =>
    label === 'LeadPilot' ? `< ${anteil(index)}` : anteil(index),
  );
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="market-competition">
      <PageHero
        eyebrow="Markt & Wettbewerb"
        title={WETTBEWERB.title}
        subtitle="Vergleich führender B2B CRM & Lead-Systeme."
        pills={['Wettbewerb DACH', `${WETTBEWERB.rows.length} Plattformen`]}
      />
      <DataState
        status={rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Wettbewerbsdaten erfasst."
      >
        <Panel
          title="Marktanteile Cloud-CRM Europa (%)"
          badge="Marktanalyse 2025"
          subtitle="Verteilung der Marktanteile im europäischen Cloud-CRM-Markt"
        >
          <ChartFigure
            title={CHART_WETTBEWERB.datasets[0]?.label ?? 'Marktanteil'}
            summary={summary}
          >
            <GroupedDepthColumns
              idPrefix="wettbewerb-anteil"
              height={300}
              maxBarWidth={90}
              regionLabel="Marktanteile je Anbieter, waagerecht scrollbar"
              labels={CHART_WETTBEWERB.labels}
              series={[{ name: 'Marktanteil', values: daten, color: CYAN }]}
              colorAt={(_, li) => (li === eigeneSaeule ? ORANGE : undefined)}
              formatTick={(wert) => `${wert.toLocaleString('de-DE')} %`}
              valueLabel={(_, __, li) => labels[li] ?? ''}
            />
          </ChartFigure>
        </Panel>
        <section
          className="pk-panel"
          data-tone="cyan"
          data-flush="true"
          aria-label="Anbietervergleich"
        >
          <KitTable
            caption="Anbietervergleich mit Marktanteil, Fokus, Schwachstelle und Differenzierung"
            leadColumn
            accentRows={eigene >= 0 ? [eigene] : []}
            columns={[
              { key: 'anbieter', label: WETTBEWERB.headers[0] ?? 'Anbieter' },
              { key: 'anteil', label: WETTBEWERB.headers[1] ?? 'Marktanteil' },
              { key: 'fokus', label: WETTBEWERB.headers[2] ?? 'Fokus' },
              { key: 'schwachstelle', label: WETTBEWERB.headers[3] ?? 'Schwachstelle' },
              { key: 'differenzierung', label: WETTBEWERB.headers[4] ?? 'Differenzierung' },
            ]}
            rows={rows}
          />
        </section>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function CompetitionPage() {
  return (
    <ImagePage page="market-competition">
      <CompetitionPageHtml />
    </ImagePage>
  );
}
