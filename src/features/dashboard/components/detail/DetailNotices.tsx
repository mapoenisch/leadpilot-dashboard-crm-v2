// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Zustände der Detailseite ohne Kachel (laden,
// keine Sitzung, Ladefehler) und die verständliche Rückkehr bei unbekannter oder gelöschter Kachel.
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DETAIL_CARD } from './detailStyles';

export const MISSING_TILE_TEXT = 'Diese Kachel gibt es in deinem Dashboard nicht mehr.';

const STATUS_TEXT = {
  laden: 'Details werden geladen …',
  keine_sitzung: 'Bitte melde dich an, um die Details zu sehen.',
  fehler: 'Dein Dashboard konnte nicht geladen werden.',
} as const;

export function DetailStatus(props: { kind: keyof typeof STATUS_TEXT; onReload?: () => void }) {
  return (
    <Card variant="glass" className={DETAIL_CARD} data-testid={`tile-detail-${props.kind}`}>
      {/* Gleiche Mindesthöhe wie Kopf und Kennzahlen der fertigen Seite: kein Sprung nach dem Laden. */}
      <div
        role={props.kind === 'fehler' ? 'alert' : 'status'}
        className="flex min-h-[160px] flex-wrap items-center gap-[10px] text-[14px] text-[var(--color-text-muted)]"
      >
        <span>{STATUS_TEXT[props.kind]}</span>
        {props.onReload ? (
          <Button size="sm" onClick={props.onReload}>
            Erneut laden
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function DetailMissingTile({ onBack }: { onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <Card variant="glass" className={DETAIL_CARD} data-testid="tile-detail-missing">
      <div className="flex flex-col items-start gap-[12px]">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="m-0 text-[20px] font-semibold text-[var(--color-text-primary,#fff)] outline-none"
        >
          Kachel nicht gefunden
        </h2>
        <p role="status" className="m-0 text-[14px] text-[var(--color-text-muted)]">
          {MISSING_TILE_TEXT} Vielleicht wurde sie entfernt oder der Link ist veraltet.
        </p>
        <Button size="sm" onClick={onBack}>
          Zurück zum Dashboard
        </Button>
      </div>
    </Card>
  );
}
