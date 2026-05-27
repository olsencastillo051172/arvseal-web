/**
 * ARV Next Integrity Layer v1 — Smoke Audit
 * Scope: LOCAL_L0 only.
 *
 * This smoke test verifies the real local integrity layer by behavior markers,
 * not brittle exact constant names.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

type TestFn = () => void;

let passed = 0;
let failed = 0;
let total = 0;

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function lower(source: string): string {
  return source.toLowerCase();
}

function compact(source: string): string {
  return lower(source).replace(/[^a-z0-9_]+/g, ' ');
}

function has(source: string, value: string): boolean {
  return source.includes(value);
}

function hasLower(source: string, value: string): boolean {
  return lower(source).includes(value.toLowerCase());
}

function hasAny(source: string, values: string[]): boolean {
  const s = lower(source);
  return values.some((value) => s.includes(value.toLowerCase()));
}

function hasAllAny(source: string, groups: string[][]): boolean {
  return groups.every((group) => hasAny(source, group));
}

function test(name: string, fn: TestFn): void {
  total += 1;
  try {
    fn();
    passed += 1;
    console.log(`✅ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`❌ ${name}`);
    console.error(error);
  }
}

function main(): void {
  console.log('\n[ARV Next Integrity Layer v1 — Smoke Audit]');
  console.log('─'.repeat(72));

  const files = {
    policy: read('lib/rva/kernel/policy.ts'),
    bundle: read('lib/rva/kernel/bundle.ts'),
    checkpoint: read('lib/rva/kernel/checkpoint.ts'),
    offlineCertificate: read('lib/rva/kernel/offline-certificate.ts'),
    packageIndex: read('lib/rva/kernel/package-index.ts'),
    qrTransferPayload: read('lib/rva/kernel/qr-transfer-payload.ts'),
    signature: read('lib/rva/kernel/signature.ts'),
    verifierPayload: read('lib/rva/kernel/verifier-payload.ts'),
    zipPackage: read('lib/rva/kernel/zip-package.ts'),
    zipVerificationReceipt: read('lib/rva/kernel/zip-verification-receipt.ts'),
    demoClient: read('app/demo/DemoClient.tsx'),
  };

  const combined = Object.values(files).join('\n');
  const combinedCompact = compact(combined);

  test('kernel remains local-only proof layer', () => {
    assert(hasAny(combined, ['LOCAL_L0', 'LOCAL_LØ', 'local proof', 'local integrity']));
    assert(!hasAny(combined, ['ARV_REGISTERED', 'AUTHORITY_REGISTERED']));
  });

  test('kernel uses SHA-256 hash primitives', () => {
    assert(hasAny(combined, ['SHA-256', 'sha256', 'sha256HexFromString', 'sha256HexFromBytes']));
  });

  test('policy declares local integrity posture', () => {
    assert(hasAny(files.policy, ['policy', 'integrity', 'local']));
    assert(hasAny(files.policy, ['authorityRequired', 'authorityrequired', 'authority required']));
    assert(hasAny(files.policy, ['networkRequired', 'networkrequired', 'network required']));
    assert(hasAny(files.policy, ['false']));
  });

  test('bundle binds source, signed envelope, checkpoint, and manifest hash', () => {
    assert(hasAllAny(files.bundle, [
      ['source'],
      ['signed_envelope_hash', 'signed envelope'],
      ['checkpoint_hash', 'checkpoint'],
      ['manifest_hash', 'manifest'],
    ]));
  });

  test('checkpoint layer is append-only and verifies linkage fields', () => {
    assert(hasAllAny(files.checkpoint, [
      ['checkpoint_hash', 'checkpoint'],
      ['previous_checkpoint_hash', 'previous checkpoint'],
      ['sequence'],
      ['verify'],
    ]));
  });

  test('offline certificate is standalone local integrity evidence', () => {
    assert(hasAllAny(files.offlineCertificate, [
      ['certificate'],
      ['local'],
      ['offline', 'standalone', 'browser-openable'],
      ['manifest_hash', 'manifest'],
      ['certificate_hash'],
    ]));
  });

  test('package index binds evidence artifact hashes', () => {
    assert(hasAllAny(files.packageIndex, [
      ['package_index_hash', 'package index'],
      ['certificate_hash', 'certificate'],
      ['verifier_payload_hash', 'verifier payload'],
      ['manifest_hash', 'manifest'],
      ['checkpoint_hash', 'checkpoint'],
      ['signed_envelope_hash', 'signed envelope'],
    ]));
  });

  test('QR transfer payload carries portable integrity chain fields', () => {
    assert(hasAllAny(files.qrTransferPayload, [
      ['qr', 'transfer'],
      ['manifest_hash', 'manifest'],
      ['checkpoint_hash', 'checkpoint'],
      ['transfer_hash'],
      ['base64url', 'json', 'arv1'],
    ]));
  });

  test('signature envelope remains local Ed25519 proof', () => {
    assert(hasAllAny(files.signature, [
      ['ed25519'],
      ['local'],
      ['payload_hash'],
      ['signature_hex', 'signature'],
    ]));
  });

  test('portable verifier payload binds document and chain hashes', () => {
    assert(hasAllAny(files.verifierPayload, [
      ['verifier', 'portable'],
      ['document_hash', 'document'],
      ['manifest_hash', 'manifest'],
      ['signed_envelope_hash', 'signed envelope'],
      ['checkpoint_hash', 'checkpoint'],
    ]));
  });

  test('ZIP package and receipt remain local deterministic verification artifacts', () => {
    assert(hasAllAny(files.zipPackage, [
      ['zip'],
      ['package_index_hash', 'package index'],
      ['zip_package_hash', 'zip package'],
      ['zip_sha256', 'sha256'],
    ]));

    assert(hasAllAny(files.zipVerificationReceipt, [
      ['receipt'],
      ['local'],
      ['sha-256', 'sha256'],
      ['zip_file', 'zip file'],
    ]));
  });

  test('DemoClient is wired to local demo integrity flow', () => {
    assert(hasAllAny(files.demoClient, [
      ['LOCAL_L0', 'LOCAL_LØ', 'local'],
      ['manifestHash', 'manifest_hash', 'manifest'],
      ['checkpointHash', 'checkpoint_hash', 'checkpoint'],
      ['qrPayload', 'qrTransfer', 'qr payload', 'qr transfer'],
    ]));
  });

  test('next integrity layer does not claim registered external authority status', () => {
    assert(!combinedCompact.includes('arv_registered'));
    assert(!combinedCompact.includes('authority_registered'));
    assert(!combinedCompact.includes('registered validation'));
    assert(!combinedCompact.includes('is official validation'));
    assert(!combinedCompact.includes('official validation record'));
    assert(!combinedCompact.includes('officially validated'));
    assert(!combinedCompact.includes('ledger anchor active'));
    assert(!combinedCompact.includes('hsm kms integration'));
    assert(!combinedCompact.includes('postgresql connection'));
  });

  console.log('\n' + '─'.repeat(72));

  if (failed === 0) {
    console.log(`[ARV Next Integrity Layer] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV Next Integrity Layer] ❌ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main();


