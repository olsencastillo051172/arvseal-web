/**
 * ARV Offline Certificate HTML v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 * No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Run:
 * npx tsx scripts/smoke-arv-offline-certificate.ts
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
  verifyPortableVerifierPayload,
} from '../lib/rva/kernel/verifier-payload';

import {
  createOfflineCertificateHtml,
  hashOfflineCertificateMetadata,
  verifyOfflineCertificateArtifact,
  type ARVOfflineCertificateArtifact,
} from '../lib/rva/kernel/offline-certificate';

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

async function assertThrows(fn: () => Promise<unknown>, message?: string): Promise<void> {
  let threw = false;

  try {
    await fn();
  } catch {
    threw = true;
  }

  assert(threw, message ?? 'expected function to throw');
}

function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function lower(value: string): string {
  return value.toLowerCase();
}

const FIXED_TS = '2026-05-23T12:00:00Z';
const SEED = new Uint8Array(32).fill(0x66);

async function main(): Promise<void> {
  console.log('\n[ARV Offline Certificate HTML v1 — Smoke Test]');
  console.log('─'.repeat(68));

  const sourceContent = 'ARV offline certificate smoke test document.';
  const fileName = 'offline-certificate-smoke.txt';
  const documentHash = await sha256HexFromString(sourceContent);

  const payload = {
    id: 'ARV-OFFLINE-CERT-SMOKE-001',
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
      file_name: fileName,
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

  const verifierPayload = await createPortableVerifierPayload({
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

  let artifact: ARVOfflineCertificateArtifact | null = null;

  function getArtifact(): ARVOfflineCertificateArtifact {
    if (!artifact) throw new Error('certificate artifact was not created');
    return artifact;
  }

  console.log('\n● preflight: source + signing + checkpoint + bundle + verifier payload');

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
    assert(bundleManifest.source.file_name === fileName);
    assert(bundleManifest.source.document_hash === documentHash);
    assert(bundleManifest.signed_envelope_hash === signedEnvelopeHash);
    assert(bundleManifest.checkpoint_hash === checkpoint.checkpoint_hash);
    assert(bundleManifest.checkpoint_sequence === checkpoint.sequence);
    assert(isSha256Hex(bundleManifest.manifest_hash));
  });

  await test('evidence bundle manifest verifies offline', async () => {
    assert(await verifyEvidenceBundleManifest(bundleManifest));
  });

  await test('can create portable verifier payload', async () => {
    assert(verifierPayload.format === 'ARV-PORTABLE-VERIFIER-PAYLOAD-v1');
    assert(verifierPayload.scope === 'LOCAL_L0');
    assert(verifierPayload.algorithm === 'SHA-256');
    assert(verifierPayload.evidence_id === bundleManifest.evidence_id);
    assert(verifierPayload.document_hash === bundleManifest.source.document_hash);
    assert(verifierPayload.manifest_hash === bundleManifest.manifest_hash);
    assert(verifierPayload.signed_envelope_hash === bundleManifest.signed_envelope_hash);
    assert(verifierPayload.checkpoint_hash === bundleManifest.checkpoint_hash);
    assert(verifierPayload.checkpoint_sequence === bundleManifest.checkpoint_sequence);
    assert(isSha256Hex(verifierPayload.payload_hash));
  });

  await test('portable verifier payload verifies offline', async () => {
    assert(await verifyPortableVerifierPayload(verifierPayload));
  });

  console.log('\n● createOfflineCertificateHtml');

  await test('can create offline certificate artifact', async () => {
    artifact = await createOfflineCertificateHtml({
      title: 'ARV Offline Certificate Smoke Test',
      evidence_id: payload.id,
      file_name: fileName,
      verifier_payload: verifierPayload,
      bundle_manifest: bundleManifest,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(artifact.metadata.format === 'ARV-OFFLINE-CERTIFICATE-HTML-v1');
    assert(artifact.metadata.scope === 'LOCAL_L0');
    assert(artifact.metadata.algorithm === 'SHA-256');
    assert(artifact.metadata.evidence_id === payload.id);
    assert(artifact.metadata.file_name === fileName);
    assert(artifact.metadata.verifier_payload_hash === verifierPayload.payload_hash);
    assert(artifact.metadata.manifest_hash === bundleManifest.manifest_hash);
    assert(artifact.metadata.created_at_utc === FIXED_TS);
    assert(artifact.metadata.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(artifact.metadata.producer === 'ARV-LOCAL');
    assert(isSha256Hex(artifact.metadata.certificate_hash));
    assert(artifact.html.startsWith('<!doctype html>'));
  });

  await test('offline certificate artifact verifies offline', async () => {
    assert(await verifyOfflineCertificateArtifact(getArtifact()));
  });

  await test('certificate hash is recomputable', async () => {
    const current = getArtifact();
    const { certificate_hash: _ignored, ...body } = current.metadata;
    const recomputed = await hashOfflineCertificateMetadata(body);
    assert(recomputed === current.metadata.certificate_hash);
  });

  await test('same fixed input produces same certificate hash', async () => {
    const duplicate = await createOfflineCertificateHtml({
      title: 'ARV Offline Certificate Smoke Test',
      evidence_id: payload.id,
      file_name: fileName,
      verifier_payload: verifierPayload,
      bundle_manifest: bundleManifest,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(duplicate.metadata.certificate_hash === getArtifact().metadata.certificate_hash);
  });

  await test('certificate hash changes when evidence_id changes', async () => {
    const current = getArtifact();
    const { certificate_hash: _ignored, ...body } = current.metadata;

    const changedHash = await hashOfflineCertificateMetadata({
      ...body,
      evidence_id: 'ARV-OFFLINE-CERT-SMOKE-CHANGED',
    });

    assert(changedHash !== current.metadata.certificate_hash);
  });

  console.log('\n● HTML content requirements');

  await test('HTML contains evidence_id', async () => {
    assert(getArtifact().html.includes(payload.id));
  });

  await test('HTML contains file_name', async () => {
    assert(getArtifact().html.includes(fileName));
  });

  await test('HTML contains verifier payload hash', async () => {
    assert(getArtifact().html.includes(verifierPayload.payload_hash));
  });

  await test('HTML contains bundle manifest hash', async () => {
    assert(getArtifact().html.includes(bundleManifest.manifest_hash));
  });

  await test('HTML contains certificate hash', async () => {
    assert(getArtifact().html.includes(getArtifact().metadata.certificate_hash));
  });

  await test('HTML contains LOCAL_L0', async () => {
    assert(getArtifact().html.includes('LOCAL_L0'));
  });

  await test('HTML contains local/unregistered/offline wording', async () => {
    const html = lower(getArtifact().html);
    assert(html.includes('local'));
    assert(html.includes('unregistered'));
    assert(html.includes('offline'));
  });

  await test('HTML contains embedded verifier payload JSON', async () => {
    assert(getArtifact().html.includes('id="arv-verifier-payload-json"'));
    assert(getArtifact().html.includes('data-arv-json="verifier-payload"'));
    assert(getArtifact().html.includes(verifierPayload.payload_hash));
  });

  await test('HTML contains embedded bundle manifest JSON', async () => {
    assert(getArtifact().html.includes('id="arv-bundle-manifest-json"'));
    assert(getArtifact().html.includes('data-arv-json="bundle-manifest"'));
    assert(getArtifact().html.includes(bundleManifest.manifest_hash));
  });

  await test('HTML escapes unsafe file_name/title content', async () => {
    const unsafeFileName = 'unsafe-<img src=x onerror=alert(1)>.txt';
    const unsafeTitle = 'Unsafe <script>alert(1)</script> Certificate';

    const unsafeBundle = await createEvidenceBundleManifest({
      evidence_id: payload.id,
      source: {
        file_name: unsafeFileName,
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

    const unsafeVerifierPayload = await createPortableVerifierPayload({
      evidence_id: unsafeBundle.evidence_id,
      document_hash: unsafeBundle.source.document_hash,
      manifest_hash: unsafeBundle.manifest_hash,
      signed_envelope_hash: unsafeBundle.signed_envelope_hash,
      checkpoint_hash: unsafeBundle.checkpoint_hash,
      checkpoint_sequence: unsafeBundle.checkpoint_sequence,
      created_at_utc: FIXED_TS,
      policy: unsafeBundle.policy,
      producer: unsafeBundle.producer,
    });

    const unsafeArtifact = await createOfflineCertificateHtml({
      title: unsafeTitle,
      evidence_id: payload.id,
      file_name: unsafeFileName,
      verifier_payload: unsafeVerifierPayload,
      bundle_manifest: unsafeBundle,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(unsafeArtifact.html.includes('&lt;img'));
    assert(unsafeArtifact.html.includes('&lt;script&gt;'));
    assert(!unsafeArtifact.html.includes('<img'));
    assert(!unsafeArtifact.html.includes('<script'));
    assert(await verifyOfflineCertificateArtifact(unsafeArtifact));
  });

  console.log('\n● HTML forbidden content rejection');

  await test('HTML does not contain <script', async () => {
    assert(!lower(getArtifact().html).includes('<script'));
  });

  await test('HTML does not contain http://', async () => {
    assert(!lower(getArtifact().html).includes('http://'));
  });

  await test('HTML does not contain https://', async () => {
    assert(!lower(getArtifact().html).includes('https://'));
  });

  await test('HTML does not contain <iframe', async () => {
    assert(!lower(getArtifact().html).includes('<iframe'));
  });

  await test('HTML does not contain <object', async () => {
    assert(!lower(getArtifact().html).includes('<object'));
  });

  await test('HTML does not contain <embed', async () => {
    assert(!lower(getArtifact().html).includes('<embed'));
  });

  console.log('\n● verification rejection cases');

  await test('mutated metadata certificate_hash fails verification', async () => {
    assert(!await verifyOfflineCertificateArtifact({
      ...getArtifact(),
      metadata: {
        ...getArtifact().metadata,
        certificate_hash: 'a'.repeat(64),
      },
    }));
  });

  await test('mutated metadata evidence_id fails verification', async () => {
    assert(!await verifyOfflineCertificateArtifact({
      ...getArtifact(),
      metadata: {
        ...getArtifact().metadata,
        evidence_id: 'ARV-OFFLINE-CERT-MUTATED',
      },
    }));
  });

  await test('mutated html with missing certificate_hash fails verification', async () => {
    const current = getArtifact();
    assert(!await verifyOfflineCertificateArtifact({
      ...current,
      html: current.html.replaceAll(current.metadata.certificate_hash, '0'.repeat(64)),
    }));
  });

  await test('mutated html with forbidden script fails verification', async () => {
    const current = getArtifact();
    assert(!await verifyOfflineCertificateArtifact({
      ...current,
      html: `${current.html}<script>alert("x")</script>`,
    }));
  });

  await test('mutated html with external http link fails verification', async () => {
    const current = getArtifact();
    assert(!await verifyOfflineCertificateArtifact({
      ...current,
      html: `${current.html}<a href="http://example.test">x</a>`,
    }));
  });

  await test('mutated html with iframe fails verification', async () => {
    const current = getArtifact();
    assert(!await verifyOfflineCertificateArtifact({
      ...current,
      html: `${current.html}<iframe></iframe>`,
    }));
  });

  await test('mismatched verifier_payload.manifest_hash vs bundle manifest fails creation', async () => {
    const badVerifierPayload = await createPortableVerifierPayload({
      evidence_id: bundleManifest.evidence_id,
      document_hash: bundleManifest.source.document_hash,
      manifest_hash: 'b'.repeat(64),
      signed_envelope_hash: bundleManifest.signed_envelope_hash,
      checkpoint_hash: bundleManifest.checkpoint_hash,
      checkpoint_sequence: bundleManifest.checkpoint_sequence,
      created_at_utc: FIXED_TS,
      policy: bundleManifest.policy,
      producer: bundleManifest.producer,
    });

    await assertThrows(() => createOfflineCertificateHtml({
      title: 'Bad Manifest Link',
      evidence_id: payload.id,
      file_name: fileName,
      verifier_payload: badVerifierPayload,
      bundle_manifest: bundleManifest,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    }));
  });

  await test('mismatched verifier_payload.evidence_id vs bundle manifest fails creation', async () => {
    const badVerifierPayload = await createPortableVerifierPayload({
      evidence_id: 'ARV-MISMATCHED-ID',
      document_hash: bundleManifest.source.document_hash,
      manifest_hash: bundleManifest.manifest_hash,
      signed_envelope_hash: bundleManifest.signed_envelope_hash,
      checkpoint_hash: bundleManifest.checkpoint_hash,
      checkpoint_sequence: bundleManifest.checkpoint_sequence,
      created_at_utc: FIXED_TS,
      policy: bundleManifest.policy,
      producer: bundleManifest.producer,
    });

    await assertThrows(() => createOfflineCertificateHtml({
      title: 'Bad Evidence Link',
      evidence_id: payload.id,
      file_name: fileName,
      verifier_payload: badVerifierPayload,
      bundle_manifest: bundleManifest,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    }));
  });

  await test('mismatched input.file_name vs bundle source file_name fails creation', async () => {
    await assertThrows(() => createOfflineCertificateHtml({
      title: 'Bad File Name Link',
      evidence_id: payload.id,
      file_name: 'different-file-name.txt',
      verifier_payload: verifierPayload,
      bundle_manifest: bundleManifest,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    }));
  });

  console.log('\n● integration invariant');

  await test('artifact remains LOCAL_L0 and does not claim authority registration', async () => {
    const current = getArtifact();
    const html = lower(current.html);

    assert(current.metadata.scope === 'LOCAL_L0');
    assert(current.metadata.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(current.metadata.producer === 'ARV-LOCAL');

    assert(html.includes('unregistered'));
    assert(html.includes('not official validation'));
    assert(html.includes('not a public ledger record'));
    assert(html.includes('not an authority seal'));
  });

  await test('certificate binds verifier payload and bundle manifest offline', async () => {
    assert(await verifySignedEnvelope(payload, envelope));
    assert(await verifyWitnessCheckpoint(checkpoint));
    assert(await verifyCheckpointChain([checkpoint]));
    assert(await verifyEvidenceBundleManifest(bundleManifest));
    assert(await verifyPortableVerifierPayload(verifierPayload));
    assert(await verifyOfflineCertificateArtifact(getArtifact()));
  });

  console.log('\n' + '─'.repeat(68));

  const total = passed + failed;

  if (failed === 0) {
    console.log(`[ARV Offline Certificate] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV Offline Certificate] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});