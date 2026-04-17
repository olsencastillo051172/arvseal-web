'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type CryptoRecord = {
  session_id: string;
  status: string;
  authority: string;
  system: string;
  canon: string;
  document_hash: string;
  merkle_root: string;
  signature_algorithm: string;
  signature_note: string;
  dual_seal_mode: string;
  verification_url: string;
  timestamp_utc: string;
  file_name: string;
  file_size_bytes: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_AUTHORITY = 'Reality Validation Authority';
const SYSTEM_NAME = 'A System by Intelligence Olsen';
const SYSTEM_CANON = 'ARV Canon v1.0';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSessionId(): string {
  const ts = Date.now().toString(16).toUpperCase();
  return `ARV-DEMO-${ts}`;
}

async function sha256Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function buildDemoAttestation(documentHash: string): Promise<{
  attestation: Attestation;
  merkleRoot: string;
}> {
  // Deterministic synthetic sibling — SHA-256 of the document hash string.
  // Root = SHA-256(documentHash + sibling), mirroring verifier pair-hash logic.
  // This ensures expected_root ≠ document_hash (non-trivial proof).
  const sibling = await sha256Hex(documentHash);
  const merkleRoot = await sha256Hex(documentHash + sibling);
  return {
    attestation: {
      document_hash: documentHash,
      merkle_proof: [{ sibling, direction: 'right' as const }],
      expected_root: merkleRoot,
    },
    merkleRoot,
  };
}

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

// ─── Certificate Builder (crypto-only, no identity fields) ────────────────────

