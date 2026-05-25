// app/demo/DemoClient.tsx
'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { GigEvidenceRecord } from '@/lib/rva/schemas';
import {
  buildKernelEvidencePackageZipFromFile,
  buildKernelOfflineCertificateHtmlFromFile,
  buildQRImage,
  buildKernelPublicVerificationRecordFromFile,
  buildRecordJson,
  buildKernelCertificatePdfFromFile,
  buildCertificateHtmlWithQR,
} from '@/lib/rva/artifacts';
import { verifyEvidenceZipBytesWithEmbeddedPackageIndexResult } from '@/lib/rva/kernel/zip-package';
import { createQrTransferPayload } from '@/lib/rva/kernel/qr-transfer-payload';
import { sha256HexFromString } from '@/lib/rva/kernel/hash';

function generateLocalId(): string {
  const ts = Date.now().toString().slice(-8);
  return `ARV-LOCAL-${ts}`;
}

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function openHtmlInNewTab(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function openTextInNewTab(content: string, mimeType = 'application/json;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function buildLocalGigRecord(file: File, hash: string): Promise<GigEvidenceRecord> {
  const now = new Date().toISOString();
  const id = generateLocalId();

  const legacyVerifierBody = {
    id,
    status: 'LOCAL_UNREGISTERED',
    hash,
    root: hash,
    ts: now,
    verify: null,
    sigfp: 'LOCAL-DEMO',
  };

  const verifierPayloadHash = await sha256HexFromString(JSON.stringify(legacyVerifierBody));

  const manifestHash = await sha256HexFromString(JSON.stringify({
    format: 'ARV-DEMO-LOCAL-MANIFEST-v1',
    scope: 'LOCAL_L0',
    evidence_id: id,
    document_hash: hash,
    merkle_root: hash,
    source_file: {
      filename: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    },
    created_at_utc: now,
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
    document_hash: hash,
    created_at_utc: now,
    witness: 'ARV-LOCAL-DEMO',
  }));

  const qrTransfer = await createQrTransferPayload({
    evidence_id: id,
    verifier_payload_hash: verifierPayloadHash,
    manifest_hash: manifestHash,
    checkpoint_hash: checkpointHash,
    created_at_utc: now,
    policy: 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: 'ARV-LOCAL',
  });

  const qrPayload = qrTransfer.transfer_string;

  return {
    id,
    status: 'LOCAL_UNREGISTERED',
    authority: 'ARV Reality Validation Authority',
    system: 'A System by Intelligence Olsen (IO)',
    canon: 'ARV Core Pack v1',
    epoch_id: null,
    ledger_position: null,
    document_hash: hash,
    merkle_root: hash,
    timestamp_utc: now,
    issued_at_utc: now,
    signature: {
      algorithm: 'Ed25519',
      value: null,
      public_key_fingerprint: 'LOCAL-DEMO',
    },
    dual_seal: {
      mode: 'LOCAL-SINGLE-SEAL',
      primary_seal_hash: hash,
      secondary_seal_hash: null,
    },
    qr: {
      payload: qrPayload,
      image_path: null,
    },
    verification_url: null,
    source_file: {
      filename: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      source_mode: 'upload',
      captured_at_utc: now,
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
    deliverable_type: file.type || 'binary-file',
    delivery_date: now,
    engagement_reference: null,
    counterparty_reference: null,
    evidence_bundle_type: 'single-file',
    dispute_status: null,
  };
}
export default function DemoClient(): JSX.Element {
  const [record, setRecord] = useState<GigEvidenceRecord | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [hashing, setHashing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [zipVerifyStatus, setZipVerifyStatus] = useState<'idle' | 'checking' | 'pass' | 'fail'>('idle');
  const [zipVerifyMsg, setZipVerifyMsg] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipVerifyInputRef = useRef<HTMLInputElement>(null);
const recordJson = record ? buildRecordJson(record) : '';

  useEffect(() => {
    if (record?.qr?.payload) {
      buildQRImage(record.qr.payload)
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [record]);

  const processFile = useCallback(async (file: File) => {
    setHashing(true);
    setErrorMsg(null);
    try {
      const hash = await sha256Hex(file);
      const nextRecord = await buildLocalGigRecord(file, hash);
      setRecord(nextRecord);
      setSourceFile(file);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not process file.');
    } finally {
      setHashing(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = '';
  };

  const handleZipVerifyInput = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    setErrorMsg(null);
    setZipVerifyStatus('checking');
    setZipVerifyMsg(`Checking embedded package index in ${file.name}...`);

    try {
      const buffer = await file.arrayBuffer();
      const result = await verifyEvidenceZipBytesWithEmbeddedPackageIndexResult(new Uint8Array(buffer));

      if (result.ok) {
        setZipVerifyStatus('pass');
        setZipVerifyMsg(`${result.status} — ${file.name} verifies against its embedded package index. Evidence ID: ${result.evidence_id}. Files: ${result.file_count}.`);
      } else {
        setZipVerifyStatus('fail');
        setZipVerifyMsg(`${result.status} — ${file.name} does not verify against its embedded package index. Reason: ${result.reason}.`);
      }
    } catch (error) {
      setZipVerifyStatus('fail');
      setZipVerifyMsg(error instanceof Error ? error.message : 'FAIL — Evidence ZIP verification failed.');
    }
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

  const handleDragLeave = (): void => {
    setIsDragOver(false);
  };

  const handleOpenCertificate = async (): Promise<void> => {
    if (!record) {
      setErrorMsg('Load a file first.');
      return;
    }

    if (!sourceFile) {
      setErrorMsg('Original source file is not available. Load the file again before viewing certificate.');
      return;
    }

    setExporting(true);
    try {
      const html = await buildKernelOfflineCertificateHtmlFromFile(record, sourceFile);
      openHtmlInNewTab(html);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating kernel certificate HTML');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenVerification = async (): Promise<void> => {
    if (!record) {
      setErrorMsg('Load a file first.');
      return;
    }

    if (!sourceFile) {
      setErrorMsg('Original source file is not available. Load the file again before viewing verification payload.');
      return;
    }

    setExporting(true);
    try {
      const kernelVerificationJson = await buildKernelPublicVerificationRecordFromFile(record, sourceFile);
      openTextInNewTab(kernelVerificationJson);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating verification payload');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenRecord = (): void => {
    if (!record) {
      setErrorMsg('Load a file first.');
      return;
    }
    openTextInNewTab(recordJson);
  };

  const handleExportZip = async (): Promise<void> => {
    if (!record) {
      setErrorMsg('Load a file first.');
      return;
    }

    if (!sourceFile) {
      setErrorMsg('Original source file is not available. Load the file again before exporting ZIP.');
      return;
    }

    setExporting(true);
    try {
      const zipBytes = await buildKernelEvidencePackageZipFromFile(record, sourceFile);
      const zipBuffer = zipBytes.buffer.slice(
        zipBytes.byteOffset,
        zipBytes.byteOffset + zipBytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([zipBuffer], { type: 'application/zip' });
      downloadBlob(blob, `${record.id}.evidence-package.zip`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating ZIP');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async (): Promise<void> => {
    if (!record) {
      setErrorMsg('Load a file first.');
      return;
    }

    if (!sourceFile) {
      setErrorMsg('Original source file is not available. Load the file again before exporting PDF.');
      return;
    }

    setExporting(true);
    try {
      const pdfBytes = await buildKernelCertificatePdfFromFile(record, sourceFile);
      const pdfBuffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      downloadBlob(blob, `${record.id}.certificate.pdf`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating kernel PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono p-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-center border-b border-gray-800 pb-4 mb-8">
        <div>
          <h1 className="text-2xl text-white font-bold tracking-tight">ARV</h1>
          <p className="text-xs text-gray-500 tracking-[0.25em] uppercase">ARV Reality Validation Authority</p>
          <p className="mt-1 text-[10px] text-gray-400 tracking-[0.35em] uppercase">A System by Intelligence Olsen (IO)</p>
          <p className="mt-4 text-xs text-gray-300 tracking-[0.18em] uppercase">Create portable evidence for any file</p>
          <p className="mt-1 text-[10px] text-gray-500 tracking-[0.22em] uppercase">Offline-first · No upload · Browser-local · Self-contained evidence</p>
        </div>
        <div className="text-right text-xs">
          <div className="text-amber-400 font-bold">CLIENT-CONTROLLED PROOF</div>
          <div>Runs in your environment</div>
          <div>Append-only evidence manifest</div>
          <div>Authority registration available</div>
        </div>
      </header>

      {errorMsg && (
        <div className="border text-red-400 p-4 mb-6 text-sm font-bold" style={{ background: 'rgba(127,29,29,0.3)', borderColor: '#991b1b' }} role="alert">
          ⚠ {errorMsg}
        </div>
      )}

      
                              {/* Capability Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 text-xs">
        <div className="border border-green-700 p-3 rounded">
          <div className="text-green-400 font-bold mb-2">CLIENT-CONTROLLED ENGINE</div>
          <div>Runs in your environment</div>
          <div>No upload required</div>
          <div>Any-file evidence capture</div>
          <div>Tamper detection</div>
        </div>

        <div className="border border-amber-700 p-3 rounded">
          <div className="text-amber-400 font-bold mb-2">PORTABLE EVIDENCE KIT</div>
          <div>Self-contained evidence ZIP</div>
          <div>Offline HTML certificate</div>
          <div>Portable QR verifier</div>
          <div>Append-only manifest</div>
        </div>

        <div className="border border-blue-700 p-3 rounded">
          <div className="text-blue-400 font-bold mb-2">ARV REGISTERED LAYER</div>
          <div>Official ARV Validation ID</div>
          <div>Registered append-only ledger</div>
          <div>On-prem / enterprise deployment</div>
          <div>Dispute-ready verification</div>
        </div>
      </div>
<div className="mb-6">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Step 1 — Load Evidence File</p>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          className={`border-2 border-dashed rounded cursor-pointer p-8 text-center transition-colors ${
            isDragOver ? 'border-white bg-gray-800' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/50'
          }`}
        >
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} />
          {hashing ? (
            <p className="text-amber-400 font-bold text-sm">Computing SHA-256...</p>
          ) : record ? (
            <div className="text-left space-y-2">
              <p className="text-green-400 font-bold text-xs uppercase tracking-widest">✓ File Loaded</p>
              <p className="text-white text-sm font-bold">{record.source_file.filename}</p>
              <p className="text-gray-500 text-xs">{formatBytes(record.source_file.size_bytes)}</p>
              <p className="text-gray-600 text-[10px] break-all">HASH: {record.document_hash}</p>
              <p className="text-gray-700 text-[10px] break-all">ROOT: {record.merkle_root}</p>
              <p className="text-gray-700 text-[10px] break-all">ID: {record.id}</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-400 text-sm font-bold">Drop any file here, or click to browse</p>
              <p className="text-gray-600 text-xs mt-2">PDF · DOCX · PNG · JPG · ZIP · JSON · MP4 · Audio · Any binary</p>
              <p className="text-gray-700 text-xs mt-1">Local hash, local record, portable evidence</p>
            </div>
          )}
        </div>
      </div>

      {record && (
        <div className="bg-gray-900 border border-gray-800 p-6 mb-6">
          <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest">Local ARV Evidence Record</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3">
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Record ID</span><span className="text-white font-bold">{record.id}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Status</span><span className="text-amber-400">{record.status === 'LOCAL_UNREGISTERED' ? 'LOCAL HASH COMPUTED — NOT YET REGISTERED' : record.status}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Source File</span><span className="text-gray-300">{record.source_file.filename}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">MIME Type</span><span className="text-gray-300">{record.source_file.mime_type || 'Unknown'}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Size</span><span className="text-gray-300">{formatBytes(record.source_file.size_bytes)}</span></div>
            </div>
            <div className="space-y-3">
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Document Hash</span><span className="text-green-500 break-all font-mono text-[10px]">{record.document_hash}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Merkle Root</span><span className="text-green-500 break-all font-mono text-[10px]">{record.merkle_root}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Timestamp UTC</span><span className="text-gray-300">{record.timestamp_utc}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Source Mode</span><span className="text-gray-300">{record.source_file.source_mode}</span></div>
            </div>
          </div>
          {qrDataUrl && (
            <div className="mt-6 pt-4 border-t border-gray-700 flex flex-col items-center">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Portable QR Verifier</p>
              <img src={qrDataUrl} alt="QR Code for verification" className="w-32 h-32 border border-gray-600 rounded" />
              <p className="text-gray-600 text-[10px] mt-2 break-all text-center max-w-md">{record.qr.payload}</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Step 2 — Verify Evidence Package ZIP</p>
        <div className="border border-cyan-800 rounded p-4 bg-cyan-950/10">
          <input
            ref={zipVerifyInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => { void handleZipVerifyInput(e); }}
          />

          <button
            onClick={() => zipVerifyInputRef.current?.click()}
            disabled={zipVerifyStatus === 'checking'}
            className="border border-cyan-600 text-cyan-400 py-2 px-3 text-xs font-bold uppercase hover:bg-cyan-600/10 disabled:opacity-50 transition-colors"
          >
            {zipVerifyStatus === 'checking' ? 'Verifying ZIP...' : 'Verify Evidence Package ZIP'}
          </button>

          <p className="text-gray-600 text-xs mt-3">
            Browser-local verification using the embedded package-index.json file inside the evidence ZIP.
          </p>

          {zipVerifyMsg && (
            <p
              className={`mt-3 text-xs font-bold ${
                zipVerifyStatus === 'pass'
                  ? 'text-green-400'
                  : zipVerifyStatus === 'fail'
                    ? 'text-red-400'
                    : 'text-cyan-400'
              }`}
            >
              {zipVerifyMsg}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
        <button onClick={handleOpenCertificate} className="border border-amber-600 text-amber-400 py-2 px-3 text-xs font-bold uppercase hover:bg-amber-600/10 transition-colors">View Certificate</button>
        <button onClick={handleExportPdf} disabled={exporting || !record} className="border border-purple-600 text-purple-400 py-2 px-3 text-xs font-bold uppercase hover:bg-purple-600/10 disabled:opacity-50 transition-colors">{exporting ? 'Generating PDF...' : 'Download Certificate PDF'}</button>
        <button onClick={handleExportZip} disabled={exporting} className="border border-blue-600 text-blue-400 py-2 px-3 text-xs font-bold uppercase hover:bg-blue-600/10 disabled:opacity-50 transition-colors">{exporting ? 'Building ZIP...' : 'Download Evidence Package ZIP'}</button>
        <button onClick={handleOpenVerification} className="border border-emerald-600 text-emerald-400 py-2 px-3 text-xs font-bold uppercase hover:bg-emerald-600/10 transition-colors">View Verification Payload</button>
        <button onClick={handleOpenRecord} className="border border-gray-500 text-gray-300 py-2 px-3 text-xs font-bold uppercase hover:bg-gray-700/20 transition-colors md:col-span-2">View L0 Record JSON</button>
      </div>
    </div>
  );
}








