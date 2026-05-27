/**
 * ARV Runtime Verification Record v1
 * Scope: LOCAL_L0 only.
 *
 * Deterministic, portable runtime verification evidence.
 * It records what was verified, when it was verified, what hashes were bound,
 * and the local verification result, without depending on any network service.
 */

import { canonicalize } from './canonicalize';
import { sha256HexFromString } from './hash';

export const ARV_RUNTIME_VERIFICATION_RECORD_FORMAT =
  'ARV-RUNTIME-VERIFICATION-RECORD-V1' as const;

export type ARVRuntimeVerificationRecordScope = 'LOCAL_L0';
export type ARVRuntimeVerificationRecordAlgorithm = 'SHA-256';
export type ARVRuntimeVerificationRecordStatus = 'passed' | 'failed';

export interface ARVRuntimeVerificationRecordInput {
  evidence_id: string;
  verifier_payload_hash: string;
  manifest_hash: string;
  checkpoint_hash: string;
  status: ARVRuntimeVerificationRecordStatus;
  verified_at_utc?: string;
  verifier?: string;
  policy?: string;
  package_index_hash?: string;
  zip_sha256?: string;
  zip_receipt_hash?: string;
  notes?: string;
}

export interface ARVRuntimeVerificationRecord {
  format: typeof ARV_RUNTIME_VERIFICATION_RECORD_FORMAT;
  scope: ARVRuntimeVerificationRecordScope;
  algorithm: ARVRuntimeVerificationRecordAlgorithm;
  evidence_id: string;
  verifier_payload_hash: string;
  manifest_hash: string;
  checkpoint_hash: string;
  status: ARVRuntimeVerificationRecordStatus;
  verified_at_utc: string;
  verifier: string;
  policy: string;
  package_index_hash?: string;
  zip_sha256?: string;
  zip_receipt_hash?: string;
  notes?: string;
  record_hash: string;
}

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function validateStatus(value: unknown): value is ARVRuntimeVerificationRecordStatus {
  return value === 'passed' || value === 'failed';
}

