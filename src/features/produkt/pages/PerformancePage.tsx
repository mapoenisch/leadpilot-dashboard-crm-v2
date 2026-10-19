import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Database,
  Headphones,
  Info,
  Server,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { PERF, CHART_PRODUKT, CHART_CHURN } from '@/domain/produktData';
import { DataState } from '@/components/ui/DataState';
import {
  BarList,
  Callout,
  ChartFigure,
  Donut,
  Grid,
  PageHero,
  Panel,
  StatTile,
  splitValueHint,
  type Tone,
} from '@/components/pageKit';
import { ImagePage } from '@/components/imagePage';
import { DepthFlaechen } from '@/features/finanzen/components/DepthFlaechen';
import '../produktSeiten.css';

// 067I / G54: Echte Performance-Seite statt WebP — genau eine h1,
// Qualitätsmetriken als Liste, beide Chart-Reihen strukturiert.
// Auftrag 068 / G66: Gestaltung nach v2.2.0-Vorlage (09-produkt-performance-2025).
// Auftrag 103 (Paket G2, Welle 10): sichtbar ausgeliefert (HTML_PAGES), „ruhig“. Vorlage ist das
// Original-WebP: sechs Kennzahlkacheln mit Zielstatus (Haken / Ausrufezeichen), Quartalsverlauf
// als 3D-Fläche (`DepthFlaechen` aus Welle 4), Kündigungsgründe als Ring mit Balkenliste und Hinweis.
// Werte nach Faktenblatt v1.2 §4/§9. Keine Mini-Verläufe in den Kacheln: Dazu gibt es keine Daten
// (Befundregister 2026-10-06, G2 „Keine Daten, keine Übernahme“).
const ICONS: LucideIcon[] = [Server, Users, Database, Brain, Zap, Headphones];
const churnTone: Tone[] = ['orange', 'orange', 'cyan', 'neutral'];
const FARBEN: Record<string, string> = {
  '#00D9C6': 'var(--color-primary)',
  '#FF7A3D': 'var(--orange)',
};

function formatProzent(value: number): string {
  return `${value.toLocaleString('de-DE')} %`;
}

/** „Ziel: 70 % · verfehlt“ → Ziel und Status getrennt, Status farbig wie im Original. */
function ZielHinweis({ text }: { text: string }) {
  const match = /^(.*?)\s*·\s*(erreicht|verfehlt)$/.exec(text);
  if (!match) return <>{text}</>;
  const [, ziel, status] = match;
  return (
    <>
      {ziel} ·{' '}
      <strong className="pd-perf__status" data-status={status}>
        {status}
      </strong>
    </>
  );
}

