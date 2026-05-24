/**
 * ARV Trust Kernel v1 — hashing utilities.
 */

const HEX_RE = /^[0-9a-fA-F]*$/;

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string: length must be even.');
  }

  if (!HEX_RE.test(hex)) {
    throw new Error('Invalid hex string: contains non-hex characters.');
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

export function assertSha256Hex(value: string, label = 'hash'): void {
  if (value.length !== 64) {
    throw new Error(`Invalid ${label}: expected 64 hex characters.`);
  }

  if (!HEX_RE.test(value)) {
    throw new Error(`Invalid ${label}: contains non-hex characters.`);
  }
}

function toCleanArrayBuffer(input: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input;
  }

  const buffer = new ArrayBuffer(input.byteLength);
  const view = new Uint8Array(buffer);
  view.set(input);
  return buffer;
}

export async function sha256HexFromBytes(input: Uint8Array | ArrayBuffer): Promise<string> {
  const buffer = toCleanArrayBuffer(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return bytesToHex(new Uint8Array(digest));
}

export async function sha256HexFromString(input: string): Promise<string> {
  return sha256HexFromBytes(new TextEncoder().encode(input));
}

export function concatHexPair(leftHex: string, rightHex: string): Uint8Array {
  assertSha256Hex(leftHex, 'left hash');
  assertSha256Hex(rightHex, 'right hash');

  const left = hexToBytes(leftHex);
  const right = hexToBytes(rightHex);
  const combined = new Uint8Array(left.length + right.length);

  combined.set(left, 0);
  combined.set(right, left.length);

  return combined;
}
