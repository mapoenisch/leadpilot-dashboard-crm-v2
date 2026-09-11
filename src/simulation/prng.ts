/**
 * Pure seedable Pseudo-Random Number Generator (PRNG) using Mulberry32 algorithm.
 * 100% deterministic, zero wall-clock or global state dependency.
 */
export class DeterministicRNG {
  private state: number;
  private readonly seed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.state = seed >>> 0;
  }

  public getSeed(): number {
    return this.seed;
  }

  public getState(): number {
    return this.state;
  }

  /**
   * Generates a deterministic float in [0, 1)
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a deterministic integer in range [min, max] inclusive
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Picks an element from an array deterministically
   */
  public pick<T>(arr: T[]): T {
    if (arr.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const idx = Math.floor(this.next() * arr.length);
    const picked = arr[idx];
    if (picked === undefined) {
      // Unerreichbar: next() liegt in [0, 1), idx damit in [0, arr.length).
      throw new Error('Zufallsindex außerhalb des gültigen Bereichs.');
    }
    return picked;
  }

  /**
   * Returns true with the given probability (0.0 to 1.0)
   */
  public nextBoolean(probability = 0.5): boolean {
    return this.next() < probability;
  }
}
