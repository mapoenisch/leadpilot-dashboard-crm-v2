/**
 * Reine Rechenfunktion für Kachel-Transformationen (Auftrag 169 / P14a).
 * Läuft außerhalb des Renderpfads; synchron in useMemo oder im Worker.
 */

import type { ResolvedTileData, TileData, TimeSeriesPoint } from '../../data/dashboardData';
import type { TileTransformation } from './types';
import { getUnitConversion } from './unitConversions';
import {
  attachTileStand,
  readTileStand,
  attachCrmQueryMeta,
  readCrmQueryMeta,
} from '../../time/useTimeControlledData';

export function getEffectiveUnit(
  baseUnit: string,
  kette?: readonly TileTransformation[] | null,
): string {
  if (!kette || kette.length === 0) return baseUnit;
  let unit = baseUnit;
  for (const step of kette) {
    if (step.art === 'einheit_umrechnen') {
      unit = step.zu;
    }
  }
  return unit;
}

export function getEffectiveTitle(
  baseTitle: string,
  kette?: readonly TileTransformation[] | null,
): string {
  if (!kette || kette.length === 0) return baseTitle;
  let title = baseTitle;
  for (const step of kette) {
    if (step.art === 'umbenennen') {
      title = step.name;
    }
  }
  return title;
}

export function formatTransformationSummary(kette?: readonly TileTransformation[] | null): string {
  if (!kette || kette.length === 0) return '';
  return kette
    .map((step) => {
      if (step.art === 'umbenennen') {
        return `Umbenannt in „${step.name}“`;
      }
      if (step.art === 'einheit_umrechnen') {
        return `${step.von} → ${step.zu}`;
      }
      if (step.art === 'gleitender_durchschnitt') {
        return `Gleitender Durchschnitt (${step.fenster} Punkte)`;
      }
      return '';
    })
    .filter(Boolean)
    .join(' · ');
}

export function applyTransformations<T extends TileData>(
  ergebnis: T,
  kette?: readonly TileTransformation[] | null,
): T {
  if (!kette || kette.length === 0 || ergebnis.state === 'nicht_verfuegbar') {
    return ergebnis;
  }

  let current: ResolvedTileData = { ...(ergebnis as ResolvedTileData) };

  for (const step of kette) {
    current = applySingleStep(current, step);
  }

  const stand = readTileStand(ergebnis);
  if (stand) {
    attachTileStand(current as unknown as TileData, stand);
  }
  const crmMeta = readCrmQueryMeta(ergebnis);
  if (crmMeta) {
    attachCrmQueryMeta(current as unknown as TileData, crmMeta);
  }

  return current as unknown as T;
}

function applySingleStep(data: ResolvedTileData, step: TileTransformation): ResolvedTileData {
  if (step.art === 'umbenennen') {
    return data;
  }

  if (step.art === 'einheit_umrechnen') {
    const conv = getUnitConversion(step.von, step.zu);
    const op = conv ? conv.operation : 'divide';
    const operand = conv ? conv.operand : 1;

    const convertNum = (val: number | null): number | null => {
      if (val === null || val === undefined) return null;
      return op === 'divide' ? val / operand : val * operand;
    };

    const nextValue = convertNum(data.value);
    const nextSeries = data.series
      ? data.series.map((item) => ({
          ...item,
          value: convertNum(item.value) ?? 0,
        }))
      : null;

    let nextTimeSeries = data.timeSeries;
    if (data.timeSeries) {
      nextTimeSeries = {
        ...data.timeSeries,
        points: data.timeSeries.points.map((p) => ({
          ...p,
          value: convertNum(p.value),
        })),
      };
    }

    return {
      ...data,
      unit: step.zu,
      value: nextValue,
      series: nextSeries,
      timeSeries: nextTimeSeries,
    };
  }

  if (step.art === 'gleitender_durchschnitt') {
    const fenster = step.fenster;
    if (!data.timeSeries && !data.series) {
      return data;
    }

    let nextTimeSeries = data.timeSeries;
    let nextValue = data.value;
    let nextSeries = data.series;

    if (data.timeSeries) {
      const origPoints = data.timeSeries.points;
      const computedPoints: TimeSeriesPoint[] = [];

      for (let i = 0; i < origPoints.length; i++) {
        const pt = origPoints[i];
        if (!pt) continue;
        if (i < fenster - 1) {
          computedPoints.push({
            ...pt,
            value: null,
            status: 'luecke',
          });
          continue;
        }

        const windowSlice = origPoints.slice(i - fenster + 1, i + 1);
        const hasGap = windowSlice.some(
          (p) => p.value === null || p.status === 'luecke' || p.status === 'vor_historienbeginn',
        );

        if (hasGap) {
          computedPoints.push({
            ...pt,
            value: null,
            status: 'luecke',
          });
        } else {
          const sum = windowSlice.reduce((acc, p) => acc + (p.value ?? 0), 0);
          const avg = sum / fenster;
          computedPoints.push({
            ...pt,
            value: avg,
            status: 'belegt',
          });
        }
      }

      nextTimeSeries = {
        ...data.timeSeries,
        points: computedPoints,
      };

      // Letzten geglätteten Wert ableiten (oder null bei Lücke/Fehlen)
      const latestPoint = computedPoints[computedPoints.length - 1];
      nextValue =
        latestPoint && latestPoint.status === 'belegt' && latestPoint.value !== null
          ? latestPoint.value
          : null;

      // Kurzfassung (series) aus den geglätteten belegten Punkten ableiten
      if (data.series) {
        const labelByAt = new Map<string, string>();
        let sIdx = 0;
        for (const pt of origPoints) {
          const sItem = data.series[sIdx];
          if (pt.status === 'belegt' && pt.value !== null && sItem) {
            labelByAt.set(pt.at, sItem.label);
            sIdx++;
          }
        }
        nextSeries = computedPoints
          .filter((p) => p.status === 'belegt' && p.value !== null)
          .map((p) => ({
            label: labelByAt.get(p.at) ?? p.at,
            value: p.value as number,
          }));
      }
    } else if (data.series) {
      const origSeries = data.series;
      nextSeries = origSeries.map((item, i) => {
        if (i < fenster - 1) {
          return { ...item, value: 0 };
        }
        const slice = origSeries.slice(i - fenster + 1, i + 1);
        const sum = slice.reduce((acc, s) => acc + s.value, 0);
        return { ...item, value: sum / fenster };
      });
      const lastItem = nextSeries[nextSeries.length - 1];
      nextValue = lastItem ? lastItem.value : null;
    }

    return {
      ...data,
      value: nextValue,
      series: nextSeries,
      timeSeries: nextTimeSeries,
    };
  }

  return data;
}
