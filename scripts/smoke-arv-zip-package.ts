/**
 * ARV Evidence ZIP Package v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 * No QR · No PDF · No UI · No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 *
 * Run:
 * npx tsx scripts/smoke-arv-zip-package.ts
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
  verifyEvidencePackageIndex,
  type ARVEvidencePackageArtifactDescriptor,
} from '../lib/rva/kernel/package-index';

import {
  createEvidenceZipPackage,
  hashEvidenceZipPackageMetadata,
  verifyEvidenceZipPackageArtifact,
  verifyEvidenceZipBytesWithEmbeddedPackageIndex,
  verifyEvidenceZipBytesWithEmbeddedPackageIndexResult,
  type ARVEvidenceZipPackageArtifact,
  type ARVEvidenceZipPackageFileInput,
} from '../lib/rva/kernel/zip-package';

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

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function bytesToHexPreview(bytes: Uint8Array, count: number): string {
  return Array.from(bytes.slice(0, count))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256HexFromBytes(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function cloneZipArtifact(
  artifact: ARVEvidenceZipPackageArtifact,
): ARVEvidenceZipPackageArtifact {
  return {
    metadata: { ...artifact.metadata },
    zip_bytes: new Uint8Array(artifact.zip_bytes),
  };
}

function mutateZipBytes(artifact: ARVEvidenceZipPackageArtifact): ARVEvidenceZipPackageArtifact {
  const clone = cloneZipArtifact(artifact);
  const indexToMutate = Math.max(30, Math.floor(clone.zip_bytes.length / 3));
  clone.zip_bytes[indexToMutate] = clone.zip_bytes[indexToMutate] ^ 0xff;
  return clone;
}

const FIXED_TS = '2026-05-23T12:00:00Z';
const SEED = new Uint8Array(32).fill(0x88);

async function main(): Promise<void> {
  console.log('\n[ARV Evidence ZIP Package v1 — Smoke Test]');
  console.log('─'.repeat(68));

  const sourceContent = 'ARV evidence ZIP package smoke test document.';
  const sourceFileName = 'zip-package-source.txt';
  const documentHash = await sha256HexFromString(sourceContent);

  const payload = {
    id: 'ARV-ZIP-PACKAGE-SMOKE-001',
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
    title: 'ARV ZIP Package Smoke Certificate',
    evidence_id: payload.id,
    file_name: sourceFileName,
    verifier_payload: verifierPayload,
    bundle_manifest: bundleManifest,
    created_at_utc: FIXED_TS,
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  });

  const sourceText = sourceContent;
  const envelopeJson = JSON.stringify(envelope, null, 2);
  const checkpointJson = JSON.stringify(checkpoint, null, 2);
  const bundleJson = JSON.stringify(bundleManifest, null, 2);
  const verifierPayloadJson = JSON.stringify(verifierPayload, null, 2);
  const certificateHtml = certificateArtifact.html;

  const artifacts: ARVEvidencePackageArtifactDescriptor[] = [
    {
      role: 'source',
      file_name: sourceFileName,
      media_type: 'text/plain',
      sha256: await sha256HexFromString(sourceText),
      size_bytes: byteLength(sourceText),
    },
    {
      role: 'offline_certificate_html',
      file_name: 'arv-offline-certificate.html',
      media_type: 'text/html',
      sha256: await sha256HexFromString(certificateHtml),
      size_bytes: byteLength(certificateHtml),
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

  const packageIndex = await createEvidencePackageIndex({
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

  const files: ARVEvidenceZipPackageFileInput[] = [
    {
      file_name: sourceFileName,
      content: sourceText,
    },
    {
      file_name: 'arv-offline-certificate.html',
      content: certificateHtml,
    },
    {
      file_name: 'arv-verifier-payload.json',
      content: verifierPayloadJson,
    },
    {
      file_name: 'arv-bundle-manifest.json',
      content: bundleJson,
    },
    {
      file_name: 'arv-signed-envelope.json',
      content: envelopeJson,
    },
    {
      file_name: 'arv-witness-checkpoint.json',
      content: checkpointJson,
    },
  ];

  let zipArtifact: ARVEvidenceZipPackageArtifact | null = null;

  function getZipArtifact(): ARVEvidenceZipPackageArtifact {
    if (!zipArtifact) throw new Error('ZIP artifact was not created');
    return zipArtifact;
  }

  console.log('\n● preflight: source + signing + checkpoint + bundle + verifier + certificate + package index');

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

  await test('can create evidence package index', async () => {
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
    assert(isSha256Hex(packageIndex.package_index_hash));
  });

  await test('evidence package index verifies offline', async () => {
    assert(await verifyEvidencePackageIndex(packageIndex));
  });

  console.log('\n● createEvidenceZipPackage');

  await test('can create evidence ZIP package', async () => {
    zipArtifact = await createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    const current = getZipArtifact();

    assert(current.metadata.format === 'ARV-EVIDENCE-ZIP-PACKAGE-v1');
    assert(current.metadata.scope === 'LOCAL_L0');
    assert(current.metadata.algorithm === 'SHA-256');
    assert(current.metadata.method === 'ZIP-STORE');
    assert(current.metadata.evidence_id === payload.id);
    assert(current.metadata.package_index_hash === packageIndex.package_index_hash);
    assert(current.metadata.file_count === packageIndex.artifacts.length + 1);
    assert(current.metadata.zip_size_bytes === current.zip_bytes.length);
    assert(isSha256Hex(current.metadata.zip_sha256));
    assert(isSha256Hex(current.metadata.zip_package_hash));
    assert(current.zip_bytes.length > 22);
  });

  await test('evidence ZIP package verifies offline', async () => {
    assert(await verifyEvidenceZipPackageArtifact(getZipArtifact(), packageIndex));
  });

  await test('ZIP bytes start with PK local header', async () => {
    assert(bytesToHexPreview(getZipArtifact().zip_bytes, 4) === '504b0304');
  });

  await test('ZIP bytes contain end of central directory', async () => {
    const zip = getZipArtifact().zip_bytes;
    let found = false;

    for (let index = 0; index <= zip.length - 4; index += 1) {
      if (bytesToHexPreview(zip.slice(index, index + 4), 4) === '504b0506') {
        found = true;
        break;
      }
    }

    assert(found);
  });

  await test('zip_sha256 is recomputable from zip_bytes', async () => {
    const current = getZipArtifact();
    const recomputed = await sha256HexFromBytes(current.zip_bytes);
    assert(recomputed === current.metadata.zip_sha256);
  });

  await test('zip_package_hash is recomputable from metadata', async () => {
    const current = getZipArtifact();
    const { zip_package_hash: _ignored, ...body } = current.metadata;
    const recomputed = await hashEvidenceZipPackageMetadata(body);
    assert(recomputed === current.metadata.zip_package_hash);
  });

  await test('same fixed input produces same ZIP sha256', async () => {
    const duplicate = await createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(duplicate.metadata.zip_sha256 === getZipArtifact().metadata.zip_sha256);
  });

  await test('same fixed input produces same zip_package_hash', async () => {
    const duplicate = await createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files,
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(duplicate.metadata.zip_package_hash === getZipArtifact().metadata.zip_package_hash);
  });

  await test('shuffled files input still produces same ZIP sha256', async () => {
    const shuffled = await createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files: [...files].reverse(),
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    });

    assert(shuffled.metadata.zip_sha256 === getZipArtifact().metadata.zip_sha256);
  });

  console.log('\n● verification rejection cases');  await test('evidence ZIP package verifies from embedded package index', async () => {
    assert(await verifyEvidenceZipBytesWithEmbeddedPackageIndex(getZipArtifact().zip_bytes));
  });

  
  await test('embedded package index verification returns structured PASS result', async () => {
    const result = await verifyEvidenceZipBytesWithEmbeddedPackageIndexResult(getZipArtifact().zip_bytes);

    assert(result.ok);
    assert(result.status === 'PASS');
    assert(result.reason === null);
    assert(result.evidence_id === payload.id);
    assert(result.package_index_file === `${payload.id}.package-index.json`);
    assert(result.file_count === packageIndex.artifacts.length + 1);
    assert(result.message === 'Evidence ZIP verifies against its embedded package index.');
  });

await test('mutated zip bytes fail embedded package index verification', async () => {
    assert(!await verifyEvidenceZipBytesWithEmbeddedPackageIndex(mutateZipBytes(getZipArtifact()).zip_bytes));
  });



  
  await test('mutated zip bytes return structured FAIL result', async () => {
    const result = await verifyEvidenceZipBytesWithEmbeddedPackageIndexResult(
      mutateZipBytes(getZipArtifact()).zip_bytes,
    );

    assert(!result.ok);
    assert(result.status === 'FAIL');
    assert(result.reason !== null);
    assert(result.message.length > 0);
  });

await test('mutated zip bytes fail verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact(mutateZipBytes(getZipArtifact()), packageIndex));
  });

  await test('mutated metadata zip_sha256 fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        zip_sha256: 'a'.repeat(64),
      },
    }, packageIndex));
  });

  await test('mutated metadata package_index_hash fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        package_index_hash: 'b'.repeat(64),
      },
    }, packageIndex));
  });

  await test('mutated metadata evidence_id fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        evidence_id: 'ARV-ZIP-PACKAGE-MUTATED',
      },
    }, packageIndex));
  });

  await test('wrong format fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        format: 'OTHER' as 'ARV-EVIDENCE-ZIP-PACKAGE-v1',
      },
    }, packageIndex));
  });

  await test('wrong scope fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        scope: 'ARV_REGISTERED' as 'LOCAL_L0',
      },
    }, packageIndex));
  });

  await test('wrong algorithm fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        algorithm: 'MD5' as 'SHA-256',
      },
    }, packageIndex));
  });

  await test('wrong method fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        method: 'ZIP-DEFLATE' as 'ZIP-STORE',
      },
    }, packageIndex));
  });

  await test('missing created_at_utc fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        created_at_utc: '',
      },
    }, packageIndex));
  });

  await test('missing policy fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        policy: '',
      },
    }, packageIndex));
  });

  await test('missing producer fails verification', async () => {
    assert(!await verifyEvidenceZipPackageArtifact({
      ...getZipArtifact(),
      metadata: {
        ...getZipArtifact().metadata,
        producer: '',
      },
    }, packageIndex));
  });

  console.log('\n● creation rejection cases');

  await test('missing required file fails creation', async () => {
    await assertThrows(() => createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files: files.filter((file) => file.file_name !== 'arv-witness-checkpoint.json'),
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    }));
  });

  await test('wrong file content hash fails creation', async () => {
    await assertThrows(() => createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files: files.map((file) =>
        file.file_name === sourceFileName
          ? { ...file, content: 'tampered source content' }
          : file,
      ),
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    }));
  });

  await test('duplicate file name fails creation', async () => {
    await assertThrows(() => createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files: [...files, { ...files[0] }],
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    }));
  });

  await test('unsafe absolute file name fails creation', async () => {
    await assertThrows(() => createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files: [{ file_name: '/absolute.txt', content: 'x' }],
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    }));
  });

  await test('unsafe parent traversal file name fails creation', async () => {
    await assertThrows(() => createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files: [{ file_name: '../escape.txt', content: 'x' }],
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    }));
  });

  await test('unsafe backslash file name fails creation', async () => {
    await assertThrows(() => createEvidenceZipPackage({
      evidence_id: payload.id,
      package_index: packageIndex,
      files: [{ file_name: 'folder\\file.txt', content: 'x' }],
      created_at_utc: FIXED_TS,
      policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
      producer: 'ARV-LOCAL',
    }));
  });

  console.log('\n● integration invariant');

  await test('ZIP package remains LOCAL_L0 and does not claim authority registration', async () => {
    const current = getZipArtifact();

    assert(current.metadata.scope === 'LOCAL_L0');
    assert(current.metadata.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(current.metadata.producer === 'ARV-LOCAL');
    assert(current.metadata.method === 'ZIP-STORE');
  });

  await test('ZIP package binds package index and all expected artifacts', async () => {
    const current = getZipArtifact();

    assert(await verifyEvidencePackageIndex(packageIndex));
    assert(current.metadata.package_index_hash === packageIndex.package_index_hash);
    assert(current.metadata.file_count === packageIndex.artifacts.length + 1);
    assert(await verifyEvidenceZipPackageArtifact(current, packageIndex));
  });

  console.log('\n' + '─'.repeat(68));

  const total = passed + failed;

  if (failed === 0) {
    console.log(`[ARV ZIP Package] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV ZIP Package] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});