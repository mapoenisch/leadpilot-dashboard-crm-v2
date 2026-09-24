import type { ReactNode } from 'react';

// 067I / G52: Einheitliche Datenzustände je Route — loading, empty, error,
// ready. Statische Domänendaten sind stets ready/leer-sicher; async-Quellen
// nutzen alle vier Zustände ohne eigene Sonderlogik.
export type DataStateStatus = 'loading' | 'empty' | 'error' | 'ready';

export interface DataStateProps {
  status: DataStateStatus;
  loadingText?: string;
  emptyText?: string;
  errorText?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children: ReactNode;
}

export function DataState({
  status,
  loadingText = 'Daten werden geladen …',
  emptyText = 'Keine Daten vorhanden.',
  errorText = 'Daten konnten nicht geladen werden.',
  onRetry,
  retryLabel = 'Erneut versuchen',
  children,
}: DataStateProps) {
  if (status === 'loading') {
    return <p role="status">{loadingText}</p>;
  }
  if (status === 'empty') {
    return <p>{emptyText}</p>;
  }
  if (status === 'error') {
    return (
      <div role="alert">
        <p>{errorText}</p>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
