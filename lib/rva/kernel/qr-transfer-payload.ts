/**
 * ARV Trust Kernel — QR-Safe Transfer Payload v1
 * Scope: LOCAL_L0 only.
 * No QR image generation · No UI · No DemoClient changes · No ARV Authority.
 *
 * Creates a deterministic QR-safe transfer string:
 * ARV1:<base64url-canonical-json>
 */

import { canonicalize } from './canonicalize';
import { sha256HexFromString } from './hash';

export type ARVQrTransferPayloadScope = 'LOCAL_L0';
export type ARVQrTransferPayloadFormat = 'ARV-QR-TRANSFER-PAYLOAD-v1';
export type ARVQrTransferPayloadAlgorithm = 'SHA-256';
export type ARVQrTransferPayloadEncoding = 'base64url-json';
export type ARVQrTransferPayloadPrefix = 'ARV1';

export interface ARVQrTransferPayloadInput {
  evidence_id: string;
  verifier_payload_hash: string;
  manifest_hash: string;
  checkpoint_hash: string;
  package_index_hash?: string;
  zip_sha256?: string;
  created_at_utc?: string;
  policy?: string;
  producer?: string;
}

export interface ARVQrTransferPayloadBody {
  format: ARVQrTransferPayloadFormat;
  scope: ARVQrTransferPayloadScope;
  algorithm: ARVQrTransferPayloadAlgorithm;
  encoding: ARVQrTransferPayloadEncoding;
  evidence_id: string;
  verifier_payload_hash: string;
  manifest_hash: string;
  checkpoint_hash: string;
  package_index_hash?: string;
  zip_sha256?: string;
  created_at_utc: string;
  policy: string;
  producer: string;
  transfer_hash: string;
}

export interface ARVQrTransferPayloadArtifact {
  prefix: ARVQrTransferPayloadPrefix;
  body: ARVQrTransferPayloadBody;
  transfer_string: string;
}

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function isQrSafeTransferString(value: string): boolean {
  return /^[A-Za-z0-9\-_:]+$/.test(value);
}

function base64UrlEncodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
function base64UrlDecodeUtf8(value: string): string {
  if (!/^[A-Za-z0-9\-_]+$/.test(value)) {
    throw new Error('ARV QR transfer: malformed base64url payload');
  }

  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');

  let binary: string;

  try {
    binary = atob(base64);
  } catch {
    throw new Error('ARV QR transfer: invalid base64url payload');
  }

  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
}

