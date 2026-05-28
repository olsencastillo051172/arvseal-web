/**
 * ARV Tech49 Local Integrity Regression Guard v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Confirms Tech46, Tech47 and Tech48 remain present in the local proof chain.
 * - Verifies required LOCAL_L0 integrity tokens are still visible in the smoke layer.
 * - Guards against accidental regression of zip receipt, next integrity layer and local inventory fields.
 *
 * No ARV Authority.
 * No RFC 3161.
 * No PostgreSQL.
 * No HSM/KMS.
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

type CheckFile = {
  file: string;
  label: string;
  required: string[];
};

function readRequired(file: string): string {
  assert.equal(existsSync(file), true, `required file missing: ${file}`);
  return readFileSync(file, 'utf8');
}

function hasAll(content: string, tokens: string[], label: string): void {
  for (const token of tokens) {
    assert.equal(
      content.includes(token),
      true,
      `${label} missing required token: ${token}`,
    );
  }
}

async function main(): Promise<void> {
  console.log('[ARV Tech49 Local Integrity Regression Guard] Smoke Audit');
  console.log('Scope: LOCAL_L0 only.');
  console.log('No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.');

  const checks: CheckFile[] = [
    {
      file: 'scripts/smoke-arv-tech46-zip-verification-receipt-finalizer.ts',
      label: 'Tech46 ZIP verification receipt finalizer smoke',
      required: [
        'Tech46',
        'ZIP',
        'verification',
        'receipt',
        'finalizer',
        'LOCAL_L0',
        'ARV-L0-LOCAL-INTEGRITY-V1',
        'package_index_hash',
        'certificate_hash',
        'runtime_record_hash',
        'zip_sha256',
        'zip_receipt_hash',
        'manifest_hash',
      ],
    },
    {
      file: 'scripts/smoke-arv-tech47-next-integrity-layer.ts',
      label: 'Tech47 next integrity layer smoke',
      required: [
        'Tech47',
        'Next Integrity Layer',
        'LOCAL_L0',
        'ARV-L0-LOCAL-INTEGRITY-V1',
        'manifest_hash',
        'package_index_hash',
        'zip_receipt_hash',
        'qrPayload',
        'qr transfer',
      ],
    },
    {
      file: 'scripts/smoke-arv-tech48-local-integrity-inventory.ts',
      label: 'Tech48 local integrity inventory smoke',
      required: [
        'Tech48',
        'Local Integrity Inventory',
        'LOCAL_L0',
        'ARV-L0-LOCAL-INTEGRITY-V1',
        'manifest_hash',
        'package_index_hash',
        'zip_receipt_hash',
        'certificate_hash',
        'verifier_payload_hash',
      ],
    },
  ];

  for (const check of checks) {
    const content = readRequired(check.file);
    hasAll(content, check.required, check.label);
  }

  const kernelFiles: CheckFile[] = [
    {
      file: 'lib/rva/kernel/local-proof-export-manifest.ts',
      label: 'local proof export manifest kernel',
      required: [
        'LOCAL_L0',
        'ARV-L0-LOCAL-INTEGRITY-V1',
        'manifest_hash',
        'package_index_hash',
        'zip_receipt_hash',
      ],
    },
    {
      file: 'lib/rva/kernel/qr-transfer-payload.ts',
      label: 'QR transfer payload kernel',
      required: [
        'LOCAL_L0',
        'ARV-L0-LOCAL-INTEGRITY-V1',
        'manifest_hash',
        'package_index_hash',
      ],
    },
    {
      file: 'lib/rva/kernel/runtime-verification-record.ts',
      label: 'runtime verification record kernel',
      required: [
        'LOCAL_L0',
        'manifest_hash',
        'package_index_hash',
        'zip_receipt_hash',
      ],
    },
  ];

  for (const check of kernelFiles) {
    const content = readRequired(check.file);
    hasAll(content, check.required, check.label);
  }

  console.log('[ARV Tech49 Local Integrity Regression Guard] all tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
