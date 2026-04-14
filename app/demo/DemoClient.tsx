'use client';

import React, { useState, useEffect } from 'react';
import { verifyMerkleProof, VerificationResult } from '../../lib/rva/verifier';

type Attestation = {
  document_hash: string;
  merkle_proof: Array<{ sibling: string; direction: 'left' | 'right' }> | string[];
  expected_root: string;
};

export default function DemoClient() {
  const [airgap, setAirgap] = useState(false);
  const [netCount, setNetCount] = useState(0);
  const [jsonInput, setJsonInput] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch;
    const OriginalXHR = window.XMLHttpRequest;
    const originalBeacon = navigator.sendBeacon?.bind(navigator);

    const intercept = () => {
      if (airgap) {
        throw new Error('SECURITY_EXCEPTION: NETWORK_ACCESS_DENIED_BY_AIRGAP_POLICY');
      }
      setNetCount((prev) => prev + 1);
    };

    window.fetch = async (...args) => {
      intercept();
      return originalFetch(...args);
    };

    class PatchedXHR extends OriginalXHR {
      send(...args: any[]) {
        intercept();
        super.send(...args);
      }
    }

    // @ts-ignore
    window.XMLHttpRequest = PatchedXHR;

    if (originalBeacon) {
      // @ts-ignore
      navigator.sendBeacon = (...args: any[]) => {
        intercept();
        return originalBeacon(...args);
      };
    }

    return () => {
      window.fetch = originalFetch;
      window.XMLHttpRequest = OriginalXHR;
      if (originalBeacon) {
        // @ts-ignore
        navigator.sendBeacon = originalBeacon;
      }
    };
  }, [airgap]);

  const loadAnchor = async () => {
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch('/anchor.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJsonInput(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setErrorMsg(`Could not load anchor.json: ${String(e?.message ?? e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      if (!jsonInput.trim()) {
        throw new Error('Invalid Input: Please paste a valid JSON Attestation object.');
      }

      let data: Attestation;
      try {
        data = JSON.parse(jsonInput);
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

      const normalizedProof =
        data.merkle_proof.length === 0
          ? []
          : data.merkle_proof.map((item: any) => {
              if (
                typeof item === 'object' &&
                typeof item.sibling === 'string' &&
                (item.direction === 'left' || item.direction === 'right')
              ) {
                return item;
              }
              throw new Error('Unsupported merkle_proof format.');
            });

      const verification = await verifyMerkleProof(
        data.document_hash,
        normalizedProof as any,
        data.expected_root
      );

      setResult(verification);
    } catch (e: any) {
      setErrorMsg(e.message || 'Unknown Integrity Error');
    } finally {
      setLoading(false);
    }
  };

  const handleCertificate = async () => {
    try {
      window.open(
        '/vault/clients/CLIENT-001/certificates/ARV-2026-000001.certificate.html',
        '_blank',
        'noopener,noreferrer'
      );
    } catch (e: any) {
      setErrorMsg(`Could not open certificate: ${e.message}`);
    }
  };

  const handlePdfCertificate = async () => {
    try {
      window.open(
        '/vault/clients/CLIENT-001/certificates/ARV-2026-000001.certificate.pdf',
        '_blank',
        'noopener,noreferrer'
      );
    } catch (e: any) {
      setErrorMsg(`Could not open PDF certificate: ${e.message}`);
    }
  };

  const handleExport = async () => {
    try {
      const url = '/vault/clients/CLIENT-001/exports/ARV-2026-000001.certificate.json';
      const res = await fetch(url, { cache: 'no-store' });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = href;
      a.download = 'ARV-2026-000001.certificate.json';
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(href);
    } catch (e: any) {
      setErrorMsg(`Could not export evidence package: ${e.message}`);
    }
  };

  const handleLedger = async () => {
    try {
      window.open(
        '/vault/public-ledger/public-ledger.jsonl',
        '_blank',
        'noopener,noreferrer'
      );
    } catch (e: any) {
      setErrorMsg(`Could not open public ledger: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono p-8 max-w-4xl mx-auto">
      <header className="flex justify-between items-center border-b border-gray-800 pb-4 mb-8">
        <div>
          <h1 className="text-2xl text-white font-bold tracking-tighter">ARV</h1>
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
            <div>
              STATUS: {airgap ? 'SECURE (OFFLINE / AIR-GAPPED)' : 'CONNECTED VERIFICATION MODE'}
            </div>
          </div>

          <button
            onClick={() => setAirgap(!airgap)}
            style={{
              backgroundColor: airgap ? '#22c55e' : '#374151',
              color: airgap ? '#000' : '#fff',
            }}
            className="px-4 py-2 font-bold uppercase text-sm"
          >
            {airgap ? 'AIR-GAP ENABLED' : 'ENABLE AIR-GAP'}
          </button>
        </div>
      </header>

      {errorMsg && (
        <div
          style={{ background: 'rgba(127,29,29,0.3)', borderColor: '#991b1b' }}
          className="border text-red-400 p-4 mb-4 text-sm font-bold"
        >
          ⚠ {errorMsg}
        </div>
      )}

      <div className="mb-8">
        <label className="block text-xs text-gray-500 mb-2">EVIDENCE PAYLOAD (JSON)</label>

        <button
          onClick={loadAnchor}
          disabled={loading}
          className="w-full mb-2 bg-gray-700 text-white font-bold py-2 disabled:opacity-50"
        >
          Load Anchor
        </button>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() =>
              setJsonInput(
                JSON.stringify(
                  {
                    document_hash:
                      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                    merkle_proof: [],
                    expected_root:
                      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                  },
                  null,
                  2
                )
              )
            }
            className="bg-green-700 text-white font-bold py-2"
          >
            Load VALID Evidence
          </button>

          <button
            onClick={() =>
              setJsonInput(
                JSON.stringify(
                  {
                    document_hash:
                      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                    merkle_proof: [],
                    expected_root:
                      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                  },
                  null,
                  2
                )
              )
            }
            className="bg-red-700 text-white font-bold py-2"
          >
            Load TAMPERED Evidence
          </button>
        </div>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{"document_hash":"...","merkle_proof":[],"expected_root":"..."}'
          className="w-full h-40 bg-gray-900 border border-gray-800 p-4 text-xs text-white focus:outline-none"
        />

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
            className="border border-amber-600 text-amber-400 py-2 px-3 text-xs font-bold uppercase hover:bg-amber-600/10"
          >
            Open Certificate
          </button>

          <button
            onClick={handlePdfCertificate}
            className="border border-purple-600 text-purple-400 py-2 px-3 text-xs font-bold uppercase hover:bg-purple-600/10"
          >
            Open PDF Certificate
          </button>

          <button
            onClick={handleExport}
            className="border border-blue-600 text-blue-400 py-2 px-3 text-xs font-bold uppercase hover:bg-blue-600/10"
          >
            Export Evidence Package
          </button>

          <button
            onClick={handleLedger}
            className="border border-emerald-600 text-emerald-400 py-2 px-3 text-xs font-bold uppercase hover:bg-emerald-600/10"
          >
            Open Public Ledger
          </button>
        </div>
      </div>

      {result && (
        <div
          style={{ borderColor: result.isValid ? '#22c55e' : '#ef4444' }}
          className="p-6 border-2 bg-gray-900/50"
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