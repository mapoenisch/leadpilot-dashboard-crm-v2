import { describe, it, expect, vi } from 'vitest';
import { loadAllPages, type HubSpotPage } from '../hubSpotPageLoader';

function page<T>(results: T[], after?: string): HubSpotPage<T> {
  return after === undefined ? { results } : { results, paging: { next: { after } } };
}

function httpError(status: number): Error & { status: number } {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

describe('067H G51 hubSpotPageLoader', () => {
  it('lädt alle Seiten über paging.next.after bis zum Ende', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page([1, 2], 'cursor-1'))
      .mockResolvedValueOnce(page([3, 4], 'cursor-2'))
      .mockResolvedValueOnce(page([5]));
    const all = await loadAllPages((after) => fetchPage(after), {
      sleep: () => Promise.resolve(),
    });
    expect(all).toEqual([1, 2, 3, 4, 5]);
    expect(fetchPage.mock.calls.map((c) => c[0])).toEqual([undefined, 'cursor-1', 'cursor-2']);
  });

  it('429 führt zu Backoff mit Obergrenze, danach Erfolg', async () => {
    const sleeps: number[] = [];
    const fetchPage = vi
      .fn()
      .mockRejectedValueOnce(httpError(429))
      .mockRejectedValueOnce(httpError(429))
      .mockResolvedValueOnce(page(['ok']));
    const all = await loadAllPages((after) => fetchPage(after), {
      baseBackoffMs: 10,
      maxRetries429: 5,
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
    });
    expect(all).toEqual(['ok']);
    expect(sleeps).toEqual([10, 20]);
  });

  it('429 über der Obergrenze bricht mit RATE_LIMITED ab', async () => {
    const fetchPage = vi.fn().mockRejectedValue(httpError(429));
    await expect(
      loadAllPages((after) => fetchPage(after), {
        baseBackoffMs: 1,
        maxRetries429: 2,
        sleep: () => Promise.resolve(),
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    // 1 Versuch + 2 Wiederholungen.
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('Abort bricht ohne Wiederholung ab', async () => {
    const controller = new AbortController();
    const fetchPage = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
    await expect(
      loadAllPages((after, signal) => fetchPage(after, signal), {
        signal: controller.signal,
        sleep: () => Promise.resolve(),
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('Maximallaufzeit bricht mit TIMEOUT_EXCEEDED ab', async () => {
    let now = 0;
    const fetchPage = vi.fn().mockImplementation(() => {
      now += 60;
      return Promise.resolve(page([1], 'cursor-1'));
    });
    await expect(
      loadAllPages((after) => fetchPage(after), {
        maxRuntimeMs: 100,
        now: () => now,
        sleep: () => Promise.resolve(),
      }),
    ).rejects.toMatchObject({ code: 'TIMEOUT_EXCEEDED' });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('andere HTTP-Fehler werden sofort weitergereicht', async () => {
    const fetchPage = vi.fn().mockRejectedValue(httpError(500));
    await expect(
      loadAllPages((after) => fetchPage(after), { sleep: () => Promise.resolve() }),
    ).rejects.toMatchObject({ status: 500 });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
