// Auftrag 087 (Paket D): gemeinsame Bausteine der Designmuster (Kachelrahmen, Zustände, Zahl- und
// Verlaufskachel). Ausgelagert, damit Vorschau und Bildschirm-Muster unter 400 Zeilen bleiben.
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { formatQuote } from '@/domain/funnelQuote';
import { FUNNEL_QUARTALE } from '@/domain/vertriebData';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Depth3dBarChart } from '../components/charts/Depth3dBarChart';

export const sum = (werte: readonly number[]) => werte.reduce((summe, wert) => summe + wert, 0);
export const NEUKUNDEN = sum(FUNNEL_QUARTALE.neukunden);
export const ANGEBOTE = sum(FUNNEL_QUARTALE.angebote);
const QUARTALE = FUNNEL_QUARTALE.neukunden.map((value, index) => ({
  label: `Q${index + 1}`,
  value,
}));
export const QUELLE = 'Faktenblatt v1.1 · Stand FY 2025 · fester Stand';
export const LANGER_TITEL =
  'Neukunden aus qualifizierten Angeboten im Geschäftsjahr 2025 nach Quartal und Vertriebskanal';

export type State = 'bereit' | 'fehler' | 'leer';

export function Frame(props: { id: string; title: string; meta: string; children: ReactNode }) {
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
export function NumberTile({ id, title, state }: { id: string; title: string; state: State }) {
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
export function ChartTile({ id, title, state }: { id: string; title: string; state: State }) {
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