function validateInput(input: ARVQrTransferPayloadInput): void {
  if (!input || typeof input !== 'object') {
    throw new Error('ARV QR transfer: input is required');
  }

  if (!input.evidence_id?.trim()) {
    throw new Error('ARV QR transfer: evidence_id is required');
  }

  if (!isHex64(input.verifier_payload_hash)) {
    throw new Error('ARV QR transfer: verifier_payload_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.manifest_hash)) {
    throw new Error('ARV QR transfer: manifest_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.checkpoint_hash)) {
    throw new Error('ARV QR transfer: checkpoint_hash must be 64-char lowercase hex');
  }

  if (input.package_index_hash !== undefined && !isHex64(input.package_index_hash)) {
    throw new Error('ARV QR transfer: package_index_hash must be 64-char lowercase hex');
  }

  if (input.zip_sha256 !== undefined && !isHex64(input.zip_sha256)) {
    throw new Error('ARV QR transfer: zip_sha256 must be 64-char lowercase hex');
  }
}

function validateBodyFields(body: ARVQrTransferPayloadBody): string | null {
  if (!body || typeof body !== 'object') return 'body missing';

  if (body.format !== 'ARV-QR-TRANSFER-PAYLOAD-v1') return 'format invalid';
  if (body.scope !== 'LOCAL_L0') return 'scope invalid';
  if (body.algorithm !== 'SHA-256') return 'algorithm invalid';
  if (body.encoding !== 'base64url-json') return 'encoding invalid';

  if (!body.evidence_id?.trim()) return 'evidence_id missing';

  if (!isHex64(body.verifier_payload_hash)) return 'verifier_payload_hash invalid';
  if (!isHex64(body.manifest_hash)) return 'manifest_hash invalid';
  if (!isHex64(body.checkpoint_hash)) return 'checkpoint_hash invalid';

  if (body.package_index_hash !== undefined && !isHex64(body.package_index_hash)) {
    return 'package_index_hash invalid';
  }

  if (body.zip_sha256 !== undefined && !isHex64(body.zip_sha256)) {
    return 'zip_sha256 invalid';
  }

  if (!body.created_at_utc?.trim()) return 'created_at_utc missing';
  if (!body.policy?.trim()) return 'policy missing';
  if (!body.producer?.trim()) return 'producer missing';

  if (!isHex64(body.transfer_hash)) return 'transfer_hash invalid';

  return null;
}

function transferBodyPreimage(
  body: Omit<ARVQrTransferPayloadBody, 'transfer_hash'>,
): Omit<ARVQrTransferPayloadBody, 'transfer_hash'> {
  const out: Omit<ARVQrTransferPayloadBody, 'transfer_hash'> = {
    format: body.format,
    scope: body.scope,
    algorithm: body.algorithm,
    encoding: body.encoding,
    evidence_id: body.evidence_id,
    verifier_payload_hash: body.verifier_payload_hash,
    manifest_hash: body.manifest_hash,
    checkpoint_hash: body.checkpoint_hash,
    created_at_utc: body.created_at_utc,
    policy: body.policy,
    producer: body.producer,
  };

  if (body.package_index_hash !== undefined) {
    out.package_index_hash = body.package_index_hash;
  }

  if (body.zip_sha256 !== undefined) {
    out.zip_sha256 = body.zip_sha256;
  }

  return out;
}

function normalizeBodyForEncoding(body: ARVQrTransferPayloadBody): ARVQrTransferPayloadBody {
  const out: ARVQrTransferPayloadBody = {
    format: body.format,
    scope: body.scope,
    algorithm: body.algorithm,
    encoding: body.encoding,
    evidence_id: body.evidence_id,
    verifier_payload_hash: body.verifier_payload_hash,
    manifest_hash: body.manifest_hash,
    checkpoint_hash: body.checkpoint_hash,
    created_at_utc: body.created_at_utc,
    policy: body.policy,
    producer: body.producer,
    transfer_hash: body.transfer_hash,
  };

  if (body.package_index_hash !== undefined) {
    out.package_index_hash = body.package_index_hash;
  }

  if (body.zip_sha256 !== undefined) {
    out.zip_sha256 = body.zip_sha256;
  }

  return out;
}

function encodeTransferString(body: ARVQrTransferPayloadBody): string {
  const canonicalJson = canonicalize(normalizeBodyForEncoding(body));
  return `ARV1:${base64UrlEncodeUtf8(canonicalJson)}`;
}

export async function hashQrTransferPayloadBody(
  body: Omit<ARVQrTransferPayloadBody, 'transfer_hash'>,
): Promise<string> {
  return sha256HexFromString(canonicalize(transferBodyPreimage(body)));
}

export async function createQrTransferPayload(
  input: ARVQrTransferPayloadInput,
): Promise<ARVQrTransferPayloadArtifact> {
  validateInput(input);

  const bodyWithoutHash: Omit<ARVQrTransferPayloadBody, 'transfer_hash'> = {
    format: 'ARV-QR-TRANSFER-PAYLOAD-v1',
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    encoding: 'base64url-json',
    evidence_id: input.evidence_id,
    verifier_payload_hash: input.verifier_payload_hash,
    manifest_hash: input.manifest_hash,
    checkpoint_hash: input.checkpoint_hash,
    created_at_utc: input.created_at_utc ?? new Date().toISOString(),
    policy: input.policy ?? 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: input.producer ?? 'ARV-LOCAL',
  };

  if (input.package_index_hash !== undefined) {
    bodyWithoutHash.package_index_hash = input.package_index_hash;
  }

  if (input.zip_sha256 !== undefined) {
    bodyWithoutHash.zip_sha256 = input.zip_sha256;
  }

  const body: ARVQrTransferPayloadBody = {
    ...bodyWithoutHash,
    transfer_hash: await hashQrTransferPayloadBody(bodyWithoutHash),
  };

  const transferString = encodeTransferString(body);

  if (!isQrSafeTransferString(transferString)) {
    throw new Error('ARV QR transfer: generated transfer string is not QR-safe');
  }

  if (transferString.includes('=')) {
    throw new Error('ARV QR transfer: generated transfer string contains base64 padding');
  }

  return {
    prefix: 'ARV1',
    body,
    transfer_string: transferString,
  };
}

export async function verifyQrTransferPayload(
  artifact: ARVQrTransferPayloadArtifact,
): Promise<boolean> {
  try {
    if (!artifact || typeof artifact !== 'object') return false;
    if (artifact.prefix !== 'ARV1') return false;
    if (typeof artifact.transfer_string !== 'string') return false;
    if (!artifact.transfer_string.startsWith('ARV1:')) return false;
    if (!isQrSafeTransferString(artifact.transfer_string)) return false;
    if (artifact.transfer_string.includes('=')) return false;

    const fieldError = validateBodyFields(artifact.body);
    if (fieldError) return false;

    const { transfer_hash: _ignored, ...bodyWithoutHash } = artifact.body;
    const expectedHash = await hashQrTransferPayloadBody(bodyWithoutHash);

    if (expectedHash !== artifact.body.transfer_hash) return false;

    const expectedTransferString = encodeTransferString(artifact.body);
    if (expectedTransferString !== artifact.transfer_string) return false;

    return true;
  } catch {
    return false;
  }
}

export async function decodeQrTransferString(
  transferString: string,
): Promise<ARVQrTransferPayloadArtifact> {
  if (typeof transferString !== 'string') {
    throw new Error('ARV QR transfer: transfer string must be a string');
  }

  if (!transferString.startsWith('ARV1:')) {
    throw new Error('ARV QR transfer: invalid prefix');
  }

  if (!isQrSafeTransferString(transferString)) {
    throw new Error('ARV QR transfer: transfer string contains unsafe characters');
  }

  if (transferString.includes('=')) {
    throw new Error('ARV QR transfer: transfer string contains base64 padding');
  }

  const encoded = transferString.slice('ARV1:'.length);

  if (!encoded) {
    throw new Error('ARV QR transfer: empty encoded payload');
  }

  const jsonText = base64UrlDecodeUtf8(encoded);

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('ARV QR transfer: decoded payload is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('ARV QR transfer: decoded payload must be a JSON object');
  }

  const artifact: ARVQrTransferPayloadArtifact = {
    prefix: 'ARV1',
    body: parsed as ARVQrTransferPayloadBody,
    transfer_string: transferString,
  };

  if (!await verifyQrTransferPayload(artifact)) {
    throw new Error('ARV QR transfer: decoded payload failed verification');
  }

  return artifact;
}