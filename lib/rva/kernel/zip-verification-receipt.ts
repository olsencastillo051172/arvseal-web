import { sha256HexFromBytes } from './hash';
import type { ARVEvidenceZipVerificationResult } from './zip-package';

export const ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT =
  'ARV-EVIDENCE-ZIP-VERIFICATION-RECEIPT-V1' as const;

export interface ARVEvidenceZipVerificationReceiptZipFile {
  name: string;
  size_bytes: number;
  sha256: string;
}

export interface ARVEvidenceZipVerificationReceipt {
  format: typeof ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT;
  scope: 'LOCAL_L0';
  algorithm: 'SHA-256';
  created_at_utc: string;
  producer: 'ARV-LOCAL';
  zip_file: ARVEvidenceZipVerificationReceiptZipFile;
  verification: {
    method: 'embedded-package-index';
    ok: boolean;
    status: ARVEvidenceZipVerificationResult['status'];
    reason: ARVEvidenceZipVerificationResult['reason'];
    evidence_id: ARVEvidenceZipVerificationResult['evidence_id'];
    package_index_file: ARVEvidenceZipVerificationResult['package_index_file'];
    file_count: ARVEvidenceZipVerificationResult['file_count'];
  };
  result: ARVEvidenceZipVerificationResult;
}

export interface ARVEvidenceZipVerificationReceiptInput {
  result: ARVEvidenceZipVerificationResult;
  zip_file: {
    name: string;
    size_bytes: number;
    bytes: Uint8Array;
  };
  created_at_utc?: string;
}

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneResult(
  result: ARVEvidenceZipVerificationResult,
): ARVEvidenceZipVerificationResult {
  return JSON.parse(JSON.stringify(result)) as ARVEvidenceZipVerificationResult;
}

function assertValidInput(input: ARVEvidenceZipVerificationReceiptInput): void {
  if (!input || typeof input !== 'object') {
    throw new Error('ARV receipt: input is required');
  }

  if (!input.result || typeof input.result !== 'object') {
    throw new Error('ARV receipt: verification result is required');
  }

  if (!input.zip_file || typeof input.zip_file !== 'object') {
    throw new Error('ARV receipt: zip_file is required');
  }

  if (!input.zip_file.name || typeof input.zip_file.name !== 'string') {
    throw new Error('ARV receipt: zip_file.name is required');
  }

  if (
    !Number.isInteger(input.zip_file.size_bytes) ||
    input.zip_file.size_bytes < 0
  ) {
    throw new Error('ARV receipt: zip_file.size_bytes invalid');
  }

  if (!(input.zip_file.bytes instanceof Uint8Array)) {
    throw new Error('ARV receipt: zip_file.bytes must be Uint8Array');
  }
}

export async function createEvidenceZipVerificationReceipt(
  input: ARVEvidenceZipVerificationReceiptInput,
): Promise<ARVEvidenceZipVerificationReceipt> {
  assertValidInput(input);

  const result = cloneResult(input.result);
  const zipSha256 = await sha256HexFromBytes(input.zip_file.bytes);

  return {
    format: ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT,
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    created_at_utc: input.created_at_utc ?? new Date().toISOString(),
    producer: 'ARV-LOCAL',
    zip_file: {
      name: input.zip_file.name,
      size_bytes: input.zip_file.size_bytes,
      sha256: zipSha256,
    },
    verification: {
      method: 'embedded-package-index',
      ok: result.ok,
      status: result.status,
      reason: result.reason,
      evidence_id: result.evidence_id,
      package_index_file: result.package_index_file,
      file_count: result.file_count,
    },
    result,
  };
}

export function canonicalizeZipVerificationReceipt(
  receipt: ARVEvidenceZipVerificationReceipt,
): string {
  return JSON.stringify(
    {
      format: receipt.format,
      scope: receipt.scope,
      algorithm: receipt.algorithm,
      created_at_utc: receipt.created_at_utc,
      producer: receipt.producer,
      zip_file: {
        name: receipt.zip_file.name,
        size_bytes: receipt.zip_file.size_bytes,
        sha256: receipt.zip_file.sha256,
      },
      verification: {
        method: receipt.verification.method,
        ok: receipt.verification.ok,
        status: receipt.verification.status,
        reason: receipt.verification.reason,
        evidence_id: receipt.verification.evidence_id,
        package_index_file: receipt.verification.package_index_file,
        file_count: receipt.verification.file_count,
      },
      result: receipt.result,
    },
    null,
    2,
  );
}

export async function createEvidenceZipVerificationReceiptJson(
  input: ARVEvidenceZipVerificationReceiptInput,
): Promise<string> {
  const receipt = await createEvidenceZipVerificationReceipt(input);
  return canonicalizeZipVerificationReceipt(receipt);
}

export function verifyEvidenceZipVerificationReceipt(
  value: unknown,
): value is ARVEvidenceZipVerificationReceipt {
  if (!isRecord(value)) return false;

  if (value.format !== ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT) return false;
  if (value.scope !== 'LOCAL_L0') return false;
  if (value.algorithm !== 'SHA-256') return false;
  if (value.producer !== 'ARV-LOCAL') return false;
  if (typeof value.created_at_utc !== 'string') return false;

  if (!isRecord(value.zip_file)) return false;

  const zipFileName = value.zip_file.name;
  const zipFileSizeBytes = value.zip_file.size_bytes;
  const zipFileSha256 = value.zip_file.sha256;

  if (typeof zipFileName !== 'string' || !zipFileName) return false;
  if (typeof zipFileSizeBytes !== 'number') return false;
  if (!Number.isInteger(zipFileSizeBytes) || zipFileSizeBytes < 0) return false;
  if (!isHex64(zipFileSha256)) return false;

  if (!isRecord(value.verification)) return false;
  if (value.verification.method !== 'embedded-package-index') return false;
  if (typeof value.verification.ok !== 'boolean') return false;
  if (value.verification.status !== 'PASS' && value.verification.status !== 'FAIL') {
    return false;
  }

  if (value.verification.ok && value.verification.status !== 'PASS') return false;
  if (!value.verification.ok && value.verification.status !== 'FAIL') return false;

  if (!isRecord(value.result)) return false;
  if (value.result.ok !== value.verification.ok) return false;
  if (value.result.status !== value.verification.status) return false;
  if (value.result.reason !== value.verification.reason) return false;
  if (value.result.evidence_id !== value.verification.evidence_id) return false;
  if (value.result.package_index_file !== value.verification.package_index_file) {
    return false;
  }
  if (value.result.file_count !== value.verification.file_count) return false;

  return true;
}