function buildCertificateHtml(record: CryptoRecord): string {
  const verificationUrl = escapeHtml(record.verification_url);
  const qrPayload = escapeHtml(
    JSON.stringify({
      id: record.session_id,
      hash: record.document_hash,
      root: record.merkle_root,
      verify: record.verification_url,
    })
  );

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(record.session_id)} — ARV Cryptographic Integrity Certificate</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    :root{--panel:#ffffff;--ink:#0f172a;--muted:#64748b;--line:#e5e7eb;--gold:#fbbf24}
    *{box-sizing:border-box}
    body{margin:0;background:linear-gradient(180deg,#0b1224 0%,#15306b 100%);color:#fff;font-family:Arial,Helvetica,sans-serif;padding:32px}
    .shell{max-width:960px;margin:0 auto}
    .brand h1{margin:0;font-size:48px;color:var(--gold);letter-spacing:-0.04em}
    .brand .sub{margin-top:6px;font-size:16px;color:#e2e8f0}
    .brand .mini{margin-top:4px;font-size:13px;color:#94a3b8}
    .topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}
    .status-block{text-align:right}
    .status-label{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8}
    .status-value{font-size:36px;font-weight:700;color:#16a34a;letter-spacing:-0.03em}
    .paper{background:var(--panel);color:var(--ink);border-radius:20px;padding:36px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
    .paper-title{text-align:center;margin:0 0 6px;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:600}
    .paper-subtitle{text-align:center;margin:0 0 8px;font-size:28px;letter-spacing:-0.02em;color:var(--ink)}
    .paper-note{text-align:center;max-width:680px;margin:0 auto 24px;font-size:14px;color:var(--muted);line-height:1.5}
    .notice{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 18px;margin-bottom:24px;font-size:13px;color:#15803d;line-height:1.5}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .section{border:1px solid var(--line);border-radius:14px;padding:18px}
    .section-title{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--line)}
    .field{margin-bottom:14px}
    .field-label{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:4px}
    .field-value{font-size:14px;line-height:1.5;color:var(--ink);word-break:break-word}
    .mono{font-family:Consolas,Menlo,monospace;font-size:12px;background:#f8fafc;border:1px solid var(--line);border-radius:8px;padding:10px;word-break:break-all;color:#0f172a}
    .footer{margin-top:20px;display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:16px}
    @media print{body{background:#fff;padding:0}.paper{box-shadow:none;border-radius:0}}
    @media(max-width:700px){.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
<div class="shell">
  <div class="topbar">
    <div class="brand">
      <h1>ARV</h1>
      <div class="sub">${escapeHtml(SYSTEM_AUTHORITY)}</div>
      <div class="mini">${escapeHtml(SYSTEM_NAME)}</div>
    </div>
    <div class="status-block">
      <div class="status-label">Integrity Status</div>
      <div class="status-value">${escapeHtml(record.status)}</div>
    </div>
  </div>

  <div class="paper">
    <div class="paper-title">Cryptographic Integrity Certificate</div>
    <div class="paper-subtitle">Independent Validation Record</div>
    <p class="paper-note">
      This certificate attests to the cryptographic integrity of the registered document hash.
      ARV certifies existence, integrity, and verifiability — not the identity or context of the document.
    </p>

    <div class="notice">
      ✓ Cryptographic integrity verified. This certificate contains only mathematically verifiable data.
      No identity, authorship, or contextual claims are made or implied by ARV.
    </div>

    <div class="grid">
      <div class="section">
        <div class="section-title">Session &amp; Authority</div>
        <div class="field">
          <div class="field-label">Session ID</div>
          <div class="field-value"><strong>${escapeHtml(record.session_id)}</strong></div>
        </div>
        <div class="field">
          <div class="field-label">Authority</div>
          <div class="field-value">${escapeHtml(record.authority)}</div>
        </div>
        <div class="field">
          <div class="field-label">System</div>
          <div class="field-value">${escapeHtml(record.system)}</div>
        </div>
        <div class="field">
          <div class="field-label">Canon</div>
          <div class="field-value">${escapeHtml(record.canon)}</div>
        </div>
        <div class="field">
          <div class="field-label">Timestamp UTC</div>
          <div class="field-value">${escapeHtml(record.timestamp_utc)}</div>
        </div>
        <div class="field">
          <div class="field-label">Signature Algorithm</div>
          <div class="field-value">${escapeHtml(record.signature_algorithm)}</div>
        </div>
        <div class="field">
          <div class="field-label">Signature Status</div>
          <div class="field-value">${escapeHtml(record.signature_note)}</div>
        </div>
        <div class="field">
          <div class="field-label">Dual Seal Mode</div>
          <div class="field-value">${escapeHtml(record.dual_seal_mode)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Cryptographic Proof</div>
        <div class="field">
          <div class="field-label">Document Hash (SHA-256)</div>
          <div class="mono">${escapeHtml(record.document_hash)}</div>
        </div>
        <div class="field" style="margin-top:14px;">
          <div class="field-label">Merkle Root</div>
          <div class="mono">${escapeHtml(record.merkle_root)}</div>
        </div>
        <div class="field" style="margin-top:14px;">
          <div class="field-label">Verification URL</div>
          <div class="mono">${verificationUrl}</div>
        </div>
        <div class="field" style="margin-top:14px;">
          <div class="field-label">QR Verification Payload</div>
          <div class="mono">${qrPayload}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>Session: ${escapeHtml(record.session_id)} · File: ${escapeHtml(record.file_name)} · ${record.file_size_bytes.toLocaleString()} bytes</div>
      <div>Generated offline — ARV AirGap Mode · ${escapeHtml(SYSTEM_CANON)}</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

function buildEvidencePackage(record: CryptoRecord, anchor: Attestation): string {
  return safeJson({
    record,
    anchor,
    exported_at_utc: new Date().toISOString(),
    package_type: 'ARV Evidence Package',
    package_version: '2.0',
  });
}

function buildLedgerJsonl(record: CryptoRecord): string {
  return JSON.stringify({
    session_id: record.session_id,
    status: record.status,
    authority: record.authority,
    document_hash: record.document_hash,
    merkle_root: record.merkle_root,
    verification_url: record.verification_url,
    timestamp_utc: record.timestamp_utc,
  });
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
  const [hashing, setHashing] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTimestamp, setSessionTimestamp] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [sessionAttestation, setSessionAttestation] = useState<Attestation | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const airgapRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalsRef = useRef<{
    fetch?: typeof window.fetch;
    xhr?: typeof window.XMLHttpRequest;
    beacon?: typeof navigator.sendBeacon;
    installed: boolean;
  }>({ installed: false });

  const cryptoRecord: CryptoRecord | null = useMemo(() => {
    if (!fileHash || !merkleRoot || !sessionId || !sessionTimestamp || !fileName || fileSize === null) {
      return null;
    }
    return {
      session_id: sessionId,
      status: 'VALID',
      authority: SYSTEM_AUTHORITY,
      system: SYSTEM_NAME,
      canon: SYSTEM_CANON,
      document_hash: fileHash,
      merkle_root: merkleRoot,
      signature_algorithm: 'Ed25519',
      signature_note: 'DEMO — Server-signed in production registration',
      dual_seal_mode: 'ARV-DUAL-SEAL-v1 (DEMO)',
      verification_url: `https://www.arvseal.com/verify?id=${encodeURIComponent(sessionId)}`,
      timestamp_utc: sessionTimestamp,
      file_name: fileName,
      file_size_bytes: fileSize,
    };
  }, [fileHash, merkleRoot, sessionId, sessionTimestamp, fileName, fileSize]);

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
      override open(
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null
      ): void {
        intercept();
        super.open(method, url, async ?? true, username ?? null, password ?? null);
      }

      override send(body?: Document | XMLHttpRequestBodyInit | null): void {
        intercept();
        super.send(body ?? null);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.XMLHttpRequest = PatchedXHR as any;

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

  const processFile = useCallback(async (file: File): Promise<void> => {
    setHashing(true);
    setErrorMsg(null);
    setResult(null);
    setJsonInput('');

    try {
      const docHash = await hashFile(file);
      const { attestation, merkleRoot: root } = await buildDemoAttestation(docHash);
      const id = generateSessionId();
      const ts = new Date().toISOString();

      setFileHash(docHash);
      setMerkleRoot(root);
      setSessionAttestation(attestation);
      setFileName(file.name);
      setFileSize(file.size);
      setSessionId(id);
      setSessionTimestamp(ts);
      setJsonInput(safeJson(attestation));
    } catch (e: unknown) {
      setErrorMsg(`Could not hash file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setHashing(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (): void => setIsDragOver(false);

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

  const handleVerify = async (): Promise<void> => {
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      if (!jsonInput.trim()) {
        throw new Error('No evidence payload. Upload a file or paste a JSON Attestation object.');
      }

      let data: Attestation;
      try {
        data = JSON.parse(jsonInput) as Attestation;
      } catch {
        throw new Error('Invalid JSON. Please paste a valid Attestation object.');
      }

      if (
        typeof data.document_hash !== 'string' ||
        typeof data.expected_root !== 'string' ||
        !Array.isArray(data.merkle_proof)
      ) {
        throw new Error('Malformed Attestation object.');
      }

      const hex64 = /^[a-f0-9]{64}$/i;
      if (!hex64.test(data.document_hash)) throw new Error('Malformed document_hash.');
      if (!hex64.test(data.expected_root)) throw new Error('Malformed expected_root.');

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
                return { sibling: step.sibling.toLowerCase(), direction: step.direction };
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

  // Fix 2: Certificate always opens as local blob until backend persistence exists.
  const handleCertificate = (): void => {
    setErrorMsg(null);
    try {
      if (!cryptoRecord) {
        setErrorMsg('Upload a file first to generate a certificate.');
        return;
      }
      openBlobInNewTab(buildCertificateHtml(cryptoRecord), 'text/html;charset=utf-8');
    } catch (e: unknown) {
      setErrorMsg(`Could not open certificate: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleExport = async (): Promise<void> => {
    setErrorMsg(null);
    setExporting(true);

    try {
      if (!cryptoRecord || !sessionAttestation) {
        setErrorMsg('Upload a file first to export an evidence package.');
        return;
      }

      if (airgap) {
        downloadBlob(
          buildEvidencePackage(cryptoRecord, sessionAttestation),
          'application/json;charset=utf-8',
          `${cryptoRecord.session_id}.json`
        );
        return;
      }

      try {
        const res = await fetch(
          `/vault/records/${encodeURIComponent(cryptoRecord.session_id)}.json`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = `${cryptoRecord.session_id}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      } catch {
        downloadBlob(
          buildEvidencePackage(cryptoRecord, sessionAttestation),
          'application/json;charset=utf-8',
          `${cryptoRecord.session_id}.json`
        );
      }
    } catch (e: unknown) {
      setErrorMsg(
        `Could not export evidence package: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setExporting(false);
    }
  };

  const handleLedger = (): void => {
    setErrorMsg(null);
    try {
      if (airgap) {
        if (!cryptoRecord) {
          setErrorMsg('Upload a file first to generate an offline ledger entry.');
          return;
        }
        openBlobInNewTab(buildLedgerJsonl(cryptoRecord), 'application/x-ndjson;charset=utf-8');
        return;
      }
      window.open('/vault/public-ledger/public-ledger.jsonl', '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      setErrorMsg(
        `Could not open public ledger: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  };

  const hasSession = fileHash !== null;

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono p-8 max-w-4xl mx-auto">

      <header className="flex justify-between items-center border-b border-gray-800 pb-4 mb-8">
        <div>
          <h1 className="text-2xl text-white font-bold tracking-tight">ARV</h1>
          <p className="text-xs text-gray-500 tracking-[0.25em] uppercase">Reality Validation Authority</p>
          <p className="mt-1 text-[10px] text-gray-400 tracking-[0.35em] uppercase">A System by Intelligence Olsen</p>
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
          className="border text-red-400 p-4 mb-6 text-sm font-bold"
          role="alert"
        >
          ⚠ {errorMsg}
        </div>
      )}

      {/* Step 1 — File upload */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">
          Step 1 — Load Document
        </p>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload any file to compute its SHA-256 hash"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
          className={`border-2 border-dashed rounded cursor-pointer p-8 text-center transition-colors ${
            isDragOver
              ? 'border-white bg-gray-800'
              : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInput}
          />
          {hashing ? (
            <p className="text-amber-400 font-bold text-sm">Computing SHA-256...</p>
          ) : hasSession ? (
            <div className="text-left space-y-1">
              <p className="text-green-400 font-bold text-xs uppercase tracking-widest">✓ File loaded</p>
              <p className="text-white text-sm font-bold">{fileName}</p>
              <p className="text-gray-500 text-xs">{formatBytes(fileSize ?? 0)}</p>
              <p className="text-gray-600 text-[10px] mt-2 break-all">SHA-256: {fileHash}</p>
              <p className="text-gray-700 text-[10px] break-all">Merkle Root: {merkleRoot}</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 text-sm font-bold">
                Drop any file here, or click to browse
              </p>
              <p className="text-gray-600 text-xs mt-2">
                PDF · DOCX · Image · Binary · Any format
              </p>
              <p className="text-gray-700 text-xs mt-1">
                Hashed locally via SubtleCrypto — no upload, no network
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Step 2 — Evidence payload */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">
          Step 2 — Evidence Payload (JSON)
        </p>
        <textarea
          value={jsonInput}
          onChange={handleInputChange}
          placeholder='Upload a file above, or paste {"document_hash":"...","merkle_proof":[...],"expected_root":"..."}'
          aria-label="Evidence payload JSON input"
          className="w-full h-36 bg-gray-900 border border-gray-800 p-4 text-xs text-white focus:outline-none"
        />
      </div>

      {/* Step 3 — Execute */}
      <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Step 3 — Verify</p>
      <button
        onClick={handleVerify}
        disabled={loading || !jsonInput.trim()}
        className="w-full bg-white text-black font-bold py-3 hover:bg-gray-200 disabled:opacity-50 transition-colors uppercase tracking-wide"
      >
        {loading ? 'Verifying Mathematical Proof...' : 'Execute Integrity Check'}
      </button>

      {/* Action buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
        <button
          onClick={handleCertificate}
          className="border border-amber-600 text-amber-400 py-2 px-3 text-xs font-bold uppercase hover:bg-amber-600/10 transition-colors"
        >
          Open Certificate
        </button>

        <button
          disabled
          title="PDF certificate not available in this release"
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
          {exporting
            ? 'Exporting...'
            : airgap
            ? 'Export Evidence Package (Offline)'
            : 'Export Evidence Package'}
        </button>

        <button
          onClick={handleLedger}
          className="border border-emerald-600 text-emerald-400 py-2 px-3 text-xs font-bold uppercase hover:bg-emerald-600/10 transition-colors"
        >
          {airgap ? 'Open Public Ledger (Offline)' : 'Open Public Ledger'}
        </button>
      </div>

      {/* Verification result */}
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