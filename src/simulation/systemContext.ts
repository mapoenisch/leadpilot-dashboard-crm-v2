export interface SystemContext {
  now(): string; // ISO-8601 Zeitstempel
  nextScenarioId(): string;
  nextRunId(seed: number, versionNumber: number): string;
  nextCorrelationId(): string;
  newRunSeed(): number; // 100000..999999
}

function cryptoInt(): number {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  }
  // Nur als Fallback in Nicht-Browser-Umgebungen ohne WebCrypto.
  return Math.floor(Math.random() * 0xffffffff);
}

const realImpl: SystemContext = {
  now: () => new Date().toISOString(),
  nextScenarioId: () => `scen-${cryptoInt()}`,
  nextRunId: (seed, v) => `run-s${seed}-v${v}-${cryptoInt()}`,
  nextCorrelationId: () => `corr-${cryptoInt()}`,
  newRunSeed: () => 100000 + (cryptoInt() % 900000),
};

let active: SystemContext = realImpl;

export const systemContext = {
  now: () => active.now(),
  nextScenarioId: () => active.nextScenarioId(),
  nextRunId: (seed: number, v: number) => active.nextRunId(seed, v),
  nextCorrelationId: () => active.nextCorrelationId(),
  newRunSeed: () => active.newRunSeed(),

  /** Nur für Tests: einzelne Felder deterministisch überschreiben. */
  __overrideForTest(partial: Partial<SystemContext>) {
    active = { ...active, ...partial };
  },
  __resetForTest() {
    active = realImpl;
  },
};
