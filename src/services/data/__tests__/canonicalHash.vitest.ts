import { describe, it, expect } from 'vitest';
import { canonicalStringify, canonicalSha256, deepFreeze } from '../canonicalHash';

describe('067E G48 canonicalHash', () => {
  it('ist invariant gegenüber Key-Reihenfolge (flach und verschachtelt)', async () => {
    const a = { name: 'Acme', id: 'c1', audit: { valid: 1, errors: 0 } };
    const b = { audit: { errors: 0, valid: 1 }, id: 'c1', name: 'Acme' };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    expect(await canonicalSha256(a)).toBe(await canonicalSha256(b));
  });

  it('liefert SHA-256 als 64-stelligen Hex-String, deterministisch', async () => {
    const h1 = await canonicalSha256({ x: [1, 2, 3] });
    const h2 = await canonicalSha256({ x: [1, 2, 3] });
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h1).toBe(h2);
  });

  it('unterscheidet Inhalte und ist array-ordnungssensitiv', async () => {
    const base = await canonicalSha256({ x: [1, 2] });
    expect(await canonicalSha256({ x: [1, 3] })).not.toBe(base);
    expect(await canonicalSha256({ x: [2, 1] })).not.toBe(base);
    expect(await canonicalSha256({ x: [1, 2], y: 1 })).not.toBe(base);
  });

  it('deepFreeze friert rekursiv ein', () => {
    const obj = { list: [{ id: 'a' }], nested: { n: 1 } };
    const frozen = deepFreeze(obj);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.list)).toBe(true);
    expect(Object.isFrozen(frozen.list[0])).toBe(true);
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(() => {
      (frozen.list as unknown[]).push({ id: 'b' });
    }).toThrow();
    expect(frozen.list).toHaveLength(1);
  });
});
