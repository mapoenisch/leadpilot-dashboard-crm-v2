// Executive Dashboard V2 (Auftrag 168 / P13c §2.1 Nr. 3–5):
// Einzelne Alarmmeldung in der Alarmliste mit Wechsel, Kachel-Link, Lesebestätigung und Quittierung.

import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { canAcknowledgeAlarmEvent } from '../../model/dashboardAlarmPermitted';
import type { DashboardAlarmEventItem } from '../../services/dashboardAlarmService';

export interface AlarmEventItemRowProps {
  event: DashboardAlarmEventItem;
  onMarkRead: (eventId: string) => Promise<void>;
  onOpenAcknowledge: (event: DashboardAlarmEventItem) => void;
}

export const AlarmEventItemRow: React.FC<AlarmEventItemRowProps> = ({
  event,
  onMarkRead,
  onOpenAcknowledge,
}) => {
  const isKritisch = event.neuerZustand === 'kritisch';
  const isWarnung = event.neuerZustand === 'warnung';
  const canAck = canAcknowledgeAlarmEvent(event.neuerZustand);

  const formattedDate = new Date(event.createdAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      data-testid="alarm-event-item"
      data-event-id={event.id}
      data-gelesen={String(event.gelesen)}
      className={`rounded-lg border p-4 transition-colors ${
        !event.gelesen
          ? 'border-primary/40 bg-surface-raised/60'
          : 'border-border/60 bg-surface/30'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Status Icon */}
          <div className="mt-0.5 shrink-0">
            {isKritisch ? (
              <AlertCircle className="h-5 w-5 text-rose-400" />
            ) : isWarnung ? (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <span className="font-semibold text-white">{event.dashboardTitle}</span>
              <span className="text-[var(--color-text-muted)]">·</span>
              <Link
                to={`/dashboard?kachel=${encodeURIComponent(event.tileId)}`}
                onClick={() => {
                  if (!event.gelesen) {
                    onMarkRead(event.id);
                  }
                }}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                title="Zur Kachel springen"
              >
                <span>{event.tileId}</span>
                <ExternalLink size={11} aria-hidden="true" />
              </Link>
              <span className="text-[var(--color-text-muted)]">·</span>
              <span className="text-[11px] text-[var(--color-text-muted)]">{formattedDate}</span>
              {!event.gelesen && (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Neu
                </span>
              )}
            </div>

            {/* Zustandswechsel */}
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="capitalize text-[var(--color-text-muted)]">
                {event.alterZustand}
              </span>
              <ArrowRight size={12} className="text-[var(--color-text-muted)]" />
              <span
                className={`font-semibold capitalize ${
                  isKritisch ? 'text-rose-400' : isWarnung ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {event.neuerZustand}
              </span>
              <span className="text-[var(--color-text-muted)]">— {event.meldung}</span>
            </div>

            {/* Messwert & Grenze */}
            {event.messwert !== null && (
              <div className="text-[11px] text-[var(--color-text-soft)]">
                Messwert: <strong className="text-white">{event.messwert}</strong>{' '}
                {event.einheit ?? ''}{' '}
                {event.grenze !== null && (
                  <span>
                    (Schwelle: <strong className="text-white">{event.grenze}</strong>)
                  </span>
                )}
              </div>
            )}

            {/* Bisherige Quittierungen */}
            {event.quittiertVon.length > 0 && (
              <div
                data-testid="acknowledgement-list"
                className="mt-2 space-y-1 border-t border-border-soft pt-2 text-[11px]"
              >
                <div className="font-medium text-[var(--color-text-soft)]">Quittiert von:</div>
                {event.quittiertVon.map((ack, idx) => (
                  <div
                    key={`${ack.userId}-${idx}`}
                    className="flex items-start gap-1 text-[var(--color-text-muted)]"
                  >
                    <Check size={12} className="mt-0.5 text-emerald-400 shrink-0" />
                    <span>
                      <strong className="text-text">{ack.email}</strong> (
                      {new Date(ack.quittiertAt).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      )
                      {ack.kommentar && (
                        <span className="italic text-white"> — „{ack.kommentar}“</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Aktionen rechts */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs mt-2 sm:mt-0">
          {!event.gelesen && (
            <button
              type="button"
              data-testid="mark-event-read-btn"
              onClick={() => onMarkRead(event.id)}
              className="rounded border border-border bg-transparent px-2.5 py-1 text-[11px] text-[var(--color-text-soft)] hover:bg-surface-raised hover:text-white transition-colors cursor-pointer"
            >
              Als gelesen markieren
            </button>
          )}

          {canAck && (
            <button
              type="button"
              data-testid={`alarm-ack-btn-${event.id}`}
              onClick={() => onOpenAcknowledge(event)}
              className="flex items-center gap-1 rounded bg-surface-raised border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-black transition-colors cursor-pointer"
            >
              <MessageSquare size={12} />
              Quittieren
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
