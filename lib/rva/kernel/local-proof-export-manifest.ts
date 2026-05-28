/**
 * ARV Trust Kernel — Local Proof Export Manifest v1
 * Scope: LOCAL_L0 only.
 *
 * No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Deterministic export manifest for portable local proof packages.
 * It binds package, certificate, runtime record, ZIP, and receipt hashes
 * without claiming official/external/registered validation.
 */

import { sha256HexFromString } from './hash';

export const ARV_LOCAL_PROOF_EXPORT_MANIFEST_FORMAT =
  'ARV-LOCAL-PROOF-EXPORT-MANIFEST-V1' as const;

export type ARVLocalProofExportManifestScope = 'LOCAL_L0';
export type ARVLocalProofExportManifestAlgorithm = 'SHA-256';

export interface ARVLocalProofExportManifestInput {
  export_id: string;
  evidence_id: string;
  package_index_hash?: string;
  certificate_hash?: string;
  runtime_record_hash?: string;
  zip_sha256?: string;
  zip_receipt_hash?: string;
  created_at_utc?: string;
  notes?: string;
}

export interface ARVLocalProofExportManifest {
  format: typeof ARV_LOCAL_PROOF_EXPORT_MANIFEST_FORMAT;
  scope: ARVLocalProofExportManifestScope;
  algorithm: ARVLocalProofExportManifestAlgorithm;
  producer: 'ARV-LOCAL';
  policy: 'ARV-L0-LOCAL-INTEGRITY-V1';
  export_id: string;
  evidence_id: string;
  created_at_utc: string;
  authority: {
    registered: false;
    official_validation: false;
    public_ledger: false;
    rfc3161: false;
    postgres: false;
    hsm_kms: false;
  };
  bindings: {
    package_index_hash?: string;
    certificate_hash?: string;
    runtime_record_hash?: string;
    zip_sha256?: string;
    zip_receipt_hash?: string;
  };
  warnings: string[];
  notes?: string;
  manifest_hash: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function assertNonEmptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`ARV local proof export manifest: ${name} is required`);
  }
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();

  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
}

function preimage(
  manifest: Omit<ARVLocalProofExportManifest, 'manifest_hash'>
): Omit<ARVLocalProofExportManifest, 'manifest_hash'> {
  return {
    format: manifest.format,
    scope: manifest.scope,
    algorithm: manifest.algorithm,
    producer: manifest.producer,
    policy: manifest.policy,
    export_id: manifest.export_id,
    evidence_id: manifest.evidence_id,
    created_at_utc: manifest.created_at_utc,
    authority: manifest.authority,
    bindings: {
      package_index_hash: manifest.bindings.package_index_hash,
      certificate_hash: manifest.bindings.certificate_hash,
      runtime_record_hash: manifest.bindings.runtime_record_hash,
      zip_sha256: manifest.bindings.zip_sha256,
      zip_receipt_hash: manifest.bindings.zip_receipt_hash,
    },
    warnings: [...manifest.warnings],
    notes: manifest.notes,
  };
}

export async function hashLocalProofExportManifest(
  manifest: Omit<ARVLocalProofExportManifest, 'manifest_hash'>
): Promise<string> {
  return sha256HexFromString(canonicalize(preimage(manifest)));
}

