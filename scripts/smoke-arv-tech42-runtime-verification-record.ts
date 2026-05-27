/**
 * ARV Tech42 Runtime Verification Record v1 — Smoke Audit
 *
 * Verifies LOCAL_L0 runtime verification records:
 * deterministic hashing, record replay, status handling,
 * optional package/ZIP bindings, and no dependency wording.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

import {
  createRuntimeVerificationRecord,
  verifyRuntimeVerificationRecord,
  hashRuntimeVerificationRecord,
  canonicalizeRuntimeVerificationRecord,
  ARV_RUNTIME_VERIFICATION_RECORD_FORMAT,
  type ARVRuntimeVerificationRecord,
} from '../lib/rva/kernel/runtime-verification-record';

import { sha256HexFromString } from '../lib/rva/kernel/hash';

type TestFn = () => void | Promise<void>;

let passed = 0;
let failed = 0;
let total = 0;

const root = resolve(process.cwd());

function file(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

function has(text: string, needle: string): boolean {
  return text.includes(needle);
}

function assertDoesNotContainAny(text: string, words: string[], label: string): void {
  const lower = text.toLowerCase();
  for (const word of words) {
    assert(!lower.includes(word.toLowerCase()), `${label} must not contain ${word}`);
  }
}

async function test(name: string, fn: TestFn): Promise<void> {
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

function mutate(record: ARVRuntimeVerificationRecord): ARVRuntimeVerificationRecord {
  return {
    ...record,
    status: record.status === 'passed' ? 'failed' : 'passed',
  };
}

async function main(): Promise<void> {
  console.log('[ARV Tech42 Runtime Verification Record] Smoke Audit');
  console.log('------------------------------------------------------');

  const runtimeFile = file('lib/rva/kernel/runtime-verification-record.ts');
  const indexFile = file('lib/rva/kernel/index.ts');

  const verifierPayloadHash = await sha256HexFromString('verifier-payload');
  const manifestHash = await sha256HexFromString('manifest');
  const checkpointHash = await sha256HexFromString('checkpoint');
  const packageIndexHash = await sha256HexFromString('package-index');
  const zipSha256 = await sha256HexFromString('zip-bytes');
  const zipReceiptHash = await sha256HexFromString('zip-receipt');

  await test('runtime record file declares LOCAL_L0 and SHA-256', () => {
    assert(has(runtimeFile, 'LOCAL_L0'));
    assert(has(runtimeFile, 'SHA-256'));
    assert(has(runtimeFile, 'ARV-RUNTIME-VERIFICATION-RECORD-V1'));
  });

  await test('runtime record module is exported from kernel index', () => {
    assert(has(indexFile, "export * from './runtime-verification-record';"));
  });

  await test('runtime record creates passed local record with deterministic hash', async () => {
    const record = await createRuntimeVerificationRecord({
      evidence_id: 'ARV-TECH42-DEMO',
      verifier_payload_hash: verifierPayloadHash,
      manifest_hash: manifestHash,
      checkpoint_hash: checkpointHash,
      status: 'passed',
      verified_at_utc: '2026-05-27T00:00:00.000Z',
    });

    assert.equal(record.format, ARV_RUNTIME_VERIFICATION_RECORD_FORMAT);
    assert.equal(record.scope, 'LOCAL_L0');
    assert.equal(record.algorithm, 'SHA-256');
    assert.equal(record.status, 'passed');
    assert.equal(record.verifier, 'ARV-LOCAL-RUNTIME');
    assert.equal(record.policy, 'ARV-L0-LOCAL-INTEGRITY-V1');
    assert.match(record.record_hash, /^[0-9a-f]{64}$/);
    assert.equal(await verifyRuntimeVerificationRecord(record), true);
  });

  await test('runtime record binds optional package and ZIP hashes', async () => {
    const record = await createRuntimeVerificationRecord({
      evidence_id: 'ARV-TECH42-ZIP',
      verifier_payload_hash: verifierPayloadHash,
      manifest_hash: manifestHash,
      checkpoint_hash: checkpointHash,
      package_index_hash: packageIndexHash,
      zip_sha256: zipSha256,
      zip_receipt_hash: zipReceiptHash,
      status: 'passed',
      verified_at_utc: '2026-05-27T00:00:00.000Z',
    });

    assert.equal(record.package_index_hash, packageIndexHash);
    assert.equal(record.zip_sha256, zipSha256);
    assert.equal(record.zip_receipt_hash, zipReceiptHash);
    assert.equal(await verifyRuntimeVerificationRecord(record), true);
  });

  await test('runtime record rejects mutation after hashing', async () => {
    const record = await createRuntimeVerificationRecord({
      evidence_id: 'ARV-TECH42-MUTATION',
      verifier_payload_hash: verifierPayloadHash,
      manifest_hash: manifestHash,
      checkpoint_hash: checkpointHash,
      status: 'passed',
      verified_at_utc: '2026-05-27T00:00:00.000Z',
    });

    assert.equal(await verifyRuntimeVerificationRecord(record), true);
    assert.equal(await verifyRuntimeVerificationRecord(mutate(record)), false);
  });

  await test('runtime record supports failed status as valid evidence state', async () => {
    const record = await createRuntimeVerificationRecord({
      evidence_id: 'ARV-TECH42-FAILED-STATE',
      verifier_payload_hash: verifierPayloadHash,
      manifest_hash: manifestHash,
      checkpoint_hash: checkpointHash,
      status: 'failed',
      verified_at_utc: '2026-05-27T00:00:00.000Z',
    });

    assert.equal(record.status, 'failed');
    assert.equal(await verifyRuntimeVerificationRecord(record), true);
  });

  await test('runtime record hash is stable from canonical preimage', async () => {
    const record = await createRuntimeVerificationRecord({
      evidence_id: 'ARV-TECH42-STABLE',
      verifier_payload_hash: verifierPayloadHash,
      manifest_hash: manifestHash,
      checkpoint_hash: checkpointHash,
      status: 'passed',
      verified_at_utc: '2026-05-27T00:00:00.000Z',
      notes: 'portable runtime check',
    });

    const { record_hash: _ignored, ...body } = record;
    const expected = await hashRuntimeVerificationRecord(body);

    assert.equal(record.record_hash, expected);
  });

  await test('runtime record canonical JSON includes core chain fields', async () => {
    const record = await createRuntimeVerificationRecord({
      evidence_id: 'ARV-TECH42-CANONICAL',
      verifier_payload_hash: verifierPayloadHash,
      manifest_hash: manifestHash,
      checkpoint_hash: checkpointHash,
      status: 'passed',
      verified_at_utc: '2026-05-27T00:00:00.000Z',
    });

    const json = canonicalizeRuntimeVerificationRecord(record);

    assert(has(json, 'verifier_payload_hash'));
    assert(has(json, 'manifest_hash'));
    assert(has(json, 'checkpoint_hash'));
    assert(has(json, 'record_hash'));
  });

  await test('runtime record rejects invalid hex input', async () => {
    await assert.rejects(
      () =>
        createRuntimeVerificationRecord({
          evidence_id: 'ARV-TECH42-BAD-HEX',
          verifier_payload_hash: 'bad',
          manifest_hash: manifestHash,
          checkpoint_hash: checkpointHash,
          status: 'passed',
        }),
      /verifier_payload_hash/,
    );
  });

  await test('runtime record stays local-only without external service dependency words', () => {
    assertDoesNotContainAny(
      runtimeFile,
      ['PostgreSQL', 'HSM', 'KMS', 'RFC 3161', 'network anchoring', 'registered validation'],
      'runtime verification record',
    );
  });

  await test('runtime record does not claim external status', () => {
    const compact = runtimeFile.replace(/\s+/g, ' ').toLowerCase();
    assert(!compact.includes('authority registration'));
    assert(!compact.includes('official validation'));
    assert(!compact.includes('registered external authority'));
  });

  console.log('------------------------------------------------------');

  if (failed > 0) {
    console.error(`[ARV Tech42 Runtime Verification Record] ${passed}/${total} passed, ${failed} FAILED`);
    process.exitCode = 1;
    return;
  }

  console.log(`[ARV Tech42 Runtime Verification Record] all tests passed (${passed}/${total})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
