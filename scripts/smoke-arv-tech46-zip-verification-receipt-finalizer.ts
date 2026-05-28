/**
 * ARV Tech46 — ZIP Verification Receipt Finalizer v1 — Smoke Test
 *
 * Scope: LOCAL_L0 only.
 * This test does not modify Tech42, Tech43, Tech44 or Tech45.
 * It validates that the ZIP verification receipt layer remains local,
 * deterministic, verifiable, and bound to the ZIP verification result.
 */

import assert from 'node:assert/strict';

import {
  ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT,
  createEvidenceZipVerificationReceipt,
  createEvidenceZipVerificationReceiptJson,
  verifyEvidenceZipVerificationReceipt,
} from '../lib/rva/kernel/zip-verification-receipt';

const SCOPE = 'LOCAL_L0';
const POLICY = 'ARV-L0-LOCAL-INTEGRITY-V1';
const PRODUCER = 'ARV-LOCAL';

const EVIDENCE_ID = 'ARV-TECH46-ZIP-RECEIPT-EVIDENCE';
const ZIP_FILE_NAME = 'ARV-TECH46-ZIP-RECEIPT.evidence.zip';

function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function assertRejectsAsync(fn: () => unknown | Promise<unknown>): Promise<void> {
  let rejected = false;

  try {
    await fn();
  } catch {
    rejected = true;
  }

  assert.equal(rejected, true);
}

const zipBytes = utf8Bytes(
  [
    'ARV Tech46 ZIP verification receipt smoke payload',
    `scope=${SCOPE}`,
    `policy=${POLICY}`,
    `evidence_id=${EVIDENCE_ID}`,
    'local_only=true',
    'authority=false',
    'rfc3161=false',
    'postgres=false',
    'hsm_kms=false',
  ].join('\n'),
);

const verificationResult = {
  method: 'embedded-package-index',
  ok: true,
  status: 'PASS',
  reason: null,
  evidence_id: EVIDENCE_ID,
  package_index_file: 'package-index.json',
  file_count: 7,
  message: 'Evidence ZIP verifies against its embedded package index.',
};

