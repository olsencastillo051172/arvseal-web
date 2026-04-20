import type {
  ARVRecord,
  AcademicCredentialRecord,
  GigEvidenceRecord,
  ComplianceAUFAMLRecord,
} from './schemas';

export type AnyARVRecord =
  | ARVRecord
  | AcademicCredentialRecord
  | GigEvidenceRecord
  | ComplianceAUFAMLRecord;

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
  record_type:
    | 'ARVRecord'
    | 'AcademicCredentialRecord'
    | 'GigEvidenceRecord'
    | 'ComplianceAUFAMLRecord';
  record_id: string;
  status: string;
  authority: string;
  canon: string;
  includes: string[];
}

export interface ARVEvidencePackage {
  manifest: ARVEvidenceManifest;
  record: AnyARVRecord;
  verification: ARVVerificationPayload;
  files: {
    certificate_html_filename: string;
    certificate_pdf_filename: string;
    verification_filename: string;
    manifest_filename: string;
    record_filename: string;
  };
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

function getRecordType(record: AnyARVRecord): ARVEvidenceManifest['record_type'] {
  if ('issuer_name' in record && 'institution_name' in record) {
    return 'AcademicCredentialRecord';
  }
  if ('worker_name' in record && 'client_name' in record) {
    return 'GigEvidenceRecord';
  }
  if ('regulated_entity_name' in record && 'compliance_framework' in record) {
    return 'ComplianceAUFAMLRecord';
  }
  return 'ARVRecord';
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
  const qr_payload = record.qr?.payload?.trim()
    ? record.qr.payload
    : buildQRCodePayload(record);

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
    record_type: getRecordType(record),
    record_id: record.id,
    status: record.status,
    authority: record.authority,
    canon: record.canon,
    includes: [
      'certificate.html',
      'certificate.pdf',
      'verification.json',
      'manifest.json',
      'record.json',
    ],
  };
}

export function buildEvidencePackage(record: AnyARVRecord): ARVEvidencePackage {
  return {
    manifest: buildEvidenceManifest(record),
    record,
    verification: buildVerificationPayload(record),
    files: {
      certificate_html_filename: `${record.id}.certificate.html`,
      certificate_pdf_filename: `${record.id}.certificate.pdf`,
      verification_filename: `${record.id}.verification.json`,
      manifest_filename: `${record.id}.manifest.json`,
      record_filename: `${record.id}.record.json`,
    },
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
  if ('issuer_name' in record && 'institution_name' in record) {
    return `
      <div class="section">
        <div class="section-title">Academic Metadata</div>
        <div class="field"><div class="label">Issuer</div><div class="value">${escapeHtml(record.issuer_name)}</div></div>
        <div class="field"><div class="label">Institution</div><div class="value">${escapeHtml(record.institution_name)}</div></div>
        <div class="field"><div class="label">Holder</div><div class="value">${escapeHtml(record.holder_name)}</div></div>
        <div class="field"><div class="label">Program</div><div class="value">${escapeHtml(record.program_name)}</div></div>
        <div class="field"><div class="label">Award Type</div><div class="value">${escapeHtml(record.award_type)}</div></div>
        <div class="field"><div class="label">Issue Date</div><div class="value">${escapeHtml(record.issue_date)}</div></div>
      </div>
    `;
  }

  if ('worker_name' in record && 'client_name' in record) {
    return `
      <div class="section">
        <div class="section-title">Gig Evidence Metadata</div>
        <div class="field"><div class="label">Worker</div><div class="value">${escapeHtml(record.worker_name)}</div></div>
        <div class="field"><div class="label">Client</div><div class="value">${escapeHtml(record.client_name)}</div></div>
        <div class="field"><div class="label">Project</div><div class="value">${escapeHtml(record.project_name)}</div></div>
        <div class="field"><div class="label">Deliverable Type</div><div class="value">${escapeHtml(record.deliverable_type)}</div></div>
        <div class="field"><div class="label">Delivery Date</div><div class="value">${escapeHtml(record.delivery_date)}</div></div>
        <div class="field"><div class="label">Dispute Status</div><div class="value">${escapeHtml(record.dispute_status ?? 'N/A')}</div></div>
      </div>
    `;
  }

  if ('regulated_entity_name' in record && 'compliance_framework' in record) {
    return `
      <div class="section">
        <div class="section-title">Compliance Metadata</div>
        <div class="field"><div class="label">Entity</div><div class="value">${escapeHtml(record.regulated_entity_name)}</div></div>
        <div class="field"><div class="label">Framework</div><div class="value">${escapeHtml(record.compliance_framework)}</div></div>
        <div class="field"><div class="label">Case Reference</div><div class="value">${escapeHtml(record.case_reference)}</div></div>
        <div class="field"><div class="label">Evidence Type</div><div class="value">${escapeHtml(record.evidence_type)}</div></div>
        <div class="field"><div class="label">Risk Level</div><div class="value">${escapeHtml(record.risk_level ?? 'N/A')}</div></div>
        <div class="field"><div class="label">Jurisdiction</div><div class="value">${escapeHtml(record.jurisdiction ?? 'N/A')}</div></div>
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

export function buildCertificateHtml(record: AnyARVRecord): string {
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
      <div class="note">
        This certificate confirms cryptographic integrity, temporal existence, and verification consistency.
        It does not independently certify legal truth, authorship, or semantic truth of the content.
      </div>

      <div class="grid">
        ${renderCommonIdentityBlock(record)}
        ${renderCommonCryptoBlock(record)}
        ${renderVerticalBlock(record)}
      </div>

      <div class="footer">
        <div>${escapeHtml(record.id)} · ${escapeHtml(record.canon)}</div>
        <div>ARV · A System by IO</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildCertificatePdfModel(record: AnyARVRecord): Record<string, unknown> {
  return {
    file_type: 'ARV Certificate PDF Model',
    version: '1.0',
    generated_at_utc: new Date().toISOString(),
    record_id: record.id,
    authority: record.authority,
    system: record.system,
    canon: record.canon,
    status: record.status,
    verification: buildVerificationPayload(record),
    record_type: getRecordType(record),
  };
}

export function buildPublicVerificationRecord(record: AnyARVRecord): string {
  return pretty(buildVerificationPayload(record));
}

export function buildRecordJson(record: AnyARVRecord): string {
  return pretty(record);
}

export function buildManifestJson(record: AnyARVRecord): string {
  return pretty(buildEvidenceManifest(record));
}

export function buildEvidencePackageJson(record: AnyARVRecord): string {
  return pretty(buildEvidencePackage(record));
}