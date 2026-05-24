/**
 * ARV Trust Kernel — Portable Verifier Payload v1
 * Scope: LOCAL_L0 only.
 * No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Deterministic compact payload derived from an Evidence Bundle Manifest.
 * Can later be encoded into QR, portable JSON, offline HTML, browser verifier input,
 * or ZIP evidence package metadata.
 */

import { canonicalize } from './canonicalize';
import { sha256HexFromString } from './hash';

export type ARVPortableVerifierPayloadScope = 'LOCAL_L0';
export type ARVPortableVerifierPayloadFormat = 'ARV-PORTABLE-VERIFIER-PAYLOAD-v1';
export type ARVPortableVerifierPayloadAlgorithm = 'SHA-256';

export interface ARVPortableVerifierPayloadInput {
  evidence_id: string;
  document_hash: string;
  manifest_hash: string;
  signed_envelope_hash: string;
  checkpoint_hash: string;
  checkpoint_sequence: number;
  created_at_utc?: string;
  policy?: string;
  producer?: string;
}

export interface ARVPortableVerifierPayload {
  format: ARVPortableVerifierPayloadFormat;
  scope: ARVPortableVerifierPayloadScope;
  algorithm: ARVPortableVerifierPayloadAlgorithm;
  evidence_id: string;
  document_hash: string;
  manifest_hash: string;
  signed_envelope_hash: string;
  checkpoint_hash: string;
  checkpoint_sequence: number;
  created_at_utc: string;
  policy: string;
  producer: string;
  payload_hash: string;
}

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function validateInput(input: ARVPortableVerifierPayloadInput): void {
  if (!input || typeof input !== 'object') {
    throw new Error('ARV verifier payload: input is required');
  }

  if (!input.evidence_id?.trim()) {
    throw new Error('ARV verifier payload: evidence_id is required');
  }

  if (!isHex64(input.document_hash)) {
    throw new Error('ARV verifier payload: document_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.manifest_hash)) {
    throw new Error('ARV verifier payload: manifest_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.signed_envelope_hash)) {
    throw new Error('ARV verifier payload: signed_envelope_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.checkpoint_hash)) {
    throw new Error('ARV verifier payload: checkpoint_hash must be 64-char lowercase hex');
  }

  if (!Number.isInteger(input.checkpoint_sequence) || input.checkpoint_sequence < 1) {
    throw new Error(
      `ARV verifier payload: checkpoint_sequence must be a positive integer, got ${input.checkpoint_sequence}`,
    );
  }
}

function validatePayloadFields(payload: ARVPortableVerifierPayload): string | null {
  if (!payload || typeof payload !== 'object') return 'payload missing';

  if (payload.format !== 'ARV-PORTABLE-VERIFIER-PAYLOAD-v1') return 'format invalid';
  if (payload.scope !== 'LOCAL_L0') return 'scope invalid';
  if (payload.algorithm !== 'SHA-256') return 'algorithm invalid';

  if (!payload.evidence_id?.trim()) return 'evidence_id missing';

  if (!isHex64(payload.document_hash)) return 'document_hash invalid';
  if (!isHex64(payload.manifest_hash)) return 'manifest_hash invalid';
  if (!isHex64(payload.signed_envelope_hash)) return 'signed_envelope_hash invalid';
  if (!isHex64(payload.checkpoint_hash)) return 'checkpoint_hash invalid';

  if (!Number.isInteger(payload.checkpoint_sequence) || payload.checkpoint_sequence < 1) {
    return 'checkpoint_sequence invalid';
  }

  if (!payload.created_at_utc?.trim()) return 'created_at_utc missing';
  if (!payload.policy?.trim()) return 'policy missing';
  if (!payload.producer?.trim()) return 'producer missing';

  if (!isHex64(payload.payload_hash)) return 'payload_hash invalid';

  return null;
}

function payloadPreimage(
  payload: Omit<ARVPortableVerifierPayload, 'payload_hash'>,
): Omit<ARVPortableVerifierPayload, 'payload_hash'> {
  return {
    format: payload.format,
    scope: payload.scope,
    algorithm: payload.algorithm,
    evidence_id: payload.evidence_id,
    document_hash: payload.document_hash,
    manifest_hash: payload.manifest_hash,
    signed_envelope_hash: payload.signed_envelope_hash,
    checkpoint_hash: payload.checkpoint_hash,
    checkpoint_sequence: payload.checkpoint_sequence,
    created_at_utc: payload.created_at_utc,
    policy: payload.policy,
    producer: payload.producer,
  };
}

export async function hashPortableVerifierPayload(
  payload: Omit<ARVPortableVerifierPayload, 'payload_hash'>,
): Promise<string> {
  return sha256HexFromString(canonicalize(payloadPreimage(payload)));
}

export async function createPortableVerifierPayload(
  input: ARVPortableVerifierPayloadInput,
): Promise<ARVPortableVerifierPayload> {
  validateInput(input);

  const body: Omit<ARVPortableVerifierPayload, 'payload_hash'> = {
    format: 'ARV-PORTABLE-VERIFIER-PAYLOAD-v1',
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    evidence_id: input.evidence_id,
    document_hash: input.document_hash,
    manifest_hash: input.manifest_hash,
    signed_envelope_hash: input.signed_envelope_hash,
    checkpoint_hash: input.checkpoint_hash,
    checkpoint_sequence: input.checkpoint_sequence,
    created_at_utc: input.created_at_utc ?? new Date().toISOString(),
    policy: input.policy ?? 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: input.producer ?? 'ARV-LOCAL',
  };

  return {
    ...body,
    payload_hash: await hashPortableVerifierPayload(body),
  };
}

export async function verifyPortableVerifierPayload(
  payload: ARVPortableVerifierPayload,
): Promise<boolean> {
  try {
    const fieldError = validatePayloadFields(payload);
    if (fieldError) return false;

    const expected = await hashPortableVerifierPayload(payload);
    return expected === payload.payload_hash;
  } catch {
    return false;
  }
}