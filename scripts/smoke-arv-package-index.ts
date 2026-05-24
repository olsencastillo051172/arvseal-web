/**
 * ARV Evidence Package Index v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 * No ZIP · No QR · No PDF · No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Run:
 * npx tsx scripts/smoke-arv-package-index.ts
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
  verifyOfflineCertificateArtifact,
} from '../lib/rva/kernel/offline-certificate';

import {
  createEvidencePackageIndex,
  hashEvidencePackageIndex,
  verifyEvidencePackageIndex,
  type ARVEvidencePackageArtifactDescriptor,
  type ARVEvidencePackageIndex,
} from '../lib/rva/kernel/package-index';

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

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function replaceArtifact(
  index: ARVEvidencePackageIndex,
  role: ARVEvidencePackageArtifactDescriptor['role'],
  patch: Partial<ARVEvidencePackageArtifactDescriptor>,
): ARVEvidencePackageIndex {
  return {
    ...index,
    artifacts: index.artifacts.map((artifact) =>
      artifact.role === role ? { ...artifact, ...patch } : artifact,
    ),
  };
}

function removeArtifact(
  index: ARVEvidencePackageIndex,
  role: ARVEvidencePackageArtifactDescriptor['role'],
): ARVEvidencePackageIndex {
  return {
    ...index,
    artifacts: index.artifacts.filter((artifact) => artifact.role !== role),
  };
}

function duplicateArtifactRole(
  index: ARVEvidencePackageIndex,
  role: ARVEvidencePackageArtifactDescriptor['role'],
): ARVEvidencePackageIndex {
  const artifact = index.artifacts.find((item) => item.role === role);
  if (!artifact) throw new Error(`artifact role not found: ${role}`);

  return {
    ...index,
    artifacts: [...index.artifacts, { ...artifact, file_name: `copy-${artifact.file_name}` }],
  };
}

const FIXED_TS = '2026-05-23T12:00:00Z';
const SEED = new Uint8Array(32).fill(0x77);

async function main(): Promise<void> {
  console.log('\n[ARV Evidence Package Index v1 — Smoke Test]');
  console.log('─'.repeat(68));

  const sourceContent = 'ARV evidence package index smoke test document.';
  const sourceFileName = 'package-index-source.txt';
  const documentHash = await sha256HexFromString(sourceContent);

  const payload = {
    id: 'ARV-PACKAGE-INDEX-SMOKE-001',
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
      file_name: sourceFileName,
      mime_type: 'text/plain',
      size_bytes: byteLength(sourceContent),
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

  const certificateArtifact = await createOfflineCertificateHtml({
    title: 'ARV Package Index Smoke Certificate',
    evidence_id: payload.id,
    file_name: sourceFileName,
    verifier_payload: verifierPayload,
    bundle_manifest: bundleManifest,
    created_at_utc: FIXED_TS,
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  });

  const envelopeJson = JSON.stringify(envelope, null, 2);
  const checkpointJson = JSON.stringify(checkpoint, null, 2);
  const bundleJson = JSON.stringify(bundleManifest, null, 2);
  const verifierPayloadJson = JSON.stringify(verifierPayload, null, 2);

  const artifacts: ARVEvidencePackageArtifactDescriptor[] = [
    {
      role: 'source',
      file_name: sourceFileName,
      media_type: 'text/plain',
      sha256: documentHash,
      size_bytes: byteLength(sourceContent),
    },
    {
      role: 'offline_certificate_html',
      file_name: 'arv-offline-certificate.html',
      media_type: 'text/html',
      sha256: await sha256HexFromString(certificateArtifact.html),
      size_bytes: byteLength(certificateArtifact.html),
    },
    {
      role: 'verifier_payload_json',
      file_name: 'arv-verifier-payload.json',
      media_type: 'application/json',
      sha256: await sha256HexFromString(verifierPayloadJson),
      size_bytes: byteLength(verifierPayloadJson),
    },
    {
      role: 'bundle_manifest_json',
      file_name: 'arv-bundle-manifest.json',
      media_type: 'application/json',
      sha256: await sha256HexFromString(bundleJson),
      size_bytes: byteLength(bundleJson),
    },
    {
      role: 'signed_envelope_json',
      file_name: 'arv-signed-envelope.json',
      media_type: 'application/json',
      sha256: await sha256HexFromString(envelopeJson),
      size_bytes: byteLength(envelopeJson),
    },
    {
      role: 'witness_checkpoint_json',
      file_name: 'arv-witness-checkpoint.json',
      media_type: 'application/json',
      sha256: await sha256HexFromString(checkpointJson),
      size_bytes: byteLength(checkpointJson),
    },
  ];

  let packageIndex: ARVEvidencePackageIndex | null = null;

  function getPackageIndex(): ARVEvidencePackageIndex {
    if (!packageIndex) throw new Error('package index was not created');
    return packageIndex;
  }

  console.log('\n● preflight: source + signing + checkpoint + bundle + verifier + certificate');

  await test('can generate source document hash', async () => {
    assert(isSha256Hex(documentHash), documentHash);
  });

  await test('can generate signed envelope', async () => {
    assert(envelope.scope === 'LOCAL_L0');
    assert(envelope.algorithm === 'Ed25519');
    assert(isSha256Hex(envelope.payload_hash));
  });

  await test('signed envelope verifies offline', async () => {
    assert(await verifySignedEnvelope(payload, envelope));
  });

  await test('can hash signed envelope', async () => {
    assert(isSha256Hex(signedEnvelopeHash), signedEnvelopeHash);
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

  await test('can create portable verifier payload', async () => {
    assert(verifierPayload.format === 'ARV-PORTABLE-VERIFIER-PAYLOAD-v1');
    assert(verifierPayload.scope === 'LOCAL_L0');
    assert(verifierPayload.algorithm === 'SHA-256');
    assert(verifierPayload.evidence_id === bundleManifest.evidence_id);
    assert(verifierPayload.manifest_hash === bundleManifest.manifest_hash);
    assert(isSha256Hex(verifierPayload.payload_hash));
  });

  await test('portable verifier payload verifies offline', async () => {
    assert(await verifyPortableVerifierPayload(verifierPayload));
  });

  await test('can create offline certificate artifact', async () => {
    assert(certificateArtifact.metadata.format === 'ARV-OFFLINE-CERTIFICATE-HTML-v1');
    assert(certificateArtifact.metadata.scope === 'LOCAL_L0');
    assert(certificateArtifact.metadata.evidence_id === payload.id);
    assert(certificateArtifact.metadata.verifier_payload_hash === verifierPayload.payload_hash);
    assert(certificateArtifact.metadata.manifest_hash === bundleManifest.manifest_hash);
    assert(isSha256Hex(certificateArtifact.metadata.certificate_hash));
  });

  await test('offline certificate artifact verifies offline', async () => {
    assert(await verifyOfflineCertificateArtifact(certificateArtifact));
  });

  console.log('\n● createEvidencePackageIndex');

  await test('can create evidence package index', async () => {
    packageIndex = await createEvidencePackageIndex({
      evidence_id: payload.id,
      artifacts,
      certificate_hash: certificateArtifact.metadata.certificate_hash,
      verifier_payload_hash: verifierPayload.payload_hash,
      manifest_hash: bundleManifest.manifest_hash,
      checkpoint_hash: checkpoint.checkpoint_hash,
      signed_envelope_hash: signedEnvelopeHash,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(packageIndex.format === 'ARV-EVIDENCE-PACKAGE-INDEX-v1');
    assert(packageIndex.scope === 'LOCAL_L0');
    assert(packageIndex.algorithm === 'SHA-256');
    assert(packageIndex.evidence_id === payload.id);
    assert(packageIndex.artifacts.length === artifacts.length);
    assert(packageIndex.certificate_hash === certificateArtifact.metadata.certificate_hash);
    assert(packageIndex.verifier_payload_hash === verifierPayload.payload_hash);
    assert(packageIndex.manifest_hash === bundleManifest.manifest_hash);
    assert(packageIndex.checkpoint_hash === checkpoint.checkpoint_hash);
    assert(packageIndex.signed_envelope_hash === signedEnvelopeHash);
    assert(packageIndex.created_at_utc === FIXED_TS);
    assert(packageIndex.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(packageIndex.producer === 'ARV-LOCAL');
    assert(isSha256Hex(packageIndex.package_index_hash));
  });

  await test('evidence package index verifies offline', async () => {
    assert(await verifyEvidencePackageIndex(getPackageIndex()));
  });

  await test('package index hash is recomputable', async () => {
    const current = getPackageIndex();
    const { package_index_hash: _ignored, ...body } = current;
    const recomputed = await hashEvidencePackageIndex(body);
    assert(recomputed === current.package_index_hash);
  });

  await test('same fixed input produces same package index hash', async () => {
    const duplicate = await createEvidencePackageIndex({
      evidence_id: payload.id,
      artifacts: [...artifacts].reverse(),
      certificate_hash: certificateArtifact.metadata.certificate_hash,
      verifier_payload_hash: verifierPayload.payload_hash,
      manifest_hash: bundleManifest.manifest_hash,
      checkpoint_hash: checkpoint.checkpoint_hash,
      signed_envelope_hash: signedEnvelopeHash,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(duplicate.package_index_hash === getPackageIndex().package_index_hash);
  });

  await test('package index hash changes when artifact sha256 changes', async () => {
    const current = getPackageIndex();
    const { package_index_hash: _ignored, ...body } = current;

    const changedHash = await hashEvidencePackageIndex({
      ...body,
      artifacts: body.artifacts.map((artifact) =>
        artifact.role === 'source'
          ? { ...artifact, sha256: 'b'.repeat(64) }
          : artifact,
      ),
    });

    assert(changedHash !== current.package_index_hash);
  });

  console.log('\n● verification rejection cases');

  await test('mutated evidence_id fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      evidence_id: 'ARV-PACKAGE-INDEX-MUTATED',
    }));
  });

  await test('mutated artifact file_name fails verification', async () => {
    assert(!await verifyEvidencePackageIndex(
      replaceArtifact(getPackageIndex(), 'source', { file_name: 'mutated-source.txt' }),
    ));
  });

  await test('mutated artifact media_type fails verification', async () => {
    assert(!await verifyEvidencePackageIndex(
      replaceArtifact(getPackageIndex(), 'source', { media_type: 'application/octet-stream' }),
    ));
  });

  await test('mutated artifact sha256 fails verification', async () => {
    assert(!await verifyEvidencePackageIndex(
      replaceArtifact(getPackageIndex(), 'source', { sha256: 'c'.repeat(64) }),
    ));
  });

  await test('mutated certificate_hash fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      certificate_hash: 'd'.repeat(64),
    }));
  });

  await test('mutated verifier_payload_hash fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      verifier_payload_hash: 'e'.repeat(64),
    }));
  });

  await test('mutated manifest_hash fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      manifest_hash: 'f'.repeat(64),
    }));
  });

  await test('mutated checkpoint_hash fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      checkpoint_hash: 'a'.repeat(64),
    }));
  });

  await test('mutated signed_envelope_hash fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      signed_envelope_hash: 'b'.repeat(64),
    }));
  });

  await test('mutated package_index_hash fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      package_index_hash: 'c'.repeat(64),
    }));
  });

  await test('duplicate artifact role fails verification', async () => {
    assert(!await verifyEvidencePackageIndex(
      duplicateArtifactRole(getPackageIndex(), 'source'),
    ));
  });

  await test('missing required role fails verification', async () => {
    assert(!await verifyEvidencePackageIndex(
      removeArtifact(getPackageIndex(), 'witness_checkpoint_json'),
    ));
  });

  await test('wrong format fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      format: 'OTHER' as 'ARV-EVIDENCE-PACKAGE-INDEX-v1',
    }));
  });

  await test('wrong scope fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      scope: 'ARV_REGISTERED' as 'LOCAL_L0',
    }));
  });

  await test('wrong algorithm fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      algorithm: 'MD5' as 'SHA-256',
    }));
  });

  await test('missing created_at_utc fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      created_at_utc: '',
    }));
  });

  await test('missing policy fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      policy: '',
    }));
  });

  await test('missing producer fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      producer: '',
    }));
  });

  await test('negative artifact size_bytes fails verification', async () => {
    assert(!await verifyEvidencePackageIndex(
      replaceArtifact(getPackageIndex(), 'source', { size_bytes: -1 }),
    ));
  });

  await test('non-integer artifact size_bytes fails verification', async () => {
    assert(!await verifyEvidencePackageIndex(
      replaceArtifact(getPackageIndex(), 'source', { size_bytes: 12.5 }),
    ));
  });

  await test('invalid artifact role fails verification', async () => {
    assert(!await verifyEvidencePackageIndex(
      replaceArtifact(getPackageIndex(), 'source', {
        role: 'not_allowed' as ARVEvidencePackageArtifactDescriptor['role'],
      }),
    ));
  });

  await test('invalid artifact sha256 format fails verification', async () => {
    assert(!await verifyEvidencePackageIndex(
      replaceArtifact(getPackageIndex(), 'source', { sha256: 'not-a-sha256' }),
    ));
  });

  await test('invalid certificate_hash format fails verification', async () => {
    assert(!await verifyEvidencePackageIndex({
      ...getPackageIndex(),
      certificate_hash: 'not-a-sha256',
    }));
  });

  console.log('\n● integration invariant');

  await test('package index remains LOCAL_L0 and does not claim authority registration', async () => {
    const current = getPackageIndex();

    assert(current.scope === 'LOCAL_L0');
    assert(current.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(current.producer === 'ARV-LOCAL');
    assert(current.format === 'ARV-EVIDENCE-PACKAGE-INDEX-v1');
  });

  await test('package index binds all expected artifact roles', async () => {
    const roles = new Set(getPackageIndex().artifacts.map((artifact) => artifact.role));

    assert(roles.has('source'));
    assert(roles.has('offline_certificate_html'));
    assert(roles.has('verifier_payload_json'));
    assert(roles.has('bundle_manifest_json'));
    assert(roles.has('signed_envelope_json'));
    assert(roles.has('witness_checkpoint_json'));
  });

  console.log('\n' + '─'.repeat(68));

  const total = passed + failed;

  if (failed === 0) {
    console.log(`[ARV Package Index] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV Package Index] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});