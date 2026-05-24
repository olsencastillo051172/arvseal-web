/**
 * ARV Portable Verifier Payload v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 * No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Run:
 * npx tsx scripts/smoke-arv-verifier-payload.ts
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
  verifyEvidenceBundleManifest,
} from '../lib/rva/kernel/bundle';

import {
  createPortableVerifierPayload,
  hashPortableVerifierPayload,
  verifyPortableVerifierPayload,
  type ARVPortableVerifierPayload,
} from '../lib/rva/kernel/verifier-payload';

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
const SEED = new Uint8Array(32).fill(0x55);

async function main(): Promise<void> {
  console.log('\n[ARV Portable Verifier Payload v1 — Smoke Test]');
  console.log('─'.repeat(64));

  const sourceContent = 'ARV portable verifier payload smoke test document.';
  const documentHash = await sha256HexFromString(sourceContent);

  const payload = {
    id: 'ARV-VERIFIER-PAYLOAD-SMOKE-001',
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

  const bundleManifest = await createEvidenceBundleManifest({
    evidence_id: payload.id,
    source: {
      file_name: 'portable-verifier-smoke.txt',
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

  let verifierPayload: ARVPortableVerifierPayload;

  console.log('\n● preflight: source + signing + checkpoint + bundle');

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

  await test('checkpoint chain verifies offline', async () => {
    assert(await verifyCheckpointChain([checkpoint]));
  });

  await test('can create evidence bundle manifest', async () => {
    assert(bundleManifest.format === 'ARV-BUNDLE-MANIFEST-v1');
    assert(bundleManifest.scope === 'LOCAL_L0');
    assert(bundleManifest.algorithm === 'SHA-256');
    assert(bundleManifest.evidence_id === payload.id);
    assert(bundleManifest.source.document_hash === documentHash);
    assert(bundleManifest.signed_envelope_hash === signedEnvelopeHash);
    assert(bundleManifest.checkpoint_hash === checkpoint.checkpoint_hash);
    assert(bundleManifest.checkpoint_sequence === checkpoint.sequence);
    assert(isSha256Hex(bundleManifest.manifest_hash));
  });

  await test('evidence bundle manifest verifies offline', async () => {
    assert(await verifyEvidenceBundleManifest(bundleManifest));
  });

  console.log('\n● createPortableVerifierPayload');

  await test('can create portable verifier payload from manifest values', async () => {
    verifierPayload = await createPortableVerifierPayload({
      evidence_id: bundleManifest.evidence_id,
      document_hash: bundleManifest.source.document_hash,
      manifest_hash: bundleManifest.manifest_hash,
      signed_envelope_hash: bundleManifest.signed_envelope_hash,
      checkpoint_hash: bundleManifest.checkpoint_hash,
      checkpoint_sequence: bundleManifest.checkpoint_sequence,
      created_at_utc: FIXED_TS,
      policy: bundleManifest.policy,
      producer: bundleManifest.producer,
    });

    assert(verifierPayload.format === 'ARV-PORTABLE-VERIFIER-PAYLOAD-v1');
    assert(verifierPayload.scope === 'LOCAL_L0');
    assert(verifierPayload.algorithm === 'SHA-256');
    assert(verifierPayload.evidence_id === bundleManifest.evidence_id);
    assert(verifierPayload.document_hash === bundleManifest.source.document_hash);
    assert(verifierPayload.manifest_hash === bundleManifest.manifest_hash);
    assert(verifierPayload.signed_envelope_hash === bundleManifest.signed_envelope_hash);
    assert(verifierPayload.checkpoint_hash === bundleManifest.checkpoint_hash);
    assert(verifierPayload.checkpoint_sequence === bundleManifest.checkpoint_sequence);
    assert(verifierPayload.created_at_utc === FIXED_TS);
    assert(verifierPayload.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(verifierPayload.producer === 'ARV-LOCAL');
    assert(isSha256Hex(verifierPayload.payload_hash));
  });

  await test('portable verifier payload verifies offline', async () => {
    assert(await verifyPortableVerifierPayload(verifierPayload));
  });

  await test('payload hash is recomputable', async () => {
    const { payload_hash: _ignored, ...body } = verifierPayload;
    const recomputed = await hashPortableVerifierPayload(body);
    assert(recomputed === verifierPayload.payload_hash);
  });

  await test('same fixed input produces same payload hash', async () => {
    const duplicate = await createPortableVerifierPayload({
      evidence_id: bundleManifest.evidence_id,
      document_hash: bundleManifest.source.document_hash,
      manifest_hash: bundleManifest.manifest_hash,
      signed_envelope_hash: bundleManifest.signed_envelope_hash,
      checkpoint_hash: bundleManifest.checkpoint_hash,
      checkpoint_sequence: bundleManifest.checkpoint_sequence,
      created_at_utc: FIXED_TS,
      policy: bundleManifest.policy,
      producer: bundleManifest.producer,
    });

    assert(duplicate.payload_hash === verifierPayload.payload_hash);
  });

  await test('payload hash changes when document_hash changes', async () => {
    const changed = await createPortableVerifierPayload({
      evidence_id: bundleManifest.evidence_id,
      document_hash: 'b'.repeat(64),
      manifest_hash: bundleManifest.manifest_hash,
      signed_envelope_hash: bundleManifest.signed_envelope_hash,
      checkpoint_hash: bundleManifest.checkpoint_hash,
      checkpoint_sequence: bundleManifest.checkpoint_sequence,
      created_at_utc: FIXED_TS,
      policy: bundleManifest.policy,
      producer: bundleManifest.producer,
    });

    assert(changed.payload_hash !== verifierPayload.payload_hash);
  });

  console.log('\n● verifyPortableVerifierPayload — mutation rejection');

  await test('mutated evidence_id fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      evidence_id: 'ARV-VERIFIER-PAYLOAD-MUTATED',
    }));
  });

  await test('mutated document_hash fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      document_hash: 'c'.repeat(64),
    }));
  });

  await test('mutated manifest_hash fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      manifest_hash: 'd'.repeat(64),
    }));
  });

  await test('mutated signed_envelope_hash fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      signed_envelope_hash: 'e'.repeat(64),
    }));
  });

  await test('mutated checkpoint_hash fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      checkpoint_hash: 'f'.repeat(64),
    }));
  });

  await test('mutated checkpoint_sequence fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      checkpoint_sequence: 2,
    }));
  });

  await test('mutated payload_hash fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      payload_hash: 'a'.repeat(64),
    }));
  });

  await test('wrong format fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      format: 'OTHER' as 'ARV-PORTABLE-VERIFIER-PAYLOAD-v1',
    }));
  });

  await test('wrong scope fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      scope: 'ARV_REGISTERED' as 'LOCAL_L0',
    }));
  });

  await test('wrong algorithm fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      algorithm: 'MD5' as 'SHA-256',
    }));
  });

  await test('missing created_at_utc fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      created_at_utc: '',
    }));
  });

  await test('missing policy fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      policy: '',
    }));
  });

  await test('missing producer fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      producer: '',
    }));
  });

  await test('checkpoint_sequence zero fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      checkpoint_sequence: 0,
    }));
  });

  await test('invalid document_hash format fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      document_hash: 'not-a-sha256',
    }));
  });

  await test('invalid manifest_hash format fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      manifest_hash: 'not-a-sha256',
    }));
  });

  await test('invalid signed_envelope_hash format fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      signed_envelope_hash: 'not-a-sha256',
    }));
  });

  await test('invalid checkpoint_hash format fails verification', async () => {
    assert(!await verifyPortableVerifierPayload({
      ...verifierPayload,
      checkpoint_hash: 'not-a-sha256',
    }));
  });

  console.log('\n● integration invariant');

  await test('payload remains connected to bundle, checkpoint, and envelope offline', async () => {
    assert(await verifySignedEnvelope(payload, envelope));
    assert(await verifyWitnessCheckpoint(checkpoint));
    assert(await verifyCheckpointChain([checkpoint]));
    assert(await verifyEvidenceBundleManifest(bundleManifest));
    assert(await verifyPortableVerifierPayload(verifierPayload));
  });

  await test('payload remains LOCAL_L0 and does not claim authority registration', async () => {
    assert(verifierPayload.scope === 'LOCAL_L0');
    assert(verifierPayload.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(verifierPayload.producer === 'ARV-LOCAL');
  });

  console.log('\n' + '─'.repeat(64));

  const total = passed + failed;

  if (failed === 0) {
    console.log(`[ARV Verifier Payload] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV Verifier Payload] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});