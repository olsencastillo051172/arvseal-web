/**
 * ARV Trust Kernel v1 — L0 verification.
 */

import { assertSha256Hex, sha256HexFromBytes } from './hash';
import { buildMerkleRoot } from './merkle';
import { isL0LocalStatus } from './policy';

export interface ARVL0RecordLike {
  id: string;
  status: string;
  document_hash: string;
  merkle_root: string;
  timestamp_utc?: string;
  source_file?: {
    filename?: string;
    mime_type?: string | null;
    size_bytes?: number;
    source_mode?: string;
    captured_at_utc?: string;
  };
}

export interface ARVL0VerificationResult {
  ok: boolean;
  level: 'L0';
  record_id: string | null;
  computed_document_hash: string | null;
  expected_document_hash: string | null;
  computed_merkle_root: string | null;
  expected_merkle_root: string | null;
  reasons: string[];
}

export async function verifyL0Record(
  record: Partial<ARVL0RecordLike>,
  fileBytes?: Uint8Array | ArrayBuffer,
): Promise<ARVL0VerificationResult> {
  const reasons: string[] = [];
  let computedDocumentHash: string | null = null;
  let computedMerkleRoot: string | null = null;

  if (!record.id) reasons.push('missing_record_id');
  if (!record.status) reasons.push('missing_status');
  if (!record.document_hash) reasons.push('missing_document_hash');
  if (!record.merkle_root) reasons.push('missing_merkle_root');

  if (record.status && !isL0LocalStatus(record.status)) {
    reasons.push('not_l0_local_status');
  }

  if (record.document_hash) {
    try {
      assertSha256Hex(record.document_hash, 'document_hash');
    } catch {
      reasons.push('invalid_document_hash');
    }
  }

  if (record.merkle_root) {
    try {
      assertSha256Hex(record.merkle_root, 'merkle_root');
    } catch {
      reasons.push('invalid_merkle_root');
    }
  }

  if (fileBytes && record.document_hash) {
    computedDocumentHash = await sha256HexFromBytes(fileBytes);

    if (computedDocumentHash !== record.document_hash.toLowerCase()) {
      reasons.push('document_hash_mismatch');
    }

    computedMerkleRoot = await buildMerkleRoot([computedDocumentHash]);

    if (record.merkle_root && computedMerkleRoot !== record.merkle_root.toLowerCase()) {
      reasons.push('merkle_root_mismatch');
    }
  } else if (record.document_hash) {
    computedMerkleRoot = await buildMerkleRoot([record.document_hash.toLowerCase()]);

    if (record.merkle_root && computedMerkleRoot !== record.merkle_root.toLowerCase()) {
      reasons.push('merkle_root_mismatch');
    }
  }

  return {
    ok: reasons.length === 0,
    level: 'L0',
    record_id: record.id ?? null,
    computed_document_hash: computedDocumentHash,
    expected_document_hash: record.document_hash ?? null,
    computed_merkle_root: computedMerkleRoot,
    expected_merkle_root: record.merkle_root ?? null,
    reasons,
  };
}
