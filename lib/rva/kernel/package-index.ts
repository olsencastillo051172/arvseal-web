/**
 * ARV Trust Kernel — Evidence Package Index v1
 * Scope: LOCAL_L0 only.
 * No ZIP · No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Binds all evidence artifacts into a deterministic, offline-verifiable index.
 */

import { canonicalize } from './canonicalize';
import { sha256HexFromString } from './hash';

export type ARVEvidencePackageIndexScope = 'LOCAL_L0';
export type ARVEvidencePackageIndexFormat = 'ARV-EVIDENCE-PACKAGE-INDEX-v1';
export type ARVEvidencePackageIndexAlgorithm = 'SHA-256';

export type ARVEvidencePackageArtifactRole =
  | 'source'
  | 'offline_certificate_html'
  | 'verifier_payload_json'
  | 'bundle_manifest_json'
  | 'signed_envelope_json'
  | 'witness_checkpoint_json';

export interface ARVEvidencePackageArtifactDescriptor {
  role: ARVEvidencePackageArtifactRole;
  file_name: string;
  media_type: string;
  sha256: string;
  size_bytes?: number;
}

export interface ARVEvidencePackageIndexInput {
  evidence_id: string;
  artifacts: ARVEvidencePackageArtifactDescriptor[];
  certificate_hash: string;
  verifier_payload_hash: string;
  manifest_hash: string;
  checkpoint_hash: string;
  signed_envelope_hash: string;
  created_at_utc?: string;
  policy?: string;
  producer?: string;
}

export interface ARVEvidencePackageIndex {
  format: ARVEvidencePackageIndexFormat;
  scope: ARVEvidencePackageIndexScope;
  algorithm: ARVEvidencePackageIndexAlgorithm;
  evidence_id: string;
  artifacts: ARVEvidencePackageArtifactDescriptor[];
  certificate_hash: string;
  verifier_payload_hash: string;
  manifest_hash: string;
  checkpoint_hash: string;
  signed_envelope_hash: string;
  created_at_utc: string;
  policy: string;
  producer: string;
  package_index_hash: string;
}

const ALLOWED_ROLES = new Set<ARVEvidencePackageArtifactRole>([
  'source',
  'offline_certificate_html',
  'verifier_payload_json',
  'bundle_manifest_json',
  'signed_envelope_json',
  'witness_checkpoint_json',
]);

const REQUIRED_ROLES: ARVEvidencePackageArtifactRole[] = [
  'offline_certificate_html',
  'verifier_payload_json',
  'bundle_manifest_json',
  'signed_envelope_json',
  'witness_checkpoint_json',
];

const ROLE_ORDER: ARVEvidencePackageArtifactRole[] = [
  'source',
  'offline_certificate_html',
  'verifier_payload_json',
  'bundle_manifest_json',
  'signed_envelope_json',
  'witness_checkpoint_json',
];

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function sortArtifacts(
  artifacts: ARVEvidencePackageArtifactDescriptor[],
): ARVEvidencePackageArtifactDescriptor[] {
  return [...artifacts].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );
}

function validateArtifact(
  artifact: ARVEvidencePackageArtifactDescriptor,
  index: number,
): string | null {
  if (!artifact || typeof artifact !== 'object') {
    return `artifact[${index}] is required`;
  }

  if (!ALLOWED_ROLES.has(artifact.role)) {
    return `artifact[${index}].role "${artifact.role}" is not an allowed role`;
  }

  if (!artifact.file_name?.trim()) {
    return `artifact[${index}].file_name is required`;
  }

  if (!artifact.media_type?.trim()) {
    return `artifact[${index}].media_type is required`;
  }

  if (!isHex64(artifact.sha256)) {
    return `artifact[${index}].sha256 must be 64-char lowercase hex`;
  }

  if (artifact.size_bytes !== undefined) {
    if (!Number.isInteger(artifact.size_bytes) || artifact.size_bytes < 0) {
      return `artifact[${index}].size_bytes must be a non-negative integer, got ${artifact.size_bytes}`;
    }
  }

  return null;
}

function validateArtifacts(
  artifacts: ARVEvidencePackageArtifactDescriptor[],
): string | null {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return 'artifacts must be a non-empty array';
  }

  for (let index = 0; index < artifacts.length; index += 1) {
    const error = validateArtifact(artifacts[index], index);
    if (error) return error;
  }

  const roles = artifacts.map((artifact) => artifact.role);

  if (new Set(roles).size !== roles.length) {
    return 'artifact roles must be unique';
  }

  const roleSet = new Set(roles);

  for (const role of REQUIRED_ROLES) {
    if (!roleSet.has(role)) {
      return `required artifact role "${role}" is missing`;
    }
  }

  return null;
}

