// Executive Dashboard V2 (Auftrag 168 / P13c):
// Liest die Szenario-Parameter der Editor-Vorschau aus der URL.
// Aus DashboardEditorPreviewV2.tsx ausgelagert (Dateigrößengrenze 400 Zeilen).

import { setupPreviewAlarmsScenario } from './previewAlarms';
import { parsePreviewLiveScenario } from './previewLiveStore';

export function readPreviewParams() {
  if (typeof window === 'undefined') {
    return {
      teams: null,
      versionen: false,
      schwellenwerte: false,
      alarme: false,
      transformationen: false,
      live: 'nicht_konfiguriert' as const,
    };
  }
  const sp = new URLSearchParams(window.location.search);
  const alarme = sp.get('alarme') === '1';
  if (alarme) setupPreviewAlarmsScenario();
  return {
    teams: sp.get('teams'),
    versionen: sp.get('versionen') === '1',
    schwellenwerte: sp.get('schwellenwerte') === '1',
    alarme,
    transformationen: sp.get('transformationen') === '1',
    live: parsePreviewLiveScenario(sp.get('live')),
  };
}