async function main(): Promise<void> {
  console.log('\n[ARV Tech46 ZIP Verification Receipt Finalizer] Smoke Test');
  console.log(`Scope: ${SCOPE} only.`);
  console.log('No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.');

  const receipt = await createEvidenceZipVerificationReceipt({
    result: {
      ...verificationResult,
      status: 'PASS' as const,
    },
    zip_file: {
      name: ZIP_FILE_NAME,
      size_bytes: zipBytes.length,
      bytes: zipBytes,
    },
  });

  await test('creates LOCAL_L0 ZIP verification receipt', async () => {
    assert.equal(receipt.format, ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT);
    assert.equal(receipt.scope, SCOPE);
    assert.equal(receipt.algorithm, 'SHA-256');
    assert.equal(receipt.producer, PRODUCER);

    assert.equal(receipt.verification.method, verificationResult.method);
    assert.equal(receipt.verification.ok, true);
    assert.equal(receipt.verification.status, 'PASS');
    assert.equal(receipt.verification.reason, null);
    assert.equal(receipt.verification.evidence_id, EVIDENCE_ID);
    assert.equal(receipt.verification.package_index_file, 'package-index.json');
    assert.equal(receipt.verification.file_count, 7);

    assert.equal(receipt.zip_file.name, ZIP_FILE_NAME);
    assert.equal(receipt.zip_file.size_bytes, zipBytes.length);
    assert.equal(isSha256Hex(receipt.zip_file.sha256), true);
  });

  await test('verifies valid ZIP verification receipt', async () => {
    assert.equal(verifyEvidenceZipVerificationReceipt(receipt), true);
  });

  await test('receipt JSON remains LOCAL_L0 and verifiable', async () => {
    const json = await createEvidenceZipVerificationReceiptJson({
      result: {
        ...verificationResult,
        status: 'PASS' as const,
      },
      zip_file: {
        name: ZIP_FILE_NAME,
        size_bytes: zipBytes.length,
        bytes: zipBytes,
      },
    });

    const parsed = JSON.parse(json);

    assert.equal(parsed.format, ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT);
    assert.equal(parsed.scope, SCOPE);
    assert.equal(parsed.algorithm, 'SHA-256');
    assert.equal(parsed.producer, PRODUCER);
    assert.equal(parsed.verification.evidence_id, EVIDENCE_ID);
    assert.equal(parsed.zip_file.name, ZIP_FILE_NAME);
    assert.equal(isSha256Hex(parsed.zip_file.sha256), true);
    assert.equal(verifyEvidenceZipVerificationReceipt(parsed), true);

    assert.equal(json.includes('LOCAL_L0'), true);
    assert.equal(json.includes('ARV_REGISTERED'), false);
    assert.equal(json.includes('RFC 3161'), false);
    assert.equal(json.includes('PostgreSQL'), false);
    assert.equal(json.includes('HSM'), false);
    assert.equal(json.includes('KMS'), false);
  });

  await test('deterministic receipt hash for same input', async () => {
    const duplicate = await createEvidenceZipVerificationReceipt({
      result: {
        ...verificationResult,
        status: 'PASS' as const,
      },
      zip_file: {
        name: ZIP_FILE_NAME,
        size_bytes: zipBytes.length,
        bytes: zipBytes,
      },
    });

    assert.equal(duplicate.zip_file.sha256, receipt.zip_file.sha256);
    assert.deepEqual(duplicate, receipt);
    assert.equal(verifyEvidenceZipVerificationReceipt(duplicate), true);
  });

  await test('changing ZIP bytes changes ZIP sha256', async () => {
    const changedZipBytes = utf8Bytes(
      [
        'ARV Tech46 ZIP verification receipt smoke payload changed',
        `scope=${SCOPE}`,
        `policy=${POLICY}`,
        `evidence_id=${EVIDENCE_ID}`,
      ].join('\n'),
    );

    const changed = await createEvidenceZipVerificationReceipt({
      result: {
        ...verificationResult,
        status: 'PASS' as const,
      },
      zip_file: {
        name: ZIP_FILE_NAME,
        size_bytes: changedZipBytes.length,
        bytes: changedZipBytes,
      },
    });

    assert.notEqual(changed.zip_file.sha256, receipt.zip_file.sha256);
    assert.equal(verifyEvidenceZipVerificationReceipt(changed), true);
  });

  await test('mutated receipt scope fails verification', async () => {
    const mutated = {
      ...receipt,
      scope: 'ARV_REGISTERED' as typeof receipt.scope,
    };

    assert.equal(verifyEvidenceZipVerificationReceipt(mutated), false);
  });

  await test('mutated ZIP hash fails verification', async () => {
    const mutated = {
      ...receipt,
      zip_file: {
        ...receipt.zip_file,
        sha256: 'a'.repeat(64),
      },
    };

    assert.equal(verifyEvidenceZipVerificationReceipt(mutated), false);
  });

  await test('invalid ZIP file input fails creation', async () => {
    await assertRejectsAsync(() =>
      createEvidenceZipVerificationReceipt({
        result: {
          ...verificationResult,
          status: 'PASS' as const,
        },
        zip_file: {
          name: ZIP_FILE_NAME,
          size_bytes: -1,
          bytes: zipBytes,
        },
      }),
    );
  });

  await test('receipt remains LOCAL_L0 and does not claim authority registration', async () => {
    assert.equal(receipt.scope, SCOPE);
    assert.equal(receipt.producer, PRODUCER);
    assert.equal(receipt.verification.ok, true);
    assert.equal(receipt.verification.status, 'PASS');

    const serialized = JSON.stringify(receipt);

    assert.equal(serialized.includes('LOCAL_L0'), true);
    assert.equal(serialized.includes('ARV_REGISTERED'), false);
    assert.equal(serialized.includes('RFC 3161'), false);
    assert.equal(serialized.includes('PostgreSQL'), false);
    assert.equal(serialized.includes('HSM'), false);
    assert.equal(serialized.includes('KMS'), false);
  });

  console.log('[ARV Tech46 ZIP Verification Receipt Finalizer] all tests passed');
}

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    throw error;
  }
}

main()
  .then(() => {
    console.log(`[ARV Tech46 ZIP Verification Receipt Finalizer] ${passed}/${passed + failed} passed`);
  })
  .catch((error) => {
    console.error(`[ARV Tech46 ZIP Verification Receipt Finalizer] ${passed}/${passed + failed} passed, ${failed} FAILED`);
    console.error(error);
    process.exit(1);
  });


