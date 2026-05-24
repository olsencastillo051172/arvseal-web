/**
 * ARV Trust Kernel — Offline Certificate HTML v1
 * Scope: LOCAL_L0 only.
 * No network · No scripts · No external resources · No ARV Authority.
 *
 * Standalone, browser-openable, deterministic HTML certificate generated
 * from ARV Portable Verifier Payload v1 and ARV Evidence Bundle Manifest v1.
 */

import { canonicalize } from './canonicalize';
import { sha256HexFromString } from './hash';
import {
  verifyPortableVerifierPayload,
  type ARVPortableVerifierPayload,
} from './verifier-payload';
import {
  verifyEvidenceBundleManifest,
  type ARVEvidenceBundleManifest,
} from './bundle';

export type ARVOfflineCertificateScope = 'LOCAL_L0';
export type ARVOfflineCertificateFormat = 'ARV-OFFLINE-CERTIFICATE-HTML-v1';
export type ARVOfflineCertificateAlgorithm = 'SHA-256';

export interface ARVOfflineCertificateInput {
  title?: string;
  evidence_id: string;
  file_name: string;
  verifier_payload: ARVPortableVerifierPayload;
  bundle_manifest: ARVEvidenceBundleManifest;
  created_at_utc?: string;
  policy?: string;
  producer?: string;
}

export interface ARVOfflineCertificateMetadata {
  format: ARVOfflineCertificateFormat;
  scope: ARVOfflineCertificateScope;
  algorithm: ARVOfflineCertificateAlgorithm;
  evidence_id: string;
  file_name: string;
  verifier_payload_hash: string;
  manifest_hash: string;
  created_at_utc: string;
  policy: string;
  producer: string;
  certificate_hash: string;
}

export interface ARVOfflineCertificateArtifact {
  metadata: ARVOfflineCertificateMetadata;
  html: string;
}

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function hasForbiddenHtml(html: string): boolean {
  const h = html.toLowerCase();

  return (
    h.includes('<script') ||
    h.includes('http://') ||
    h.includes('https://') ||
    h.includes('<iframe') ||
    h.includes('<object') ||
    h.includes('<embed')
  );
}

function extractJsonFromPre(html: string, id: string): unknown | null {
  const re = new RegExp(`<pre[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/pre>`, 'i');
  const match = html.match(re);
  if (!match?.[1]) return null;

  try {
    return JSON.parse(decodeHtmlEntities(match[1]));
  } catch {
    return null;
  }
}

function validateMetadataFields(metadata: ARVOfflineCertificateMetadata): string | null {
  if (!metadata || typeof metadata !== 'object') return 'metadata missing';

  if (metadata.format !== 'ARV-OFFLINE-CERTIFICATE-HTML-v1') return 'format invalid';
  if (metadata.scope !== 'LOCAL_L0') return 'scope invalid';
  if (metadata.algorithm !== 'SHA-256') return 'algorithm invalid';

  if (!metadata.evidence_id?.trim()) return 'evidence_id missing';
  if (!metadata.file_name?.trim()) return 'file_name missing';

  if (!isHex64(metadata.verifier_payload_hash)) return 'verifier_payload_hash invalid';
  if (!isHex64(metadata.manifest_hash)) return 'manifest_hash invalid';

  if (!metadata.created_at_utc?.trim()) return 'created_at_utc missing';
  if (!metadata.policy?.trim()) return 'policy missing';
  if (!metadata.producer?.trim()) return 'producer missing';

  if (!isHex64(metadata.certificate_hash)) return 'certificate_hash invalid';

  return null;
}

function metadataPreimage(
  metadata: Omit<ARVOfflineCertificateMetadata, 'certificate_hash'>,
): Omit<ARVOfflineCertificateMetadata, 'certificate_hash'> {
  return {
    format: metadata.format,
    scope: metadata.scope,
    algorithm: metadata.algorithm,
    evidence_id: metadata.evidence_id,
    file_name: metadata.file_name,
    verifier_payload_hash: metadata.verifier_payload_hash,
    manifest_hash: metadata.manifest_hash,
    created_at_utc: metadata.created_at_utc,
    policy: metadata.policy,
    producer: metadata.producer,
  };
}

export async function hashOfflineCertificateMetadata(
  metadata: Omit<ARVOfflineCertificateMetadata, 'certificate_hash'>,
): Promise<string> {
  return sha256HexFromString(canonicalize(metadataPreimage(metadata)));
}

