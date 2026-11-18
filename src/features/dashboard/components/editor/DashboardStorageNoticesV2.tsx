import { Info } from 'lucide-react';
import type { DashboardV2StorageError } from '../../services/dashboardStorageV2Types';
import { getDashboardTeamErrorMessage } from '../../model/dashboardTeamMessages';

export interface DashboardStorageNoticesV2Props {
  fallbackNotice?: string | null;
  onClearFallbackNotice?: () => void;
  storageError?: DashboardV2StorageError | null;
  onClearStorageError?: () => void;
}

export function DashboardStorageNoticesV2({
  fallbackNotice,
  onClearFallbackNotice,
  storageError,
  onClearStorageError,
}: DashboardStorageNoticesV2Props) {
  return (
    <>
      {fallbackNotice && (
        <div
          role="status"
          data-testid="dashboard-fallback-notice"
          className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>{fallbackNotice}</span>
          </div>
          <button
            type="button"
            data-testid="dismiss-fallback-notice"
            onClick={onClearFallbackNotice}
            className="text-xs text-amber-300 hover:text-white"
          >
            Ausblenden
          </button>
        </div>
      )}
      {storageError && (
        <div
          role="alert"
          data-testid="dashboard-storage-error-notice"
          className="flex items-center justify-between border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
            <span>{getDashboardTeamErrorMessage(storageError)}</span>
          </div>
          <button
            type="button"
            data-testid="dismiss-storage-error-notice"
            onClick={onClearStorageError}
            className="text-xs text-rose-300 hover:text-white"
          >
            Ausblenden
          </button>
        </div>
      )}
    </>
  );
}
