// 067E / G48 — kanonische Serialisierung, SHA-256, Deep-Clone und Deep-Freeze
// für Baseline-Datensätze (Design §7.1). Der Hash läuft über eine
// kanonisch serialisierte Darstellung mit sortierten Keys; er ist damit
// unabhängig von Key-Reihenfolge, aber sensitiv gegenüber Inhalten.

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Kanonische Stringifizierung: Records mit sortierten Keys (rekursiv),
 * Arrays in Reihenfolge, Primitive in JSON-Semantik (`-0` → `0`,
 * nicht-finite Zahlen → `null`). Wirft bei nicht serialisierbaren Werten
 * (undefined, Funktionen, Symbole, BigInt) und Zyklen statt still zu
 * raten — ein Hash darf niemals über undefiniertem Material stehen.
 */
export function canonicalStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const encode = (v: unknown): string => {
    if (v === null) return 'null';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') {
      if (v === 0) return '0';
      if (!Number.isFinite(v)) return 'null';
      return JSON.stringify(v);
    }
    if (Array.isArray(v)) {
      if (seen.has(v)) throw new Error('canonicalStringify: Zyklus erkannt.');
      seen.add(v);
      const out = `[${v.map(encode).join(',')}]`;
      seen.delete(v);
      return out;
    }
    if (isPlainRecord(v)) {
      if (seen.has(v)) throw new Error('canonicalStringify: Zyklus erkannt.');
      seen.add(v);
      const out = `{${Object.keys(v)
        .sort()
        .map((k) => `${JSON.stringify(k)}:${encode(v[k])}`)
        .join(',')}}`;
      seen.delete(v);
      return out;
    }
    throw new Error(`canonicalStringify: nicht serialisierbarer Wert (${typeof v}).`);
  };
  return encode(value);
}

/** SHA-256 über die kanonische Darstellung als 64-stelliger Hex-String. */
export async function canonicalSha256(value: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('canonicalSha256: WebCrypto (SubtleCrypto) nicht verfügbar.');
  }
  const bytes = new TextEncoder().encode(canonicalStringify(value));
  const digest = await subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Strukturierter Tiefen-Klon (keine geteilten Referenzen mit der Quelle). */
export function deepClone<T>(value: T): T {
  return globalThis.structuredClone(value);
}

/** Rekursives Einfrieren; gibt dieselbe Referenz typisiert zurück. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    if (Array.isArray(value)) {
      for (const entry of value) deepFreeze(entry);
    } else if (isPlainRecord(value)) {
      for (const key of Object.keys(value)) deepFreeze(value[key]);
    }
    Object.freeze(value);
  }
  return value;
}