function PerformancePageHtml() {
  const quartale = CHART_PRODUKT.labels;
  const letztes = quartale.length - 1;
  const aktivierung = (index: number): string =>
    formatProzent(CHART_PRODUKT.datasets[0]?.data[index] ?? 0);
  const scoring = (index: number): string =>
    formatProzent(CHART_PRODUKT.datasets[1]?.data[index] ?? 0);
  const verlaufSummary =
    `${CHART_PRODUKT.datasets[0]?.label} steigt von ${aktivierung(0)} (${quartale[0]}) ` +
    `auf ${aktivierung(letztes)} (${quartale[letztes]}), ` +
    `${CHART_PRODUKT.datasets[1]?.label} von ${scoring(0)} auf ${scoring(letztes)}.`;
  const churnWerte = CHART_CHURN.datasets[0]?.data ?? [];
  const churnGesamt = churnWerte.reduce((sum, wert) => sum + wert, 0);
  const churnTop = CHART_CHURN.labels[0];
  const churnTopWert = churnWerte[0] ?? 0;
  const churnSummary = `Häufigster Kündigungsgrund ist ${churnTop} mit ${String(churnTopWert)} Nennungen.`;
  return (
    <div className="pk-page" data-ruhig="true" data-page-key="product-performance">
      <PageHero
        eyebrow="Produkt"
        title={PERF.title}
        subtitle="System-Performance & Verarbeitungsmetriken."
        pills={['Telemetrie 2025', `${PERF.metrics.length} Kernmetriken`]}
      />
      <DataState
        status={PERF.metrics.length > 0 ? 'ready' : 'empty'}
        emptyText="Keine Performance-Daten erfasst."
      >
        <section aria-label="Kernmetriken">
          <h2 className="sr-only">Kernmetriken</h2>
          <ul className="pk-grid pd-perf__kacheln" data-cols="4">
            {PERF.metrics.map((metric, index) => {
              const [wert, ziel] = splitValueHint(metric.val);
              // Zielstatus steht in den Daten („erreicht“ / „verfehlt“).
              const verfehlt = ziel?.includes('verfehlt') ?? false;
              const StatusIcon = verfehlt ? AlertCircle : CheckCircle2;
              return (
                <li key={metric.label} className="pd-perf__kachel" data-testid="perf-kachel">
                  <StatTile
                    label={metric.label}
                    value={wert}
                    hint={ziel ? <ZielHinweis text={ziel} /> : undefined}
                    tone="cyan"
                    icon={ICONS[index % ICONS.length]}
                  />
                  <StatusIcon
                    className="pd-perf__icon"
                    data-status={verfehlt ? 'verfehlt' : 'erreicht'}
                    size={24}
                    aria-hidden="true"
                  />
                </li>
              );
            })}
          </ul>
        </section>
        <Grid cols="2">
          <Panel
            title="Produkt-Aktivierung & KI-Nutzung (2025)"
            badge="Telemetrie 2025"
            subtitle="Nutzungsintensität nach Produktmodulen"
            chip="Quartalsansicht"
            chipTone="neutral"
          >
            <ChartFigure title="Quartalsverlauf Aktivierung & Scoring" summary={verlaufSummary}>
              <DepthFlaechen
                idPrefix="perf-verlauf"
                regionLabel="Produkt-Aktivierung und KI-Nutzung 2025, waagerecht scrollbar"
                labels={quartale}
                series={CHART_PRODUKT.datasets.map((set) => ({
                  name: set.label,
                  values: set.data,
                  color: FARBEN[set.color] ?? 'var(--color-primary)',
                  area: true,
                }))}
                formatTick={formatProzent}
                datenTabelle={formatProzent}
              />
              <p className="pd-perf__stand" data-testid="perf-stand">
                <span className="pd-perf__stand-q">{quartale[letztes]}</span>
                {CHART_PRODUKT.datasets.map((set, index) => (
                  <span key={set.label} className="pd-perf__stand-wert" data-reihe={index}>
                    <strong>{formatProzent(set.data[letztes] ?? 0)}</strong>{' '}
                    {set.label.replace(/\s*\(%\)$/, '')}
                  </span>
                ))}
              </p>
            </ChartFigure>
          </Panel>
          <Panel
            title="Kündigungsgründe & Churn-Ursachen (2025)"
            badge="Customer Success"
            subtitle="Verteilung der Abwanderungsursachen"
            chip="Absolute Zahlen"
            chipTone="neutral"
          >
            <ChartFigure title="Kündigungsgründe" summary={churnSummary}>
              <div className="pk-donut-wrap pd-perf__ring">
                <Donut
                  segments={CHART_CHURN.labels.map((label, index) => ({
                    label,
                    value: churnWerte[index] ?? 0,
                    tone: churnTone[index] ?? 'neutral',
                  }))}
                  centerLabel="Gesamt"
                  centerValue={String(churnGesamt)}
                />
                <div className="pk-donut-side">
                  <BarList
                    items={CHART_CHURN.labels.map((label, index) => ({
                      label,
                      value: churnWerte[index] ?? 0,
                      display: String(churnWerte[index] ?? 0),
                      note:
                        churnGesamt > 0
                          ? `(${Math.round(((churnWerte[index] ?? 0) / churnGesamt) * 100)} %)`
                          : undefined,
                      tone: churnTone[index] ?? 'neutral',
                    }))}
                  />
                  <Callout title="Hinweis:" tone="cyan" icon={Info}>
                    Die Kategorie „{churnTop}“ ist der häufigste Kündigungsgrund. Fokus auf
                    ICP-konforme Kunden empfohlen: Kleinstkunden mit 2–3 Nutzern sind Negative-Fit.
                  </Callout>
                </div>
              </div>
            </ChartFigure>
          </Panel>
        </Grid>
      </DataState>
    </div>
  );
}

// Auftrag 069 / G67: Original-WebP aus v2.2.0, v2.3.1-Inhalt als Textschicht
// (Schalter `PAGE_PRESENTATION` in src/config/pagePresentation.ts).
export function PerformancePage() {
  return (
    <ImagePage page="product-performance">
      <PerformancePageHtml />
    </ImagePage>
  );
}
