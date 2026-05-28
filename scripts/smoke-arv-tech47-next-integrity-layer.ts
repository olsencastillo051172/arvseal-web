/**
 * ARV Tech47 Next Integrity Layer v1 – Smoke Audit
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Audits that the local proof chain remains portable, deterministic, and LOCAL_L0.
 * - Confirms Tech42–Tech46 chain fields are still present after the ZIP receipt/finalizer layer.
 * - No authority posture. No RFC 3161. No PostgreSQL. No HSM/KMS.
 * - No kernel mutation. No UI mutation. Audit-only smoke.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function pathOf(file: string): string {
  return join(ROOT, file);
}

function read(file: string): string {
  const fullPath = pathOf(file);
  assert.equal(existsSync(fullPath), true, `Required file missing: ${file}`);
  return readFileSync(fullPath, 'utf8');
}

function hasAll(source: string, tokens: string[], label: string): void {
  for (const token of tokens) {
    assert.equal(
      source.includes(token),
      true,
      `${label} missing required token: ${token}`,
    );
  }
}

function hasAny(source: string, tokens: string[], label: string): void {
  assert.equal(
    tokens.some((token) => source.includes(token)),
    true,
    `${label} missing all expected tokens: ${tokens.join(', ')}`,
  );
}

const files = {
  bundle: read('lib/rva/kernel/bundle.ts'),
  checkpoint: read('lib/rva/kernel/checkpoint.ts'),
  localProofExportManifest: read('lib/rva/kernel/local-proof-export-manifest.ts'),
  offlineCertificate: read('lib/rva/kernel/offline-certificate.ts'),
  packageIndex: read('lib/rva/kernel/package-index.ts'),
  qrTransferPayload: read('lib/rva/kernel/qr-transfer-payload.ts'),
  runtimeVerificationRecord: read('lib/rva/kernel/runtime-verification-record.ts'),
  verifierPayload: read('lib/rva/kernel/verifier-payload.ts'),
  zipPackage: read('lib/rva/kernel/zip-package.ts'),
  zipVerificationReceipt: read('lib/rva/kernel/zip-verification-receipt.ts'),
  demoClient: read('app/demo/DemoClient.tsx'),
  tech46: read('scripts/smoke-arv-tech46-zip-verification-receipt-finalizer.ts'),
};

console.log('\n[ARV Tech47 Next Integrity Layer] Smoke Audit');
console.log('Scope: LOCAL_L0 only.');
console.log('No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.');

hasAll(files.verifierPayload, [
  'LOCAL_L0',
  'manifest_hash',
  'payload_hash',
], 'verifier payload');

hasAll(files.bundle, [
  'LOCAL_L0',
  'manifest_hash',
  'ARV-L0-LOCAL-INTEGRITY-V1',
], 'bundle manifest');

hasAll(files.checkpoint, [
  'LOCAL_L0',
  'payload_hash',
], 'checkpoint');

hasAll(files.offlineCertificate, [
  'LOCAL_L0',
  'certificate_hash',
  'verifier_payload_hash',
  'manifest_hash',
  'ARV-L0-LOCAL-INTEGRITY-V1',
], 'offline certificate');

hasAll(files.packageIndex, [
  'LOCAL_L0',
  'package_index_hash',
  'certificate_hash',
  'verifier_payload_hash',
  'manifest_hash',
  'ARV-L0-LOCAL-INTEGRITY-V1',
], 'package index');

hasAll(files.runtimeVerificationRecord, [
  'LOCAL_L0',
  'verifier_payload_hash',
  'manifest_hash',
  'package_index_hash',
  'zip_receipt_hash',
  'ARV-L0-LOCAL-INTEGRITY-V1',
], 'runtime verification record');

hasAll(files.zipPackage, [
  'LOCAL_L0',
  'ARV-EVIDENCE-ZIP-PACKAGE-V1',
  'package_index_hash',
  'zip_sha256',
  'ARV-L0-LOCAL-INTEGRITY-V1',
], 'ZIP package');

hasAll(files.zipVerificationReceipt, [
  'LOCAL_L0',
  'ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT',
  'createEvidenceZipVerificationReceipt',
  'createEvidenceZipVerificationReceiptJson',
  'verifyEvidenceZipVerificationReceipt',
], 'ZIP verification receipt');

hasAll(files.localProofExportManifest, [
  'LOCAL_L0',
  'ARV-LOCAL-PROOF-EXPORT-MANIFEST-V1',
  'package_index_hash',
  'zip_receipt_hash',
  'manifest_hash',
  'ARV-L0-LOCAL-INTEGRITY-V1',
], 'local proof export manifest');

hasAll(files.qrTransferPayload, [
  'LOCAL_L0',
  'ARV-QR-TRANSFER-PAYLOAD-V1',
  'verifier_payload_hash',
  'manifest_hash',
  'package_index_hash',
  'zip_sha256',
  'ARV-L0-LOCAL-INTEGRITY-V1',
], 'QR transfer payload');

hasAll(files.demoClient, [
  'createQrTransferPayload',
  'ZIP Verification Receipt',
  'createEvidenceZipVerificationReceiptJson',
  'ARV-L0-LOCAL-INTEGRITY-V1',
], 'DemoClient portable local proof UI');

hasAll(files.tech46, [
  'Tech46',
  'ZIP verification receipt',
  'createEvidenceZipVerificationReceipt',
  'verifyEvidenceZipVerificationReceipt',
], 'Tech46 receipt finalizer smoke');

const combinedKernel = [
  files.verifierPayload,
  files.bundle,
  files.checkpoint,
  files.offlineCertificate,
  files.packageIndex,
  files.runtimeVerificationRecord,
  files.zipPackage,
  files.zipVerificationReceipt,
  files.localProofExportManifest,
  files.qrTransferPayload,
].join('\n');

hasAny(combinedKernel, [
  'local proof',
  'Local Proof',
  'LOCAL_L0',
], 'combined local proof posture');

hasAll(combinedKernel, [
  'manifest_hash',
  'certificate_hash',
  'verifier_payload_hash',
  'package_index_hash',
  'zip_receipt_hash',
  'ARV-L0-LOCAL-INTEGRITY-V1',
], 'combined portable integrity chain');

assert.equal(
  combinedKernel.includes('ARV_REGISTERED'),
  true,
  'Expected existing mutation/rejection tests to reference ARV_REGISTERED as invalid authority posture',
);

console.log('[ARV Tech47 Next Integrity Layer] portable integrity fields verified.');
console.log('[ARV Tech47 Next Integrity Layer] LOCAL_L0 posture verified.');
console.log('[ARV Tech47 Next Integrity Layer] all tests passed.');
