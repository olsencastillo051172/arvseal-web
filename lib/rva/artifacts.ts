// lib/rva/artifacts.ts
import JSZip from 'jszip';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AnyARVRecord } from './schemas';
import { sha256HexFromBytes, sha256HexFromString, hexToBytes } from './kernel/hash';
import { generateLocalSigningKeyPair, signCanonicalPayload } from './kernel/signature';
import { createWitnessCheckpoint, hashSignedEnvelope } from './kernel/checkpoint';
import { createEvidenceBundleManifest } from './kernel/bundle';
import { createPortableVerifierPayload } from './kernel/verifier-payload';
import { createOfflineCertificateHtml } from './kernel/offline-certificate';
import {
  createEvidencePackageIndex,
  type ARVEvidencePackageArtifactDescriptor,
} from './kernel/package-index';
import { createEvidenceZipPackage } from './kernel/zip-package';
import {
  decodeQrTransferString,
  verifyQrTransferPayload,
} from './kernel/qr-transfer-payload';

export interface ARVVerificationPayload {
  id: string;
  status: string;
  authority: string;
  system: string;
  canon: string;
  epoch_id: string | null;
  ledger_position: number | null;
  document_hash: string;
  merkle_root: string;
  timestamp_utc: string;
  signature_algorithm: string;
  public_key_fingerprint: string | null;
  verification_url: string | null;
  qr_payload: string;
}

