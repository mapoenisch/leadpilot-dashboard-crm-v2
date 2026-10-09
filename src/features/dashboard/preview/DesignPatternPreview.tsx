// Auftrag 087 (Paket D, Designmuster): Muster zur Sichtabnahme durch Marc.
// Richtung „ruhige Weiterentwicklung“ mit 3D-Tiefe (Entscheidung Marc 09.10.2026, Variante B):
// bestehende Farben/Schriften und Depth3d-Diagramme, kompakter Kopf, Kennzahl vorn, klare
// Quellenzeile, Touchfläche ≥ 44 px. Je Muster: Normalfall, langer Titel, Fehler, keine Daten.
// Daten: belegte Quartalswerte aus dem Faktenblatt (src/domain/vertriebData.ts), keine Fantasiezahlen.
// Nur in der Vorschau (dashboard-vorschau.html?bereich=muster), kein Produkt-Schalter.
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { formatQuote } from '@/domain/funnelQuote';
import { FUNNEL_QUARTALE } from '@/domain/vertriebData';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Depth3dBarChart } from '../components/charts/Depth3dBarChart';

const sum = (werte: readonly number[]) => werte.reduce((summe, wert) => summe + wert, 0);
const NEUKUNDEN = sum(FUNNEL_QUARTALE.neukunden);
const ANGEBOTE = sum(FUNNEL_QUARTALE.angebote);
const QUARTALE = FUNNEL_QUARTALE.neukunden.map((value, index) => ({
  label: `Q${index + 1}`,
  value,
}));
const QUELLE = 'Faktenblatt v1.1 · Stand FY 2025 · fester Stand';
const LANGER_TITEL =
  'Neukunden aus qualifizierten Angeboten im Geschäftsjahr 2025 nach Quartal und Vertriebskanal';

type Theme = 'dark' | 'light';
type State = 'bereit' | 'fehler' | 'leer';

function Frame(props: { id: string; title: string; meta: string; children: ReactNode }) {
  const titleId = `${props.id}-titel`;
  return (
    <article
      aria-labelledby={titleId}
      data-testid={`muster-${props.id}`}
      data-muster
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-solid border-border bg-surface p-4"
    >
      <header className="flex min-w-0 flex-col gap-1">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Vertrieb
        </p>
        <h3
          id={titleId}
          className="m-0 break-words text-[15px] font-semibold leading-snug text-[var(--color-text-primary)]"
        >
          {props.title}
        </h3>
        <p className="m-0 text-[12px] text-[var(--color-text-muted)] [overflow-wrap:anywhere]">
          {props.meta}
        </p>
      </header>
      {props.children}
      <footer className="mt-auto flex justify-end border-0 border-t border-solid border-border pt-3">
        <Button size="sm" variant="secondary" className="min-h-[44px]">
          Details
        </Button>
      </footer>
    </article>
  );
}

function StateBody({ state, children }: { state: State; children: ReactNode }) {
  if (state === 'fehler') {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p className="m-0 text-[13px] font-semibold text-error">Nicht verfügbar</p>
        <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
          Die Daten konnten nicht geladen werden. Es wird kein Wert angezeigt, auch nicht 0.
        </p>
        <Button size="sm" variant="secondary" className="min-h-[44px]">
          Erneut versuchen
        </Button>
      </div>
    );
  }
  if (state === 'leer') {
    return (
      <p className="m-0 text-[13px] text-[var(--color-text-muted)]">
        Keine Daten für diesen Zeitraum vorhanden.
      </p>
    );
  }
  return <>{children}</>;
}

/** Muster 1: kompakte Zahlkachel. */
function NumberTile({ id, title, state }: { id: string; title: string; state: State }) {
  return (
    <Frame id={id} title={title} meta={QUELLE}>
      <StateBody state={state}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[32px] font-bold leading-none text-[var(--color-text-primary)]">
            {NEUKUNDEN}
          </span>
          <span className="text-[13px] text-[var(--color-text-muted)]">
            Neukunden · Win Rate {formatQuote(NEUKUNDEN, ANGEBOTE)}
          </span>
        </div>
      </StateBody>
    </Frame>
  );
}

