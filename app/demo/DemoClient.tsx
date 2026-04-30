// app/demo/DemoClient.tsx
'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import type { GigEvidenceRecord } from '@/lib/rva/schemas';
import {
  buildEvidencePackageZip,
  buildQRImage,
  buildPublicVerificationRecord,
  buildRecordJson,
  buildCertificatePdf,
  buildCertificateHtmlWithQR,
} from '@/lib/rva/artifacts';

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

function buildLocalGigRecord(file: File, hash: string): GigEvidenceRecord {
  const now = new Date().toISOString();
  const id = generateLocalId();
  const qrPayload = JSON.stringify({
    id,
    status: 'LOCAL_UNREGISTERED',
    hash,
    root: hash,
    ts: now,
    verify: null,
    sigfp: 'LOCAL-DEMO',
  });

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
  const [hashing, setHashing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const verificationJson = record ? buildPublicVerificationRecord(record) : '';
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
      const nextRecord = buildLocalGigRecord(file, hash);
      setRecord(nextRecord);
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
    try {
      const html = await buildCertificateHtmlWithQR(record);
      openHtmlInNewTab(html);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating certificate HTML');
    }
  };

  const handleOpenVerification = (): void => {
    if (!record) {
      setErrorMsg('Load a file first.');
      return;
    }
    openTextInNewTab(verificationJson);
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
    setExporting(true);
    try {
      const zipBytes = await buildEvidencePackageZip(record);
      // Convertir Uint8Array a ArrayBuffer seguro para Blob
      const blob = new Blob([zipBytes.buffer as ArrayBuffer], { type: 'application/zip' });
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
    setExporting(true);
    try {
      const pdfBytes = await buildCertificatePdf(record);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      downloadBlob(blob, `${record.id}.certificate.pdf`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generating PDF');
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
        </div>
        <div className="text-right text-xs">
          <div className="text-amber-400">MODE: LOCAL_UNREGISTERED</div>
          <div>VERTICAL: GIG EVIDENCE</div>
          <div>CORE: ARV Core Pack v1</div>
        </div>
      </header>

      {errorMsg && (
        <div className="border text-red-400 p-4 mb-6 text-sm font-bold" style={{ background: 'rgba(127,29,29,0.3)', borderColor: '#991b1b' }} role="alert">
          ⚠ {errorMsg}
        </div>
      )}

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
          <p className="text-xs text-gray-500 mb-4 uppercase tracking-widest">Local Gig Evidence Record</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3">
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Record ID</span><span className="text-white font-bold">{record.id}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Status</span><span className="text-amber-400">{record.status}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Worker</span><span className="text-gray-300">{record.worker_name}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Client</span><span className="text-gray-300">{record.client_name}</span></div>
              <div><span className="text-gray-500 block uppercase tracking-wider mb-1">Project</span><span className="text-gray-300">{record.project_name}</span></div>
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
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Signed QR Payload</p>
              <img src={qrDataUrl} alt="QR Code for verification" className="w-32 h-32 border border-gray-600 rounded" />
              <p className="text-gray-600 text-[10px] mt-2 break-all text-center max-w-md">{record.qr.payload}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
        <button onClick={handleOpenCertificate} className="border border-amber-600 text-amber-400 py-2 px-3 text-xs font-bold uppercase hover:bg-amber-600/10 transition-colors">Open Certificate HTML</button>
        <button onClick={handleExportPdf} disabled={exporting || !record} className="border border-purple-600 text-purple-400 py-2 px-3 text-xs font-bold uppercase hover:bg-purple-600/10 disabled:opacity-50 transition-colors">{exporting ? 'Generating PDF...' : 'Export PDF Certificate'}</button>
        <button onClick={handleExportZip} disabled={exporting} className="border border-blue-600 text-blue-400 py-2 px-3 text-xs font-bold uppercase hover:bg-blue-600/10 disabled:opacity-50 transition-colors">{exporting ? 'Building ZIP...' : 'Export Evidence Package ZIP'}</button>
        <button onClick={handleOpenVerification} className="border border-emerald-600 text-emerald-400 py-2 px-3 text-xs font-bold uppercase hover:bg-emerald-600/10 transition-colors">Open Verification Record</button>
        <button onClick={handleOpenRecord} className="border border-gray-500 text-gray-300 py-2 px-3 text-xs font-bold uppercase hover:bg-gray-700/20 transition-colors md:col-span-2">Open Raw Record JSON</button>
      </div>
    </div>
  );
}

