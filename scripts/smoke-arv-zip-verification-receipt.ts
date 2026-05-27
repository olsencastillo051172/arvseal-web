import assert from 'node:assert/strict';

import type { ARVEvidenceZipVerificationResult } from '../lib/rva/kernel/zip-package';
import {
  ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT,
  createEvidenceZipVerificationReceipt,
  createEvidenceZipVerificationReceiptJson,
  verifyEvidenceZipVerificationReceipt,
} from '../lib/rva/kernel/zip-verification-receipt';

async function main(): Promise<void> {
  const zipBytes = new TextEncoder().encode('ARV local evidence zip bytes sample');

  const passResult = {
    ok: true,
    status: 'PASS',
    reason: null,
    evidence_id: 'ARV-LOCAL-TEST',
    package_index_file: 'ARV-LOCAL-TEST.package-index.json',
    file_count: 7,
  } as ARVEvidenceZipVerificationResult;

  const receipt = await createEvidenceZipVerificationReceipt({
    result: passResult,
    zip_file: {
      name: 'ARV-LOCAL-TEST.evidence-package.zip',
      size_bytes: zipBytes.byteLength,
      bytes: zipBytes,
    },
    created_at_utc: '2026-05-25T00:00:00.000Z',
  });

  assert.equal(receipt.format, ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT);
  assert.equal(receipt.scope, 'LOCAL_L0');
  assert.equal(receipt.algorithm, 'SHA-256');
  assert.equal(receipt.producer, 'ARV-LOCAL');
  assert.equal(receipt.verification.method, 'embedded-package-index');
  assert.equal(receipt.verification.ok, true);
  assert.equal(receipt.verification.status, 'PASS');
  assert.equal(receipt.verification.evidence_id, 'ARV-LOCAL-TEST');
  assert.equal(receipt.verification.file_count, 7);
  assert.match(receipt.zip_file.sha256, /^[0-9a-f]{64}$/);
  assert.equal(verifyEvidenceZipVerificationReceipt(receipt), true);

  const json = await createEvidenceZipVerificationReceiptJson({
    result: passResult,
    zip_file: {
      name: 'ARV-LOCAL-TEST.evidence-package.zip',
      size_bytes: zipBytes.byteLength,
      bytes: zipBytes,
    },
    created_at_utc: '2026-05-25T00:00:00.000Z',
  });

  const parsed = JSON.parse(json);
  assert.equal(verifyEvidenceZipVerificationReceipt(parsed), true);
  assert.equal(parsed.format, ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT);
  assert.equal(parsed.zip_file.name, 'ARV-LOCAL-TEST.evidence-package.zip');
  assert.match(parsed.zip_file.sha256, /^[0-9a-f]{64}$/);

  const broken = {
    ...parsed,
    verification: {
      ...parsed.verification,
      status: 'FAIL',
    },
  };

  assert.equal(verifyEvidenceZipVerificationReceipt(broken), false);

  console.log('[ARV ZIP Verification Receipt] all tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
