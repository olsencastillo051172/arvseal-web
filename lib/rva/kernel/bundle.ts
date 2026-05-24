/**
 * ARV Trust Kernel — Evidence Bundle Manifest v1
 * Scope: LOCAL_L0 only.
 * No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Binds source evidence, signed envelope, and witness checkpoint
 * into a deterministic, offline-verifiable manifest.
 */

import { canonicalize } from './canonicalize';
import { sha256HexFromString } from './hash';

function isValidHex64(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

export type ARVEvidenceBundleScope = 'LOCAL_L0';
export type ARVEvidenceBundleFormat = 'ARV-BUNDLE-MANIFEST-v1';
export type ARVEvidenceBundleAlgorithm = 'SHA-256';

export interface ARVEvidenceSourceDescriptor {
  file_name: string;
  mime_type?: string;
  size_bytes?: number;
  document_hash: string;
}

export interface ARVEvidenceBundleInput {
  evidence_id: string;
  source: ARVEvidenceSourceDescriptor;
  signed_envelope_hash: string;
  checkpoint_hash: string;
  checkpoint_sequence: number;
  created_at_utc?: string;
  policy?: string;
  producer?: string;
}

export interface ARVEvidenceBundleManifest {
  format: ARVEvidenceBundleFormat;
  scope: ARVEvidenceBundleScope;
  algorithm: ARVEvidenceBundleAlgorithm;
  evidence_id: string;
  source: ARVEvidenceSourceDescriptor;
  signed_envelope_hash: string;
  checkpoint_hash: string;
  checkpoint_sequence: number;
  created_at_utc: string;
  policy: string;
  producer: string;
  manifest_hash: string;
}

function validateSource(src: ARVEvidenceSourceDescriptor): void {
  if (!src || typeof src !== 'object') {
    throw new Error('ARV bundle: source is required');
  }

  if (!src.file_name?.trim()) {
    throw new Error('ARV bundle: source.file_name is required');
  }

  if (!isValidHex64(src.document_hash)) {
    throw new Error('ARV bundle: source.document_hash must be 64-char lowercase hex');
  }

  if (src.size_bytes !== undefined) {
    if (!Number.isInteger(src.size_bytes) || src.size_bytes < 0) {
      throw new Error(
        `ARV bundle: source.size_bytes must be a non-negative integer, got ${src.size_bytes}`,
      );
    }
  }
}

function validateInput(input: ARVEvidenceBundleInput): void {
  if (!input || typeof input !== 'object') {
    throw new Error('ARV bundle: input is required');
  }

  if (!input.evidence_id?.trim()) {
    throw new Error('ARV bundle: evidence_id is required');
  }

  validateSource(input.source);

  if (!isValidHex64(input.signed_envelope_hash)) {
    throw new Error('ARV bundle: signed_envelope_hash must be 64-char lowercase hex');
  }

  if (!isValidHex64(input.checkpoint_hash)) {
    throw new Error('ARV bundle: checkpoint_hash must be 64-char lowercase hex');
  }

  if (!Number.isInteger(input.checkpoint_sequence) || input.checkpoint_sequence < 1) {
    throw new Error(
      `ARV bundle: checkpoint_sequence must be a positive integer, got ${input.checkpoint_sequence}`,
    );
  }
}

function validateManifestFields(manifest: ARVEvidenceBundleManifest): string | null {
  if (!manifest || typeof manifest !== 'object') return 'manifest missing';

  if (manifest.format !== 'ARV-BUNDLE-MANIFEST-v1') return 'format invalid';
  if (manifest.scope !== 'LOCAL_L0') return 'scope invalid';
  if (manifest.algorithm !== 'SHA-256') return 'algorithm invalid';

  if (!manifest.evidence_id?.trim()) return 'evidence_id missing';

  if (!manifest.source || typeof manifest.source !== 'object') {
    return 'source missing';
  }

  if (!manifest.source.file_name?.trim()) return 'source.file_name missing';
  if (!isValidHex64(manifest.source.document_hash)) return 'source.document_hash invalid';

  if (
    manifest.source.size_bytes !== undefined &&
    (!Number.isInteger(manifest.source.size_bytes) || manifest.source.size_bytes < 0)
  ) {
    return 'source.size_bytes invalid';
  }

  if (!isValidHex64(manifest.signed_envelope_hash)) return 'signed_envelope_hash invalid';
  if (!isValidHex64(manifest.checkpoint_hash)) return 'checkpoint_hash invalid';

  if (!Number.isInteger(manifest.checkpoint_sequence) || manifest.checkpoint_sequence < 1) {
    return 'checkpoint_sequence invalid';
  }

  if (!manifest.created_at_utc?.trim()) return 'created_at_utc missing';
  if (!manifest.policy?.trim()) return 'policy missing';
  if (!manifest.producer?.trim()) return 'producer missing';

  if (!isValidHex64(manifest.manifest_hash)) return 'manifest_hash invalid';

  return null;
}

function manifestPreimage(
  manifest: Omit<ARVEvidenceBundleManifest, 'manifest_hash'>,
): Omit<ARVEvidenceBundleManifest, 'manifest_hash'> {
  return {
    format: manifest.format,
    scope: manifest.scope,
    algorithm: manifest.algorithm,
    evidence_id: manifest.evidence_id,
    source: manifest.source,
    signed_envelope_hash: manifest.signed_envelope_hash,
    checkpoint_hash: manifest.checkpoint_hash,
    checkpoint_sequence: manifest.checkpoint_sequence,
    created_at_utc: manifest.created_at_utc,
    policy: manifest.policy,
    producer: manifest.producer,
  };
}

export async function hashEvidenceBundleManifest(
  manifest: Omit<ARVEvidenceBundleManifest, 'manifest_hash'>,
): Promise<string> {
  return sha256HexFromString(canonicalize(manifestPreimage(manifest)));
}

export async function createEvidenceBundleManifest(
  input: ARVEvidenceBundleInput,
): Promise<ARVEvidenceBundleManifest> {
  validateInput(input);

  const body: Omit<ARVEvidenceBundleManifest, 'manifest_hash'> = {
    format: 'ARV-BUNDLE-MANIFEST-v1',
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    evidence_id: input.evidence_id,
    source: input.source,
    signed_envelope_hash: input.signed_envelope_hash,
    checkpoint_hash: input.checkpoint_hash,
    checkpoint_sequence: input.checkpoint_sequence,
    created_at_utc: input.created_at_utc ?? new Date().toISOString(),
    policy: input.policy ?? 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: input.producer ?? 'ARV-LOCAL',
  };

  return {
    ...body,
    manifest_hash: await hashEvidenceBundleManifest(body),
  };
}

export async function verifyEvidenceBundleManifest(
  manifest: ARVEvidenceBundleManifest,
): Promise<boolean> {
  try {
    const fieldError = validateManifestFields(manifest);
    if (fieldError) return false;

    const expected = await hashEvidenceBundleManifest(manifest);
    return expected === manifest.manifest_hash;
  } catch {
    return false;
  }
}