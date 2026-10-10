// Auftrag 087 (Paket D): Bildschirm-Muster 3–5 zur Sichtabnahme – mobile Dashboard-Startseite,
// Funnel-Fachseite und vereinfachter Editor. Nur Ansicht: keine Abfragen, keine Speicherung.
// Zahlen aus dem Faktenblatt (FUNNEL_QUARTALE), Quoten über formatQuote wie die Produktseite.
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatAnzahl, formatQuote } from '@/domain/funnelQuote';
import { FUNNEL_QUARTALE } from '@/domain/vertriebData';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Depth3dBarChart } from '../components/charts/Depth3dBarChart';
import {
  ChartTile,
  Frame,
  LANGER_TITEL,
  NumberTile,
  QUELLE,
  StateBody,
  sum,
} from './designPatternTiles';

const FY = {
  leads: sum(FUNNEL_QUARTALE.leads),
  mql: sum(FUNNEL_QUARTALE.mql),
  sql: sum(FUNNEL_QUARTALE.sql),
  testversionen: sum(FUNNEL_QUARTALE.testversionen),
  angebote: sum(FUNNEL_QUARTALE.angebote),
  neukunden: sum(FUNNEL_QUARTALE.neukunden),
};
const STUFEN = [
  { label: 'Leads', value: FY.leads, quote: '—' },
  { label: 'MQL', value: FY.mql, quote: `${formatQuote(FY.mql, FY.leads)} der Leads` },
  { label: 'SQL', value: FY.sql, quote: `${formatQuote(FY.sql, FY.mql)} der MQL` },
  // Testversionen gestartet: paralleler Self-Service-Pfad, keine Stufe der Kette (wie FunnelPage);
  // nur in der Tabelle als Nebenkennzahl (Codex PR #73, Runde 4/5).
  {
    label: 'Testversionen gestartet',
    value: FY.testversionen,
    quote: 'Self-Service-Pfad, parallel',
    nebenpfad: true,
  },
  { label: 'Angebote', value: FY.angebote, quote: `${formatQuote(FY.angebote, FY.sql)} der SQL` },
  {
    label: 'Neukunden',
    value: FY.neukunden,
    quote: `Win Rate ${formatQuote(FY.neukunden, FY.angebote)}`,
  },
];

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-solid border-border bg-surface p-3">
      <span className="text-[12px] text-[var(--color-text-muted)] [overflow-wrap:anywhere]">
        {label}
      </span>
      <span className="font-mono text-[22px] font-bold leading-none text-[var(--color-text-primary)]">
        {value}
      </span>
    </div>
  );
}

/** Muster 3: mobile Dashboard-Startseite (375 px Rahmen). */
export function MobileHomePattern() {
  return (
    <div
      data-testid="muster-mobil"
      data-muster
      className="mx-auto flex w-full max-w-[375px] flex-col gap-3 rounded-2xl border border-solid border-border bg-[var(--color-bg)] p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-[18px] font-semibold text-[var(--color-text-primary)] [overflow-wrap:anywhere]">
          Executive Dashboard
        </h3>
        <Button size="sm" variant="secondary" className="min-h-[44px]">
          Filter
        </Button>
      </header>
      <p className="m-0 text-[12px] text-[var(--color-text-muted)]">{QUELLE}</p>
      <div className="grid grid-cols-1 gap-2 min-[300px]:grid-cols-2">
        <MiniKpi label="Leads" value={formatAnzahl(FY.leads)} />
        <MiniKpi label="SQL" value={formatAnzahl(FY.sql)} />
        <MiniKpi label="Angebote" value={formatAnzahl(FY.angebote)} />
        <MiniKpi label="Neukunden" value={formatAnzahl(FY.neukunden)} />
      </div>
      <NumberTile id="mobil-zahl" title="Neukunden 2025" state="bereit" />
      <ChartTile id="mobil-verlauf" title="Neukunden je Quartal 2025" state="bereit" />
      {/* Codex PR #73: Zustände auch im mobilen Muster – langer Titel und Fehler getrennt (Runde 6). */}
      <ChartTile id="mobil-lang" title={LANGER_TITEL} state="bereit" />
      <NumberTile id="mobil-fehler" title="Neukunden 2025" state="fehler" />
      <ChartTile id="mobil-leer" title="Neukunden je Quartal 2025" state="leer" />
    </div>
  );
}

