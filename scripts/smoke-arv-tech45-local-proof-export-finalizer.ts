/**
 * ARV Tech45 Local Proof Export Finalizer v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 *
 * This test finalizes the local proof export layer by validating that
 * Tech44's Local Proof Export Manifest can bind the final proof components:
 *
 * - package_index_hash
 * - certificate_hash
 * - runtime_record_hash
 * - zip_sha256
 * - zip_receipt_hash
 *
 * No ARV Authority.
 * No RFC 3161.
 * No PostgreSQL.
 * No HSM/KMS.
 * No official validation.
 */

import assert from 'node:assert/strict';

import {
  ARV_LOCAL_PROOF_EXPORT_MANIFEST_FORMAT,
  canonicalizeLocalProofExportManifest,
  createLocalProofExportManifest,
  hashLocalProofExportManifest,
  verifyLocalProofExportManifest,
  type ARVLocalProofExportManifest,
} from '../lib/rva/kernel/local-proof-export-manifest';

const HEX64_PACKAGE_INDEX = 'a'.repeat(64);
const HEX64_CERTIFICATE = 'b'.repeat(64);
const HEX64_RUNTIME_RECORD = 'c'.repeat(64);
const HEX64_ZIP_SHA256 = 'd'.repeat(64);
const HEX64_ZIP_RECEIPT = 'e'.repeat(64);

const EXPORT_ID = 'ARV-TECH45-LOCAL-PROOF-EXPORT-FINALIZER-V1';
const EVIDENCE_ID = 'ARV-TECH45-LOCAL-PROOF-EVIDENCE';
const CREATED_AT_UTC = '2026-05-28T00:00:00.000Z';

let passed = 0;
let failed = 0;
let total = 0;

function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  total += 1;

  try {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(error);
  }
}

async function assertThrows(
  fn: () => unknown | Promise<unknown>,
  messageIncludes: string,
): Promise<void> {
  let didThrow = false;

  try {
    await fn();
  } catch (error) {
    didThrow = true;

    assert(error instanceof Error);
    assert(
      error.message.includes(messageIncludes),
      `expected error message to include "${messageIncludes}", got "${error.message}"`,
    );
  }

  assert.equal(didThrow, true, 'expected function to throw');
}

function createBaseManifest(): Promise<ARVLocalProofExportManifest> {
  return createLocalProofExportManifest({
    export_id: EXPORT_ID,
    evidence_id: EVIDENCE_ID,
    package_index_hash: HEX64_PACKAGE_INDEX,
    certificate_hash: HEX64_CERTIFICATE,
    runtime_record_hash: HEX64_RUNTIME_RECORD,
    zip_sha256: HEX64_ZIP_SHA256,
    zip_receipt_hash: HEX64_ZIP_RECEIPT,
    created_at_utc: CREATED_AT_UTC,
    notes: 'Tech45 local proof export finalizer smoke test',
  });
}

