/**
 * ARV Witness Checkpoint v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 * No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Run:
 * npx tsx scripts/smoke-arv-checkpoint.ts
 */

import {
  createWitnessCheckpoint,
  hashSignedEnvelope,
  verifyCheckpointChain,
  verifyWitnessCheckpoint,
  type ARVWitnessCheckpoint,
} from '../lib/rva/kernel/checkpoint';

import {
  generateLocalSigningKeyPair,
  signCanonicalPayload,
  verifySignedEnvelope,
} from '../lib/rva/kernel/signature';

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
const SEED = new Uint8Array(32).fill(0x33);

async function main(): Promise<void> {
  console.log('\n[ARV Witness Checkpoint v1 — Smoke Test]');
  console.log('─'.repeat(56));

  const payload = {
    id: 'ARV-WITNESS-SMOKE-001',
    status: 'LOCAL_UNREGISTERED',
    authority: 'Reality Validation Authority',
    document_hash: 'a'.repeat(64),
    timestamp_utc: FIXED_TS,
  };

  const keypair = await generateLocalSigningKeyPair(SEED);
  const envelope = await signCanonicalPayload(payload, keypair.secret_key_hex, {
    signed_at_utc: FIXED_TS,
  });

  const payloadHash = envelope.payload_hash;
  const envelopeHash = await hashSignedEnvelope(envelope);

  let cp1: ARVWitnessCheckpoint;
  let cp2: ARVWitnessCheckpoint;

  console.log('\n● signed envelope preflight');

  await test('signed envelope verifies before checkpointing', async () => {
    assert(await verifySignedEnvelope(payload, envelope));
  });

  await test('hashSignedEnvelope returns 64-char sha256 hex', async () => {
    assert(isSha256Hex(envelopeHash), envelopeHash);
  });

  await test('hashSignedEnvelope is stable for same envelope', async () => {
    const again = await hashSignedEnvelope(envelope);
    assert(envelopeHash === again);
  });

  await test('hashSignedEnvelope changes when envelope changes', async () => {
    const changed = await hashSignedEnvelope({
      ...envelope,
      signed_at_utc: '2026-05-23T12:01:00Z',
    });
    assert(envelopeHash !== changed);
  });

  console.log('\n● createWitnessCheckpoint');

  await test('creates checkpoint #1 with previous_checkpoint_hash null', async () => {
    cp1 = await createWitnessCheckpoint({
      sequence: 1,
      evidence_id: 'ARV-WITNESS-001',
      payload_hash: payloadHash,
      envelope_hash: envelopeHash,
      previous_checkpoint_hash: null,
      created_at_utc: FIXED_TS,
      witness: 'ARV-LOCAL-WITNESS',
    });

    assert(cp1.scope === 'LOCAL_L0');
    assert(cp1.algorithm === 'SHA-256');
    assert(cp1.sequence === 1);
    assert(cp1.previous_checkpoint_hash === null);
    assert(cp1.created_at_utc === FIXED_TS);
    assert(cp1.witness === 'ARV-LOCAL-WITNESS');
    assert(isSha256Hex(cp1.checkpoint_hash));
  });

  await test('creates checkpoint #2 linked to checkpoint #1', async () => {
    cp2 = await createWitnessCheckpoint({
      sequence: 2,
      evidence_id: 'ARV-WITNESS-002',
      payload_hash: payloadHash,
      envelope_hash: envelopeHash,
      previous_checkpoint_hash: cp1.checkpoint_hash,
      created_at_utc: FIXED_TS,
      witness: 'ARV-LOCAL-WITNESS',
    });

    assert(cp2.sequence === 2);
    assert(cp2.previous_checkpoint_hash === cp1.checkpoint_hash);
    assert(isSha256Hex(cp2.checkpoint_hash));
    assert(cp2.checkpoint_hash !== cp1.checkpoint_hash);
  });

  console.log('\n● verifyWitnessCheckpoint');

  await test('valid checkpoint #1 verifies', async () => {
    assert(await verifyWitnessCheckpoint(cp1));
  });

  await test('valid checkpoint #2 verifies', async () => {
    assert(await verifyWitnessCheckpoint(cp2));
  });

  await test('mutated evidence_id fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp1,
      evidence_id: 'ARV-WITNESS-MUTATED',
    }));
  });

  await test('mutated payload_hash fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp1,
      payload_hash: 'b'.repeat(64),
    }));
  });

  await test('mutated envelope_hash fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp1,
      envelope_hash: 'c'.repeat(64),
    }));
  });

  await test('mutated checkpoint_hash fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp1,
      checkpoint_hash: 'd'.repeat(64),
    }));
  });

  await test('wrong scope fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp1,
      scope: 'REGISTERED' as 'LOCAL_L0',
    }));
  });

  await test('wrong algorithm fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp1,
      algorithm: 'MD5' as 'SHA-256',
    }));
  });

  await test('sequence 0 fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp1,
      sequence: 0,
    }));
  });

  await test('invalid previous_checkpoint_hash fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp2,
      previous_checkpoint_hash: 'not-a-sha256',
    }));
  });

  await test('missing created_at_utc fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp1,
      created_at_utc: '',
    }));
  });

  await test('missing witness fails verification', async () => {
    assert(!await verifyWitnessCheckpoint({
      ...cp1,
      witness: '',
    }));
  });

  await test('garbage checkpoint fails without throwing', async () => {
    const garbage = {
      ...cp1,
      payload_hash: 'x'.repeat(64),
      envelope_hash: 'x'.repeat(64),
      checkpoint_hash: 'x'.repeat(64),
    } as ARVWitnessCheckpoint;

    assert(!await verifyWitnessCheckpoint(garbage));
  });

  console.log('\n● verifyCheckpointChain');

  await test('valid two-checkpoint chain verifies', async () => {
    assert(await verifyCheckpointChain([cp1, cp2]));
  });

  await test('empty chain fails', async () => {
    assert(!await verifyCheckpointChain([]));
  });

  await test('reversed chain fails', async () => {
    assert(!await verifyCheckpointChain([cp2, cp1]));
  });

  await test('duplicate sequence fails', async () => {
    const duplicate = await createWitnessCheckpoint({
      sequence: 1,
      evidence_id: 'ARV-WITNESS-DUPLICATE',
      payload_hash: payloadHash,
      envelope_hash: envelopeHash,
      previous_checkpoint_hash: null,
      created_at_utc: FIXED_TS,
      witness: 'ARV-LOCAL-WITNESS',
    });

    assert(await verifyWitnessCheckpoint(duplicate));
    assert(!await verifyCheckpointChain([cp1, duplicate]));
  });

  await test('broken chain link with internally valid cp2 fails', async () => {
    const rogue = await createWitnessCheckpoint({
      sequence: 2,
      evidence_id: 'ARV-WITNESS-ROGUE',
      payload_hash: payloadHash,
      envelope_hash: envelopeHash,
      previous_checkpoint_hash: 'e'.repeat(64),
      created_at_utc: FIXED_TS,
      witness: 'ARV-LOCAL-WITNESS',
    });

    assert(await verifyWitnessCheckpoint(rogue));
    assert(!await verifyCheckpointChain([cp1, rogue]));
  });

  await test('mutated checkpoint inside chain fails', async () => {
    assert(!await verifyCheckpointChain([
      cp1,
      {
        ...cp2,
        evidence_id: 'ARV-WITNESS-002-MUTATED',
      },
    ]));
  });

  await test('checkpoint created from signed envelope remains offline-verifiable', async () => {
    assert(await verifySignedEnvelope(payload, envelope));
    assert(await verifyWitnessCheckpoint(cp1));
    assert(await verifyCheckpointChain([cp1, cp2]));
  });

  console.log('\n' + '─'.repeat(56));

  const total = passed + failed;

  if (failed === 0) {
    console.log(`[ARV Checkpoint] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV Checkpoint] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});