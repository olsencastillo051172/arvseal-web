/**
 * ARV QR-Safe Transfer Payload v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 * No QR image generation · No UI · No DemoClient changes · No ARV Authority.
 *
 * Run:
 * npx tsx scripts/smoke-arv-qr-transfer-payload.ts
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
} from '../lib/rva/kernel/package-index';

import {
  createEvidenceZipPackage,
  verifyEvidenceZipPackageArtifact,
} from '../lib/rva/kernel/zip-package';

import {
  createQrTransferPayload,
  decodeQrTransferString,
  hashQrTransferPayloadBody,
  verifyQrTransferPayload,
  type ARVQrTransferPayloadArtifact,
} from '../lib/rva/kernel/qr-transfer-payload';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed += 1;
  } catch (error: unknown) {
    console.log(`  ✗  ${name}`);
    console.log(`     ${error instanceof Error ? error.message : String(error)}`);
    failed += 1;
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

  assert(threw, message ?? 'expected exception was not thrown');
}

function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

const SEED = new Uint8Array(32).fill(0x55);
const FIXED_TS = '2026-05-24T00:00:00Z';
const FAKE_HASH = 'a'.repeat(64);
const FILE_NAME = 'test-document.txt';
const FILE_CONTENT = 'ARV smoke test document content for QR transfer payload.';

async function buildFullPipeline() {
  const documentHash = await sha256HexFromString(FILE_CONTENT);

  const keypair = await generateLocalSigningKeyPair(SEED);

  const payload = {
    id: 'ARV-QR-SMOKE-001',
    status: 'LOCAL_UNREGISTERED',
    authority: 'Reality Validation Authority',
    document_hash: documentHash,
    timestamp_utc: FIXED_TS,
  };

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
    witness: 'ARV-LOCAL',
  });

  const bundleManifest = await createEvidenceBundleManifest({
    evidence_id: payload.id,
    source: {
      file_name: FILE_NAME,
      mime_type: 'text/plain',
      size_bytes: byteLength(FILE_CONTENT),
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
    evidence_id: payload.id,
    document_hash: documentHash,
    manifest_hash: bundleManifest.manifest_hash,
    signed_envelope_hash: signedEnvelopeHash,
    checkpoint_hash: checkpoint.checkpoint_hash,
    checkpoint_sequence: checkpoint.sequence,
    created_at_utc: FIXED_TS,
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  });

  const certificateArtifact = await createOfflineCertificateHtml({
    evidence_id: payload.id,
    file_name: FILE_NAME,
    verifier_payload: verifierPayload,
    bundle_manifest: bundleManifest,
    created_at_utc: FIXED_TS,
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  });

  const envelopeJson = JSON.stringify(envelope);
  const checkpointJson = JSON.stringify(checkpoint);
  const bundleJson = JSON.stringify(bundleManifest);
  const verifierPayloadJson = JSON.stringify(verifierPayload);
  const certificateHtml = certificateArtifact.html;

  const artifacts = [
    {
      role: 'source' as const,
      file_name: FILE_NAME,
      media_type: 'text/plain',
      sha256: documentHash,
      size_bytes: byteLength(FILE_CONTENT),
    },
    {
      role: 'offline_certificate_html' as const,
      file_name: 'ARV-QR-SMOKE-001.certificate.html',
      media_type: 'text/html',
      sha256: await sha256HexFromString(certificateHtml),
      size_bytes: byteLength(certificateHtml),
    },
    {
      role: 'verifier_payload_json' as const,
      file_name: 'ARV-QR-SMOKE-001.verifier-payload.json',
      media_type: 'application/json',
      sha256: await sha256HexFromString(verifierPayloadJson),
      size_bytes: byteLength(verifierPayloadJson),
    },
    {
      role: 'bundle_manifest_json' as const,
      file_name: 'ARV-QR-SMOKE-001.bundle-manifest.json',
      media_type: 'application/json',
      sha256: await sha256HexFromString(bundleJson),
      size_bytes: byteLength(bundleJson),
    },
    {
      role: 'signed_envelope_json' as const,
      file_name: 'ARV-QR-SMOKE-001.signed-envelope.json',
      media_type: 'application/json',
      sha256: await sha256HexFromString(envelopeJson),
      size_bytes: byteLength(envelopeJson),
    },
    {
      role: 'witness_checkpoint_json' as const,
      file_name: 'ARV-QR-SMOKE-001.checkpoint.json',
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

  const files = [
    {
      file_name: FILE_NAME,
      content: FILE_CONTENT,
    },
    {
      file_name: 'ARV-QR-SMOKE-001.certificate.html',
      content: certificateHtml,
    },
    {
      file_name: 'ARV-QR-SMOKE-001.verifier-payload.json',
      content: verifierPayloadJson,
    },
    {
      file_name: 'ARV-QR-SMOKE-001.bundle-manifest.json',
      content: bundleJson,
    },
    {
      file_name: 'ARV-QR-SMOKE-001.signed-envelope.json',
      content: envelopeJson,
    },
    {
      file_name: 'ARV-QR-SMOKE-001.checkpoint.json',
      content: checkpointJson,
    },
  ];

  const zipArtifact = await createEvidenceZipPackage({
    evidence_id: payload.id,
    package_index: packageIndex,
    files,
    created_at_utc: FIXED_TS,
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  });

  return {
    documentHash,
    payload,
    envelope,
    signedEnvelopeHash,
    checkpoint,
    bundleManifest,
    verifierPayload,
    certificateArtifact,
    packageIndex,
    zipArtifact,
  };
}

async function main(): Promise<void> {
  console.log('\n[ARV QR-Safe Transfer Payload v1 — Smoke Test]');
  console.log('─'.repeat(64));

  let pipeline: Awaited<ReturnType<typeof buildFullPipeline>>;
  let qrArtifact: ARVQrTransferPayloadArtifact;

  console.log('\n● build full pipeline');

  await test('can generate source document hash', async () => {
    pipeline = await buildFullPipeline();
    assert(isSha256Hex(pipeline.documentHash));
  });

  await test('can generate signed envelope', async () => {
    assert(pipeline.envelope.scope === 'LOCAL_L0');
    assert(pipeline.envelope.algorithm === 'Ed25519');
    assert(isSha256Hex(pipeline.envelope.payload_hash));
  });

  await test('signed envelope verifies offline', async () => {
    assert(await verifySignedEnvelope(pipeline.payload, pipeline.envelope));
  });

  await test('can create witness checkpoint', async () => {
    assert(pipeline.checkpoint.scope === 'LOCAL_L0');
    assert(pipeline.checkpoint.algorithm === 'SHA-256');
    assert(isSha256Hex(pipeline.checkpoint.checkpoint_hash));
  });

  await test('checkpoint verifies offline', async () => {
    assert(await verifyWitnessCheckpoint(pipeline.checkpoint));
  });

  await test('checkpoint chain verifies offline', async () => {
    assert(await verifyCheckpointChain([pipeline.checkpoint]));
  });

  await test('can create bundle manifest', async () => {
    assert(pipeline.bundleManifest.scope === 'LOCAL_L0');
    assert(pipeline.bundleManifest.algorithm === 'SHA-256');
    assert(isSha256Hex(pipeline.bundleManifest.manifest_hash));
  });

  await test('bundle verifies offline', async () => {
    assert(await verifyEvidenceBundleManifest(pipeline.bundleManifest));
  });

  await test('can create portable verifier payload', async () => {
    assert(pipeline.verifierPayload.scope === 'LOCAL_L0');
    assert(pipeline.verifierPayload.algorithm === 'SHA-256');
    assert(isSha256Hex(pipeline.verifierPayload.payload_hash));
  });

  await test('verifier payload verifies offline', async () => {
    assert(await verifyPortableVerifierPayload(pipeline.verifierPayload));
  });

  await test('can create offline certificate', async () => {
    assert(pipeline.certificateArtifact.metadata.scope === 'LOCAL_L0');
    assert(isSha256Hex(pipeline.certificateArtifact.metadata.certificate_hash));
  });

  await test('offline certificate verifies offline', async () => {
    assert(await verifyOfflineCertificateArtifact(pipeline.certificateArtifact));
  });

  await test('can create package index', async () => {
    assert(pipeline.packageIndex.scope === 'LOCAL_L0');
    assert(isSha256Hex(pipeline.packageIndex.package_index_hash));
  });

  await test('package index verifies offline', async () => {
    assert(await verifyEvidencePackageIndex(pipeline.packageIndex));
  });

  await test('can create ZIP package', async () => {
    assert(pipeline.zipArtifact.metadata.scope === 'LOCAL_L0');
    assert(isSha256Hex(pipeline.zipArtifact.metadata.zip_sha256));
  });

  await test('ZIP package verifies offline', async () => {
    assert(await verifyEvidenceZipPackageArtifact(pipeline.zipArtifact, pipeline.packageIndex));
  });

  console.log('\n● createQrTransferPayload');

  const transferInput = {
    evidence_id: pipeline.payload.id,
    verifier_payload_hash: pipeline.verifierPayload.payload_hash,
    manifest_hash: pipeline.bundleManifest.manifest_hash,
    checkpoint_hash: pipeline.checkpoint.checkpoint_hash,
    package_index_hash: pipeline.packageIndex.package_index_hash,
    zip_sha256: pipeline.zipArtifact.metadata.zip_sha256,
    created_at_utc: FIXED_TS,
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  };

  await test('can create QR-safe transfer payload', async () => {
    qrArtifact = await createQrTransferPayload(transferInput);

    assert(qrArtifact.prefix === 'ARV1');
    assert(qrArtifact.body.scope === 'LOCAL_L0');
    assert(qrArtifact.body.format === 'ARV-QR-TRANSFER-PAYLOAD-v1');
    assert(qrArtifact.body.algorithm === 'SHA-256');
    assert(qrArtifact.body.encoding === 'base64url-json');
    assert(isSha256Hex(qrArtifact.body.transfer_hash));
  });

  await test('QR-safe transfer payload verifies offline', async () => {
    assert(await verifyQrTransferPayload(qrArtifact));
  });

  await test('transfer string starts with ARV1:', () => {
    assert(qrArtifact.transfer_string.startsWith('ARV1:'));
  });

  await test('transfer string has no =', () => {
    assert(!qrArtifact.transfer_string.includes('='));
  });

  await test('transfer string uses only allowed QR-safe characters', () => {
    assert(/^[A-Za-z0-9\-_:]+$/.test(qrArtifact.transfer_string));
  });

  await test('transfer hash is recomputable', async () => {
    const { transfer_hash: _ignored, ...body } = qrArtifact.body;
    const recomputed = await hashQrTransferPayloadBody(body);
    assert(recomputed === qrArtifact.body.transfer_hash);
  });

  await test('same fixed input produces same transfer string', async () => {
    const duplicate = await createQrTransferPayload(transferInput);
    assert(duplicate.transfer_string === qrArtifact.transfer_string);
  });

  await test('changing verifier_payload_hash changes transfer string', async () => {
    const changed = await createQrTransferPayload({
      ...transferInput,
      verifier_payload_hash: FAKE_HASH,
    });

    assert(changed.transfer_string !== qrArtifact.transfer_string);
  });

  console.log('\n● decodeQrTransferString');

  await test('decodeQrTransferString reconstructs a valid artifact', async () => {
    const decoded = await decodeQrTransferString(qrArtifact.transfer_string);

    assert(decoded.prefix === 'ARV1');
    assert(decoded.body.evidence_id === qrArtifact.body.evidence_id);
    assert(decoded.body.transfer_hash === qrArtifact.body.transfer_hash);
  });

  await test('decoded artifact verifies offline', async () => {
    const decoded = await decodeQrTransferString(qrArtifact.transfer_string);
    assert(await verifyQrTransferPayload(decoded));
  });

  await test('wrong prefix fails decode', async () => {
    await assertThrows(() => decodeQrTransferString(`BAD:${qrArtifact.transfer_string.slice(5)}`));
  });

  await test('malformed base64url fails decode', async () => {
    await assertThrows(() => decodeQrTransferString('ARV1:!!!not-base64!!!'));
  });

  await test('invalid JSON fails decode', async () => {
    const encoded = btoa('not json')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    await assertThrows(() => decodeQrTransferString(`ARV1:${encoded}`));
  });

  console.log('\n● verifyQrTransferPayload — mutation rejection');

  await test('mutated transfer_hash fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        transfer_hash: FAKE_HASH,
      },
    }));
  });

  await test('mutated evidence_id fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        evidence_id: 'ARV-QR-SMOKE-MUTATED',
      },
    }));
  });

  await test('mutated verifier_payload_hash fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        verifier_payload_hash: FAKE_HASH,
      },
    }));
  });

  await test('mutated manifest_hash fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        manifest_hash: FAKE_HASH,
      },
    }));
  });

  await test('mutated checkpoint_hash fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        checkpoint_hash: FAKE_HASH,
      },
    }));
  });

  await test('mutated package_index_hash fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        package_index_hash: FAKE_HASH,
      },
    }));
  });

  await test('mutated zip_sha256 fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        zip_sha256: FAKE_HASH,
      },
    }));
  });

  await test('wrong format fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        format: 'OTHER' as 'ARV-QR-TRANSFER-PAYLOAD-v1',
      },
    }));
  });

  await test('wrong scope fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        scope: 'ARV_REGISTERED' as 'LOCAL_L0',
      },
    }));
  });

  await test('wrong algorithm fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        algorithm: 'MD5' as 'SHA-256',
      },
    }));
  });

  await test('wrong encoding fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        encoding: 'hex' as 'base64url-json',
      },
    }));
  });

  await test('missing created_at_utc fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        created_at_utc: '',
      },
    }));
  });

  await test('missing policy fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        policy: '',
      },
    }));
  });

  await test('missing producer fails verification', async () => {
    assert(!await verifyQrTransferPayload({
      ...qrArtifact,
      body: {
        ...qrArtifact.body,
        producer: '',
      },
    }));
  });

  console.log('\n● integration invariant');

  await test('payload remains LOCAL_L0 and does not claim authority registration', async () => {
    assert(qrArtifact.body.scope === 'LOCAL_L0');
    assert(qrArtifact.body.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(qrArtifact.body.producer === 'ARV-LOCAL');

    const bodyJson = JSON.stringify(qrArtifact.body);
    assert(!bodyJson.includes('ARV_REGISTERED'));
    assert(!bodyJson.includes('AUTHORITY_REGISTERED'));
  });

  console.log('\n' + '─'.repeat(64));

  const total = passed + failed;

  if (failed === 0) {
    console.log(`[ARV QR Transfer Payload] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV QR Transfer Payload] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});