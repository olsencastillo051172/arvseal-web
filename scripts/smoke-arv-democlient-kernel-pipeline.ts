/**
 * ARV DemoClient Kernel Pipeline Consolidation v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 *
 * This test validates the consolidated DemoClient kernel pipeline:
 * - buildDemoClientKernelEvidenceArtifacts(record, sourceFile)
 * - buildKernelOfflineCertificateHtmlFromFile(record, sourceFile)
 * - buildKernelEvidencePackageZipFromFile(record, sourceFile)
 * - buildKernelPublicVerificationRecordFromFile(record, sourceFile)
 *
 * It intentionally does NOT test PDF rendering because PDF export uses
 * document/html2canvas/jsPDF and requires a browser DOM.
 *
 * Run:
 * npx tsx scripts/smoke-arv-democlient-kernel-pipeline.ts
 */

import type { GigEvidenceRecord } from '../lib/rva/schemas';

import {
  buildDemoClientKernelEvidenceArtifacts,
  buildKernelEvidencePackageZipFromFile,
  buildKernelOfflineCertificateHtmlFromFile,
  buildKernelPublicVerificationRecordFromFile,
} from '../lib/rva/artifacts';

import {
  sha256HexFromBytes,
  sha256HexFromString,
} from '../lib/rva/kernel/hash';

import {
  verifySignedEnvelope,
} from '../lib/rva/kernel/signature';

import {
  hashSignedEnvelope,
  verifyWitnessCheckpoint,
  verifyCheckpointChain,
} from '../lib/rva/kernel/checkpoint';

import {
  verifyEvidenceBundleManifest,
} from '../lib/rva/kernel/bundle';

import {
  verifyPortableVerifierPayload,
} from '../lib/rva/kernel/verifier-payload';

import {
  verifyOfflineCertificateArtifact,
} from '../lib/rva/kernel/offline-certificate';

import {
  verifyEvidencePackageIndex,
} from '../lib/rva/kernel/package-index';

import {
  createEvidenceZipPackage,
  verifyEvidenceZipPackageArtifact,
} from '../lib/rva/kernel/zip-package';

import {
  createQrTransferPayload,
  decodeQrTransferString,
  verifyQrTransferPayload,
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

function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function makeTestFile(content: string, name: string, type: string): File {
  const bytes = new TextEncoder().encode(content);

  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => {
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      return buffer;
    },
  } as File;
}

const FIXED_TS = '2026-05-24T00:00:00Z';
const FILE_NAME = 'arv-democlient-kernel-pipeline-smoke.txt';
const FILE_TYPE = 'text/plain';
const FILE_CONTENT = 'ARV DemoClient consolidated kernel pipeline smoke test payload.';

async function buildRecordAndFile(): Promise<{
  record: GigEvidenceRecord;
  sourceFile: File;
  documentHash: string;
}> {
  const sourceFile = makeTestFile(FILE_CONTENT, FILE_NAME, FILE_TYPE);
  const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
  const documentHash = await sha256HexFromBytes(sourceBytes);

  const id = 'ARV-DEMOCLIENT-PIPELINE-SMOKE-001';

  const legacyVerifierBody = {
    id,
    status: 'LOCAL_UNREGISTERED',
    hash: documentHash,
    root: documentHash,
    ts: FIXED_TS,
    verify: null,
    sigfp: 'LOCAL-DEMO',
  };

  const verifierPayloadHash = await sha256HexFromString(JSON.stringify(legacyVerifierBody));

  const manifestHash = await sha256HexFromString(JSON.stringify({
    format: 'ARV-DEMO-LOCAL-MANIFEST-v1',
    scope: 'LOCAL_L0',
    evidence_id: id,
    document_hash: documentHash,
    merkle_root: documentHash,
    source_file: {
      filename: FILE_NAME,
      mime_type: FILE_TYPE,
      size_bytes: sourceFile.size,
    },
    created_at_utc: FIXED_TS,
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  }));

  const checkpointHash = await sha256HexFromString(JSON.stringify({
    format: 'ARV-DEMO-LOCAL-CHECKPOINT-v1',
    scope: 'LOCAL_L0',
    sequence: 1,
    evidence_id: id,
    verifier_payload_hash: verifierPayloadHash,
    manifest_hash: manifestHash,
    document_hash: documentHash,
    created_at_utc: FIXED_TS,
    witness: 'ARV-LOCAL-DEMO',
  }));

  const qrTransfer = await createQrTransferPayload({
    evidence_id: id,
    verifier_payload_hash: verifierPayloadHash,
    manifest_hash: manifestHash,
    checkpoint_hash: checkpointHash,
    created_at_utc: FIXED_TS,
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  });

  const record: GigEvidenceRecord = {
    id,
    status: 'LOCAL_UNREGISTERED',
    authority: 'ARV Reality Validation Authority',
    system: 'A System by Intelligence Olsen (IO)',
    canon: 'ARV Core Pack v1',
    epoch_id: null,
    ledger_position: null,
    document_hash: documentHash,
    merkle_root: documentHash,
    timestamp_utc: FIXED_TS,
    issued_at_utc: FIXED_TS,
    signature: {
      algorithm: 'Ed25519',
      value: null,
      public_key_fingerprint: 'LOCAL-DEMO',
    },
    dual_seal: {
      mode: 'LOCAL-SINGLE-SEAL',
      primary_seal_hash: documentHash,
      secondary_seal_hash: null,
    },
    qr: {
      payload: qrTransfer.transfer_string,
      image_path: null,
    },
    verification_url: null,
    source_file: {
      filename: FILE_NAME,
      mime_type: FILE_TYPE,
      size_bytes: sourceFile.size,
      source_mode: 'upload',
      captured_at_utc: FIXED_TS,
    },
    timestamp: {
      type: 'local',
      authority: null,
      token: null,
      policy_oid: null,
    },
    worker_name: 'Local User',
    client_name: 'Unspecified',
    project_name: 'Demo Project',
    deliverable_type: FILE_TYPE,
    delivery_date: FIXED_TS,
    engagement_reference: null,
    counterparty_reference: null,
    evidence_bundle_type: 'single-file',
    dispute_status: null,
  };

  return {
    record,
    sourceFile,
    documentHash,
  };
}

