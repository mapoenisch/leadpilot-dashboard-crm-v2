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

  for (;;) {
    signal?.throwIfAborted();
    if (now() - startedAt >= maxRuntimeMs) {
      throw new HubSpotPageLoaderError(
        'TIMEOUT_EXCEEDED',
        `HubSpot-Pagination überschreitet ${maxRuntimeMs} ms.`,
      );
    }

    let page: HubSpotPage<T>;
    let attempt = 0;
    for (;;) {
      try {
        page = await fetchPage(after, signal);
        break;
      } catch (error) {
        // Abbruch wird niemals wiederholt oder maskiert.
        if (isAbortError(error) || signal?.aborted) throw error;
        if (errorStatus(error) === 429 && attempt < maxRetries429) {
          await sleep(baseBackoffMs * 2 ** attempt);
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
