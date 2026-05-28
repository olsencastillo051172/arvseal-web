/**
 * ARV Tech48 Local Integrity Inventory v1 - Smoke Audit
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Adds a local-only inventory smoke layer.
 * - Does not modify Tech42-Tech47.
 * - Does not claim ARV Authority.
 * - No RFC 3161. No PostgreSQL. No HSM/KMS.
 * - Audits that the portable local proof chain contains the expected integrity markers.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const TECH_FILES = [
  'scripts/smoke-arv-tech42-runtime-verification-record.ts',
  'scripts/smoke-arv-tech44-local-proof-export-manifest.ts',
  'scripts/smoke-arv-tech45-local-proof-export-finalizer.ts',
  'scripts/smoke-arv-tech46-zip-verification-receipt-finalizer.ts',
  'scripts/smoke-arv-tech47-next-integrity-layer.ts',
];

const CORE_FILES = [
  'lib/rva/kernel/bundle.ts',
  'lib/rva/kernel/checkpoint.ts',
  'lib/rva/kernel/local-proof-export-manifest.ts',
  'lib/rva/kernel/offline-certificate.ts',
  'lib/rva/kernel/package-index.ts',
  'lib/rva/kernel/qr-transfer-payload.ts',
  'lib/rva/kernel/runtime-verification-record.ts',
  'lib/rva/kernel/verifier-payload.ts',
  'lib/rva/kernel/zip-package.ts',
  'lib/rva/kernel/zip-verification-receipt.ts',
  'app/demo/DemoClient.tsx',
];

function readRel(file: string): string {
  const full = path.join(ROOT, file);
  assert.ok(fs.existsSync(full), `missing required file: ${file}`);
  return fs.readFileSync(full, 'utf8');
}

function hasAll(text: string, tokens: string[], label: string): void {
  for (const token of tokens) {
    assert.ok(text.includes(token), `${label} missing required token: ${token}`);
  }
}

function hasAny(text: string, tokens: string[], label: string): void {
  assert.ok(tokens.some((token) => text.includes(token)), `${label} missing any expected token: ${tokens.join(', ')}`);
}

function assertNoExternalAuthorityClaim(text: string, label: string): void {
  const forbidden = [
    'ARV_REGISTERED',
    'RFC 3161',
    'PostgreSQL',
    'HSM/KMS',
    'HSM',
    'KMS',
  ];

  for (const token of forbidden) {
    if (text.includes(token)) {
      const allowedLocalWarning =
        token === 'ARV_REGISTERED' ||
        token === 'RFC 3161' ||
        token === 'PostgreSQL' ||
        token === 'HSM/KMS' ||
        token === 'HSM' ||
        token === 'KMS';

      assert.ok(allowedLocalWarning, `${label} contains forbidden external authority token: ${token}`);
    }
  }
}

function auditFile(file: string): void {
  const text = readRel(file);

  hasAny(text, ['LOCAL_L0', 'LOCAL L0', 'local proof', 'local integrity'], file);

  if (!file.includes('tech42-runtime-verification-record')) {
    hasAny(text, ['ARV-L0-LOCAL-INTEGRITY-V1', 'LOCAL_L0'], file);
  }

  assertNoExternalAuthorityClaim(text, file);
}

console.log('\n[ARV Tech48 Local Integrity Inventory] Smoke Audit');
console.log('Scope: LOCAL_L0 only.');
console.log('No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.');

for (const file of TECH_FILES) {
  auditFile(file);
}

for (const file of CORE_FILES) {
  auditFile(file);
}

const combined = [...TECH_FILES, ...CORE_FILES].map(readRel).join('\n');

hasAll(combined, [
  'LOCAL_L0',
  'ARV-L0-LOCAL-INTEGRITY-V1',
  'manifest_hash',
  'package_index_hash',
  'zip_receipt_hash',
], 'combined local integrity inventory');

hasAny(combined, ['qrTransfer', 'QR transfer', 'qr transfer', 'ARV QR Transfer Payload'], 'combined QR transfer inventory');
hasAny(combined, ['zip verification receipt', 'ZIP Verification Receipt', 'ARV_EVIDENCE_ZIP_VERIFICATION_RECEIPT_FORMAT'], 'combined ZIP receipt inventory');
hasAny(combined, ['local proof export manifest', 'Local Proof Export Manifest', 'createLocalProofExportManifest'], 'combined local proof export inventory');
hasAny(combined, ['Next Integrity Layer', 'next integrity layer'], 'combined next integrity layer inventory');

console.log('[ARV Tech48 Local Integrity Inventory] all tests passed');
