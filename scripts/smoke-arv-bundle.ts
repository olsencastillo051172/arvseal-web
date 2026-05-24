/**
 * ARV Evidence Bundle Manifest v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 * No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Run:
 * npx tsx scripts/smoke-arv-bundle.ts
 */

import { sha256HexFromString } from '../lib/rva/kernel/hash';

import {
  generateLocalSigningKeyPair,
  signCanonicalPayload,
  verifySignedEnvelope,
} from '../lib/rva/kernel/signature';

import {
  createWitnessCheckpoint,
  hashSignedEnvelope,
  verifyCheckpointChain,
  verifyWitnessCheckpoint,
} from '../lib/rva/kernel/checkpoint';

import {
  createEvidenceBundleManifest,
  hashEvidenceBundleManifest,
  verifyEvidenceBundleManifest,
  type ARVEvidenceBundleManifest,
} from '../lib/rva/kernel/bundle';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e: unknown) {
    console.log(`  ✗  ${name}`);
    console.log(`     ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(message ?? 'assertion failed');
}

function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

const FIXED_TS = '2026-05-23T12:00:00Z';
const SEED = new Uint8Array(32).fill(0x44);

async function main(): Promise<void> {
  console.log('\n[ARV Evidence Bundle Manifest v1 — Smoke Test]');
  console.log('─'.repeat(60));

  const sourceContent = 'ARV evidence bundle smoke test document.';
  const documentHash = await sha256HexFromString(sourceContent);

  const payload = {
    id: 'ARV-BUNDLE-SMOKE-001',
    status: 'LOCAL_UNREGISTERED',
    authority: 'Reality Validation Authority',
    document_hash: documentHash,
    timestamp_utc: FIXED_TS,
  };

  const keypair = await generateLocalSigningKeyPair(SEED);

  const envelope = await signCanonicalPayload(payload, keypair.secret_key_hex, {
    signed_at_utc: FIXED_TS,
  });

  const signedEnvelopeHash = await hashSignedEnvelope(envelope);

  const checkpoint = await createWitnessCheckpoint({
    sequence: 1,
    evidence_id: payload.id,
    payload_hash: envelope.payload_hash,
    envelope_hash: signedEnvelopeHash,
    previous_checkpoint_hash: null,
    created_at_utc: FIXED_TS,
    witness: 'ARV-LOCAL-WITNESS',
  });

  let manifest: ARVEvidenceBundleManifest;

  console.log('\n● preflight: source + signing + checkpoint');

  await test('can generate source document hash', async () => {
    assert(isSha256Hex(documentHash), documentHash);
  });

  await test('can generate signed envelope', async () => {
    assert(envelope.scope === 'LOCAL_L0');
    assert(envelope.algorithm === 'Ed25519');
    assert(isSha256Hex(envelope.payload_hash));
    assert(isSha256Hex(signedEnvelopeHash));
  });

  await test('signed envelope verifies offline', async () => {
    assert(await verifySignedEnvelope(payload, envelope));
  });

  await test('can create witness checkpoint', async () => {
    assert(checkpoint.scope === 'LOCAL_L0');
    assert(checkpoint.algorithm === 'SHA-256');
    assert(checkpoint.sequence === 1);
    assert(checkpoint.previous_checkpoint_hash === null);
    assert(isSha256Hex(checkpoint.checkpoint_hash));
  });

  await test('witness checkpoint verifies offline', async () => {
    assert(await verifyWitnessCheckpoint(checkpoint));
  });

  await test('single-checkpoint chain verifies offline', async () => {
    assert(await verifyCheckpointChain([checkpoint]));
  });

  console.log('\n● createEvidenceBundleManifest');

  await test('can create evidence bundle manifest', async () => {
    manifest = await createEvidenceBundleManifest({
      evidence_id: payload.id,
      source: {
        file_name: 'smoke-document.txt',
        mime_type: 'text/plain',
        size_bytes: sourceContent.length,
        document_hash: documentHash,
      },
      signed_envelope_hash: signedEnvelopeHash,
      checkpoint_hash: checkpoint.checkpoint_hash,
      checkpoint_sequence: checkpoint.sequence,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(manifest.format === 'ARV-BUNDLE-MANIFEST-v1');
    assert(manifest.scope === 'LOCAL_L0');
    assert(manifest.algorithm === 'SHA-256');
    assert(manifest.evidence_id === payload.id);
    assert(manifest.source.file_name === 'smoke-document.txt');
    assert(manifest.source.document_hash === documentHash);
    assert(manifest.signed_envelope_hash === signedEnvelopeHash);
    assert(manifest.checkpoint_hash === checkpoint.checkpoint_hash);
    assert(manifest.checkpoint_sequence === checkpoint.sequence);
    assert(manifest.created_at_utc === FIXED_TS);
    assert(manifest.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(manifest.producer === 'ARV-LOCAL');
    assert(isSha256Hex(manifest.manifest_hash));
  });

  await test('manifest verifies offline', async () => {
    assert(await verifyEvidenceBundleManifest(manifest));
  });

  await test('manifest hash is recomputable', async () => {
    const { manifest_hash: _ignored, ...body } = manifest;
    const recomputed = await hashEvidenceBundleManifest(body);
    assert(recomputed === manifest.manifest_hash);
  });

  await test('same fixed input produces same manifest hash', async () => {
    const duplicate = await createEvidenceBundleManifest({
      evidence_id: payload.id,
      source: {
        file_name: 'smoke-document.txt',
        mime_type: 'text/plain',
        size_bytes: sourceContent.length,
        document_hash: documentHash,
      },
      signed_envelope_hash: signedEnvelopeHash,
      checkpoint_hash: checkpoint.checkpoint_hash,
      checkpoint_sequence: checkpoint.sequence,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(duplicate.manifest_hash === manifest.manifest_hash);
  });

  await test('manifest hash changes when source document_hash changes', async () => {
    const changed = await createEvidenceBundleManifest({
      evidence_id: payload.id,
      source: {
        file_name: 'smoke-document.txt',
        mime_type: 'text/plain',
        size_bytes: sourceContent.length,
        document_hash: 'b'.repeat(64),
      },
      signed_envelope_hash: signedEnvelopeHash,
      checkpoint_hash: checkpoint.checkpoint_hash,
      checkpoint_sequence: checkpoint.sequence,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(changed.manifest_hash !== manifest.manifest_hash);
  });

  console.log('\n● verifyEvidenceBundleManifest — mutation rejection');

  await test('mutated evidence_id fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      evidence_id: 'ARV-BUNDLE-MUTATED',
    }));
  });

  await test('mutated source.file_name fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      source: {
        ...manifest.source,
        file_name: 'tampered.txt',
      },
    }));
  });

  await test('mutated source.document_hash fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      source: {
        ...manifest.source,
        document_hash: 'c'.repeat(64),
      },
    }));
  });

  await test('mutated signed_envelope_hash fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      signed_envelope_hash: 'd'.repeat(64),
    }));
  });

  await test('mutated checkpoint_hash fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      checkpoint_hash: 'e'.repeat(64),
    }));
  });

  await test('mutated checkpoint_sequence fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      checkpoint_sequence: 2,
    }));
  });

  await test('mutated manifest_hash fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      manifest_hash: 'f'.repeat(64),
    }));
  });

  await test('wrong format fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      format: 'OTHER' as 'ARV-BUNDLE-MANIFEST-v1',
    }));
  });

  await test('wrong scope fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      scope: 'ARV_REGISTERED' as 'LOCAL_L0',
    }));
  });

  await test('wrong algorithm fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      algorithm: 'MD5' as 'SHA-256',
    }));
  });

  await test('missing created_at_utc fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      created_at_utc: '',
    }));
  });

  await test('missing policy fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      policy: '',
    }));
  });

  await test('missing producer fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      producer: '',
    }));
  });

  await test('negative size_bytes fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      source: {
        ...manifest.source,
        size_bytes: -1,
      },
    }));
  });

  await test('non-integer size_bytes fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      source: {
        ...manifest.source,
        size_bytes: 12.5,
      },
    }));
  });

  await test('invalid source.document_hash format fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      source: {
        ...manifest.source,
        document_hash: 'not-a-sha256',
      },
    }));
  });

  await test('invalid signed_envelope_hash format fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      signed_envelope_hash: 'not-a-sha256',
    }));
  });

  await test('invalid checkpoint_hash format fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      checkpoint_hash: 'not-a-sha256',
    }));
  });

  await test('checkpoint_sequence zero fails verification', async () => {
    assert(!await verifyEvidenceBundleManifest({
      ...manifest,
      checkpoint_sequence: 0,
    }));
  });

  console.log('\n● integration invariant');

  await test('bundle binds source + signed envelope + witness checkpoint offline', async () => {
    assert(await verifySignedEnvelope(payload, envelope));
    assert(await verifyWitnessCheckpoint(checkpoint));
    assert(await verifyCheckpointChain([checkpoint]));
    assert(await verifyEvidenceBundleManifest(manifest));
  });

  await test('bundle remains LOCAL_L0 and does not claim authority registration', async () => {
    assert(manifest.scope === 'LOCAL_L0');
    assert(manifest.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(manifest.producer === 'ARV-LOCAL');
  });

  console.log('\n' + '─'.repeat(60));

  const total = passed + failed;

  if (failed === 0) {
    console.log(`[ARV Bundle] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV Bundle] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});