export async function createLocalProofExportManifest(
  input: ARVLocalProofExportManifestInput
): Promise<ARVLocalProofExportManifest> {
  if (!isRecord(input)) {
    throw new Error('ARV local proof export manifest: input is required');
  }

  assertNonEmptyString(input.export_id, 'export_id');
  assertNonEmptyString(input.evidence_id, 'evidence_id');

  if (input.package_index_hash !== undefined && !isSha256Hex(input.package_index_hash)) {
    throw new Error('ARV local proof export manifest: package_index_hash must be 64-char lowercase hex');
  }

  if (input.certificate_hash !== undefined && !isSha256Hex(input.certificate_hash)) {
    throw new Error('ARV local proof export manifest: certificate_hash must be 64-char lowercase hex');
  }

  if (input.runtime_record_hash !== undefined && !isSha256Hex(input.runtime_record_hash)) {
    throw new Error('ARV local proof export manifest: runtime_record_hash must be 64-char lowercase hex');
  }

  if (input.zip_sha256 !== undefined && !isSha256Hex(input.zip_sha256)) {
    throw new Error('ARV local proof export manifest: zip_sha256 must be 64-char lowercase hex');
  }

  if (input.zip_receipt_hash !== undefined && !isSha256Hex(input.zip_receipt_hash)) {
    throw new Error('ARV local proof export manifest: zip_receipt_hash must be 64-char lowercase hex');
  }

  const body: Omit<ARVLocalProofExportManifest, 'manifest_hash'> = {
    format: ARV_LOCAL_PROOF_EXPORT_MANIFEST_FORMAT,
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    producer: 'ARV-LOCAL',
    policy: 'ARV-L0-LOCAL-INTEGRITY-V1',
    export_id: input.export_id,
    evidence_id: input.evidence_id,
    created_at_utc: input.created_at_utc ?? new Date().toISOString(),
    authority: {
      registered: false,
      official_validation: false,
      public_ledger: false,
      rfc3161: false,
      postgres: false,
      hsm_kms: false,
    },
    bindings: {
      package_index_hash: input.package_index_hash,
      certificate_hash: input.certificate_hash,
      runtime_record_hash: input.runtime_record_hash,
      zip_sha256: input.zip_sha256,
      zip_receipt_hash: input.zip_receipt_hash,
    },
    warnings: [
      'LOCAL_L0 only',
      'not official validation',
      'not authority registration',
      'not a public ledger record',
      'no RFC 3161 timestamp',
      'no PostgreSQL persistence',
      'no HSM/KMS custody',
    ],
    notes: input.notes,
  };

  return {
    ...body,
    manifest_hash: await hashLocalProofExportManifest(body),
  };
}

export function canonicalizeLocalProofExportManifest(
  manifest: ARVLocalProofExportManifest
): string {
  return canonicalize({
    ...preimage(manifest),
    manifest_hash: manifest.manifest_hash,
  });
}

export async function verifyLocalProofExportManifest(
  value: unknown
): Promise<boolean> {
  try {
    if (!isRecord(value)) return false;

    const manifest = value as unknown as ARVLocalProofExportManifest;

    if (manifest.format !== ARV_LOCAL_PROOF_EXPORT_MANIFEST_FORMAT) return false;
    if (manifest.scope !== 'LOCAL_L0') return false;
    if (manifest.algorithm !== 'SHA-256') return false;
    if (manifest.producer !== 'ARV-LOCAL') return false;
    if (manifest.policy !== 'ARV-L0-LOCAL-INTEGRITY-V1') return false;

    if (!manifest.export_id?.trim()) return false;
    if (!manifest.evidence_id?.trim()) return false;
    if (!manifest.created_at_utc?.trim()) return false;

    if (!isRecord(manifest.authority)) return false;
    if (manifest.authority.registered !== false) return false;
    if (manifest.authority.official_validation !== false) return false;
    if (manifest.authority.public_ledger !== false) return false;
    if (manifest.authority.rfc3161 !== false) return false;
    if (manifest.authority.postgres !== false) return false;
    if (manifest.authority.hsm_kms !== false) return false;

    if (!isRecord(manifest.bindings)) return false;

    const bindings = manifest.bindings;

    if (bindings.package_index_hash !== undefined && !isSha256Hex(bindings.package_index_hash)) return false;
    if (bindings.certificate_hash !== undefined && !isSha256Hex(bindings.certificate_hash)) return false;
    if (bindings.runtime_record_hash !== undefined && !isSha256Hex(bindings.runtime_record_hash)) return false;
    if (bindings.zip_sha256 !== undefined && !isSha256Hex(bindings.zip_sha256)) return false;
    if (bindings.zip_receipt_hash !== undefined && !isSha256Hex(bindings.zip_receipt_hash)) return false;

    if (!Array.isArray(manifest.warnings)) return false;
    if (!manifest.warnings.includes('LOCAL_L0 only')) return false;
    if (!manifest.warnings.includes('not official validation')) return false;
    if (!manifest.warnings.includes('not authority registration')) return false;

    if (!isSha256Hex(manifest.manifest_hash)) return false;

    const { manifest_hash: _ignored, ...body } = manifest;
    const expected = await hashLocalProofExportManifest(body);

    return expected === manifest.manifest_hash;
  } catch {
    return false;
  }
}
