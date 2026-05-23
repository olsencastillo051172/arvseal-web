/**
 * ARV Trust Kernel v1 — evidence manifest.
 */

import { canonicalize } from './canonicalize';
import { sha256HexFromString } from './hash';

export const REQUIRED_EVIDENCE_PACKAGE_SUFFIXES = [
  '.certificate.html',
  '.certificate.pdf',
  '.verification.json',
  '.manifest.json',
  '.record.json',
] as const;

export interface ARVEvidenceManifest {
  package_type: 'ARV Evidence Package';
  package_version: '1.0';
  exported_at_utc: string;
  record_type: string;
  record_id: string;
  status: string;
  authority: string;
  canon: string;
  includes: string[];
}

export interface BuildKernelManifestInput {
  record_type: string;
  record_id: string;
  status: string;
  authority: string;
  canon: string;
  includes: string[];
  exported_at_utc?: string;
}

export interface ARVManifestValidationResult {
  ok: boolean;
  reasons: string[];
}

export function buildKernelManifest(input: BuildKernelManifestInput): ARVEvidenceManifest {
  return {
    package_type: 'ARV Evidence Package',
    package_version: '1.0',
    exported_at_utc: input.exported_at_utc ?? new Date().toISOString(),
    record_type: input.record_type,
    record_id: input.record_id,
    status: input.status,
    authority: input.authority,
    canon: input.canon,
    includes: [...input.includes],
  };
}

export function validateManifest(manifest: Partial<ARVEvidenceManifest>): ARVManifestValidationResult {
  const reasons: string[] = [];

  if (manifest.package_type !== 'ARV Evidence Package') {
    reasons.push('invalid_package_type');
  }

  if (manifest.package_version !== '1.0') {
    reasons.push('invalid_package_version');
  }

  if (!manifest.record_id) {
    reasons.push('missing_record_id');
  }

  if (!manifest.status) {
    reasons.push('missing_status');
  }

  if (!Array.isArray(manifest.includes) || manifest.includes.length === 0) {
    reasons.push('missing_includes');
  }

  const includes = Array.isArray(manifest.includes) ? manifest.includes : [];

  for (const suffix of REQUIRED_EVIDENCE_PACKAGE_SUFFIXES) {
    if (!includes.some((item) => item.endsWith(suffix))) {
      reasons.push(`missing_required_artifact:${suffix}`);
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

export async function hashManifest(manifest: ARVEvidenceManifest): Promise<string> {
  return sha256HexFromString(canonicalize(manifest));
}
