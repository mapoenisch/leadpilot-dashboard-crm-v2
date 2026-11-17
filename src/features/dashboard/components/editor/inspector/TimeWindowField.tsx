// Executive Dashboard V2 (Auftrag 161 / P10b-2):
// Zeitfenster-Auswahl je Verlaufskachel im Kachel-Inspector.
// Unterstützt Katalog-Standard, Vorgaben je Quelle und eigenes Fenster mit Höchstwerten.

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { ActiveCatalogEntry } from '../../../model/dashboardCatalog';
import type { TimeSeriesResolution } from '../../../data/dashboardData';

export interface TimeWindowConfig {
  count: number;
  resolution: TimeSeriesResolution;
}

function isSameWindow(a?: TimeWindowConfig, b?: TimeWindowConfig): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.count === b.count && a.resolution === b.resolution;
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
  {
    id: '24_stunden',
    label: '24 Stunden (je Stunde)',
    window: { count: 24, resolution: 'stunde' },
  },
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

function parsePositiveInteger(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num < 1) return null;
  return num;
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

  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    if (!currentWindow) return false;
    return !presets.some(
      (p) =>
        p.window &&
        p.window.count === currentWindow.count &&
        p.window.resolution === currentWindow.resolution,
    );
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    if (!currentWindow) return 'standard';
    const matched = presets.find(
      (p) =>
        p.window &&
        p.window.count === currentWindow.count &&
        p.window.resolution === currentWindow.resolution,
    );
    return matched ? matched.id : 'custom';
  });
  const [customCountInput, setCustomCountInput] = useState<string>(() =>
    String(currentWindow?.count ?? 30),
  );
  const [customResolution, setCustomResolution] = useState<TimeSeriesResolution>(
    currentWindow?.resolution ?? (layer === 'crm' ? 'woche' : 'tag'),
  );
  const [error, setError] = useState<string | null>(null);

  const lastEmittedWindowRef = useRef<TimeWindowConfig | undefined>(currentWindow);
  const prevTileIdRef = useRef<string>(catalogEntry.id);

  useEffect(() => {
    const isNewTile = catalogEntry.id !== prevTileIdRef.current;
    const isExternalChange = !isSameWindow(currentWindow, lastEmittedWindowRef.current);

    if (isNewTile || isExternalChange) {
      prevTileIdRef.current = catalogEntry.id;
      lastEmittedWindowRef.current = currentWindow;
      setError(null);

      if (!currentWindow) {
        setIsCustomMode(false);
        setSelectedPresetId('standard');
      } else {
        const matched = presets.find(
          (p) =>
            p.window &&
            p.window.count === currentWindow.count &&
            p.window.resolution === currentWindow.resolution,
        );
        if (matched) {
          setIsCustomMode(false);
          setSelectedPresetId(matched.id);
          setCustomCountInput(String(currentWindow.count));
          setCustomResolution(currentWindow.resolution);
        } else {
          setIsCustomMode(true);
          setSelectedPresetId('custom');
          setCustomCountInput(String(currentWindow.count));
          setCustomResolution(currentWindow.resolution);
        }
      }
    }
  }, [catalogEntry.id, currentWindow, presets]);

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

  const validateAndApplyCustom = (countRaw: string, resolution: TimeSeriesResolution) => {
    const count = parsePositiveInteger(countRaw);
    if (count === null) {
      setError('Bitte eine ganze Zahl von mindestens 1 eingeben.');
      return;
    }
    const max = getMaxCountForResolution(layer, resolution);
    if (max === null) {
      setError(`Auflösung '${resolution}' ist für diese Kennzahl unzulässig.`);
      return;
    }
    if (count > max) {
      setError(
        `Maximal ${max} ${
          resolution === 'stunde'
            ? 'Stunden'
            : resolution === 'tag'
              ? 'Tage'
              : resolution === 'woche'
                ? 'Wochen'
                : 'Monate'
        } zulässig.`,
      );
      return;
    }
    setError(null);
    const nextWindow: TimeWindowConfig = { count, resolution };
    lastEmittedWindowRef.current = nextWindow;
    onChangeWindow(nextWindow);
  };

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    setError(null);

    if (nextId === 'standard') {
      setIsCustomMode(false);
      setSelectedPresetId('standard');
      lastEmittedWindowRef.current = undefined;
      onChangeWindow(undefined);
      return;
    }
    if (nextId === 'custom') {
      setIsCustomMode(true);
      setSelectedPresetId('custom');
      validateAndApplyCustom(customCountInput, customResolution);
      return;
    }

    const matched = presets.find((p) => p.id === nextId);
    if (matched?.window) {
      setIsCustomMode(false);
      setSelectedPresetId(nextId);
      lastEmittedWindowRef.current = matched.window;
      onChangeWindow(matched.window);
    }
  };

  return (
    <div data-testid="inspector-time-window" className="space-y-1.5">
      <label className="text-xs font-medium text-[var(--color-text-muted)]">Zeitfenster</label>
      <select
        data-testid="inspector-window-preset-select"
        value={isCustomMode ? 'custom' : selectedPresetId}
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

      {isCustomMode && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              step={1}
              data-testid="inspector-window-custom-count"
              value={customCountInput}
              onChange={(e) => {
                const raw = e.target.value;
                setCustomCountInput(raw);
                validateAndApplyCustom(raw, customResolution);
              }}
              className="h-8 w-24 rounded border border-[var(--color-border,#1b3d39)] bg-black/40 px-2 text-xs text-white outline-none focus:border-primary"
            />
            <select
              data-testid="inspector-window-custom-resolution"
              value={customResolution}
              onChange={(e) => {
                const res = e.target.value as TimeSeriesResolution;
                setCustomResolution(res);
                validateAndApplyCustom(customCountInput, res);
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