function buildHtml(
  input: ARVOfflineCertificateInput,
  metadata: ARVOfflineCertificateMetadata,
): string {
  const title = esc(input.title ?? `ARV Evidence Certificate — ${metadata.evidence_id}`);
  const evidenceId = esc(metadata.evidence_id);
  const fileName = esc(metadata.file_name);
  const certHash = esc(metadata.certificate_hash);
  const vpHash = esc(metadata.verifier_payload_hash);
  const manifestHash = esc(metadata.manifest_hash);
  const createdAt = esc(metadata.created_at_utc);
  const policy = esc(metadata.policy);
  const producer = esc(metadata.producer);
  const scope = esc(metadata.scope);

  const verifierPayloadJson = esc(JSON.stringify(input.verifier_payload, null, 2));
  const bundleManifestJson = esc(JSON.stringify(input.bundle_manifest, null, 2));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:32px;background:#0a0f1e;color:#e2e8f0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;line-height:1.55}
  .shell{max-width:980px;margin:0 auto}
  .brand{font-size:42px;font-weight:800;letter-spacing:-.06em;color:#d6a13a}
  .subtitle{margin-top:4px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#94a3b8}
  .notice{margin:28px 0;padding:18px 20px;border:1px solid #d6a13a66;border-radius:12px;background:#d6a13a14;color:#fbbf24;font-size:13px}
  .grid{display:grid;gap:18px}
  .section{border:1px solid #1e293b;border-radius:12px;overflow:hidden;background:#0f172a}
  .section-title{padding:10px 14px;background:#111827;color:#94a3b8;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;border-bottom:1px solid #1e293b}
  .field{display:grid;grid-template-columns:240px 1fr;border-bottom:1px solid #1e293b}
  .field:last-child{border-bottom:0}
  .label{padding:10px 14px;background:#0b1120;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.12em}
  .value{padding:10px 14px;color:#e2e8f0;font-size:13px;word-break:break-all}
  .green{color:#4ade80}
  .amber{color:#fbbf24}
  pre{margin:0;padding:16px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#020617;color:#cbd5e1;font-size:12px}
  .footer{margin-top:28px;padding-top:18px;border-top:1px solid #1e293b;color:#64748b;text-align:center;font-size:12px}
</style>
</head>
<body>
<div class="shell">
  <header>
    <div class="brand">ARV</div>
    <div class="subtitle">Reality Validation Authority — A System by Intelligence Olsen (IO)</div>
  </header>

  <div class="notice">
    <strong>LOCAL PROOF — SCOPE: ${scope}</strong><br>
    This certificate is local, offline, and unregistered evidence.
    It has not been submitted to ARV Authority.
    It is not official validation, not a public ledger record, and not an authority seal.
    It demonstrates local cryptographic integrity and tamper-evidence only.
  </div>

  <main class="grid">
    <section class="section">
      <div class="section-title">Certificate Identity</div>
      <div class="field"><div class="label">Evidence ID</div><div class="value amber">${evidenceId}</div></div>
      <div class="field"><div class="label">File Name</div><div class="value">${fileName}</div></div>
      <div class="field"><div class="label">Scope</div><div class="value amber">${scope}</div></div>
      <div class="field"><div class="label">Created UTC</div><div class="value">${createdAt}</div></div>
      <div class="field"><div class="label">Policy</div><div class="value">${policy}</div></div>
      <div class="field"><div class="label">Producer</div><div class="value">${producer}</div></div>
    </section>

    <section class="section">
      <div class="section-title">Cryptographic Proof</div>
      <div class="field"><div class="label">Certificate Hash</div><div class="value green">${certHash}</div></div>
      <div class="field"><div class="label">Verifier Payload Hash</div><div class="value green">${vpHash}</div></div>
      <div class="field"><div class="label">Bundle Manifest Hash</div><div class="value green">${manifestHash}</div></div>
    </section>

    <section class="section">
      <div class="section-title">Embedded Verifier Payload JSON</div>
      <pre id="arv-verifier-payload-json" data-arv-json="verifier-payload">${verifierPayloadJson}</pre>
    </section>

    <section class="section">
      <div class="section-title">Embedded Bundle Manifest JSON</div>
      <pre id="arv-bundle-manifest-json" data-arv-json="bundle-manifest">${bundleManifestJson}</pre>
    </section>
  </main>

  <div class="footer">
    VERITAS SCRIPTA INMUTABILIS EST — ARV Reality Validation Authority<br>
    LOCAL_L0 offline, local, unregistered evidence certificate. No authority seal. No ledger anchor. No RFC 3161.
  </div>
</div>
</body>
</html>`;
}

export async function createOfflineCertificateHtml(
  input: ARVOfflineCertificateInput,
): Promise<ARVOfflineCertificateArtifact> {
  if (!input || typeof input !== 'object') {
    throw new Error('ARV offline certificate: input is required');
  }

  if (!input.evidence_id?.trim()) {
    throw new Error('ARV offline certificate: evidence_id is required');
  }

  if (!input.file_name?.trim()) {
    throw new Error('ARV offline certificate: file_name is required');
  }

  const [verifierOk, bundleOk] = await Promise.all([
    verifyPortableVerifierPayload(input.verifier_payload),
    verifyEvidenceBundleManifest(input.bundle_manifest),
  ]);

  if (!verifierOk) {
    throw new Error('ARV offline certificate: verifier_payload failed verification');
  }

  if (!bundleOk) {
    throw new Error('ARV offline certificate: bundle_manifest failed verification');
  }

  if (input.evidence_id !== input.verifier_payload.evidence_id) {
    throw new Error('ARV offline certificate: input.evidence_id !== verifier_payload.evidence_id');
  }

  if (input.evidence_id !== input.bundle_manifest.evidence_id) {
    throw new Error('ARV offline certificate: input.evidence_id !== bundle_manifest.evidence_id');
  }

  if (input.file_name !== input.bundle_manifest.source.file_name) {
    throw new Error('ARV offline certificate: input.file_name !== bundle_manifest.source.file_name');
  }

  if (input.verifier_payload.evidence_id !== input.bundle_manifest.evidence_id) {
    throw new Error('ARV offline certificate: verifier_payload.evidence_id !== bundle_manifest.evidence_id');
  }

  if (input.verifier_payload.manifest_hash !== input.bundle_manifest.manifest_hash) {
    throw new Error('ARV offline certificate: verifier_payload.manifest_hash !== bundle_manifest.manifest_hash');
  }

  const body: Omit<ARVOfflineCertificateMetadata, 'certificate_hash'> = {
    format: 'ARV-OFFLINE-CERTIFICATE-HTML-v1',
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    evidence_id: input.evidence_id,
    file_name: input.file_name,
    verifier_payload_hash: input.verifier_payload.payload_hash,
    manifest_hash: input.bundle_manifest.manifest_hash,
    created_at_utc: input.created_at_utc ?? new Date().toISOString(),
    policy: input.policy ?? 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: input.producer ?? 'ARV-LOCAL',
  };

  const metadata: ARVOfflineCertificateMetadata = {
    ...body,
    certificate_hash: await hashOfflineCertificateMetadata(body),
  };

  const html = buildHtml(input, metadata);

  if (hasForbiddenHtml(html)) {
    throw new Error('ARV offline certificate: generated HTML contains forbidden content');
  }

  return { metadata, html };
}

export async function verifyOfflineCertificateArtifact(
  artifact: ARVOfflineCertificateArtifact,
): Promise<boolean> {
  try {
    if (!artifact || typeof artifact !== 'object') return false;
    if (!artifact.html || typeof artifact.html !== 'string') return false;

    const metadataError = validateMetadataFields(artifact.metadata);
    if (metadataError) return false;

    const { certificate_hash: _ignored, ...body } = artifact.metadata;
    const expected = await hashOfflineCertificateMetadata(body);

    if (expected !== artifact.metadata.certificate_hash) return false;
    if (hasForbiddenHtml(artifact.html)) return false;

    const lowerHtml = artifact.html.toLowerCase();

    if (!artifact.html.includes(esc(artifact.metadata.certificate_hash))) return false;
    if (!artifact.html.includes(esc(artifact.metadata.verifier_payload_hash))) return false;
    if (!artifact.html.includes(esc(artifact.metadata.manifest_hash))) return false;
    if (!artifact.html.includes(esc(artifact.metadata.evidence_id))) return false;
    if (!artifact.html.includes(esc(artifact.metadata.file_name))) return false;
    if (!artifact.html.includes('LOCAL_L0')) return false;

    if (!lowerHtml.includes('local')) return false;
    if (!lowerHtml.includes('offline')) return false;
    if (!lowerHtml.includes('unregistered')) return false;

    const verifierPayload = extractJsonFromPre(
      artifact.html,
      'arv-verifier-payload-json',
    ) as ARVPortableVerifierPayload | null;

    const bundleManifest = extractJsonFromPre(
      artifact.html,
      'arv-bundle-manifest-json',
    ) as ARVEvidenceBundleManifest | null;

    if (!verifierPayload || !bundleManifest) return false;

    const [verifierOk, bundleOk] = await Promise.all([
      verifyPortableVerifierPayload(verifierPayload),
      verifyEvidenceBundleManifest(bundleManifest),
    ]);

    if (!verifierOk || !bundleOk) return false;

    if (verifierPayload.evidence_id !== bundleManifest.evidence_id) return false;
    if (verifierPayload.manifest_hash !== bundleManifest.manifest_hash) return false;

    if (artifact.metadata.evidence_id !== verifierPayload.evidence_id) return false;
    if (artifact.metadata.evidence_id !== bundleManifest.evidence_id) return false;
    if (artifact.metadata.file_name !== bundleManifest.source.file_name) return false;

    if (artifact.metadata.verifier_payload_hash !== verifierPayload.payload_hash) return false;
    if (artifact.metadata.manifest_hash !== bundleManifest.manifest_hash) return false;

    return true;
  } catch {
    return false;
  }
}