// Fehlergrenze für nachgeladene Diagrammmodule (Designprobe Teilauftrag 0, übernommen in Auftrag 073).
// Scheitert das Laden eines Moduls, zeigt die Kachel einen erklärten Zustand mit „Wiederholen“,
// ohne die übrige Kachel (Titel, Umschalter, Größe) zu verlieren.
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ChartLayoutReserve } from './ChartReadout';
import type { ChartControls } from './ChartReadout';

/** Gerüst des erwarteten Diagramms; Lade- und Fehlerzustand legen ihren Inhalt darüber. */
export interface ChartReserveSpec {
  labels: readonly string[];
  controls: ChartControls;
  /** Dashboard-Kacheln: feste Legendenhöhe auch ohne bekannte Kategorien (Auftrag 073). */
  stableLegend?: boolean;
}

export const OVERLAY = 'absolute inset-0 flex flex-col justify-center gap-[10px]';

/**
 * Ladeplatzhalter mit der Endhöhe des Diagramms. Fokussierbar (Titel- und Zeitraumkontext); hatte er
 * den Fokus, merkt sich die Markierung das für die Übergabe an Diagrammbereich oder „Wiederholen“.
 */
export function ChartLoadingPlaceholder({
  label,
  reserve,
  hadFocus,
}: {
  label: string;
  reserve: ChartReserveSpec;
  hadFocus: React.MutableRefObject<boolean>;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      tabIndex={0}
      aria-label={`${label}: Darstellung wird geladen`}
      onFocus={() => {
        hadFocus.current = true;
      }}
      onBlur={(event) => {
        // Beim Entfernen aus dem DOM (Laden fertig) bleibt die Markierung für die Fokusübergabe.
        if (event.currentTarget.isConnected) hadFocus.current = false;
      }}
      className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <ChartLayoutReserve {...reserve} />
      <span className={`${OVERLAY} items-start text-[13px] text-[var(--color-text-muted)]`}>
        {label}: Darstellung wird geladen …
      </span>
    </div>
  );
}

interface Props {
  onRetry: () => void;
  /** Hatte der Ladeplatzhalter den Fokus, übernimmt ihn im Fehlerfall „Wiederholen“. */
  placeholderHadFocus?: React.MutableRefObject<boolean>;
  /** Gerüst des erwarteten Diagramms: Der Fehlerzustand behält dessen Höhe. */
  reserve: ChartReserveSpec;
  children: React.ReactNode;
}

interface State {
  failed: boolean;
}

export class ChartModuleBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  private alertRef = React.createRef<HTMLDivElement>();

  // Der fokussierte Platzhalter verschwindet mit dem Fehler aus dem DOM; ohne Übergabe fiele der
  // Fokus auf den Seitenanfang zurück.
  componentDidUpdate(_prevProps: Props, prevState: State) {
    const hadFocus = this.props.placeholderHadFocus;
    if (prevState.failed || !this.state.failed || !hadFocus?.current) return;
    hadFocus.current = false;
    this.alertRef.current?.querySelector('button')?.focus();
  }

  private retry = () => {
    this.setState({ failed: false });
    this.props.onRetry();
  };

  // Gleiches Gerüst wie Ladeplatzhalter und Diagramm: kein Layoutsprung im Fehlerfall.
  render() {
    if (this.state.failed) {
      return (
        <div className="relative">
          <ChartLayoutReserve {...this.props.reserve} />
          <div ref={this.alertRef} role="alert" className={`${OVERLAY} items-start`}>
            <p className="m-0 text-[13px] text-[var(--color-text-muted)]">
              Die Darstellung konnte nicht geladen werden.
            </p>
            <Button variant="secondary" size="sm" onClick={this.retry}>
              Wiederholen
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Hatte der Ladeplatzhalter den Tastaturfokus, verschwindet er beim Auflösen von Suspense aus dem DOM.
 * Damit der Fokus nicht auf den Seitenanfang zurückfällt, übernimmt ihn der Diagrammbereich.
 */
export function FocusAfterLoad({
  placeholderHadFocus,
  target,
}: {
  placeholderHadFocus: React.MutableRefObject<boolean>;
  target: React.RefObject<HTMLDivElement>;
}) {
  useEffect(() => {
    if (!placeholderHadFocus.current) return;
    placeholderHadFocus.current = false;
    target.current?.focus();
  }, [placeholderHadFocus, target]);
  return null;
}
