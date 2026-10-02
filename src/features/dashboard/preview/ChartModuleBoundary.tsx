// Designprobe Dashboard-Testkachel (Teilauftrag 0): Fehlergrenze für nachgeladene Diagrammmodule.
// Scheitert das Laden eines Moduls, zeigt die Kachel einen erklärten Zustand mit „Wiederholen“,
// ohne die übrige Kachel (Titel, Umschalter, Größe) zu verlieren.
import React from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  onRetry: () => void;
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

  private retry = () => {
    this.setState({ failed: false });
    this.props.onRetry();
  };

  // Mindesthöhe wie Ladeplatzhalter und Diagramm (CHART_SLOT_MIN_HEIGHT): kein Layoutsprung im Fehlerfall.
  render() {
    if (this.state.failed) {
      return (
        <div
          role="alert"
          className="flex min-h-[360px] flex-col items-start justify-center gap-[10px]"
        >
          <p className="m-0 text-[13px] text-[var(--color-text-muted)]">
            Die Darstellung konnte nicht geladen werden.
          </p>
          <Button variant="secondary" size="sm" onClick={this.retry}>
            Wiederholen
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
