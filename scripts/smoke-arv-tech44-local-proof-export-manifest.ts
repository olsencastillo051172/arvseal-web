/**
 * ARV Tech44 Local Proof Export Manifest v1 — Smoke Audit
 * Scope: LOCAL_L0 only.
 *
 * Verifies deterministic export manifests, local authority posture,
 * package/certificate/runtime/ZIP bindings, and no external authority claims.
 */

import assert from 'node:assert/strict';

import {
  createLocalProofExportManifest,
  verifyLocalProofExportManifest,
  canonicalizeLocalProofExportManifest,
  ARV_LOCAL_PROOF_EXPORT_MANIFEST_FORMAT,
} from '../lib/rva/kernel/local-proof-export-manifest';

import { sha256HexFromString } from '../lib/rva/kernel/hash';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
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

async function main(): Promise<void> {
  console.log('\n[ARV Tech44 Local Proof Export Manifest] Smoke Audit');
  console.log('—'.repeat(72));

  const packageIndexHash = await sha256HexFromString('package-index');
  const certificateHash = await sha256HexFromString('certificate');
  const runtimeRecordHash = await sha256HexFromString('runtime-record');
  const zipSha256 = await sha256HexFromString('zip-bytes');
  const zipReceiptHash = await sha256HexFromString('zip-receipt');

  const manifest = await createLocalProofExportManifest({
    export_id: 'ARV-EXPORT-LOCAL-001',
    evidence_id: 'ARV-EVIDENCE-LOCAL-001',
    package_index_hash: packageIndexHash,
    certificate_hash: certificateHash,
    runtime_record_hash: runtimeRecordHash,
    zip_sha256: zipSha256,
    zip_receipt_hash: zipReceiptHash,
    created_at_utc: '2026-05-28T00:00:00.000Z',
    notes: 'Tech44 smoke audit',
  });

  await test('creates LOCAL_L0 export manifest', async () => {
    assert.equal(manifest.format, ARV_LOCAL_PROOF_EXPORT_MANIFEST_FORMAT);
    assert.equal(manifest.scope, 'LOCAL_L0');
    assert.equal(manifest.algorithm, 'SHA-256');
    assert.equal(manifest.producer, 'ARV-LOCAL');
    assert.equal(manifest.policy, 'ARV-L0-LOCAL-INTEGRITY-V1');
    assert.match(manifest.manifest_hash, /^[0-9a-f]{64}$/);
  });

  await test('binds package, certificate, runtime record, ZIP, and receipt hashes', async () => {
    assert.equal(manifest.bindings.package_index_hash, packageIndexHash);
    assert.equal(manifest.bindings.certificate_hash, certificateHash);
    assert.equal(manifest.bindings.runtime_record_hash, runtimeRecordHash);
    assert.equal(manifest.bindings.zip_sha256, zipSha256);
    assert.equal(manifest.bindings.zip_receipt_hash, zipReceiptHash);
  });

  await test('declares no authority registration or external validation', async () => {
    assert.equal(manifest.authority.registered, false);
    assert.equal(manifest.authority.official_validation, false);
    assert.equal(manifest.authority.public_ledger, false);
    assert.equal(manifest.authority.rfc3161, false);
    assert.equal(manifest.authority.postgres, false);
    assert.equal(manifest.authority.hsm_kms, false);
  });

  await test('verifies valid manifest', async () => {
    assert.equal(await verifyLocalProofExportManifest(manifest), true);
  });

  await test('canonical output is deterministic', async () => {
    const again = await createLocalProofExportManifest({
      export_id: 'ARV-EXPORT-LOCAL-001',
      evidence_id: 'ARV-EVIDENCE-LOCAL-001',
      package_index_hash: packageIndexHash,
      certificate_hash: certificateHash,
      runtime_record_hash: runtimeRecordHash,
      zip_sha256: zipSha256,
      zip_receipt_hash: zipReceiptHash,
      created_at_utc: '2026-05-28T00:00:00.000Z',
      notes: 'Tech44 smoke audit',
    });

    assert.equal(manifest.manifest_hash, again.manifest_hash);
    assert.equal(
      canonicalizeLocalProofExportManifest(manifest),
      canonicalizeLocalProofExportManifest(again)
    );
  });

  await test('changed evidence id changes manifest hash', async () => {
    const changed = await createLocalProofExportManifest({
      export_id: 'ARV-EXPORT-LOCAL-001',
      evidence_id: 'ARV-EVIDENCE-LOCAL-CHANGED',
      package_index_hash: packageIndexHash,
      certificate_hash: certificateHash,
      runtime_record_hash: runtimeRecordHash,
      zip_sha256: zipSha256,
      zip_receipt_hash: zipReceiptHash,
      created_at_utc: '2026-05-28T00:00:00.000Z',
      notes: 'Tech44 smoke audit',
    });

    assert.notEqual(changed.manifest_hash, manifest.manifest_hash);
  });

  await test('mutated manifest hash fails verification', async () => {
    assert.equal(
      await verifyLocalProofExportManifest({
        ...manifest,
        manifest_hash: 'a'.repeat(64),
      }),
      false
    );
  });

  await test('wrong scope fails verification', async () => {
    assert.equal(
      await verifyLocalProofExportManifest({
        ...manifest,
        scope: 'ARV_REGISTERED',
      }),
      false
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
      false
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
      false
    );
  });

  await test('invalid binding hash format fails creation', async () => {
    await assert.rejects(
      () =>
        createLocalProofExportManifest({
          export_id: 'ARV-EXPORT-LOCAL-001',
          evidence_id: 'ARV-EVIDENCE-LOCAL-001',
          certificate_hash: 'not-a-sha256',
        }),
      /certificate_hash must be 64-char lowercase hex/
    );
  });

  await test('manifest text does not claim external authority', async () => {
    const compact = JSON.stringify(manifest).toLowerCase();

    assert(!compact.includes('"registered":true'));
    assert(!compact.includes('"official_validation":true'));
    assert(!compact.includes('"public_ledger":true'));
    assert(!compact.includes('"rfc3161":true'));
    assert(!compact.includes('"postgres":true'));
    assert(!compact.includes('"hsm_kms":true'));
    assert(compact.includes('local_l0'));
    assert(compact.includes('not official validation'));
    assert(compact.includes('not authority registration'));
  });

  console.log('—'.repeat(72));

  if (failed > 0) {
    console.error(`[ARV Tech44 Local Proof Export Manifest] ${passed}/${passed + failed} passed, ${failed} FAILED`);
    process.exitCode = 1;
    return;
  }

  console.log(`[ARV Tech44 Local Proof Export Manifest] all tests passed (${passed}/${passed})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
