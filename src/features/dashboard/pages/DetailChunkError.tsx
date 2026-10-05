// Executive Dashboard, Teilauftrag 7 (Auftrag 077): Ersatz, wenn der Code der Detailseite nicht
// nachgeladen werden kann (z. B. nach einem Deployment). React hält einen fehlgeschlagenen Lazy-
// Import fest; nur ein Neuladen der Seite holt ihn erneut. Die gespeicherte Ansicht bleibt erhalten.
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const DETAIL_CHUNK_ERROR_TEXT = 'Die Detailseite konnte nicht geladen werden.';

export function DetailChunkError({ onReload = () => window.location.reload() }) {
  return (
    <Card variant="glass" data-testid="tile-detail-chunk-error">
      <div role="alert" className="flex flex-wrap items-center gap-[10px] text-[14px]">
        <span>{DETAIL_CHUNK_ERROR_TEXT}</span>
        <Button size="sm" onClick={onReload}>
          Erneut laden
        </Button>
        <Link
          to="/dashboard"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Zurück zum Dashboard
        </Link>
      </div>
    </Card>
  );
}