async function main(): Promise<void> {
  console.log('\n[ARV Tech45 Local Proof Export Finalizer] Smoke Test');
  console.log('Scope: LOCAL_L0 only.');
  console.log('No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.');
  console.log('------------------------------------------------------------');

  const manifest = await createBaseManifest();

  await test('creates local proof export manifest', async () => {
    assert.equal(manifest.format, ARV_LOCAL_PROOF_EXPORT_MANIFEST_FORMAT);
    assert.equal(manifest.scope, 'LOCAL_L0');
    assert.equal(manifest.algorithm, 'SHA-256');
    assert.equal(manifest.producer, 'ARV-LOCAL');
    assert.equal(manifest.policy, 'ARV-L0-LOCAL-INTEGRITY-V1');

    assert.equal(manifest.export_id, EXPORT_ID);
    assert.equal(manifest.evidence_id, EVIDENCE_ID);
    assert.equal(manifest.created_at_utc, CREATED_AT_UTC);

    assert.match(manifest.manifest_hash, /^[0-9a-f]{64}$/);
  });

  await test('binds package, certificate, runtime, ZIP, and receipt hashes', async () => {
    assert.equal(manifest.bindings.package_index_hash, HEX64_PACKAGE_INDEX);
    assert.equal(manifest.bindings.certificate_hash, HEX64_CERTIFICATE);
    assert.equal(manifest.bindings.runtime_record_hash, HEX64_RUNTIME_RECORD);
    assert.equal(manifest.bindings.zip_sha256, HEX64_ZIP_SHA256);
    assert.equal(manifest.bindings.zip_receipt_hash, HEX64_ZIP_RECEIPT);
  });

  await test('declares local-only non-authority posture', async () => {
    assert.equal(manifest.authority.registered, false);
    assert.equal(manifest.authority.official_validation, false);
    assert.equal(manifest.authority.public_ledger, false);
    assert.equal(manifest.authority.rfc3161, false);
    assert.equal(manifest.authority.postgres, false);
    assert.equal(manifest.authority.hsm_kms, false);

    assert(manifest.warnings.includes('LOCAL_L0 only'));
    assert(manifest.warnings.includes('not official validation'));
    assert(manifest.warnings.includes('not authority registration'));
  });

  await test('verifies valid final export manifest', async () => {
    assert.equal(await verifyLocalProofExportManifest(manifest), true);
  });

  await test('manifest hash is deterministic and recomputable', async () => {
    const { manifest_hash: _ignored, ...body } = manifest;
    const recomputed = await hashLocalProofExportManifest(body);

    assert.equal(recomputed, manifest.manifest_hash);
  });

  await test('same input produces same manifest hash and canonical output', async () => {
    const duplicate = await createBaseManifest();

    assert.equal(duplicate.manifest_hash, manifest.manifest_hash);
    assert.equal(
      canonicalizeLocalProofExportManifest(duplicate),
      canonicalizeLocalProofExportManifest(manifest),
    );
  });

  await test('changed evidence id changes manifest hash', async () => {
    const changed = await createLocalProofExportManifest({
      export_id: EXPORT_ID,
      evidence_id: 'ARV-TECH45-LOCAL-PROOF-EVIDENCE-CHANGED',
      package_index_hash: HEX64_PACKAGE_INDEX,
      certificate_hash: HEX64_CERTIFICATE,
      runtime_record_hash: HEX64_RUNTIME_RECORD,
      zip_sha256: HEX64_ZIP_SHA256,
      zip_receipt_hash: HEX64_ZIP_RECEIPT,
      created_at_utc: CREATED_AT_UTC,
      notes: 'Tech45 local proof export finalizer smoke test',
    });

    assert.notEqual(changed.manifest_hash, manifest.manifest_hash);
  });

  await test('mutated manifest hash fails verification', async () => {
    assert.equal(
      await verifyLocalProofExportManifest({
        ...manifest,
        manifest_hash: 'f'.repeat(64),
      }),
      false,
    );
  });

  await test('registered authority claim fails verification', async () => {
    assert.equal(
      await verifyLocalProofExportManifest({
        ...manifest,
        authority: {
          ...manifest.authority,
          registered: true,
        },
      }),
      false,
    );
  });

  await test('official validation claim fails verification', async () => {
    assert.equal(
      await verifyLocalProofExportManifest({
        ...manifest,
        authority: {
          ...manifest.authority,
          official_validation: true,
        },
      }),
      false,
    );
  });

  await test('invalid package index hash fails creation', async () => {
    await assertThrows(
      () =>
        createLocalProofExportManifest({
          export_id: EXPORT_ID,
          evidence_id: EVIDENCE_ID,
          package_index_hash: 'not-a-sha256',
        }),
      'package_index_hash',
    );
  });

  await test('invalid certificate hash fails creation', async () => {
    await assertThrows(
      () =>
        createLocalProofExportManifest({
          export_id: EXPORT_ID,
          evidence_id: EVIDENCE_ID,
          certificate_hash: 'not-a-sha256',
        }),
      'certificate_hash',
    );
  });

  await test('invalid runtime record hash fails creation', async () => {
    await assertThrows(
      () =>
        createLocalProofExportManifest({
          export_id: EXPORT_ID,
          evidence_id: EVIDENCE_ID,
          runtime_record_hash: 'not-a-sha256',
        }),
      'runtime_record_hash',
    );
  });

  await test('invalid ZIP sha256 fails creation', async () => {
    await assertThrows(
      () =>
        createLocalProofExportManifest({
          export_id: EXPORT_ID,
          evidence_id: EVIDENCE_ID,
          zip_sha256: 'not-a-sha256',
        }),
      'zip_sha256',
    );
  });

  await test('invalid ZIP receipt hash fails creation', async () => {
    await assertThrows(
      () =>
        createLocalProofExportManifest({
          export_id: EXPORT_ID,
          evidence_id: EVIDENCE_ID,
          zip_receipt_hash: 'not-a-sha256',
        }),
      'zip_receipt_hash',
    );
  });

  await test('manifest JSON remains local proof only', async () => {
    const text = JSON.stringify(manifest).toLowerCase();

    assert(text.includes('local_l0'));
    assert(text.includes('not official validation'));
    assert(text.includes('not authority registration'));

    assert(!text.includes('"registered":true'));
    assert(!text.includes('"official_validation":true'));
    assert(!text.includes('"public_ledger":true'));
    assert(!text.includes('"rfc3161":true'));
    assert(!text.includes('"postgres":true'));
    assert(!text.includes('"hsm_kms":true'));

    assert.equal(isSha256Hex(manifest.manifest_hash), true);
  });

  console.log('------------------------------------------------------------');

  if (failed > 0) {
    console.error(
      `[ARV Tech45 Local Proof Export Finalizer] ${passed}/${total} passed, ${failed} FAILED`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `[ARV Tech45 Local Proof Export Finalizer] all tests passed (${passed}/${total})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});