// Executive Dashboard V2 (Auftrag 161 / P10b-2):
// Zeitfenster-Auswahl je Verlaufskachel im Kachel-Inspector.
// Unterstützt Katalog-Standard, Vorgaben je Quelle und eigenes Fenster mit Höchstwerten.

import { useEffect, useState, type ChangeEvent } from 'react';
import type { ActiveCatalogEntry } from '../../../model/dashboardCatalog';
import type { TimeSeriesResolution } from '../../../data/dashboardData';

export interface TimeWindowConfig {
  count: number;
  resolution: TimeSeriesResolution;
}

export interface TimeWindowFieldProps {
  catalogEntry: ActiveCatalogEntry;
  currentWindow?: TimeWindowConfig;
  onChangeWindow: (window: TimeWindowConfig | undefined) => void;
}

interface WindowPreset {
  id: string;
  label: string;
  window?: TimeWindowConfig;
}

const CRM_PRESETS: readonly WindowPreset[] = [
  { id: '4_wochen', label: '4 Wochen (je Woche)', window: { count: 4, resolution: 'woche' } },
  { id: '12_wochen', label: '12 Wochen (je Woche)', window: { count: 12, resolution: 'woche' } },
  { id: '26_wochen', label: '26 Wochen (je Woche)', window: { count: 26, resolution: 'woche' } },
  { id: '12_monate', label: '12 Monate (je Monat)', window: { count: 12, resolution: 'monat' } },
];

const LIVE_PRESETS: readonly WindowPreset[] = [
  { id: '6_stunden', label: '6 Stunden (je Stunde)', window: { count: 6, resolution: 'stunde' } },
  { id: '24_stunden', label: '24 Stunden (je Stunde)', window: { count: 24, resolution: 'stunde' } },
  { id: '7_tage', label: '7 Tage (je Tag)', window: { count: 7, resolution: 'tag' } },
  { id: '30_tage', label: '30 Tage (je Tag)', window: { count: 30, resolution: 'tag' } },
];

export function getMaxCountForResolution(
  layer: 'crm' | 'live',
  resolution: TimeSeriesResolution,
): number | null {
  if (layer === 'crm') {
    if (resolution === 'stunde') return null; // unzulässig
    if (resolution === 'tag') return 366;
    if (resolution === 'woche') return 260;
    if (resolution === 'monat') return 120;
  } else {
    if (resolution === 'stunde') return 168;
    if (resolution === 'tag') return 90;
    return null; // woche/monat unzulässig
  }
  return null;
}

export function TimeWindowField({
  catalogEntry,
  currentWindow,
  onChangeWindow,
}: TimeWindowFieldProps) {
  const layer = catalogEntry.source.layer === 'crm' ? 'crm' : 'live';
  const presets = layer === 'crm' ? CRM_PRESETS : LIVE_PRESETS;
  const defaultWin = catalogEntry.history.defaultWindow;
  const defaultLabel = defaultWin
    ? `Standard (${defaultWin.count} ${defaultWin.resolution === 'stunde' ? 'Std.' : defaultWin.resolution === 'tag' ? 'Tage' : defaultWin.resolution === 'woche' ? 'Wochen' : 'Monate'})`
    : 'Standard (Katalog)';

  // Erkennen, ob aktuelles Fenster einem Preset entspricht
  let currentPresetId = 'standard';
  if (currentWindow) {
    const matched = presets.find(
      (p) =>
        p.window &&
        p.window.count === currentWindow.count &&
        p.window.resolution === currentWindow.resolution,
    );
    currentPresetId = matched ? matched.id : 'custom';
  }

  const [selectedPreset, setSelectedPreset] = useState<string>(currentPresetId);
  const [customCount, setCustomCount] = useState<number>(currentWindow?.count ?? 30);
  const [customResolution, setCustomResolution] = useState<TimeSeriesResolution>(
    currentWindow?.resolution ?? (layer === 'crm' ? 'woche' : 'tag'),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPreset(currentPresetId);
    if (currentWindow) {
      setCustomCount(currentWindow.count);
      setCustomResolution(currentWindow.resolution);
    }
    setError(null);
  }, [catalogEntry.id, currentPresetId, currentWindow]);

  const allowedResolutions: readonly { value: TimeSeriesResolution; label: string }[] =
    layer === 'crm'
      ? [
          { value: 'tag', label: 'Tage (max. 366)' },
          { value: 'woche', label: 'Wochen (max. 260)' },
          { value: 'monat', label: 'Monate (max. 120)' },
        ]
      : [
          { value: 'stunde', label: 'Stunden (max. 168)' },
          { value: 'tag', label: 'Tage (max. 90)' },
        ];

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    setSelectedPreset(nextId);
    setError(null);

    if (nextId === 'standard') {
      onChangeWindow(undefined);
      return;
    }
    if (nextId === 'custom') {
      validateAndApplyCustom(customCount, customResolution);
      return;
    }

    const matched = presets.find((p) => p.id === nextId);
    if (matched?.window) {
      onChangeWindow(matched.window);
    }
  };

  const validateAndApplyCustom = (count: number, resolution: TimeSeriesResolution) => {
    if (!Number.isInteger(count) || count < 1) {
      setError('Bitte eine ganze Zahl von mindestens 1 eingeben.');
      return;
    }
    const max = getMaxCountForResolution(layer, resolution);
    if (max === null) {
      setError(`Auflösung '${resolution}' ist für diese Kennzahl unzulässig.`);
      return;
    }
    if (count > max) {
      setError(`Maximal ${max} ${resolution === 'stunde' ? 'Stunden' : resolution === 'tag' ? 'Tage' : resolution === 'woche' ? 'Wochen' : 'Monate'} zulässig.`);
      return;
    }
    setError(null);
    onChangeWindow({ count, resolution });
  };

  return (
    <div data-testid="inspector-time-window" className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--color-text-muted)]">Zeitfenster</label>
      <select
        data-testid="inspector-window-preset-select"
        value={selectedPreset}
        onChange={handlePresetChange}
        className="h-8 w-full rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary"
      >
        <option value="standard" className="bg-[var(--color-bg-deep,#051413)]">
          {defaultLabel}
        </option>
        {presets.map((p) => (
          <option key={p.id} value={p.id} className="bg-[var(--color-bg-deep,#051413)]">
            {p.label}
          </option>
        ))}
        <option value="custom" className="bg-[var(--color-bg-deep,#051413)]">
          Eigenes Fenster…
        </option>
      </select>

      {selectedPreset === 'custom' && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              step={1}
              data-testid="inspector-window-custom-count"
              value={customCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setCustomCount(val);
                if (!Number.isNaN(val)) validateAndApplyCustom(val, customResolution);
              }}
              className="h-8 w-24 rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary"
            />
            <select
              data-testid="inspector-window-custom-resolution"
              value={customResolution}
              onChange={(e) => {
                const res = e.target.value as TimeSeriesResolution;
                setCustomResolution(res);
                validateAndApplyCustom(customCount, res);
              }}
              className="h-8 flex-1 rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary"
            >
              {allowedResolutions.map((r) => (
                <option key={r.value} value={r.value} className="bg-[var(--color-bg-deep,#051413)]">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p data-testid="inspector-window-error" className="m-0 text-[11px] text-red-400">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