function validateInput(input: ARVEvidencePackageIndexInput): void {
  if (!input || typeof input !== 'object') {
    throw new Error('ARV package index: input is required');
  }

  if (!input.evidence_id?.trim()) {
    throw new Error('ARV package index: evidence_id is required');
  }

  const artifactError = validateArtifacts(input.artifacts);
  if (artifactError) {
    throw new Error(`ARV package index: ${artifactError}`);
  }

  if (!isHex64(input.certificate_hash)) {
    throw new Error('ARV package index: certificate_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.verifier_payload_hash)) {
    throw new Error('ARV package index: verifier_payload_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.manifest_hash)) {
    throw new Error('ARV package index: manifest_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.checkpoint_hash)) {
    throw new Error('ARV package index: checkpoint_hash must be 64-char lowercase hex');
  }

  if (!isHex64(input.signed_envelope_hash)) {
    throw new Error('ARV package index: signed_envelope_hash must be 64-char lowercase hex');
  }
}

function validateIndexFields(index: ARVEvidencePackageIndex): string | null {
  if (!index || typeof index !== 'object') return 'index missing';

  if (index.format !== 'ARV-EVIDENCE-PACKAGE-INDEX-v1') return 'format invalid';
  if (index.scope !== 'LOCAL_L0') return 'scope invalid';
  if (index.algorithm !== 'SHA-256') return 'algorithm invalid';

  if (!index.evidence_id?.trim()) return 'evidence_id missing';

  const artifactError = validateArtifacts(index.artifacts);
  if (artifactError) return artifactError;

  if (!isHex64(index.certificate_hash)) return 'certificate_hash invalid';
  if (!isHex64(index.verifier_payload_hash)) return 'verifier_payload_hash invalid';
  if (!isHex64(index.manifest_hash)) return 'manifest_hash invalid';
  if (!isHex64(index.checkpoint_hash)) return 'checkpoint_hash invalid';
  if (!isHex64(index.signed_envelope_hash)) return 'signed_envelope_hash invalid';

  if (!index.created_at_utc?.trim()) return 'created_at_utc missing';
  if (!index.policy?.trim()) return 'policy missing';
  if (!index.producer?.trim()) return 'producer missing';

  if (!isHex64(index.package_index_hash)) return 'package_index_hash invalid';

  return null;
}

function indexPreimage(
  index: Omit<ARVEvidencePackageIndex, 'package_index_hash'>,
): Omit<ARVEvidencePackageIndex, 'package_index_hash'> {
  return {
    format: index.format,
    scope: index.scope,
    algorithm: index.algorithm,
    evidence_id: index.evidence_id,
    artifacts: sortArtifacts(index.artifacts),
    certificate_hash: index.certificate_hash,
    verifier_payload_hash: index.verifier_payload_hash,
    manifest_hash: index.manifest_hash,
    checkpoint_hash: index.checkpoint_hash,
    signed_envelope_hash: index.signed_envelope_hash,
    created_at_utc: index.created_at_utc,
    policy: index.policy,
    producer: index.producer,
  };
}

export async function hashEvidencePackageIndex(
  index: Omit<ARVEvidencePackageIndex, 'package_index_hash'>,
): Promise<string> {
  return sha256HexFromString(canonicalize(indexPreimage(index)));
}

export async function createEvidencePackageIndex(
  input: ARVEvidencePackageIndexInput,
): Promise<ARVEvidencePackageIndex> {
  validateInput(input);

  const body: Omit<ARVEvidencePackageIndex, 'package_index_hash'> = {
    format: 'ARV-EVIDENCE-PACKAGE-INDEX-v1',
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    evidence_id: input.evidence_id,
    artifacts: sortArtifacts(input.artifacts),
    certificate_hash: input.certificate_hash,
    verifier_payload_hash: input.verifier_payload_hash,
    manifest_hash: input.manifest_hash,
    checkpoint_hash: input.checkpoint_hash,
    signed_envelope_hash: input.signed_envelope_hash,
    created_at_utc: input.created_at_utc ?? new Date().toISOString(),
    policy: input.policy ?? 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: input.producer ?? 'ARV-LOCAL',
  };

  return {
    ...body,
    package_index_hash: await hashEvidencePackageIndex(body),
  };
}

export async function verifyEvidencePackageIndex(
  index: ARVEvidencePackageIndex,
): Promise<boolean> {
  try {
    const fieldError = validateIndexFields(index);
    if (fieldError) return false;

    const expected = await hashEvidencePackageIndex(index);
    return expected === index.package_index_hash;
  } catch {
    return false;
  }
}