/** Muster 2: Verlauf/Verteilung mit 3D-Säulen. */
function ChartTile({ id, title, state }: { id: string; title: string; state: State }) {
  const reducedMotion = useReducedMotion();
  return (
    <Frame id={id} title={title} meta={QUELLE}>
      <StateBody state={state}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[24px] font-bold leading-none text-[var(--color-text-primary)]">
            {NEUKUNDEN}
          </span>
          <span className="text-[13px] text-[var(--color-text-muted)]">Neukunden im Jahr</span>
        </div>
        <Depth3dBarChart
          idPrefix={`muster-${id}`}
          data={QUARTALE}
          unit="Neukunden"
          period="2025"
          title={title}
          reducedMotion={reducedMotion}
          formatValue={(value) => `${value} Neukunden`}
          stableLegend
        />
      </StateBody>
    </Frame>
  );
}

function PatternSection(props: { id: string; title: string; hint: string; children: ReactNode }) {
  return (
    <section aria-labelledby={props.id} className="flex flex-col gap-3">
      <h2 id={props.id} className="m-0 text-[18px] font-semibold">
        {props.title}
      </h2>
      <p className="m-0 max-w-[720px] text-[13px] text-[var(--color-text-muted)]">{props.hint}</p>
      {props.children}
    </section>
  );
}

export function DesignPatternPreview() {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return (
    <div className="flex flex-col gap-8">
      {/* Werte über den Säulen sind im Diagramm fest weiß – im hellen Modus unlesbar. Im Muster folgt
          die Farbe dem Textton; die Produktdarstellung ändert sich erst nach Marcs Freigabe. */}
      <style>{`[data-muster] svg text[font-weight="700"] { fill: var(--color-text-primary); }`}</style>
      <header className="flex flex-col gap-2">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Paket D · Designmuster zur Sichtabnahme
        </p>
        <h1 className="m-0 text-[24px] font-semibold">Ruhige Weiterentwicklung mit 3D-Tiefe</h1>
        <p className="m-0 max-w-[720px] text-[13px] text-[var(--color-text-muted)]">
          Bestehende Farben, Schriften und 3D-Diagramme. Jedes Muster zeigt Normalfall, langen
          Titel, Fehler und fehlende Daten. Werte aus dem Faktenblatt v1.1.
        </p>
        <div role="group" aria-label="Farbmodus" className="flex gap-2">
          {(['dark', 'light'] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={theme === mode ? 'primary' : 'secondary'}
              aria-pressed={theme === mode}
              className="min-h-[44px]"
              onClick={() => setTheme(mode)}
            >
              {mode === 'dark' ? 'Dunkel' : 'Hell'}
            </Button>
          ))}
        </div>
      </header>

      <PatternSection
        id="muster-zahl"
        title="Muster 1 – Kompakte Zahlkachel"
        hint="Kennzahl groß vorn, Einordnung daneben. Fehler zeigt „Nicht verfügbar“ statt 0."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberTile id="zahl-normal" title="Neukunden 2025" state="bereit" />
          <NumberTile id="zahl-lang" title={LANGER_TITEL} state="bereit" />
          <NumberTile id="zahl-fehler" title="Neukunden 2025" state="fehler" />
          <NumberTile id="zahl-leer" title="Neukunden 2025" state="leer" />
        </div>
      </PatternSection>

      <PatternSection
        id="muster-verlauf"
        title="Muster 2 – Verlauf/Verteilung mit 3D-Tiefe"
        hint="Summe vorn, darunter die 3D-Säulen. Werte über den Säulen folgen dem Textton (im hellen Modus lesbar)."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ChartTile id="verlauf-normal" title="Neukunden je Quartal 2025" state="bereit" />
          <ChartTile id="verlauf-lang" title={LANGER_TITEL} state="bereit" />
          <ChartTile id="verlauf-fehler" title="Neukunden je Quartal 2025" state="fehler" />
          <ChartTile id="verlauf-leer" title="Neukunden je Quartal 2025" state="leer" />
        </div>
      </PatternSection>
    </div>
  );
}
