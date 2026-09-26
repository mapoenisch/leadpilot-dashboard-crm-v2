import { WETTBEWERB, CHART_WETTBEWERB } from '@/domain/marktData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, Chip, ColumnChart, KitTable, PageHero, Panel } from '@/components/pageKit';

// 067I / G53: Echte Wettbewerbsseite statt WebP — genau eine h1,
// Anbietervergleich als semantische Tabelle, Marktanteile mit Summary.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (02-wettbewerbslandschaft).
function formatAnteil(value: number): string {
  return `${value.toLocaleString('de-DE')} %`;
}

export function CompetitionPage() {
  const eigene = WETTBEWERB.rows.findIndex((row) => row[0] === 'LeadPilot');
  const rows = WETTBEWERB.rows.map((row, index) => ({
    anbieter: row[0] ?? '',
    anteil: row[1] ?? '',
    fokus: row[2] ?? '',
    schwachstelle: <Chip tone={index === eigene ? 'orange' : 'cyan'}>{row[3] ?? ''}</Chip>,
    differenzierung: row[4] ?? '',
  }));
  const daten = CHART_WETTBEWERB.datasets[0]?.data ?? [];
  const anteil = (index: number): string => formatAnteil(daten[index] ?? 0);
  const summary =
    `${CHART_WETTBEWERB.labels[0]} führt mit ${anteil(0)}, ` +
    `gefolgt von ${CHART_WETTBEWERB.labels[1]} mit ${anteil(1)} und ` +
    `${CHART_WETTBEWERB.labels[2]} mit ${anteil(2)}.`;
  // Der eigene Marktanteil ist in den Daten als Obergrenze geführt (< 0,1 %).
  const labels = CHART_WETTBEWERB.labels.map((label, index) =>
    label === 'LeadPilot' ? `< ${anteil(index)}` : anteil(index),
  );
  return (
    <div className="pk-page">
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
          title="Marktanteile Cloud-CRM Europa / DACH (%)"
          badge="Marktanalyse 2025"
          subtitle="Verteilung der Marktanteile im B2B-Mittelstand"
        >
          <ChartFigure
            title={CHART_WETTBEWERB.datasets[0]?.label ?? 'Marktanteil'}
            summary={summary}
          >
            <ColumnChart
              labels={CHART_WETTBEWERB.labels}
              series={[{ name: 'Marktanteil', values: daten }]}
              valueLabels={labels}
              highlightLast
            />
          </ChartFigure>
        </Panel>
        <Panel title="Anbietervergleich" flush>
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
        </Panel>
      </DataState>
    </div>
  );
}
