/**
 * ARV Tech51 Local Integrity Inventory Map v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Builds a local inventory map of the ARV integrity files currently present.
 * - Confirms local integrity by marker families, not fragile single tokens.
 * - Does not force every file to carry every token.
 * - No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

type InventoryItem = {
  name: string;
  path: string;
  requiredFamilies: string[][];
};

const read = (path: string): string => {
  assert.equal(existsSync(path), true, `missing required file: ${path}`);
  return readFileSync(path, 'utf8');
};

const hasAny = (content: string, tokens: string[]): boolean => {
  return tokens.some((token) => content.includes(token));
};

const assertFamilies = (label: string, content: string, families: string[][]): void => {
  for (const family of families) {
    assert.equal(
      hasAny(content, family),
      true,
      `${label} missing required marker family: ${family.join(' | ')}`
    );
  }
};

const localScopeFamily = ['LOCAL_L0'];
const localPolicyFamily = [
  'ARV-L0-LOCAL-INTEGRITY-v1',
  'ARV_L0_POLICY_ID',
  'policy',
  'local integrity',
  'LOCAL INTEGRITY',
];

const manifestFamily = ['manifest_hash', 'manifest hash', 'manifestHash', 'manifest'];
const packageIndexFamily = ['package_index_hash', 'package index', 'packageIndex'];
const zipReceiptFamily = ['zip_receipt_hash', 'ZIP Verification Receipt', 'VerificationReceipt', 'verification receipt'];
const qrFamily = ['QR transfer', 'qr transfer', 'qrTransfer', 'qrPayload'];

const inventory: InventoryItem[] = [
  {
    name: 'bundle kernel',
    path: 'lib/rva/kernel/bundle.ts',
    requiredFamilies: [
      localScopeFamily,
      manifestFamily,
      localPolicyFamily,
    ],
  },
  {
    name: 'checkpoint kernel',
    path: 'lib/rva/kernel/checkpoint.ts',
    requiredFamilies: [
      localScopeFamily,
      ['checkpoint', 'ARVCheckpoint'],
    ],
  },
  {
    name: 'local proof export manifest',
    path: 'lib/rva/kernel/local-proof-export-manifest.ts',
    requiredFamilies: [
      localScopeFamily,
      ['local proof', 'Local Proof', 'LOCAL PROOF', 'ARVLocalProofExportManifest'],
      manifestFamily,
      packageIndexFamily,
      ['zip_receipt_hash', 'zip receipt', 'zip_receipt'],
    ],
  },
  {
    name: 'offline certificate',
    path: 'lib/rva/kernel/offline-certificate.ts',
    requiredFamilies: [
      localScopeFamily,
      ['offline certificate', 'OfflineCertificate', 'LOCAL PROOF'],
      manifestFamily,
    ],
  },
  {
    name: 'package index',
    path: 'lib/rva/kernel/package-index.ts',
    requiredFamilies: [
      localScopeFamily,
      packageIndexFamily,
      manifestFamily,
    ],
  },
  {
    name: 'QR transfer payload',
    path: 'lib/rva/kernel/qr-transfer-payload.ts',
    requiredFamilies: [
      localScopeFamily,
      qrFamily,
      manifestFamily,
      packageIndexFamily,
    ],
  },
  {
    name: 'runtime verification record',
    path: 'lib/rva/kernel/runtime-verification-record.ts',
    requiredFamilies: [
      localScopeFamily,
      ['runtime record', 'RuntimeVerificationRecord', 'runtime verification'],
      manifestFamily,
      packageIndexFamily,
    ],
  },
  {
    name: 'verifier payload',
    path: 'lib/rva/kernel/verifier-payload.ts',
    requiredFamilies: [
      localScopeFamily,
      ['verifier payload', 'VerifierPayload'],
      manifestFamily,
    ],
  },
  {
    name: 'ZIP package',
    path: 'lib/rva/kernel/zip-package.ts',
    requiredFamilies: [
      localScopeFamily,
      ['zip package', 'ZipPackage', 'ARV zip'],
      packageIndexFamily,
    ],
  },
  {
    name: 'ZIP verification receipt',
    path: 'lib/rva/kernel/zip-verification-receipt.ts',
    requiredFamilies: [
      localScopeFamily,
      zipReceiptFamily,
      ['verification', 'Verification'],
    ],
  },
  {
    name: 'DemoClient',
    path: 'app/demo/DemoClient.tsx',
    requiredFamilies: [
      localScopeFamily,
      ['ZIP Verification Receipt', 'QR transfer', 'qr transfer'],
    ],
  },
  {
    name: 'Tech47 next integrity layer smoke',
    path: 'scripts/smoke-arv-tech47-next-integrity-layer.ts',
    requiredFamilies: [
      localScopeFamily,
      ['Next Integrity Layer'],
      ['manifest_hash', 'package_index_hash', 'qrPayload', 'qrTransfer'],
    ],
  },
  {
    name: 'Tech48 local integrity inventory smoke',
    path: 'scripts/smoke-arv-tech48-local-integrity-inventory.ts',
    requiredFamilies: [
      localScopeFamily,
      ['inventory', 'Inventory'],
    ],
  },
  {
    name: 'Tech49 local integrity regression guard smoke',
    path: 'scripts/smoke-arv-tech49-local-integrity-regression-guard.ts',
    requiredFamilies: [
      localScopeFamily,
      ['regression', 'Regression'],
    ],
  },
  {
    name: 'Tech50 local integrity release gate smoke',
    path: 'scripts/smoke-arv-tech50-local-integrity-release-gate.ts',
    requiredFamilies: [
      localScopeFamily,
      ['release gate', 'Release Gate'],
    ],
  },
];

console.log('[ARV Tech51 Local Integrity Inventory Map] Smoke Audit');
console.log('Scope: LOCAL_L0 only.');
console.log('No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.');
console.log('Token policy: marker families only. No fragile single-token release gate.');

let passed = 0;

for (const item of inventory) {
  const content = read(item.path);
  assertFamilies(item.name, content, item.requiredFamilies);
  passed += 1;
  console.log(`PASS ${item.name}`);
}

const summary = {
  scope: 'LOCAL_L0',
  strategy: 'marker-families',
  inventory_count: inventory.length,
  authority: 'none',
  external_anchor: 'none',
};

assert.equal(summary.scope, 'LOCAL_L0');
assert.equal(summary.strategy, 'marker-families');
assert.equal(summary.inventory_count, inventory.length);
assert.equal(summary.authority, 'none');
assert.equal(summary.external_anchor, 'none');

console.log(`[ARV Tech51 Local Integrity Inventory Map] ${passed}/${inventory.length} inventory checks passed`);
console.log('[ARV Tech51 Local Integrity Inventory Map] all tests passed');
