// Executive Dashboard V2 (Auftrag 166 / P13a, Auftrag 168 / P13c):
// Kachelanzeige für Schwellenwert-Badge (Client-Bewertung) und Alarmglocke (Server-Status).
// Auftrag 168 §2.1 Nr. 7, Nr. 11a, Nr. 19.

import React from 'react';
import { AlertCircle, AlertTriangle, Bell, BellOff, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThresholdEvaluationResult } from '../model/thresholdRuleV2';
import { isDataOlderThanMaxAlarmAge } from '../model/alarmDataAge';
import { THRESHOLD_MESSAGES } from '../model/thresholdMessages';

export interface TileThresholdBadgeProps {
  evaluation: ThresholdEvaluationResult;
  dataTimestamp?: string | number | Date | null;
  alarmStatus?:
    | 'aktiv'
    | 'pausiert'
    | 'regel_ungueltig'
    | 'verantwortlicher_ohne_rechte'
    | 'kachel_entfernt'
    | string
    | null;
  alarmPauseReason?: string | null;
  className?: string;
}

export const TileThresholdBadge: React.FC<TileThresholdBadgeProps> = React.memo(
  ({ evaluation, dataTimestamp, alarmStatus, alarmPauseReason, className }) => {
    // 11a: Live-Einzelwerte älter als 24 Stunden als nicht_bewertet einstufen
    const isStale = isDataOlderThanMaxAlarmAge(dataTimestamp);
    const effectiveEval: ThresholdEvaluationResult = isStale
      ? { stufe: 'nicht_bewertet', text: 'Letzter Wert älter als 24 Stunden' }
      : evaluation;

    const { stufe, text } = effectiveEval;
    const isOverdueData = isStale || (stufe === 'nicht_bewertet' && text.includes('24 Stunden'));
    // Auftrag 171: veraltete Werte (z. B. Kiosk offline) werden sichtbar nicht bewertet.
    const isStaleState =
      !isOverdueData &&
      stufe === 'nicht_bewertet' &&
      text === THRESHOLD_MESSAGES.nichtBewertetVeraltet;

    const isAlarmActive = alarmStatus === 'aktiv';
    const isAlarmPaused =
      alarmStatus === 'pausiert' ||
      alarmStatus === 'verantwortlicher_ohne_rechte' ||
      alarmStatus === 'regel_ungueltig';

    const showBadge =
      isOverdueData ||
      isStaleState ||
      stufe === 'warnung' ||
      stufe === 'kritisch' ||
      stufe === 'regel_ungueltig';

    if (!showBadge && !isAlarmActive && !isAlarmPaused) {
      return null;
    }

    const isKritisch = stufe === 'kritisch';
    const isWarnung = stufe === 'warnung';

    const badgeText = isOverdueData
      ? 'Letzter Wert älter als 24 Stunden'
      : isStaleState
        ? 'Nicht bewertet (veraltet)'
        : isKritisch
          ? 'Kritisch'
          : isWarnung
            ? 'Warnung'
            : 'Schwellenwert prüfen';

    // Auftrag 171: neutrale Tokens statt fester Dunkeltöne, damit der Hinweis auch hell lesbar ist.
    const colorClasses =
      isStaleState || isOverdueData
        ? 'border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)]'
        : isKritisch
          ? 'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-700/80 dark:bg-rose-950/70 dark:text-rose-200'
          : 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700/80 dark:bg-amber-950/70 dark:text-amber-200';

    return (
      <div className={cn('inline-flex items-center gap-1.5', className)}>
        {/* Alarm-Symbol (Auftrag 168 §2.1 Nr. 7) */}
        {isAlarmActive && (
          <div
            data-testid="tile-alarm-bell"
            data-alarm-status="aktiv"
            role="status"
            tabIndex={0}
            title="Alarm aktiv, Prüfung alle 5 Minuten"
            aria-label="Alarm aktiv, Prüfung alle 5 Minuten"
            className="inline-flex items-center justify-center p-0.5 rounded text-primary hover:text-primary-focus cursor-help select-none"
          >
            <span
              data-testid="tile-alarm-indicator-active"
              title="Alarm aktiv, Prüfung alle 5 Minuten"
              className="inline-flex items-center justify-center"
            >
              <Bell className="h-3 w-3 shrink-0" aria-hidden="true" />
            </span>
          </div>
        )}

        {isAlarmPaused && (
          <div
            data-testid="tile-alarm-bell"
            data-alarm-status="pausiert"
            role="status"
            tabIndex={0}
            title={alarmPauseReason ? `Alarm pausiert: ${alarmPauseReason}` : 'Alarm pausiert'}
            aria-label={alarmPauseReason ? `Alarm pausiert: ${alarmPauseReason}` : 'Alarm pausiert'}
            className="inline-flex items-center justify-center p-0.5 rounded text-[var(--color-text-muted)] hover:text-white cursor-help select-none"
          >
            <span
              data-testid="tile-alarm-indicator-paused"
              title={alarmPauseReason ? `Alarm pausiert: ${alarmPauseReason}` : 'Alarm pausiert'}
              className="inline-flex items-center justify-center"
            >
              <BellOff className="h-3 w-3 shrink-0" aria-hidden="true" />
            </span>
          </div>
        )}

        {/* Schwellenwert-Badge (Client-Bewertung) */}
        {showBadge && (
          <div
            data-testid="tile-threshold-badge"
            data-threshold-stufe={stufe}
            role="status"
            tabIndex={0}
            aria-label={`Schwellenwert: ${text}`}
            title={text}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none select-none cursor-help focus:outline-none focus:ring-1 focus:ring-primary',
              colorClasses,
            )}
          >
            {isOverdueData || isStaleState ? (
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
            ) : isKritisch ? (
              <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            <span>{badgeText}</span>
          </div>
        )}
      </div>
    );
  },
);