/** Muster 4: Funnel-Fachseite als HTML (statt Bild), 3D-Balken plus Tabelle aus derselben Quelle. */
export function FunnelPattern() {
  const reducedMotion = useReducedMotion();
  return (
    <div data-testid="muster-funnel" data-muster className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Vertrieb · Funnel
        </p>
        <h3 className="m-0 text-[22px] font-semibold text-[var(--color-text-primary)]">
          Sales Funnel 2025
        </h3>
        <p className="m-0 text-[12px] text-[var(--color-text-muted)]">{QUELLE}</p>
      </header>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <Frame id="funnel-stufen" title="Stufen im Geschäftsjahr" meta="Anzahl je Stufe, FY 2025">
          <Depth3dBarChart
            idPrefix="muster-funnel"
            data={STUFEN.filter((stufe) => !('nebenpfad' in stufe)).map(({ label, value }) => ({
              label,
              value,
            }))}
            unit="Anzahl"
            period="FY 2025"
            title="Sales Funnel 2025"
            reducedMotion={reducedMotion}
            orientation="horizontal"
            formatValue={(value) => formatAnzahl(value)}
            stableLegend
          />
        </Frame>
        <Frame id="funnel-tabelle" title="Conversion je Stufe" meta="Quote = Stufe / Vorstufe">
          {/* Codex PR #73: Bei großer Schrift scrollt nur die Tabelle, nicht die Seite. */}
          <div
            role="region"
            aria-label="Conversion-Tabelle"
            tabIndex={0}
            className="max-w-full overflow-x-auto"
          >
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-[var(--color-text-muted)]">
                  <th className="py-2 font-medium">Stufe</th>
                  <th className="py-2 text-right font-medium">FY 2025</th>
                  <th className="py-2 text-right font-medium">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {STUFEN.map((stufe) => (
                  <tr key={stufe.label} className="border-0 border-t border-solid border-border">
                    <td
                      className={
                        'nebenpfad' in stufe
                          ? 'py-2 pl-3 italic text-[var(--color-text-muted)]'
                          : 'py-2 text-[var(--color-text-primary)]'
                      }
                    >
                      {stufe.label}
                    </td>
                    <td className="py-2 text-right font-mono">{formatAnzahl(stufe.value)}</td>
                    <td className="py-2 text-right">{stufe.quote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Frame>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Frame id="funnel-lang" title={LANGER_TITEL} meta={QUELLE}>
          <p className="m-0 text-[13px] text-[var(--color-text-primary)]">
            {formatAnzahl(FY.neukunden)} Neukunden aus {formatAnzahl(FY.angebote)} Angeboten · Win
            Rate {formatQuote(FY.neukunden, FY.angebote)}
          </p>
        </Frame>
        <Frame id="funnel-fehler" title="Stufen im Geschäftsjahr" meta={QUELLE}>
          <StateBody state="fehler">{null}</StateBody>
        </Frame>
        <Frame id="funnel-leer" title="Stufen im Geschäftsjahr" meta={QUELLE}>
          <StateBody state="leer">{null}</StateBody>
        </Frame>
      </div>
    </div>
  );
}

const TABS = ['Kennzahl', 'Darstellung', 'Vorschau', 'Erweitert'] as const;

/** Muster 5: vereinfachter Editor – eine Aktionsleiste je Kachel, gegliedertes Einstellungsfenster. */
export function EditorPattern() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Kennzahl');
  const [menu, setMenu] = useState(true);
  return (
    <div data-testid="muster-editor" data-muster className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-primary px-3 py-1">
          <span className="text-[12px] text-[var(--color-text-muted)]">
            ⠿ Ziehen zum Verschieben · Position 2 von 6
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="min-h-[44px]"
            aria-expanded={menu}
            aria-controls="muster-editor-menue"
            onClick={() => setMenu((open) => !open)}
          >
            Kachel-Aktionen ▾
          </Button>
        </div>
        {/* Im Fluss statt schwebend: überdeckt weder Kachel noch ragt es auf 320 px aus dem Bild. */}
        {menu ? (
          <ul
            id="muster-editor-menue"
            className="m-0 grid list-none grid-cols-1 gap-1 min-[300px]:grid-cols-2 rounded-lg border border-solid border-border bg-surface p-1"
          >
            {['Nach oben', 'Nach unten', 'Bearbeiten', 'Entfernen'].map((label) => (
              <li key={label}>
                <button
                  type="button"
                  className={`min-h-[44px] w-full rounded-md border-0 bg-transparent px-3 text-left text-[13px] hover:bg-[var(--color-bg)] ${label === 'Entfernen' ? 'text-error' : 'text-[var(--color-text)]'}`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <NumberTile id="editor-kachel" title="Neukunden 2025" state="bereit" />
        <NumberTile id="editor-lang" title={LANGER_TITEL} state="bereit" />
        <NumberTile id="editor-fehler" title="Neukunden 2025" state="fehler" />
        <NumberTile id="editor-leer" title="Neukunden 2025" state="leer" />
      </div>
      <section
        aria-label="Kachel bearbeiten"
        className="flex min-w-0 flex-col gap-3 rounded-xl border border-solid border-border bg-surface p-4"
      >
        <h3 className="m-0 text-[15px] font-semibold text-[var(--color-text-primary)]">
          Kachel bearbeiten
        </h3>
        <div role="group" aria-label="Bereiche" className="flex flex-wrap gap-1">
          {TABS.map((name) => (
            <Button
              key={name}
              size="sm"
              aria-pressed={tab === name}
              variant={tab === name ? 'primary' : 'secondary'}
              className="min-h-[44px]"
              onClick={() => setTab(name)}
            >
              {name}
            </Button>
          ))}
        </div>
        <div
          aria-live="polite"
          className="min-h-[120px] text-[13px] text-[var(--color-text-muted)]"
        >
          {tab === 'Kennzahl' ? 'Kennzahl suchen und wählen, z. B. „Neukunden“.' : null}
          {tab === 'Darstellung' ? 'Zahl, Säulen, Balken, Ring … und Größe der Kachel.' : null}
          {tab === 'Vorschau' ? 'Live-Vorschau der Kachel mit echten Daten.' : null}
          {tab === 'Erweitert'
            ? 'Kombinationen, eigener Titel, kacheleigene Pipeline und Zeitbezug.'
            : null}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-0 border-t border-solid border-border bg-surface pt-3">
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Änderungen liegen in der Arbeitskopie, gespeichert wird erst mit „Speichern“.
          </span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" className="min-h-[44px]">
              Verwerfen
            </Button>
            <Button size="sm" className="min-h-[44px]">
              Speichern
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