export interface ARVEvidenceManifest {
  package_type: 'ARV Evidence Package';
  package_version: '1.0';
  exported_at_utc: string;
  record_type: string;
  record_id: string;
  status: string;
  authority: string;
  canon: string;
  includes: string[];
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function buildQRCodePayload(record: AnyARVRecord): string {
  return JSON.stringify({
    id: record.id,
    status: record.status,
    hash: record.document_hash,
    root: record.merkle_root,
    ts: record.timestamp_utc,
    verify: record.verification_url,
    sigfp: record.signature.public_key_fingerprint,
  });
}

export function buildVerificationPayload(record: AnyARVRecord): ARVVerificationPayload {
  const qr_payload = record.qr?.payload?.trim() ? record.qr.payload : buildQRCodePayload(record);
  return {
    id: record.id,
    status: record.status,
    authority: record.authority,
    system: record.system,
    canon: record.canon,
    epoch_id: record.epoch_id,
    ledger_position: record.ledger_position,
    document_hash: record.document_hash,
    merkle_root: record.merkle_root,
    timestamp_utc: record.timestamp_utc,
    signature_algorithm: record.signature.algorithm,
    public_key_fingerprint: record.signature.public_key_fingerprint,
    verification_url: record.verification_url,
    qr_payload,
  };
}

export function buildEvidenceManifest(record: AnyARVRecord): ARVEvidenceManifest {
  return {
    package_type: 'ARV Evidence Package',
    package_version: '1.0',
    exported_at_utc: new Date().toISOString(),
    record_type: 'GigEvidenceRecord',
    record_id: record.id,
    status: record.status,
    authority: record.authority,
    canon: record.canon,
    includes: [
      `${record.id}.certificate.html`,
      `${record.id}.certificate.pdf`,
      `${record.id}.verification.json`,
      `${record.id}.manifest.json`,
      `${record.id}.record.json`,
    ],
  };
}

function renderCommonIdentityBlock(record: AnyARVRecord): string {
  return `
    <div class="section">
      <div class="section-title">Record Identity</div>
      <div class="field"><div class="label">ID</div><div class="value"><strong>${escapeHtml(record.id)}</strong></div></div>
      <div class="field"><div class="label">Status</div><div class="value">${escapeHtml(record.status)}</div></div>
      <div class="field"><div class="label">Authority</div><div class="value">${escapeHtml(record.authority)}</div></div>
      <div class="field"><div class="label">System</div><div class="value">${escapeHtml(record.system)}</div></div>
      <div class="field"><div class="label">Canon</div><div class="value">${escapeHtml(record.canon)}</div></div>
      <div class="field"><div class="label">Epoch ID</div><div class="value">${escapeHtml(record.epoch_id ?? 'N/A')}</div></div>
      <div class="field"><div class="label">Ledger Position</div><div class="value">${String(record.ledger_position ?? 'N/A')}</div></div>
      <div class="field"><div class="label">Timestamp UTC</div><div class="value">${escapeHtml(record.timestamp_utc)}</div></div>
    </div>
  `;
}

function renderCommonCryptoBlock(record: AnyARVRecord): string {
  const verification = buildVerificationPayload(record);
  return `
    <div class="section">
      <div class="section-title">Cryptographic Proof</div>
      <div class="field"><div class="label">Document Hash</div><div class="mono">${escapeHtml(record.document_hash)}</div></div>
      <div class="field"><div class="label">Merkle Root</div><div class="mono">${escapeHtml(record.merkle_root)}</div></div>
      <div class="field"><div class="label">Signature Algorithm</div><div class="value">${escapeHtml(record.signature.algorithm)}</div></div>
      <div class="field"><div class="label">Public Key Fingerprint</div><div class="mono">${escapeHtml(record.signature.public_key_fingerprint ?? 'N/A')}</div></div>
      <div class="field"><div class="label">Verification URL</div><div class="value">${escapeHtml(record.verification_url ?? 'Not available')}</div></div>
      <div class="field"><div class="label">QR Payload</div><div class="mono">${escapeHtml(verification.qr_payload)}</div></div>
    </div>
  `;
}

function renderVerticalBlock(record: AnyARVRecord): string {
  if ('worker_name' in record) {
    return `
      <div class="section">
        <div class="section-title">Gig Evidence Metadata</div>
        <div class="field"><div class="label">Worker</div><div class="value">${escapeHtml(record.worker_name)}</div></div>
        <div class="field"><div class="label">Client</div><div class="value">${escapeHtml(record.client_name)}</div></div>
        <div class="field"><div class="label">Project</div><div class="value">${escapeHtml(record.project_name)}</div></div>
        <div class="field"><div class="label">Deliverable Type</div><div class="value">${escapeHtml(record.deliverable_type)}</div></div>
        <div class="field"><div class="label">Delivery Date</div><div class="value">${escapeHtml(record.delivery_date)}</div></div>
      </div>
    `;
  }
  return `
    <div class="section">
      <div class="section-title">Record Metadata</div>
      <div class="field"><div class="label">Source File</div><div class="value">${escapeHtml(record.source_file.filename)}</div></div>
      <div class="field"><div class="label">MIME Type</div><div class="value">${escapeHtml(record.source_file.mime_type ?? 'Unknown')}</div></div>
      <div class="field"><div class="label">Size Bytes</div><div class="value">${record.source_file.size_bytes.toLocaleString()}</div></div>
      <div class="field"><div class="label">Source Mode</div><div class="value">${escapeHtml(record.source_file.source_mode)}</div></div>
    </div>
  `;
}

export function buildCertificateHtml(record: AnyARVRecord, qrDataUrl?: string): string {
  const localBanner = record.status === 'LOCAL_UNREGISTERED'
    ? `<div class="notice-local">⚠ LOCAL HASH COMPUTED — NOT YET REGISTERED</div>`
    : '';
  const verification = buildVerificationPayload(record);
  const qrImageHtml = qrDataUrl
    ? `<div style="text-align:center; margin: 8px 0;"><img src="${qrDataUrl}" width="160" height="160" alt="Verification QR" style="border:1px solid #ccc; border-radius:8px;" /></div>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(record.id)} — ARV Certificate</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    :root{--bg:#0b1224;--panel:#ffffff;--ink:#0f172a;--muted:#64748b;--line:#e5e7eb;--gold:#fbbf24;--ok:#16a34a}
    *{box-sizing:border-box}
    body{margin:0;background:linear-gradient(180deg,#0b1224 0%,#15306b 100%);color:#fff;font-family:Arial,Helvetica,sans-serif;padding:32px}
    .shell{max-width:1100px;margin:0 auto}
    .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}
    .brand h1{margin:0;font-size:48px;color:var(--gold);letter-spacing:-0.04em}
    .brand .sub{margin-top:6px;font-size:16px;color:#e2e8f0}
    .brand .mini{margin-top:4px;font-size:13px;color:#94a3b8}
    .status{text-align:right}
    .status .k{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8}
    .status .v{font-size:34px;font-weight:700;color:var(--ok)}
    .paper{background:var(--panel);color:var(--ink);border-radius:20px;padding:36px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
    .title{text-align:center;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:700}
    .subtitle{text-align:center;font-size:30px;margin:8px 0 12px}
    .note{text-align:center;max-width:760px;margin:0 auto 24px;color:var(--muted);font-size:14px;line-height:1.5}
    .notice-local{background:#fffbeb;border:1px solid #fcd34d;color:#92400e;border-radius:12px;padding:12px 16px;margin-bottom:20px;font-size:13px;line-height:1.4}
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px}
    .section{border:1px solid var(--line);border-radius:14px;padding:18px;background:#fff}
    .section-title{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--line)}
    .field{margin-bottom:12px}
    .label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:4px}
    .value{font-size:14px;line-height:1.45;word-break:break-word}
    .mono{font-family:Consolas,Menlo,monospace;font-size:12px;background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:10px;word-break:break-all;color:#0f172a}
    .footer{margin-top:20px;display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:16px}
    @media(max-width:960px){.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="shell">
    <div class="top">
      <div class="brand">
        <h1>ARV</h1>
        <div class="sub">${escapeHtml(record.authority)}</div>
        <div class="mini">${escapeHtml(record.system)}</div>
      </div>
      <div class="status">
        <div class="k">Status</div>
        <div class="v">${escapeHtml(record.status)}</div>
      </div>
    </div>
    <div class="paper">
      <div class="title">Cryptographic Integrity Certificate</div>
      <div class="subtitle">Portable Verification Record</div>
      <div class="note">This certificate confirms cryptographic integrity, temporal existence, and verification consistency.</div>
      ${localBanner}
      <div class="grid">
        ${renderCommonIdentityBlock(record)}
        ${renderCommonCryptoBlock(record)}
        <div class="section">
          <div class="section-title">Signed QR</div>
          ${qrImageHtml}
          <div class="field" style="margin-top:12px;">
            <div class="label">Signed QR Payload</div>
            <div class="mono" style="font-size:10px;">${escapeHtml(verification.qr_payload)}</div>
          </div>
        </div>
      </div>
      <div class="footer">
        <div>${escapeHtml(record.id)} · ${escapeHtml(record.canon)}</div>
        <div>ARV · A System by Intelligence Olsen (IO)</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function buildQRImage(payload: string): Promise<string> {
  return await QRCode.toDataURL(payload, { width: 200, margin: 1, errorCorrectionLevel: 'M' });
}

export async function buildCertificateHtmlWithQR(record: AnyARVRecord): Promise<string> {
  const qrPayload = record.qr?.payload?.trim() || buildQRCodePayload(record);
  const qrDataUrl = await buildQRImage(qrPayload);
  return buildCertificateHtml(record, qrDataUrl);
}

export async function buildCertificatePdf(record: AnyARVRecord): Promise<Uint8Array> {
  const html = await buildCertificateHtmlWithQR(record);
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.innerHTML = html;
  document.body.appendChild(container);
  const rootElement = container.querySelector('.shell') as HTMLElement;
  if (!rootElement) throw new Error('Missing .shell element');
  const canvas = await html2canvas(rootElement, { scale: 2, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let renderWidth = pageWidth;
  let renderHeight = (canvas.height * renderWidth) / canvas.width;
  if (renderHeight > pageHeight) {
    renderHeight = pageHeight;
    renderWidth = (canvas.width * renderHeight) / canvas.height;
  }
  const x = (pageWidth - renderWidth) / 2;
  const y = 0;
  pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');
  document.body.removeChild(container);
  const buffer = pdf.output('arraybuffer');
  return new Uint8Array(buffer);
}

export async function buildKernelCertificatePdfFromFile(
  record: AnyARVRecord,
  sourceFile: File,
): Promise<Uint8Array> {
  const html = await buildKernelOfflineCertificateHtmlFromFile(record, sourceFile);

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.innerHTML = html;

  document.body.appendChild(container);

  try {
    const rootElement = container.querySelector('.shell') as HTMLElement;
    if (!rootElement) throw new Error('Missing .shell element');

    const canvas = await html2canvas(rootElement, {
      scale: 2,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let renderWidth = pageWidth;
    let renderHeight = (canvas.height * renderWidth) / canvas.width;

    if (renderHeight > pageHeight) {
      renderHeight = pageHeight;
      renderWidth = (canvas.width * renderHeight) / canvas.height;
    }

    const x = (pageWidth - renderWidth) / 2;
    const y = 0;

    pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

    const buffer = pdf.output('arraybuffer');
    return new Uint8Array(buffer);
  } finally {
    document.body.removeChild(container);
  }
}

export async function buildEvidencePackageZip(record: AnyARVRecord): Promise<Uint8Array> {
  const zip = new JSZip();
  const htmlWithQR = await buildCertificateHtmlWithQR(record);
  zip.file(`${record.id}.certificate.html`, htmlWithQR);
  zip.file(`${record.id}.certificate.pdf`, await buildCertificatePdf(record));
  zip.file(`${record.id}.verification.json`, buildPublicVerificationRecord(record));
  zip.file(`${record.id}.manifest.json`, JSON.stringify(buildEvidenceManifest(record), null, 2));
  zip.file(`${record.id}.record.json`, buildRecordJson(record));
  return await zip.generateAsync({ type: 'uint8array' });
}

function safeKernelZipFileName(value: string | null | undefined, fallback: string): string {
  const raw = (value ?? '').trim() || fallback;

  const cleaned = raw
    .replace(/\\/g, '-')
    .replace(/\//g, '-')
    .replace(/\.\./g, '__')
    .replace(/^[A-Za-z]:/, '')
    .replace(/^[-.\s]+/, '')
    .trim();

  return cleaned || fallback;
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

async function buildDeterministicDemoSeed(record: AnyARVRecord): Promise<Uint8Array> {
  const seedHash = await sha256HexFromString(
    `ARV-DEMOCLIENT-KERNEL-ZIP-v1:${record.id}:${record.document_hash}`,
  );

  return hexToBytes(seedHash).slice(0, 32);
}

export async function buildDemoClientKernelEvidenceArtifacts(
  record: AnyARVRecord,
  sourceFile: File,
) {
  const createdAt = record.timestamp_utc || record.issued_at_utc || new Date().toISOString();
  const policy = 'ARV-L0-LOCAL-INTEGRITY-v1';
  const producer = 'ARV-LOCAL';

  if (!record.id?.trim()) {
    throw new Error('ARV kernel pipeline: record.id is required');
  }

  if (!record.document_hash?.trim()) {
    throw new Error('ARV kernel pipeline: record.document_hash is required');
  }

  if (!sourceFile) {
    throw new Error('ARV kernel pipeline: source file is required');
  }

  const sourceBytes = new Uint8Array(await sourceFile.arrayBuffer());
  const sourceHash = await sha256HexFromBytes(sourceBytes);

  if (sourceHash !== record.document_hash) {
    throw new Error('ARV kernel pipeline: source file hash does not match record.document_hash');
  }

  if (
    record.source_file?.size_bytes !== undefined &&
    record.source_file.size_bytes !== sourceBytes.byteLength
  ) {
    throw new Error('ARV kernel pipeline: source file size does not match record.source_file.size_bytes');
  }

  const sourceFileName = safeKernelZipFileName(
    record.source_file?.filename || sourceFile.name,
    `${record.id}.source.bin`,
  );

  const signingPayload = {
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
      size_bytes: sourceBytes.byteLength,
    },
    policy,
    producer,
  };

  const seed = await buildDeterministicDemoSeed(record);
  const keypair = await generateLocalSigningKeyPair(seed);
  const signedEnvelope = await signCanonicalPayload(signingPayload, keypair.secret_key_hex, {
    signed_at_utc: createdAt,
  });

  const signedEnvelopeHash = await hashSignedEnvelope(signedEnvelope);

  const checkpoint = await createWitnessCheckpoint({
    sequence: 1,
    evidence_id: record.id,
    payload_hash: signedEnvelope.payload_hash,
    envelope_hash: signedEnvelopeHash,
    previous_checkpoint_hash: null,
    created_at_utc: createdAt,
    witness: 'ARV-LOCAL-DEMOCLIENT',
  });

  const bundleManifest = await createEvidenceBundleManifest({
    evidence_id: record.id,
    source: {
      file_name: sourceFileName,
      mime_type: record.source_file?.mime_type || sourceFile.type || 'application/octet-stream',
      size_bytes: sourceBytes.byteLength,
      document_hash: sourceHash,
    },
    signed_envelope_hash: signedEnvelopeHash,
    checkpoint_hash: checkpoint.checkpoint_hash,
    checkpoint_sequence: checkpoint.sequence,
    created_at_utc: createdAt,
    policy,
    producer,
  });

  const verifierPayload = await createPortableVerifierPayload({
    evidence_id: record.id,
    document_hash: sourceHash,
    manifest_hash: bundleManifest.manifest_hash,
    signed_envelope_hash: signedEnvelopeHash,
    checkpoint_hash: checkpoint.checkpoint_hash,
    checkpoint_sequence: checkpoint.sequence,
    created_at_utc: createdAt,
    policy,
    producer,
  });

  const certificateArtifact = await createOfflineCertificateHtml({
    title: `${record.id} — ARV Offline Evidence Certificate`,
    evidence_id: record.id,
    file_name: sourceFileName,
    verifier_payload: verifierPayload,
    bundle_manifest: bundleManifest,
    created_at_utc: createdAt,
    policy,
    producer,
  });

  const signedEnvelopeJson = JSON.stringify(signedEnvelope, null, 2);
  const checkpointJson = JSON.stringify(checkpoint, null, 2);
  const bundleManifestJson = JSON.stringify(bundleManifest, null, 2);
  const verifierPayloadJson = JSON.stringify(verifierPayload, null, 2);
  const certificateHtml = certificateArtifact.html;

  const signedEnvelopeFile = `${record.id}.signed-envelope.json`;
  const checkpointFile = `${record.id}.witness-checkpoint.json`;
  const bundleManifestFile = `${record.id}.bundle-manifest.json`;
  const verifierPayloadFile = `${record.id}.verifier-payload.json`;
  const certificateFile = `${record.id}.certificate.html`;

  const artifacts: ARVEvidencePackageArtifactDescriptor[] = [
    {
      role: 'source',
      file_name: sourceFileName,
      media_type: record.source_file?.mime_type || sourceFile.type || 'application/octet-stream',
      sha256: sourceHash,
      size_bytes: sourceBytes.byteLength,
    },
    {
      role: 'offline_certificate_html',
      file_name: certificateFile,
      media_type: 'text/html',
      sha256: await sha256HexFromString(certificateHtml),
      size_bytes: utf8Bytes(certificateHtml),
    },
    {
      role: 'verifier_payload_json',
      file_name: verifierPayloadFile,
      media_type: 'application/json',
      sha256: await sha256HexFromString(verifierPayloadJson),
      size_bytes: utf8Bytes(verifierPayloadJson),
    },
    {
      role: 'bundle_manifest_json',
      file_name: bundleManifestFile,
      media_type: 'application/json',
      sha256: await sha256HexFromString(bundleManifestJson),
      size_bytes: utf8Bytes(bundleManifestJson),
    },
    {
      role: 'signed_envelope_json',
      file_name: signedEnvelopeFile,
      media_type: 'application/json',
      sha256: await sha256HexFromString(signedEnvelopeJson),
      size_bytes: utf8Bytes(signedEnvelopeJson),
    },
    {
      role: 'witness_checkpoint_json',
      file_name: checkpointFile,
      media_type: 'application/json',
      sha256: await sha256HexFromString(checkpointJson),
      size_bytes: utf8Bytes(checkpointJson),
    },
  ];

  const packageIndex = await createEvidencePackageIndex({
    evidence_id: record.id,
    artifacts,
    certificate_hash: certificateArtifact.metadata.certificate_hash,
    verifier_payload_hash: verifierPayload.payload_hash,
    manifest_hash: bundleManifest.manifest_hash,
    checkpoint_hash: checkpoint.checkpoint_hash,
    signed_envelope_hash: signedEnvelopeHash,
    created_at_utc: createdAt,
    policy,
    producer,
  });

  const packageFiles = [
    {
      file_name: sourceFileName,
      content: sourceBytes,
    },
    {
      file_name: certificateFile,
      content: certificateHtml,
    },
    {
      file_name: verifierPayloadFile,
      content: verifierPayloadJson,
    },
    {
      file_name: bundleManifestFile,
      content: bundleManifestJson,
    },
    {
      file_name: signedEnvelopeFile,
      content: signedEnvelopeJson,
    },
    {
      file_name: checkpointFile,
      content: checkpointJson,
    },
  ];

  return {
    format: 'ARV-DEMOCLIENT-KERNEL-EVIDENCE-ARTIFACTS-v1',
    scope: 'LOCAL_L0',
    evidence_id: record.id,
    created_at_utc: createdAt,
    policy,
    producer,
    source: {
      file_name: sourceFileName,
      media_type: record.source_file?.mime_type || sourceFile.type || 'application/octet-stream',
      size_bytes: sourceBytes.byteLength,
      document_hash: sourceHash,
    },
    source_bytes: sourceBytes,
    signed_envelope: signedEnvelope,
    signed_envelope_hash: signedEnvelopeHash,
    checkpoint,
    bundle_manifest: bundleManifest,
    verifier_payload: verifierPayload,
    certificate_artifact: certificateArtifact,
    package_index: packageIndex,
    package_files: packageFiles,
  };
}

export async function buildKernelOfflineCertificateHtmlFromFile(
  record: AnyARVRecord,
  sourceFile: File,
): Promise<string> {
  const evidence = await buildDemoClientKernelEvidenceArtifacts(record, sourceFile);
  return evidence.certificate_artifact.html;
}
export async function buildKernelEvidencePackageZipFromFile(
  record: AnyARVRecord,
  sourceFile: File,
): Promise<Uint8Array> {
  const evidence = await buildDemoClientKernelEvidenceArtifacts(record, sourceFile);

  const zipArtifact = await createEvidenceZipPackage({
    evidence_id: record.id,
    package_index: evidence.package_index,
    files: evidence.package_files,
    created_at_utc: evidence.created_at_utc,
    policy: evidence.policy,
    producer: evidence.producer,
  });

  return zipArtifact.zip_bytes;
}

export async function buildKernelPublicVerificationRecordFromFile(
  record: AnyARVRecord,
  sourceFile: File,
): Promise<string> {
  const evidence = await buildDemoClientKernelEvidenceArtifacts(record, sourceFile);

  let qrTransfer:
    | {
        prefix: string;
        transfer_string: string;
        transfer_hash: string;
        verified: boolean;
        evidence_id_matches_record: boolean;
        body: unknown;
      }
    | {
        verified: false;
        error: string;
      }
    | null = null;

  const qrPayload = record.qr?.payload?.trim();

  if (qrPayload) {
    try {
      const decodedQrTransfer = await decodeQrTransferString(qrPayload);
      const qrTransferOk = await verifyQrTransferPayload(decodedQrTransfer);

      qrTransfer = {
        prefix: decodedQrTransfer.prefix,
        transfer_string: decodedQrTransfer.transfer_string,
        transfer_hash: decodedQrTransfer.body.transfer_hash,
        verified: qrTransferOk,
        evidence_id_matches_record: decodedQrTransfer.body.evidence_id === record.id,
        body: decodedQrTransfer.body,
      };
    } catch (error) {
      qrTransfer = {
        verified: false,
        error: error instanceof Error ? error.message : 'QR transfer decode failed',
      };
    }
  }

  return pretty({
    format: 'ARV-DEMOCLIENT-KERNEL-VERIFICATION-PAYLOAD-v1',
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    evidence_id: record.id,
    status: record.status,
    document_hash: evidence.source.document_hash,
    merkle_root: record.merkle_root,
    timestamp_utc: record.timestamp_utc,
    issued_at_utc: record.issued_at_utc,
    source_file: {
      filename: record.source_file.filename,
      exported_file_name: evidence.source.file_name,
      mime_type: record.source_file.mime_type,
      size_bytes: evidence.source.size_bytes,
      source_mode: record.source_file.source_mode,
      captured_at_utc: record.source_file.captured_at_utc,
    },
    kernel: {
      signed_envelope_hash: evidence.signed_envelope_hash,
      checkpoint_hash: evidence.checkpoint.checkpoint_hash,
      checkpoint_sequence: evidence.checkpoint.sequence,
      manifest_hash: evidence.bundle_manifest.manifest_hash,
      verifier_payload_hash: evidence.verifier_payload.payload_hash,
      certificate_hash: evidence.certificate_artifact.metadata.certificate_hash,
      package_index_hash: evidence.package_index.package_index_hash,
    },
    artifacts: evidence.package_index.artifacts,
    qr_transfer: qrTransfer,
    consistency: {
      source_hash_matches_record_document_hash: evidence.source.document_hash === record.document_hash,
      scope_is_local_l0: evidence.scope === 'LOCAL_L0',
      package_index_evidence_id_matches_record: evidence.package_index.evidence_id === record.id,
      verifier_payload_evidence_id_matches_record: evidence.verifier_payload.evidence_id === record.id,
      bundle_manifest_evidence_id_matches_record: evidence.bundle_manifest.evidence_id === record.id,
    },
    policy: evidence.policy,
    producer: evidence.producer,
    verification_url: record.verification_url,
    note:
      'LOCAL_L0 consolidated kernel verification payload. This is not ARV Authority registration, not a public ledger record, and not RFC 3161 timestamping.',
  });
}
export async function buildKernelPublicVerificationRecord(record: AnyARVRecord): Promise<string> {
  const qrPayload = record.qr?.payload?.trim();

  if (!qrPayload) {
    throw new Error('ARV verification payload: record.qr.payload is required');
  }

  const decodedQrTransfer = await decodeQrTransferString(qrPayload);
  const qrTransferOk = await verifyQrTransferPayload(decodedQrTransfer);

  if (!qrTransferOk) {
    throw new Error('ARV verification payload: QR transfer payload failed verification');
  }

  if (decodedQrTransfer.body.evidence_id !== record.id) {
    throw new Error('ARV verification payload: QR evidence_id does not match record.id');
  }

  return pretty({
    format: 'ARV-DEMOCLIENT-KERNEL-VERIFICATION-PAYLOAD-v1',
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    evidence_id: record.id,
    status: record.status,
    document_hash: record.document_hash,
    merkle_root: record.merkle_root,
    timestamp_utc: record.timestamp_utc,
    issued_at_utc: record.issued_at_utc,
    source_file: {
      filename: record.source_file.filename,
      mime_type: record.source_file.mime_type,
      size_bytes: record.source_file.size_bytes,
      source_mode: record.source_file.source_mode,
      captured_at_utc: record.source_file.captured_at_utc,
    },
    signature: {
      algorithm: record.signature.algorithm,
      public_key_fingerprint: record.signature.public_key_fingerprint,
      value_present: Boolean(record.signature.value),
    },
    qr_transfer: {
      prefix: decodedQrTransfer.prefix,
      transfer_string: decodedQrTransfer.transfer_string,
      transfer_hash: decodedQrTransfer.body.transfer_hash,
      verified: true,
      body: decodedQrTransfer.body,
    },
    consistency: {
      evidence_id_matches_qr_transfer: decodedQrTransfer.body.evidence_id === record.id,
      scope_is_local_l0: decodedQrTransfer.body.scope === 'LOCAL_L0',
      qr_encoding: decodedQrTransfer.body.encoding,
      qr_algorithm: decodedQrTransfer.body.algorithm,
      qr_policy: decodedQrTransfer.body.policy,
      qr_producer: decodedQrTransfer.body.producer,
    },
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
    verification_url: record.verification_url,
    note:
      'LOCAL_L0 kernel-compatible verification payload. This is not ARV Authority registration, not a public ledger record, and not RFC 3161 timestamping.',
  });
}

export function buildPublicVerificationRecord(record: AnyARVRecord): string {
  return pretty(buildVerificationPayload(record));
}

export function buildRecordJson(record: AnyARVRecord): string {
  const stripNullish = (value: unknown): unknown => {
    if (value === null || value === undefined) return undefined;

    if (Array.isArray(value)) {
      const cleanedArray = value
        .map(stripNullish)
        .filter((item) => item !== undefined);

      return cleanedArray.length > 0 ? cleanedArray : undefined;
    }

    if (typeof value === 'object') {
      const cleanedObject = Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .map(([key, item]) => [key, stripNullish(item)])
          .filter(([, item]) => item !== undefined),
      );

      return Object.keys(cleanedObject).length > 0 ? cleanedObject : undefined;
    }

    return value;
  };

  const cleanRecord = stripNullish(record) as Record<string, unknown>;

  const sourceRecord = record as AnyARVRecord & {
    signature?: { value?: string | null };
    dual_seal?: { secondary_seal_hash?: string | null };
  };

  if (!sourceRecord.signature?.value) {
    delete cleanRecord.signature;
  }

  if (!sourceRecord.dual_seal?.secondary_seal_hash) {
    delete cleanRecord.dual_seal;
  }

  return pretty({
    _arv_level: 'L0',
    _arv_policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    _arv_note:
      'LOCAL PROOF — authority fields are omitted by design. Register with ARV Authority to activate official validation, registered ledger position, authority seal, and institutional verification.',
    ...cleanRecord,
  });
}

