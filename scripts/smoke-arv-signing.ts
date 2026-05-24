/**
 * ARV Local Signing Envelope v1 — Smoke Test
 * Imports real exports from lib/rva/kernel/signature.ts.
 * Run: npx tsx scripts/smoke-arv-signing.ts
 */
import {
  generateLocalSigningKeyPair,
  signCanonicalPayload,
  verifySignedEnvelope,
  fingerprintPublicKey,
  type ARVSignedEnvelope,
} from '../lib/rva/kernel/signature';

let passed = 0; let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try   { await fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (e: unknown) {
    console.log(`  ✗  ${name}`);
    console.log(`       ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}
function assert(cond: boolean, msg?: string): void {
  if (!cond) throw new Error(msg ?? 'assertion failed');
}

const PAYLOAD  = {
  id: 'ARV-SMOKE-SIGN-001', status: 'LOCAL_UNREGISTERED',
  authority: 'Reality Validation Authority',
  document_hash: 'a'.repeat(64), timestamp_utc: '2026-05-23T12:00:00Z',
};
const FIXED_TS = '2026-05-23T12:00:00Z';
const SEED     = new Uint8Array(32).fill(0x42);

async function main(): Promise<void> {
  console.log('\n[ARV Local Signing Envelope v1 — Smoke Test]');
  console.log('─'.repeat(52));

  console.log('\n● generateLocalSigningKeyPair');

  let kp1: Awaited<ReturnType<typeof generateLocalSigningKeyPair>>;

  await test('generates key pair without seed', async () => {
    const kp = await generateLocalSigningKeyPair();
    assert(kp.algorithm === 'Ed25519');
    assert(kp.public_key_hex.length  === 64);
    assert(kp.secret_key_hex.length  === 128);
    assert(/^[0-9a-f]+$/.test(kp.public_key_hex));
    assert(kp.public_key_fingerprint.length === 16);
  });

  await test('seeded key pair is deterministic', async () => {
    kp1                  = await generateLocalSigningKeyPair(SEED);
    const kp2            = await generateLocalSigningKeyPair(SEED);
    assert(kp1.public_key_hex  === kp2.public_key_hex);
    assert(kp1.secret_key_hex  === kp2.secret_key_hex);
  });

  await test('fingerprint in key pair matches fingerprintPublicKey()', async () => {
    const expected = await fingerprintPublicKey(kp1.public_key_hex);
    assert(kp1.public_key_fingerprint === expected,
      `kp: ${kp1.public_key_fingerprint}  fn: ${expected}`);
  });

  await test('random key pairs differ', async () => {
    const r1 = await generateLocalSigningKeyPair();
    const r2 = await generateLocalSigningKeyPair();
    assert(r1.public_key_hex !== r2.public_key_hex);
  });

  console.log('\n● fingerprintPublicKey');

  await test('16 lowercase hex chars', async () => {
    const fp = await fingerprintPublicKey(kp1.public_key_hex);
    assert(fp.length === 16 && /^[0-9a-f]+$/.test(fp));
  });
  await test('stable for same key', async () => {
    assert(await fingerprintPublicKey(kp1.public_key_hex) ===
           await fingerprintPublicKey(kp1.public_key_hex));
  });
  await test('differs for different keys', async () => {
    const other = await generateLocalSigningKeyPair();
    assert(await fingerprintPublicKey(kp1.public_key_hex) !==
           await fingerprintPublicKey(other.public_key_hex));
  });

  console.log('\n● signCanonicalPayload');

  let envelope: ARVSignedEnvelope;

  await test('produces valid envelope', async () => {
    envelope = await signCanonicalPayload(PAYLOAD, kp1.secret_key_hex, { signed_at_utc: FIXED_TS });
    assert(envelope.algorithm === 'Ed25519');
    assert(envelope.scope     === 'LOCAL_L0');
    assert(envelope.signature_hex.length === 128);
    assert(envelope.payload_hash.length  === 64);
    assert(envelope.public_key_hex       === kp1.public_key_hex);
    assert(envelope.signed_at_utc        === FIXED_TS);
    assert(envelope.public_key_fingerprint === await fingerprintPublicKey(kp1.public_key_hex));
  });

  await test('deterministic for same seed + payload + timestamp', async () => {
    const e2 = await signCanonicalPayload(PAYLOAD, kp1.secret_key_hex, { signed_at_utc: FIXED_TS });
    assert(envelope.signature_hex === e2.signature_hex);
    assert(envelope.payload_hash  === e2.payload_hash);
  });

  await test('canonical key order does not affect signature', async () => {
    const shuffled = {
      timestamp_utc: PAYLOAD.timestamp_utc, document_hash: PAYLOAD.document_hash,
      authority: PAYLOAD.authority, status: PAYLOAD.status, id: PAYLOAD.id,
    };
    const e2 = await signCanonicalPayload(shuffled, kp1.secret_key_hex, { signed_at_utc: FIXED_TS });
    assert(envelope.signature_hex === e2.signature_hex);
  });

  await test('throws on wrong-length secret key', async () => {
    let threw = false;
    try { await signCanonicalPayload(PAYLOAD, 'deadbeef'); } catch { threw = true; }
    assert(threw);
  });

  console.log('\n● verifySignedEnvelope — happy path');

  await test('original payload verifies', async () => {
    assert(await verifySignedEnvelope(PAYLOAD, envelope));
  });
  await test('shuffled key order still verifies', async () => {
    const s = { document_hash: PAYLOAD.document_hash, id: PAYLOAD.id,
                authority: PAYLOAD.authority, status: PAYLOAD.status,
                timestamp_utc: PAYLOAD.timestamp_utc };
    assert(await verifySignedEnvelope(s, envelope));
  });

  console.log('\n● verifySignedEnvelope — payload integrity');

  await test('mutated payload → false', async () => {
    assert(!await verifySignedEnvelope({ ...PAYLOAD, document_hash: 'b'.repeat(64) }, envelope));
  });
  await test('empty payload → false', async () => {
    assert(!await verifySignedEnvelope({}, envelope));
  });

  console.log('\n● verifySignedEnvelope — envelope integrity');

  await test('mutated signature_hex → false', async () => {
    assert(!await verifySignedEnvelope(PAYLOAD,
      { ...envelope, signature_hex: envelope.signature_hex.slice(0, -2) + 'ff' }));
  });
  await test('mutated payload_hash → false', async () => {
    assert(!await verifySignedEnvelope(PAYLOAD,
      { ...envelope, payload_hash: 'c'.repeat(64) }));
  });
  await test('mutated public_key_fingerprint → false', async () => {
    assert(!await verifySignedEnvelope(PAYLOAD,
      { ...envelope, public_key_fingerprint: 'f'.repeat(16) }));
  });
  await test('wrong scope → false', async () => {
    assert(!await verifySignedEnvelope(PAYLOAD,
      { ...envelope, scope: 'ARV_REGISTERED' as 'LOCAL_L0' }));
  });
  await test('wrong algorithm → false', async () => {
    assert(!await verifySignedEnvelope(PAYLOAD,
      { ...envelope, algorithm: 'RSA' as 'Ed25519' }));
  });
  await test('wrong public_key_hex → false', async () => {
    const other = await generateLocalSigningKeyPair();
    assert(!await verifySignedEnvelope(PAYLOAD,
      { ...envelope, public_key_hex: other.public_key_hex }));
  });
  await test('garbage envelope → false without throwing', async () => {
    const bad: ARVSignedEnvelope = {
      algorithm: 'Ed25519', scope: 'LOCAL_L0',
      payload_hash: 'x'.repeat(64), public_key_hex: 'x'.repeat(64),
      public_key_fingerprint: 'x'.repeat(16), signature_hex: 'x'.repeat(128),
      signed_at_utc: FIXED_TS,
    };
    assert(!await verifySignedEnvelope(PAYLOAD, bad));
  });

  console.log('\n● cross-key isolation');

  await test('envelope from key A does not verify under key B', async () => {
    const kpB = await generateLocalSigningKeyPair();
    assert(!await verifySignedEnvelope(PAYLOAD,
      { ...envelope, public_key_hex: kpB.public_key_hex }));
  });
  await test('different keys → different signatures for same payload', async () => {
    const kpC = await generateLocalSigningKeyPair();
    const e1  = await signCanonicalPayload(PAYLOAD, kp1.secret_key_hex, { signed_at_utc: FIXED_TS });
    const e2  = await signCanonicalPayload(PAYLOAD, kpC.secret_key_hex, { signed_at_utc: FIXED_TS });
    assert(e1.signature_hex !== e2.signature_hex);
  });

  const total = passed + failed;
  console.log('\n' + '─'.repeat(52));
  if (failed === 0) {
    console.log(`[ARV Signing] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV Signing] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
