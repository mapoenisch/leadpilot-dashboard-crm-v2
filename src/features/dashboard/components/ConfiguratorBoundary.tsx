import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { useEscapeToClose } from './UnsavedChangesDialog';

export interface ConfiguratorShellProps {
  onClose: () => void;
  active: boolean;
  children: ReactNode;
}

/** Drawer-Hülle für Lade- und Fehlerzustand des Kachel-Konfigurators. */
export function ConfiguratorShell(props: ConfiguratorShellProps) {
  // Nur der oberste Dialog reagiert auf Escape: Liegt die Rückfrage darüber, ruht diese Hülle.
  useEscapeToClose(props.active, props.onClose);
  return (
    <Drawer
      open
      onClose={() => props.active && props.onClose()}
      title="Kachel konfigurieren"
      width="420px"
      escapeActive={props.active}
    >
      {props.children}
    </Drawer>
  );
}

export interface ConfiguratorBoundaryProps {
  onRetry: () => void;
  onClose: () => void;
  active: boolean;
  children: ReactNode;
}

export class ConfiguratorBoundary extends Component<
  ConfiguratorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ConfiguratorShell onClose={this.props.onClose} active={this.props.active}>
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          <span>Das Konfigurationsfenster konnte nicht geladen werden.</span>
          <Button size="sm" onClick={this.props.onRetry}>
            Seite neu laden
          </Button>
          <Button size="sm" variant="secondary" onClick={this.props.onClose}>
            Schließen
          </Button>
        </div>
      </ConfiguratorShell>
    );
  }
}
