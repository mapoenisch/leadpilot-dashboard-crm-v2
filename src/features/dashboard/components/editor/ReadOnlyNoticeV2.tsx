// Auftrag 163 (P11b): Hinweisbalken für Team-Dashboards in der Leseansicht (canWrite === false).
// Bietet direkten Weg zum Anlegen einer persönlichen Kopie für eigene Änderungen.

import { Info, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ReadOnlyNoticeV2Props {
  teamName?: string | null;
  onSaveAsPersonalCopy: () => void | Promise<void>;
  copyError?: string | null;
  isCopying?: boolean;
  className?: string;
}

export function ReadOnlyNoticeV2({
  teamName,
  onSaveAsPersonalCopy,
  copyError,
  isCopying = false,
  className,
}: ReadOnlyNoticeV2Props) {
  const teamLabel = teamName ? `‚${teamName}‘` : 'dieses Teams';

  return (
    <div
      role="status"
      data-testid="readonly-notice-banner"
      className={`flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200 ${
        className ?? ''
      }`}
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
        <span>
          Nur Lesen – Team-Dashboard {teamLabel}. Für eigene Änderungen eine persönliche Kopie
          anlegen.
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        data-testid="copy-as-personal-button"
        disabled={isCopying}
        onClick={onSaveAsPersonalCopy}
        className="h-7 gap-1.5 border-amber-500/40 bg-amber-500/20 text-xs font-medium text-amber-100 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Copy className="h-3.5 w-3.5" />
        <span>{isCopying ? 'Wird kopiert…' : 'Als persönliche Kopie'}</span>
      </Button>
      {copyError && (
        <div
          role="alert"
          data-testid="readonly-copy-error"
          className="mt-1 w-full text-xs font-semibold text-rose-300"
        >
          {copyError}
        </div>
      )}
    </div>
  );
}
