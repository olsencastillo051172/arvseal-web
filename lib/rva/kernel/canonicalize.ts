/**
 * ARV Trust Kernel v1 — deterministic JSON canonicalization.
 *
 * Internal path remains lib/rva for repository compatibility.
 * Public semantic name remains ARV.
 *
 * Assumptions:
 * - ARV records use JSON-compatible values.
 * - Object keys are sorted lexicographically.
 * - Array order is preserved.
 * - Undefined object fields are omitted.
 * - NaN, Infinity, functions, symbols, and bigint are rejected.
 */

export type ARVCanonicalJsonValue =
  | null
  | string
  | number
  | boolean
  | ARVCanonicalJsonValue[]
  | { [key: string]: ARVCanonicalJsonValue | undefined };

function assertFiniteNumber(value: number): void {
  if (!Number.isFinite(value)) {
    throw new TypeError('ARV canonicalization rejects NaN and Infinity.');
  }
}

export function canonicalize(value: unknown): string {
  if (value === null) return 'null';

  if (typeof value === 'string') return JSON.stringify(value);

  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') {
    assertFiniteNumber(value);
    return JSON.stringify(value);
  }

  if (typeof value === 'bigint') {
    throw new TypeError('ARV canonicalization rejects bigint.');
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    throw new TypeError('ARV canonicalization rejects non-JSON values.');
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (item === undefined) {
        throw new TypeError('ARV canonicalization rejects undefined array items.');
      }
      return canonicalize(item);
    });

    return `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();

    const entries = keys.map((key) => {
      return `${JSON.stringify(key)}:${canonicalize(record[key])}`;
    });

    return `{${entries.join(',')}}`;
  }

  throw new TypeError('Unsupported ARV canonicalization value.');
}
