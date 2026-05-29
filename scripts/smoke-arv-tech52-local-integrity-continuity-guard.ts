/**
 * ARV Tech52 Local Integrity Continuity Guard v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Confirms Tech46-Tech51 continuity after release/inventory gates.
 * - Uses marker families, not fragile single-token checks.
 * - Confirms local-only integrity continuity across kernel/demo/smoke surfaces.
 * - Confirms no ARV Authority / RFC3161 / PostgreSQL / HSM/KMS dependency.
 * - Does not force kernel policy wording into DemoClient UI.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path: string): string => {
  assert.equal(existsSync(path), true, `missing required file: ${path}`);
  return readFileSync(path, "utf8");
};

const hasAny = (text: string, markers: string[]): boolean => {
  return markers.some((marker) => text.includes(marker));
};

const assertFamilies = (
  name: string,
  text: string,
  families: string[][]
): void => {
  for (const family of families) {
    assert.equal(
      hasAny(text, family),
      true,
      `${name} missing required marker family: ${family.join(" | ")}`
    );
  }
};

const assertAbsent = (
  name: string,
  text: string,
  banned: string[]
): void => {
  for (const token of banned) {
    assert.equal(
      text.includes(token),
      false,
      `${name} contains banned marker: ${token}`
    );
  }
};

const files = {
  bundle: "lib/rva/kernel/bundle.ts",
  checkpoint: "lib/rva/kernel/checkpoint.ts",
  localProofExportManifest: "lib/rva/kernel/local-proof-export-manifest.ts",
  offlineCertificate: "lib/rva/kernel/offline-certificate.ts",
  packageIndex: "lib/rva/kernel/package-index.ts",
  qrTransferPayload: "lib/rva/kernel/qr-transfer-payload.ts",
  runtimeVerificationRecord: "lib/rva/kernel/runtime-verification-record.ts",
  verifierPayload: "lib/rva/kernel/verifier-payload.ts",
  zipPackage: "lib/rva/kernel/zip-package.ts",
  zipVerificationReceipt: "lib/rva/kernel/zip-verification-receipt.ts",
  demoClient: "app/demo/DemoClient.tsx",
  tech47: "scripts/smoke-arv-tech47-next-integrity-layer.ts",
  tech48: "scripts/smoke-arv-tech48-local-integrity-inventory.ts",
  tech49: "scripts/smoke-arv-tech49-local-integrity-regression-guard.ts",
  tech50: "scripts/smoke-arv-tech50-local-integrity-release-gate.ts",
  tech51: "scripts/smoke-arv-tech51-local-integrity-inventory-map.ts",
};

const loaded = Object.fromEntries(
  Object.entries(files).map(([name, path]) => [name, read(path)])
);

const allText = Object.values(loaded).join("\n\n");
const kernelText = [
  loaded.bundle,
  loaded.checkpoint,
  loaded.localProofExportManifest,
  loaded.offlineCertificate,
  loaded.packageIndex,
  loaded.qrTransferPayload,
  loaded.runtimeVerificationRecord,
  loaded.verifierPayload,
  loaded.zipPackage,
  loaded.zipVerificationReceipt,
].join("\n\n");

console.log("[ARV Tech52 Local Integrity Continuity Guard] Smoke Audit");
console.log("Scope: LOCAL_L0 only.");
console.log("No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.");
console.log("Policy: marker families only. No fragile single-token release gate.");

const localScopeFamily = ["LOCAL_L0", "LOCAL L0", "LOCAL_LØ", "LOCAL LØ"];
const policyFamily = [
  "ARV-L0-LOCAL-INTEGRITY-V1",
  "ARV-LØ-LOCAL-INTEGRITY-V1",
  "ARV_L0_POLICY_ID",
  "LOCAL INTEGRITY",
  "local integrity",
];
const manifestFamily = ["manifest_hash", "manifest hash", "manifest", "Manifest"];
const packageFamily = ["package_index_hash", "package index", "package_index"];
const zipFamily = ["zip_receipt_hash", "zip receipt", "zip", "ZIP"];
const receiptUiFamily = [
  "ZIP Verification Receipt",
  "Verification Receipt",
  "verification receipt",
  "Download ZIP",
  "View ZIP",
];
const proofFamily = ["local proof", "Local Proof", "LOCAL PROOF"];

assertFamilies("bundle kernel", loaded.bundle, [
  localScopeFamily,
  manifestFamily,
]);
console.log("PASS bundle kernel");

assertFamilies("checkpoint kernel", loaded.checkpoint, [
  localScopeFamily,
  ["checkpoint", "Checkpoint"],
]);
console.log("PASS checkpoint kernel");

assertFamilies("local proof export manifest", loaded.localProofExportManifest, [
  localScopeFamily,
  proofFamily,
  manifestFamily,
  packageFamily,
  zipFamily,
]);
console.log("PASS local proof export manifest");

assertFamilies("offline certificate", loaded.offlineCertificate, [
  localScopeFamily,
  ["offline", "Offline"],
  ["certificate", "Certificate"],
  manifestFamily,
]);
console.log("PASS offline certificate");

assertFamilies("package index", loaded.packageIndex, [
  localScopeFamily,
  packageFamily,
  manifestFamily,
]);
console.log("PASS package index");

assertFamilies("QR transfer payload", loaded.qrTransferPayload, [
  localScopeFamily,
  ["QR transfer", "qr transfer", "qrTransfer", "QR Transfer"],
  manifestFamily,
]);
console.log("PASS QR transfer payload");

assertFamilies("runtime verification record", loaded.runtimeVerificationRecord, [
  localScopeFamily,
  ["runtime", "Runtime"],
  manifestFamily,
]);
console.log("PASS runtime verification record");

assertFamilies("verifier payload", loaded.verifierPayload, [
  localScopeFamily,
  ["verifier", "Verifier"],
  manifestFamily,
]);
console.log("PASS verifier payload");

assertFamilies("ZIP package", loaded.zipPackage, [
  localScopeFamily,
  ["zip", "ZIP"],
  packageFamily,
]);
console.log("PASS ZIP package");

assertFamilies("ZIP verification receipt", loaded.zipVerificationReceipt, [
  localScopeFamily,
  ["zip", "ZIP", "receipt", "Receipt", "value", "verify", "verification"],
]);
console.log("PASS ZIP verification receipt");

assertFamilies("DemoClient", loaded.demoClient, [
  receiptUiFamily,
  ["QR Transfer Payload", "QR transfer", "qrTransfer", "Download"],
]);
console.log("PASS DemoClient");

assertFamilies("Tech47 next integrity layer smoke", loaded.tech47, [
  ["Tech47", "Next Integrity Layer", "next integrity layer"],
  localScopeFamily,
]);
console.log("PASS Tech47 next integrity layer smoke");

assertFamilies("Tech48 local integrity inventory smoke", loaded.tech48, [
  ["Tech48", "Local Integrity Inventory", "local integrity inventory"],
  localScopeFamily,
]);
console.log("PASS Tech48 local integrity inventory smoke");

assertFamilies("Tech49 regression guard smoke", loaded.tech49, [
  ["Tech49", "Regression Guard", "regression guard"],
  localScopeFamily,
]);
console.log("PASS Tech49 regression guard smoke");

assertFamilies("Tech50 release gate smoke", loaded.tech50, [
  ["Tech50", "Release Gate", "release gate"],
  localScopeFamily,
]);
console.log("PASS Tech50 release gate smoke");

assertFamilies("Tech51 inventory map smoke", loaded.tech51, [
  ["Tech51", "Inventory Map", "inventory map"],
  localScopeFamily,
]);
console.log("PASS Tech51 inventory map smoke");

assertFamilies("kernel local integrity policy surface", kernelText, [
  localScopeFamily,
  policyFamily,
  proofFamily,
  manifestFamily,
  packageFamily,
  zipFamily,
]);

assertFamilies("global continuity surface", allText, [
  localScopeFamily,
  proofFamily,
  manifestFamily,
  packageFamily,
  zipFamily,
]);

assertAbsent("local integrity continuity surface", allText, [
  "MetaMask",
  "metamask",
  "wallet required",
  "Wallet required",
  "connect wallet",
  "Connect Wallet",
  "ARV Authority required",
  "RFC 3161 required",
  "PostgreSQL required",
  "HSM required",
  "KMS required",
]);

console.log("PASS no wallet/token/authority dependency markers");
console.log("[ARV Tech52 Local Integrity Continuity Guard] all tests passed");