function validateInput(input: ARVRuntimeVerificationRecordInput): void {
  if (!input || typeof input !== 'object') {
    throw new Error('ARV runtime record: input is required');
  }

  if (!input.evidence_id?.trim()) {
    throw new Error('ARV runtime record: evidence_id is required');
  }

  if (!isHex64(input.verifier_payload_hash)) {
    throw new Error('ARV runtime record: verifier_payload_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.manifest_hash)) {
    throw new Error('ARV runtime record: manifest_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.checkpoint_hash)) {
    throw new Error('ARV runtime record: checkpoint_hash must be 64-char lowercase hex');
  }

  if (!validateStatus(input.status)) {
    throw new Error('ARV runtime record: status must be passed or failed');
  }

  if (input.package_index_hash !== undefined && !isHex64(input.package_index_hash)) {
    throw new Error('ARV runtime record: package_index_hash must be 64-char lowercase hex');
  }

  if (input.zip_sha256 !== undefined && !isHex64(input.zip_sha256)) {
    throw new Error('ARV runtime record: zip_sha256 must be 64-char lowercase hex');
  }

  if (input.zip_receipt_hash !== undefined && !isHex64(input.zip_receipt_hash)) {
    throw new Error('ARV runtime record: zip_receipt_hash must be 64-char lowercase hex');
  }
}

function validateRecordFields(record: ARVRuntimeVerificationRecord): string | null {
  if (!record || typeof record !== 'object') return 'record missing';
  if (record.format !== ARV_RUNTIME_VERIFICATION_RECORD_FORMAT) return 'format invalid';
  if (record.scope !== 'LOCAL_L0') return 'scope invalid';
  if (record.algorithm !== 'SHA-256') return 'algorithm invalid';
  if (!record.evidence_id?.trim()) return 'evidence_id missing';
  if (!isHex64(record.verifier_payload_hash)) return 'verifier_payload_hash invalid';
  if (!isHex64(record.manifest_hash)) return 'manifest_hash invalid';
  if (!isHex64(record.checkpoint_hash)) return 'checkpoint_hash invalid';
  if (!validateStatus(record.status)) return 'status invalid';
  if (!record.verified_at_utc?.trim()) return 'verified_at_utc missing';
  if (!record.verifier?.trim()) return 'verifier missing';
  if (!record.policy?.trim()) return 'policy missing';
  if (record.package_index_hash !== undefined && !isHex64(record.package_index_hash)) return 'package_index_hash invalid';
  if (record.zip_sha256 !== undefined && !isHex64(record.zip_sha256)) return 'zip_sha256 invalid';
  if (record.zip_receipt_hash !== undefined && !isHex64(record.zip_receipt_hash)) return 'zip_receipt_hash invalid';
  if (!isHex64(record.record_hash)) return 'record_hash invalid';

  return null;
}

function recordPreimage(
  record: Omit<ARVRuntimeVerificationRecord, 'record_hash'>,
): Omit<ARVRuntimeVerificationRecord, 'record_hash'> {
  const out: Omit<ARVRuntimeVerificationRecord, 'record_hash'> = {
    format: record.format,
    scope: record.scope,
    algorithm: record.algorithm,
    evidence_id: record.evidence_id,
    verifier_payload_hash: record.verifier_payload_hash,
    manifest_hash: record.manifest_hash,
    checkpoint_hash: record.checkpoint_hash,
    status: record.status,
    verified_at_utc: record.verified_at_utc,
    verifier: record.verifier,
    policy: record.policy,
  };

  if (record.package_index_hash !== undefined) out.package_index_hash = record.package_index_hash;
  if (record.zip_sha256 !== undefined) out.zip_sha256 = record.zip_sha256;
  if (record.zip_receipt_hash !== undefined) out.zip_receipt_hash = record.zip_receipt_hash;
  if (record.notes !== undefined) out.notes = record.notes;

  return out;
}

export async function hashRuntimeVerificationRecord(
  record: Omit<ARVRuntimeVerificationRecord, 'record_hash'>,
): Promise<string> {
  return sha256HexFromString(canonicalize(recordPreimage(record)));
}

export async function createRuntimeVerificationRecord(
  input: ARVRuntimeVerificationRecordInput,
): Promise<ARVRuntimeVerificationRecord> {
  validateInput(input);

  const body: Omit<ARVRuntimeVerificationRecord, 'record_hash'> = {
    format: ARV_RUNTIME_VERIFICATION_RECORD_FORMAT,
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    evidence_id: input.evidence_id,
    verifier_payload_hash: input.verifier_payload_hash,
    manifest_hash: input.manifest_hash,
    checkpoint_hash: input.checkpoint_hash,
    status: input.status,
    verified_at_utc: input.verified_at_utc ?? new Date().toISOString(),
    verifier: input.verifier ?? 'ARV-LOCAL-RUNTIME',
    policy: input.policy ?? 'ARV-L0-LOCAL-INTEGRITY-V1',
  };

  if (input.package_index_hash !== undefined) body.package_index_hash = input.package_index_hash;
  if (input.zip_sha256 !== undefined) body.zip_sha256 = input.zip_sha256;
  if (input.zip_receipt_hash !== undefined) body.zip_receipt_hash = input.zip_receipt_hash;
  if (input.notes !== undefined) body.notes = input.notes;

  return {
    ...body,
    record_hash: await hashRuntimeVerificationRecord(body),
  };
}

export async function verifyRuntimeVerificationRecord(
  record: ARVRuntimeVerificationRecord,
): Promise<boolean> {
  try {
    const fieldError = validateRecordFields(record);
    if (fieldError) return false;

    const { record_hash: _ignored, ...body } = record;
    const expected = await hashRuntimeVerificationRecord(body);

    return expected === record.record_hash;
  } catch {
    return false;
  }
}

export function canonicalizeRuntimeVerificationRecord(
  record: ARVRuntimeVerificationRecord,
): string {
  return canonicalize(record);
}