function buildExpectedSigningPayload(
  record: GigEvidenceRecord,
  sourceFile: File,
  sourceFileName: string,
  sourceBytesLength: number,
) {
  return {
    format: 'ARV-DEMOCLIENT-KERNEL-PIPELINE-SIGNING-PAYLOAD-v1',
    scope: 'LOCAL_L0',
    evidence_id: record.id,
    status: record.status,
    document_hash: record.document_hash,
    merkle_root: record.merkle_root,
    timestamp_utc: record.timestamp_utc,
    source_file: {
      filename: record.source_file?.filename || sourceFile.name,
      exported_file_name: sourceFileName,
      mime_type: record.source_file?.mime_type || sourceFile.type || null,
      size_bytes: sourceBytesLength,
    },
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  };
}

async function main(): Promise<void> {
  console.log('\n[ARV DemoClient Kernel Pipeline v1 — Smoke Test]');
  console.log('─'.repeat(72));

  const { record, sourceFile, documentHash } = await buildRecordAndFile();
  const evidence = await buildDemoClientKernelEvidenceArtifacts(record, sourceFile);

  const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());

  await test('source document hash is generated', async () => {
    assert(isSha256Hex(documentHash));
    assert(documentHash === record.document_hash);
  });

  await test('record QR transfer decodes and verifies', async () => {
    const decoded = await decodeQrTransferString(record.qr.payload);
    assert(decoded.prefix === 'ARV1');
    assert(decoded.body.evidence_id === record.id);
    assert(await verifyQrTransferPayload(decoded));
  });

  await test('consolidated pipeline returns LOCAL_L0 evidence artifacts', () => {
    assert(evidence.format === 'ARV-DEMOCLIENT-KERNEL-EVIDENCE-ARTIFACTS-v1');
    assert(evidence.scope === 'LOCAL_L0');
    assert(evidence.evidence_id === record.id);
    assert(evidence.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(evidence.producer === 'ARV-LOCAL');
  });

  await test('consolidated pipeline verifies source hash against record', () => {
    assert(evidence.source.document_hash === record.document_hash);
    assert(evidence.source.size_bytes === sourceBytes.byteLength);
    assert(evidence.source.file_name === FILE_NAME);
    assert(evidence.source_bytes.byteLength === sourceBytes.byteLength);
    assert(bytesToText(evidence.source_bytes) === FILE_CONTENT);
  });

  await test('signed envelope verifies offline', async () => {
    const signingPayload = buildExpectedSigningPayload(
      record,
      sourceFile,
      evidence.source.file_name,
      evidence.source.size_bytes,
    );

    assert(evidence.signed_envelope.scope === 'LOCAL_L0');
    assert(evidence.signed_envelope.algorithm === 'Ed25519');
    assert(isSha256Hex(evidence.signed_envelope.payload_hash));

    assert(await verifySignedEnvelope(signingPayload, evidence.signed_envelope));
  });

  await test('signed envelope hash is deterministic and recomputable', async () => {
    const recomputed = await hashSignedEnvelope(evidence.signed_envelope);
    assert(recomputed === evidence.signed_envelope_hash);
  });

  await test('witness checkpoint verifies offline', async () => {
    assert(evidence.checkpoint.scope === 'LOCAL_L0');
    assert(evidence.checkpoint.evidence_id === record.id);
    assert(evidence.checkpoint.envelope_hash === evidence.signed_envelope_hash);
    assert(await verifyWitnessCheckpoint(evidence.checkpoint));
    assert(await verifyCheckpointChain([evidence.checkpoint]));
  });

  await test('bundle manifest verifies offline', async () => {
    assert(evidence.bundle_manifest.scope === 'LOCAL_L0');
    assert(evidence.bundle_manifest.evidence_id === record.id);
    assert(evidence.bundle_manifest.source.document_hash === record.document_hash);
    assert(evidence.bundle_manifest.signed_envelope_hash === evidence.signed_envelope_hash);
    assert(evidence.bundle_manifest.checkpoint_hash === evidence.checkpoint.checkpoint_hash);
    assert(await verifyEvidenceBundleManifest(evidence.bundle_manifest));
  });

  await test('portable verifier payload verifies offline', async () => {
    assert(evidence.verifier_payload.scope === 'LOCAL_L0');
    assert(evidence.verifier_payload.evidence_id === record.id);
    assert(evidence.verifier_payload.document_hash === record.document_hash);
    assert(evidence.verifier_payload.manifest_hash === evidence.bundle_manifest.manifest_hash);
    assert(evidence.verifier_payload.checkpoint_hash === evidence.checkpoint.checkpoint_hash);
    assert(await verifyPortableVerifierPayload(evidence.verifier_payload));
  });

  await test('offline certificate artifact verifies offline', async () => {
    assert(evidence.certificate_artifact.metadata.scope === 'LOCAL_L0');
    assert(evidence.certificate_artifact.metadata.evidence_id === record.id);
    assert(evidence.certificate_artifact.html.includes('LOCAL_L0'));
    assert(await verifyOfflineCertificateArtifact(evidence.certificate_artifact));
  });

  await test('package index verifies offline', async () => {
    assert(evidence.package_index.scope === 'LOCAL_L0');
    assert(evidence.package_index.evidence_id === record.id);
    assert(evidence.package_index.certificate_hash === evidence.certificate_artifact.metadata.certificate_hash);
    assert(evidence.package_index.verifier_payload_hash === evidence.verifier_payload.payload_hash);
    assert(evidence.package_index.manifest_hash === evidence.bundle_manifest.manifest_hash);
    assert(evidence.package_index.checkpoint_hash === evidence.checkpoint.checkpoint_hash);
    assert(evidence.package_index.signed_envelope_hash === evidence.signed_envelope_hash);
    assert(await verifyEvidencePackageIndex(evidence.package_index));
  });

  await test('package files are complete and ordered by kernel package index roles', () => {
    assert(evidence.package_files.length === 6);
    assert(evidence.package_files[0].file_name === FILE_NAME);
    assert(evidence.package_files.some((file) => file.file_name.endsWith('.certificate.html')));
    assert(evidence.package_files.some((file) => file.file_name.endsWith('.verifier-payload.json')));
    assert(evidence.package_files.some((file) => file.file_name.endsWith('.bundle-manifest.json')));
    assert(evidence.package_files.some((file) => file.file_name.endsWith('.signed-envelope.json')));
    assert(evidence.package_files.some((file) => file.file_name.endsWith('.witness-checkpoint.json')));
  });

  await test('manual ZIP artifact from consolidated package files verifies offline', async () => {
    const zipArtifact = await createEvidenceZipPackage({
      evidence_id: record.id,
      package_index: evidence.package_index,
      files: evidence.package_files,
      created_at_utc: evidence.created_at_utc,
      policy: evidence.policy,
      producer: evidence.producer,
    });

    assert(zipArtifact.metadata.scope === 'LOCAL_L0');
    assert(zipArtifact.metadata.evidence_id === record.id);
    assert(zipArtifact.metadata.file_count === evidence.package_files.length + 1);
    assert(isSha256Hex(zipArtifact.metadata.zip_sha256));
    assert(await verifyEvidenceZipPackageArtifact(zipArtifact, evidence.package_index));
  });

  await test('buildKernelOfflineCertificateHtmlFromFile emits valid kernel certificate HTML', async () => {
    const html = await buildKernelOfflineCertificateHtmlFromFile(record, sourceFile);

    assert(typeof html === 'string');
    assert(html.length > 0);
    assert(html.includes('LOCAL_L0'));
    assert(html.includes(record.id));
    assert(html.includes('ARV'));
  });
  await test('buildKernelEvidencePackageZipFromFile returns deterministic ZIP bytes', async () => {
    const directZipBytes = await buildKernelEvidencePackageZipFromFile(record, sourceFile);

    const expectedZipArtifact = await createEvidenceZipPackage({
      evidence_id: record.id,
      package_index: evidence.package_index,
      files: evidence.package_files,
      created_at_utc: evidence.created_at_utc,
      policy: evidence.policy,
      producer: evidence.producer,
    });

    const directHash = await sha256HexFromBytes(directZipBytes);
    const expectedHash = await sha256HexFromBytes(expectedZipArtifact.zip_bytes);

    assert(directZipBytes.byteLength > 0);
    assert(directZipBytes[0] === 0x50);
    assert(directZipBytes[1] === 0x4b);
    assert(directHash === expectedHash);
  });

  await test('buildKernelPublicVerificationRecordFromFile emits consolidated verification JSON', async () => {
    const json = await buildKernelPublicVerificationRecordFromFile(record, sourceFile);
    const parsed = JSON.parse(json) as {
      format: string;
      scope: string;
      evidence_id: string;
      kernel: {
        signed_envelope_hash: string;
        checkpoint_hash: string;
        manifest_hash: string;
        verifier_payload_hash: string;
        certificate_hash: string;
        package_index_hash: string;
      };
      qr_transfer: {
        verified: boolean;
        evidence_id_matches_record: boolean;
        transfer_string: string;
      };
      consistency: {
        source_hash_matches_record_document_hash: boolean;
        scope_is_local_l0: boolean;
        package_index_evidence_id_matches_record: boolean;
        verifier_payload_evidence_id_matches_record: boolean;
        bundle_manifest_evidence_id_matches_record: boolean;
      };
    };

    assert(parsed.format === 'ARV-DEMOCLIENT-KERNEL-VERIFICATION-PAYLOAD-v1');
    assert(parsed.scope === 'LOCAL_L0');
    assert(parsed.evidence_id === record.id);

    assert(parsed.kernel.signed_envelope_hash === evidence.signed_envelope_hash);
    assert(parsed.kernel.checkpoint_hash === evidence.checkpoint.checkpoint_hash);
    assert(parsed.kernel.manifest_hash === evidence.bundle_manifest.manifest_hash);
    assert(parsed.kernel.verifier_payload_hash === evidence.verifier_payload.payload_hash);
    assert(parsed.kernel.certificate_hash === evidence.certificate_artifact.metadata.certificate_hash);
    assert(parsed.kernel.package_index_hash === evidence.package_index.package_index_hash);

    assert(parsed.qr_transfer.verified === true);
    assert(parsed.qr_transfer.evidence_id_matches_record === true);
    assert(parsed.qr_transfer.transfer_string === record.qr.payload);

    assert(parsed.consistency.source_hash_matches_record_document_hash === true);
    assert(parsed.consistency.scope_is_local_l0 === true);
    assert(parsed.consistency.package_index_evidence_id_matches_record === true);
    assert(parsed.consistency.verifier_payload_evidence_id_matches_record === true);
    assert(parsed.consistency.bundle_manifest_evidence_id_matches_record === true);
  });

  await test('same fixed record and file produce stable package index hash', async () => {
    const duplicate = await buildDemoClientKernelEvidenceArtifacts(record, sourceFile);
    assert(duplicate.package_index.package_index_hash === evidence.package_index.package_index_hash);
    assert(duplicate.certificate_artifact.metadata.certificate_hash === evidence.certificate_artifact.metadata.certificate_hash);
    assert(duplicate.verifier_payload.payload_hash === evidence.verifier_payload.payload_hash);
    assert(duplicate.bundle_manifest.manifest_hash === evidence.bundle_manifest.manifest_hash);
    assert(duplicate.checkpoint.checkpoint_hash === evidence.checkpoint.checkpoint_hash);
    assert(duplicate.signed_envelope_hash === evidence.signed_envelope_hash);
  });

  await test('payload remains LOCAL_L0 and does not claim authority registration', () => {
    const serialized = JSON.stringify(evidence);

    assert(evidence.scope === 'LOCAL_L0');
    assert(evidence.policy === 'ARV-L0-LOCAL-INTEGRITY-v1');
    assert(evidence.producer === 'ARV-LOCAL');

    assert(!serialized.includes('ARV_REGISTERED'));
    assert(!serialized.includes('AUTHORITY_REGISTERED'));
    assert(!serialized.includes('RFC3161'));
  });

  console.log('\n' + '─'.repeat(72));

  const total = passed + failed;

  if (failed === 0) {
    console.log(`[ARV DemoClient Kernel Pipeline] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV DemoClient Kernel Pipeline] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});