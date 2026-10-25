import { HEADCOUNT } from '@/domain/organisationData';
import { DataState } from '@/components/ui/DataState';
import { ChartFigure, Chip, PageHero, Panel, RowList } from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { DepthFlaechen } from '@/features/finanzen/components/DepthFlaechen';
import '../organisationSeiten.css';

// 067I / G55: Echte Headcount-Seite statt WebP — genau eine h1,
// Kapazitätsliste plus FTE-Verlauf mit Summary, alles aus Domäne.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (01-headcount-entwicklung).
// Auftrag 100 (Paket G2, Welle 7): sichtbar ausgeliefert (HTML_PAGES), „ruhig“, FTE-Verlauf mit
// 3D-Tiefe, Markierung „Kapazitätsfokus“ und Gesamtbestand mit Ziel wie im Original-WebP.

/**
 * Bereiche mit Markierung „Kapazitätsfokus“ – wie im Original-WebP (Engineering, Sales,
 * Customer Success; Faktenblatt v1.2 §10, Spalte Engpass). Auch von der Teamstruktur genutzt.
 */
const KAPAZITAETSFOKUS = ['Engineering', 'Sales', 'Customer Success'];

export function hatEngpass(bereich: string): boolean {
  return KAPAZITAETSFOKUS.some((name) => bereich.startsWith(name));
}

function formatFte(value: number): string {
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 1 })} FTE`;
}

/** „Ziel 2026: 12,0 FTE“ → geplanter Zuwachs gegenüber dem Gesamtbestand („+2,0 FTE“). */
function geplanterZuwachs(bestand: string, ziel: string): string | undefined {
  const zahl = (text: string) => Number(/(\d+(?:,\d+)?) FTE/.exec(text)?.[1]?.replace(',', '.'));
  const differenz = zahl(ziel) - zahl(bestand);
  return Number.isFinite(differenz) ? `+${formatFte(differenz)}` : undefined;
}

function HeadcountPageHtml() {
  const bereiche = HEADCOUNT.rows.slice(0, -1);
  const gesamt = HEADCOUNT.rows[HEADCOUNT.rows.length - 1];
  const labels = HEADCOUNT.chart.labels;
  const reihe = HEADCOUNT.chart.datasets[0];
  const start = formatFte(reihe?.data[0] ?? 0);
  const stand = formatFte(reihe?.data[labels.length - 1] ?? 0);
  const ziel = gesamt?.[2] ?? '';
  const summary =
    `${reihe?.label} wächst von ${start} (${labels[0]}) ` +
    `auf ${stand} (${labels[labels.length - 1]}), ${ziel}.`;
  const zuwachs = gesamt ? geplanterZuwachs(gesamt[1] ?? '', ziel) : undefined;
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="organisation-headcount">
      <PageHero
        eyebrow="Organisation"
        title="Entwicklung der Teamgröße"
        subtitle="Entwicklung der Mitarbeiterkapazität und Teamstärke (Stand: 31.12.2025)."
        pills={['Personalbestand 2025', 'Unternehmensdaten 2025']}
      />
      <DataState
        status={HEADCOUNT.rows.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Headcount-Daten erfasst."
      >
        <Panel
          title="Headcount-Verlauf (Gesamt-FTE)"
          badge="Personalbestand 2025"
          subtitle={`Entwicklung des gesamten Personalbestands von ${labels[0] ?? ''} bis ${
            labels[labels.length - 1] ?? ''
          }`.replace(/(Q\d) (\d\d)/g, '$1 20$2')}
        >
          <ChartFigure title={reihe?.label ?? 'FTE-Verlauf'} summary={summary}>
            <DepthFlaechen
              idPrefix="hc-fte"
              regionLabel="Headcount-Verlauf, waagerecht scrollbar"
              labels={labels}
              series={[
                {
                  name: reihe?.label ?? 'FTE',
                  values: reihe?.data ?? [],
                  color: reihe?.color ?? '#00D9C6',
                  area: true,
                },
              ]}
              datenTabelle={(wert) => formatFte(wert)}
            />
          </ChartFigure>
        </Panel>
        <section className="pk-stack" aria-label="Kapazität je Bereich">
          <div className="org-section-head">
            <h2 className="pk-section-title">Kapazitätsübersicht &amp; Rollenverteilung</h2>
            <span className="pk-muted">Stand 31.12.2025</span>
          </div>
          <RowList
            label="Bereiche mit Kapazität und Besetzung"
            items={bereiche.map((row) => ({
              key: row[0] ?? '',
              title: row[0] ?? '',
              chip: <Chip>{row[1] ?? ''}</Chip>,
              text: row[2] ?? '',
              aside: hatEngpass(row[0] ?? '') ? (
                <Chip tone="orange">Kapazitätsfokus</Chip>
              ) : undefined,
            }))}
          />
          {gesamt ? (
            <div className="org-total" data-testid="headcount-gesamt">
              <div className="org-total__head">
                <h3 className="pk-row__title">{gesamt[0] ?? ''}</h3>
                <Chip>{gesamt[1] ?? ''}</Chip>
              </div>
              <p className="org-total__ziel">{ziel}</p>
              {zuwachs ? <Chip tone="neutral">{`Geplant: ${zuwachs}`}</Chip> : null}
            </div>
          ) : null}
        </section>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function HeadcountPage() {
  return (
    <ImagePage page="organisation-headcount">
      <HeadcountPageHtml />
    </ImagePage>
  );
}
