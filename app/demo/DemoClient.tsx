'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { verifyMerkleProof, type VerificationResult } from '../../lib/rva/verifier';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProofStep = {
  sibling: string;
  direction: 'left' | 'right';
};

type Attestation = {
  document_hash: string;
  merkle_proof: ProofStep[] | string[];
  expected_root: string;
};

type OfflineRecord = {
  validation_id: string;
  status: string;
  authority: string;
  system: string;
  canon: string;
  epoch_id: string;
  ledger_position: number | null;
  issued_by: string;
  institution: string;
  issued_for: string;
  document_type: string;
  source_file: { path: string; filename: string };
  certificate_artifact: { path: string | null; filename: string | null };
  document_hash: string;
  merkle_root: string;
  signature: {
    algorithm: string;
    value: string | null;
    public_key_fingerprint: string | null;
  };
  dual_seal: {
    mode: string;
    primary_seal_hash: string | null;
    secondary_seal_hash: string | null;
  };
  qr: { image_path: string | null; payload: string };
  verification_url: string;
  timestamp_utc: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_VALIDATION_ID =
  process.env.NEXT_PUBLIC_ACTIVE_VALIDATION_ID ?? 'ARV-2026-000006';

const OFFLINE_RECORD: OfflineRecord = {
  validation_id: ACTIVE_VALIDATION_ID,
  status: 'VALID',
  authority: 'Reality Validation Authority',
  system: 'A System by Intelligence Olsen',
  canon: 'ARV Canon v1.0',
  epoch_id: 'ARV-EPOCH-20260408',
  ledger_position: 6,
  issued_by: 'Universidad Autónoma de Santo Domingo',
  institution: 'Universidad Autónoma de Santo Domingo (UASD)',
  issued_for: 'Juan Carlos Perez Rodriguez',
  document_type: 'Academic Diploma',
  source_file: {
    path: `/vault/sources/UASD-diploma-source.pdf`,
    filename: 'UASD-diploma-source.pdf',
  },
  certificate_artifact: {
    path: `/vault/certificates/${ACTIVE_VALIDATION_ID}.certificate.html`,
    filename: `${ACTIVE_VALIDATION_ID}.certificate.html`,
  },
  document_hash:
    '25d8128218671a0d63062198311352469f866aae59494fc29ea834c67e783325',
  merkle_root:
    '0e9e4471eb3305590e17afe2d87d1bfb2fe6631abf6f81a88cd8e3cc375a1242',
  signature: {
    algorithm: 'Ed25519',
    value:
      'Ctvy4RX0PV2GFFgj6irFnoxjkzT27Cq7QsW5ghgAWh6SQ3qJC2da/taQBHTrD++84cWJLVK3H3+6wzZogqPwAw==',
    public_key_fingerprint: '122e08b7a7b4039cd79ea09e',
  },
  dual_seal: {
    mode: 'ARV-DUAL-SEAL-v1',
    primary_seal_hash:
      'ef7c7d79cd793e93c9654abba678a1995f880ee0bdae2ad270f7f718dd05eb33',
    secondary_seal_hash:
      '92b71d3efa49d1ca6a986698ea662743aaa78f2353195f67284accc46baf5279',
  },
  qr: {
    image_path: null,
    payload: JSON.stringify({
      id: ACTIVE_VALIDATION_ID,
      verify: `https://www.arvseal.com/verify?id=${ACTIVE_VALIDATION_ID}`,
      sig: 'Ctvy4RX0PV2GFFgj6irFnoxjkzT27Cq7QsW5ghgAWh6SQ3qJC2da/taQBHTrD++84cWJLVK3H3+6wzZogqPwAw==',
    }),
  },
  verification_url: `https://www.arvseal.com/verify?id=${ACTIVE_VALIDATION_ID}`,
  timestamp_utc: '2026-04-08T23:07:23.048Z',
};

const EMBEDDED_ANCHOR: Attestation = {
  document_hash: OFFLINE_RECORD.document_hash,
  merkle_proof: [],
  expected_root: OFFLINE_RECORD.merkle_root,
};

const VALID_EVIDENCE: Attestation = {
  document_hash: OFFLINE_RECORD.document_hash,
  merkle_proof: [],
  expected_root: OFFLINE_RECORD.merkle_root,
};

const TAMPERED_EVIDENCE: Attestation = {
  document_hash:
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  merkle_proof: [],
  expected_root: OFFLINE_RECORD.merkle_root,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function buildOfflineLedgerJsonl(record: OfflineRecord): string {
  return JSON.stringify({
    validation_id: record.validation_id,
    ledger_position: record.ledger_position,
    epoch_id: record.epoch_id,
    status: record.status,
    authority: record.authority,
    document_hash: record.document_hash,
    merkle_root: record.merkle_root,
    dual_seal: record.dual_seal,
    signature: record.signature,
    verification_url: record.verification_url,
    timestamp_utc: record.timestamp_utc,
  });
}

function buildEvidencePackage(record: OfflineRecord): string {
  return safeJson({
    record,
    anchor: EMBEDDED_ANCHOR,
    exported_at_utc: new Date().toISOString(),
    package_type: 'ARV Evidence Package',
    package_version: '1.0',
  });
}

function buildCertificateHtml(record: OfflineRecord): string {
  const qrPayload = escapeHtml(record.qr.payload);
  const verificationUrl = escapeHtml(record.verification_url);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(record.validation_id)} — ARV Certificate</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    :root{
      --bg:#0f172a;
      --panel:#ffffff;
      --ink:#0f172a;
      --muted:#64748b;
      --line:#e5e7eb;
      --gold:#fbbf24;
      --ok:#16a34a;
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      background:linear-gradient(180deg,#0b1224 0%,#15306b 100%);
      color:#fff;
      font-family:Arial,Helvetica,sans-serif;
      padding:32px;
    }
    .shell{max-width:1200px;margin:0 auto}
    .brand{margin-bottom:24px}
    .brand h1{margin:0;font-size:56px;color:var(--gold);letter-spacing:-0.04em}
    .brand .sub{margin-top:8px;font-size:18px;color:#e2e8f0}
    .brand .mini{margin-top:4px;font-size:14px;color:#94a3b8}
    .topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}
    .status{text-align:right;color:#dcfce7;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase}
    .paper{background:var(--panel);color:var(--ink);border-radius:24px;padding:40px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
    .paper h2{text-align:center;margin:0 0 8px;font-size:18px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:600}
    .paper h3{text-align:center;margin:0 0 12px;font-size:52px;letter-spacing:-0.03em}
    .paper p.lead{margin:0 auto 28px;max-width:880px;text-align:center;color:var(--muted);font-size:16px}
    .grid{display:grid;grid-template-columns:1.1fr 1.1fr .9fr;gap:24px}
    .section{border:1px solid var(--line);border-radius:18px;padding:20px;min-height:100%}
    .label{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;font-weight:700}
    .value{font-size:15px;line-height:1.55;word-break:break-word;margin-bottom:18px}
    .mono{font-family:Consolas,Menlo,monospace;font-size:13px;background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:12px;word-break:break-all}
    .qrbox{border:1px solid var(--line);border-radius:18px;padding:18px;text-align:center;background:#fff}
    .fake-qr{width:280px;height:280px;margin:0 auto 14px;display:grid;place-items:center;font-size:12px;color:#111827;border:1px solid #d1d5db;background:linear-gradient(90deg,#fff 0,#fff 8px,#111 8px,#111 16px,#fff 16px,#fff 24px),linear-gradient(#fff 0,#fff 8px,#111 8px,#111 16px,#fff 16px,#fff 24px);background-size:24px 24px}
    .footer{margin-top:24px;display:flex;justify-content:space-between;gap:16px;color:var(--muted);font-size:13px;flex-wrap:wrap}
    @media print{body{background:#fff;color:#000;padding:0}.shell{max-width:none}.paper{box-shadow:none;border-radius:0}}
    @media (max-width:960px){.grid{grid-template-columns:1fr}.paper h3{font-size:34px}.brand h1{font-size:42px}.fake-qr{width:220px;height:220px}}
  </style>
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <div class="brand">
        <h1>ARV</h1>
        <div class="sub">Reality Validation Authority</div>
        <div class="mini">A System by Intelligence Olsen</div>
      </div>
      <div class="status">
        <div>Status</div>
        <div style="font-size:38px;letter-spacing:-0.04em;color:${record.status === 'VALID' ? '#16a34a' : '#dc2626'};">${escapeHtml(record.status)}</div>
      </div>
    </div>

    <div class="paper">
      <h2>Integrity Certificate</h2>
      <h3>Independent Cryptographic Validation Record</h3>
      <p class="lead">
        This certificate confirms that the validation record identified below exists, has been registered, and is publicly verifiable through ARV.
      </p>

      <div class="grid">
        <div class="section">
          <div class="label">Validation ID</div>
          <div class="value"><strong>${escapeHtml(record.validation_id)}</strong></div>
          <div class="label">Authority</div>
          <div class="value">${escapeHtml(record.authority)}</div>
          <div class="label">System</div>
          <div class="value">${escapeHtml(record.system)}</div>
          <div class="label">Canon</div>
          <div class="value">${escapeHtml(record.canon)}</div>
          <div class="label">Epoch ID</div>
          <div class="value">${escapeHtml(record.epoch_id)}</div>
          <div class="label">Ledger Position</div>
          <div class="value">${String(record.ledger_position ?? 'N/A')}</div>
          <div class="label">Issued By</div>
          <div class="value">${escapeHtml(record.issued_by)}</div>
          <div class="label">Institution</div>
          <div class="value">${escapeHtml(record.institution)}</div>
          <div class="label">Issued For</div>
          <div class="value">${escapeHtml(record.issued_for)}</div>
          <div class="label">Document Type</div>
          <div class="value">${escapeHtml(record.document_type)}</div>
          <div class="label">Source File</div>
          <div class="value">${escapeHtml(record.source_file.filename)}</div>
        </div>

        <div class="section">
          <div class="label">Document Hash</div>
          <div class="mono">${escapeHtml(record.document_hash)}</div>
          <div class="label" style="margin-top:18px;">Merkle Root</div>
          <div class="mono">${escapeHtml(record.merkle_root)}</div>
          <div class="label" style="margin-top:18px;">Dual Seal</div>
          <div class="value">${escapeHtml(record.dual_seal.mode)}</div>
          <div class="label">Primary Seal Hash</div>
          <div class="mono">${escapeHtml(record.dual_seal.primary_seal_hash ?? 'N/A')}</div>
          <div class="label" style="margin-top:18px;">Secondary Seal Hash</div>
          <div class="mono">${escapeHtml(record.dual_seal.secondary_seal_hash ?? 'N/A')}</div>
          <div class="label" style="margin-top:18px;">Signature Algorithm</div>
          <div class="value">${escapeHtml(record.signature.algorithm)}</div>
          <div class="label">Public Key Fingerprint</div>
          <div class="mono">${escapeHtml(record.signature.public_key_fingerprint ?? 'N/A')}</div>
          <div class="label" style="margin-top:18px;">Signature</div>
          <div class="mono">${escapeHtml(record.signature.value ?? 'N/A')}</div>
          <div class="label" style="margin-top:18px;">Timestamp UTC</div>
          <div class="value">${escapeHtml(record.timestamp_utc)}</div>
          <div class="label">Verification URL</div>
          <div class="mono">${verificationUrl}</div>
        </div>

        <div class="section">
          <div class="label">Signed QR</div>
          <div class="qrbox">
            <div class="fake-qr">QR PAYLOAD</div>
            <div class="label" style="text-align:left;">Signed QR Payload</div>
            <div class="mono" style="text-align:left;">${qrPayload}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div>Certificate Artifact: ${escapeHtml(record.certificate_artifact.filename ?? 'N/A')}</div>
        <div>Generated locally for offline air-gap validation mode</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function downloadBlob(content: BlobPart, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

function openBlobInNewTab(content: BlobPart, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  window.open(href, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DemoClient(): JSX.Element {
  const [airgap, setAirgap] = useState<boolean>(false);
  const [netCount, setNetCount] = useState<number>(0);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const airgapRef = useRef<boolean>(false);
  const originalsRef = useRef<{
    fetch?: typeof window.fetch;
    xhr?: typeof window.XMLHttpRequest;
    beacon?: typeof navigator.sendBeacon;
    installed: boolean;
  }>({ installed: false });

  const localCertificateHtml = useMemo(() => buildCertificateHtml(OFFLINE_RECORD), []);
  const localEvidencePackage = useMemo(() => buildEvidencePackage(OFFLINE_RECORD), []);
  const localLedgerJsonl = useMemo(() => buildOfflineLedgerJsonl(OFFLINE_RECORD), []);

  useEffect(() => {
    airgapRef.current = airgap;
  }, [airgap]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (originalsRef.current.installed) return;

    const originalFetch = window.fetch.bind(window);
    const OriginalXHR = window.XMLHttpRequest;
    const originalBeacon = navigator.sendBeacon?.bind(navigator);

    const intercept = (): void => {
      if (airgapRef.current) {
        setBlockedCount((prev) => prev + 1);
        throw new Error('SECURITY_EXCEPTION: NETWORK_ACCESS_DENIED_BY_AIRGAP_POLICY');
      }
      setNetCount((prev) => prev + 1);
    };

    window.fetch = async function patchedFetch(
      this: unknown,
      ...args: Parameters<typeof fetch>
    ): Promise<Response> {
      intercept();
      return originalFetch.apply(this, args);
    };

    class PatchedXHR extends OriginalXHR {
      override open(...args: Parameters<XMLHttpRequest['open']>): void {
        intercept();
        super.open(...args);
      }

      override send(...args: Parameters<XMLHttpRequest['send']>): void {
        intercept();
        super.send(...args);
      }
    }

    window.XMLHttpRequest = PatchedXHR as unknown as typeof XMLHttpRequest;

    if (originalBeacon) {
      navigator.sendBeacon = (
        ...args: Parameters<typeof navigator.sendBeacon>
      ): boolean => {
        intercept();
        return originalBeacon(...args);
      };
    }

    originalsRef.current = {
      fetch: originalFetch,
      xhr: OriginalXHR,
      beacon: originalBeacon,
      installed: true,
    };

    return () => {
      if (!originalsRef.current.installed) return;
      if (originalsRef.current.fetch) window.fetch = originalsRef.current.fetch;
      if (originalsRef.current.xhr) {
        window.XMLHttpRequest = originalsRef.current.xhr as typeof XMLHttpRequest;
      }
      if (originalsRef.current.beacon) {
        navigator.sendBeacon = originalsRef.current.beacon;
      }
      originalsRef.current.installed = false;
    };
  }, []);

  const handleToggleAirgap = (): void => {
    setAirgap((prev) => !prev);
    setNetCount(0);
    setBlockedCount(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setJsonInput(e.target.value);
    setResult(null);
    setErrorMsg(null);
  };

  const loadAnchor = async (): Promise<void> => {
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      if (airgap) {
        setJsonInput(safeJson(EMBEDDED_ANCHOR));
        return;
      }

      const res = await fetch('/anchor.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: unknown = await res.json();
      setJsonInput(safeJson(data));
    } catch (e: unknown) {
      setErrorMsg(`Could not load anchor.json: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const loadValidEvidence = (): void => {
    setErrorMsg(null);
    setResult(null);
    setJsonInput(safeJson(VALID_EVIDENCE));
  };

  const loadTamperedEvidence = (): void => {
    setErrorMsg(null);
    setResult(null);
    setJsonInput(safeJson(TAMPERED_EVIDENCE));
  };

  const handleVerify = async (): Promise<void> => {
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      if (!jsonInput.trim()) {
        throw new Error('Invalid Input: Please paste a valid JSON Attestation object.');
      }

      let data: Attestation;
      try {
        data = JSON.parse(jsonInput) as Attestation;
      } catch {
        throw new Error('Invalid Input: Please paste a valid JSON Attestation object.');
      }

      if (
        typeof data.document_hash !== 'string' ||
        typeof data.expected_root !== 'string' ||
        !Array.isArray(data.merkle_proof)
      ) {
        throw new Error('Malformed Attestation object.');
      }

      const hex64 = /^[a-f0-9]{64}$/i;

      if (!hex64.test(data.document_hash)) {
        throw new Error('Malformed document_hash.');
      }

      if (!hex64.test(data.expected_root)) {
        throw new Error('Malformed expected_root.');
      }

      const normalizedProof: ProofStep[] =
        data.merkle_proof.length === 0
          ? []
          : data.merkle_proof.map((item: unknown) => {
              if (
                typeof item === 'object' &&
                item !== null &&
                typeof (item as ProofStep).sibling === 'string' &&
                ((item as ProofStep).direction === 'left' ||
                  (item as ProofStep).direction === 'right')
              ) {
                const step = item as ProofStep;
                if (!hex64.test(step.sibling)) {
                  throw new Error('Malformed merkle_proof sibling hash.');
                }
                return {
                  sibling: step.sibling.toLowerCase(),
                  direction: step.direction,
                };
              }
              throw new Error('Unsupported merkle_proof format.');
            });

      const verification = await verifyMerkleProof(
        data.document_hash.toLowerCase(),
        normalizedProof,
        data.expected_root.toLowerCase()
      );

      setResult(verification);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown Integrity Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCertificate = (): void => {
    setErrorMsg(null);
    try {
      if (airgap) {
        openBlobInNewTab(localCertificateHtml, 'text/html;charset=utf-8');
        return;
      }
      window.open(
        `/certificate?id=${encodeURIComponent(ACTIVE_VALIDATION_ID)}`,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (e: unknown) {
      setErrorMsg(`Could not open certificate: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    setErrorMsg(null);
    setExporting(true);

    try {
      if (airgap) {
        downloadBlob(
          localEvidencePackage,
          'application/json;charset=utf-8',
          `${ACTIVE_VALIDATION_ID}.json`
        );
        return;
      }

      const url = `/vault/records/${ACTIVE_VALIDATION_ID}.json`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${ACTIVE_VALIDATION_ID}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e: unknown) {
      setErrorMsg(`Could not export evidence package: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const handleLedger = (): void => {
    setErrorMsg(null);
    try {
      if (airgap) {
        openBlobInNewTab(localLedgerJsonl, 'application/x-ndjson;charset=utf-8');
        return;
      }
      window.open('/vault/public-ledger/public-ledger.jsonl', '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      setErrorMsg(`Could not open public ledger: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono p-8 max-w-4xl mx-auto">
      <header className="flex justify-between items-center border-b border-gray-800 pb-4 mb-8">
        <div>
          <h1 className="text-2xl text-white font-bold tracking-tight">ARV</h1>
          <p className="text-xs text-gray-500 tracking-[0.25em] uppercase">
            Reality Validation Authority
          </p>
          <p className="mt-1 text-[10px] text-gray-400 tracking-[0.35em] uppercase">
            A System by Intelligence Olsen
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <div className={netCount === 0 ? 'text-green-400' : 'text-red-400'}>
              NET REQ: {netCount}
            </div>
            <div className="text-amber-400">BLOCKED: {blockedCount}</div>
            <div>
              STATUS:{' '}
              {airgap ? 'SECURE (OFFLINE / AIR-GAPPED)' : 'CONNECTED VERIFICATION MODE'}
            </div>
          </div>

          <button
            onClick={handleToggleAirgap}
            aria-label={airgap ? 'Disable AirGap mode' : 'Enable AirGap mode'}
            className={`px-4 py-2 font-bold uppercase text-sm transition-colors ${
              airgap ? 'bg-green-500 text-black' : 'bg-gray-700 text-white'
            }`}
          >
            {airgap ? 'AIR-GAP ENABLED' : 'ENABLE AIR-GAP'}
          </button>
        </div>
      </header>

      {errorMsg && (
        <div
          style={{ background: 'rgba(127,29,29,0.3)', borderColor: '#991b1b' }}
          className="border text-red-400 p-4 mb-4 text-sm font-bold"
          role="alert"
        >
          ⚠ {errorMsg}
        </div>
      )}

      <div className="mb-8">
        <label className="block text-xs text-gray-500 mb-2">EVIDENCE PAYLOAD (JSON)</label>

        <button
          onClick={loadAnchor}
          disabled={loading}
          className="w-full mb-2 bg-gray-700 text-white font-bold py-2 disabled:opacity-50 hover:bg-gray-600 transition-colors"
        >
          {airgap ? 'Load Embedded Anchor' : 'Load Anchor'}
        </button>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={loadValidEvidence}
            aria-label="Load a valid evidence sample"
            className="bg-green-700 text-white font-bold py-2 hover:bg-green-600 transition-colors"
          >
            Load VALID Evidence
          </button>

          <button
            onClick={loadTamperedEvidence}
            aria-label="Load a tampered evidence sample (hash mismatch)"
            className="bg-red-700 text-white font-bold py-2 hover:bg-red-600 transition-colors"
          >
            Load TAMPERED Evidence
          </button>
        </div>

        <textarea
          value={jsonInput}
          onChange={handleInputChange}
          placeholder='{"document_hash":"...","merkle_proof":[],"expected_root":"..."}'
          aria-label="Evidence payload JSON input"
          className="w-full h-40 bg-gray-900 border border-gray-800 p-4 text-xs text-white focus:outline-none"
        />
      </div>

      <button
        onClick={handleVerify}
        disabled={loading || !jsonInput.trim()}
        className="w-full mt-4 bg-white text-black font-bold py-3 hover:bg-gray-200 disabled:opacity-50 transition-colors uppercase tracking-wide"
      >
        {loading ? 'Verifying Mathematical Proof...' : 'Execute Integrity Check'}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
        <button
          onClick={handleCertificate}
          className="border border-amber-600 text-amber-400 py-2 px-3 text-xs font-bold uppercase hover:bg-amber-600/10 transition-colors"
        >
          {airgap ? 'Open Certificate (Offline)' : 'Open Certificate'}
        </button>

        <button
          disabled
          title="PDF certificate not available in offline mode"
          aria-disabled="true"
          className="border border-purple-800 text-purple-700 py-2 px-3 text-xs font-bold uppercase cursor-not-allowed opacity-50"
        >
          Open PDF Certificate (Unavailable)
        </button>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="border border-blue-600 text-blue-400 py-2 px-3 text-xs font-bold uppercase hover:bg-blue-600/10 disabled:opacity-50 transition-colors"
        >
          {exporting ? 'Exporting...' : airgap ? 'Export Evidence Package (Offline)' : 'Export Evidence Package'}
        </button>

        <button
          onClick={handleLedger}
          className="border border-emerald-600 text-emerald-400 py-2 px-3 text-xs font-bold uppercase hover:bg-emerald-600/10 transition-colors"
        >
          {airgap ? 'Open Public Ledger (Offline)' : 'Open Public Ledger'}
        </button>
      </div>

      {result && (
        <div
          style={{ borderColor: result.isValid ? '#22c55e' : '#ef4444' }}
          className="p-6 border-2 bg-gray-900/50 mt-6"
          role="status"
          aria-live="polite"
        >
          <h2
            style={{ color: result.isValid ? '#22c55e' : '#ef4444' }}
            className="text-xl font-bold mb-4"
          >
            {result.isValid
              ? 'INTEGRITY VERIFIED (MATHEMATICALLY SOUND)'
              : 'VERIFICATION FAILED (EVIDENCE TAMPERED)'}
          </h2>

          <div className="space-y-3 text-xs text-gray-400 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-950 p-3 border border-gray-800">
                <strong className="text-gray-500 block mb-1">EXPECTED ROOT (ANCHOR)</strong>
                <span className="text-green-500 break-all">{result.expectedRoot}</span>
              </div>

              <div className="bg-gray-950 p-3 border border-gray-800">
                <strong className="text-gray-500 block mb-1">COMPUTED ROOT (EVIDENCE)</strong>
                <span className={`break-all ${result.isValid ? 'text-gray-300' : 'text-red-500'}`}>
                  {result.computedRoot}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}