// 067H / G51 — HubSpot-Pagination mit Härtung (Design §10.2): Alle Seiten
// werden über `paging.next.after` vollständig geladen; 429-Backoff mit
// Obergrenze, Abbruchsignal und Maximallaufzeit sind verpflichtend. Kein
// 100er-Limit als stilles Ende — ohne `after`-Cursor endet die Kette.

export interface HubSpotPage<T> {
  results: T[];
  paging?: { next?: { after?: string } };
}

export type FetchHubSpotPage<T> = (
  after: string | undefined,
  signal?: AbortSignal,
) => Promise<HubSpotPage<T>>;

export interface PageLoaderOptions {
  signal?: AbortSignal;
  /** Maximallaufzeit in ms (Default 120 000). */
  maxRuntimeMs?: number;
  /** 429-Wiederholungen je Seite (Default 5). */
  maxRetries429?: number;
  /** Basis-Backoff in ms, verdoppelt je Versuch (Default 1000). */
  baseBackoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export type PageLoaderErrorCode = 'RATE_LIMITED' | 'TIMEOUT_EXCEEDED';

export class HubSpotPageLoaderError extends Error {
  constructor(
    public code: PageLoaderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HubSpotPageLoaderError';
  }
}

function errorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { code?: unknown }).code === 'ABORT_ERR')
  );
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function loadAllPages<T>(
  fetchPage: FetchHubSpotPage<T>,
  opts: PageLoaderOptions = {},
): Promise<T[]> {
  const {
    signal,
    maxRuntimeMs = 120_000,
    maxRetries429 = 5,
    baseBackoffMs = 1000,
    sleep = defaultSleep,
    now = () => Date.now(),
  } = opts;
  const startedAt = now();
  const all: T[] = [];
  let after: string | undefined;

  const elapsed = (): number => now() - startedAt;

  /** Fetch mit Deadline-Kopplung: Budget aufgebraucht oder hängend → Timeout. */
  const runFetch = async (cursor: string | undefined): Promise<HubSpotPage<T>> => {
    const remaining = maxRuntimeMs - elapsed();
    if (remaining <= 0) {
      throw new HubSpotPageLoaderError(
        'TIMEOUT_EXCEEDED',
        `HubSpot-Pagination überschreitet ${maxRuntimeMs} ms.`,
      );
    }
    const controller = new AbortController();
    const onExternalAbort = (): void => controller.abort();
    signal?.addEventListener('abort', onExternalAbort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, remaining);
    // Node < 20 kennt kein AbortSignal.any — manuelle Kopplung.
    try {
      return await fetchPage(cursor, controller.signal);
    } catch (error) {
      if (timedOut) {
        throw new HubSpotPageLoaderError(
          'TIMEOUT_EXCEEDED',
          `HubSpot-Request überschreitet Restbudget von ${remaining} ms.`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onExternalAbort);
    }
  };

  for (;;) {
    signal?.throwIfAborted();
    if (elapsed() >= maxRuntimeMs) {
      throw new HubSpotPageLoaderError(
        'TIMEOUT_EXCEEDED',
        `HubSpot-Pagination überschreitet ${maxRuntimeMs} ms.`,
      );
    }

    let page: HubSpotPage<T>;
    let attempt = 0;
    for (;;) {
      try {
        page = await runFetch(after);
        break;
      } catch (error) {
        // Abbruch wird niemals wiederholt oder maskiert.
        if (isAbortError(error) || signal?.aborted) throw error;
        if (errorStatus(error) === 429 && attempt < maxRetries429) {
          const delay = baseBackoffMs * 2 ** attempt;
          // Backoff ohne Restbudget ist zwecklos — sofort abbrechen statt
          // schlafen und danach doch erfolgreich zu liefern.
          if (elapsed() + delay > maxRuntimeMs) {
            throw new HubSpotPageLoaderError(
              'TIMEOUT_EXCEEDED',
              `Backoff (${delay} ms) sprengt Restbudget von ${maxRuntimeMs} ms.`,
            );
          }
          await sleep(delay);
          attempt += 1;
          continue;
        }
        if (errorStatus(error) === 429) {
          throw new HubSpotPageLoaderError(
            'RATE_LIMITED',
            `HubSpot-Rate-Limit nach ${maxRetries429} Wiederholungen.`,
          );
        }
        throw error;
      }
    }

    all.push(...page.results);
    const nextAfter = page.paging?.next?.after;
    if (!nextAfter) return all;
    after = nextAfter;
  }
}
