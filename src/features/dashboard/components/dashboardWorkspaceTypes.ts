import type { ComponentType } from 'react';
import type { EditorPreferences } from '../hooks/useDashboardEditor';
import type { ChartLoaders } from './charts/chartLoaders';
import type { TileDataHook } from './LazyDashboardTile';
import type { TileConfiguratorProps } from './TileConfigurator';
import type { SessionFilters } from '../hooks/useDashboardNavigation';

export interface WorkspacePreferences extends EditorPreferences {
  status: 'keine_sitzung' | 'laden' | 'bereit' | 'fehler';
}

export type ConfiguratorModule = { default: ComponentType<TileConfiguratorProps> };

export interface DashboardWorkspaceProps {
  preferences: WorkspacePreferences;
  useData: TileDataHook;
  chartLoaders?: ChartLoaders;
  organizationName?: string;
  /** Fehlt sie, erscheint ein Hinweis, dass es hier keine Detailansicht gibt (Vorschau). */
  onShowDetails?: (tileId: string, session: SessionFilters) => void;
  /** Auftrag 077: Sitzungsfilter beim Öffnen (Rückkehr aus den Details); nur beim ersten Rendern. */
  initialSession?: SessionFilters;
  /** Auftrag 077: Kachel, deren „Details“-Knopf nach dem Laden den Fokus erhält (nur einmal). */
  returnFocusTileId?: string | null;
  /** Rückkehr erledigt: `found` = Fokus liegt auf „Details“; sonst setzt die Seite den Fokus selbst. */
  onReturnFocus?: (found: boolean) => void;
  /** Auftrag 077: interne Navigation; mit offenen Änderungen erst nach Rückfrage. */
  navigate?: (to: string) => void;
  /** Auftrag 077: Schutz der Zurück-Taste (Hook der Seite); ohne Router wirkungslos. */
  useBackGuard?: (dirty: boolean, req: (proceed: () => void) => void, pending: boolean) => boolean;
  /** Seite neu laden; Standard `window.location.reload()`. */
  onReload?: () => void;
  onTileActivated?: (tileId: string) => void;
  /** Meldet die aktuell dargestellten Kachel-IDs (Ansicht oder Entwurf), z. B. für Diagnoseanzeigen. */
  onShownTilesChange?: (tileIds: readonly string[]) => void;
  /** Nur für Tests: Nachladefunktion des Konfigurationsfensters. */
  configuratorLoader?: () => Promise<ConfiguratorModule>;
}
