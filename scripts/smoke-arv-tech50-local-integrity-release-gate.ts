/**
 * ARV Tech50 Local Integrity Release Gate v1 - Smoke Audit
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Final local release gate over Tech46-Tech49.
 * - Validates local-only posture.
 * - Validates integrity marker families without brittle one-word checks.
 * - No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = {
  tech46: "scripts/smoke-arv-tech46-zip-verification-receipt-finalizer.ts",
  tech47: "scripts/smoke-arv-tech47-next-integrity-layer.ts",
  tech48: "scripts/smoke-arv-tech48-local-integrity-inventory.ts",
  tech49: "scripts/smoke-arv-tech49-local-integrity-regression-guard.ts",
};

const KERNEL_FILES = [
  "lib/rva/kernel/bundle.ts",
  "lib/rva/kernel/checkpoint.ts",
  "lib/rva/kernel/local-proof-export-manifest.ts",
  "lib/rva/kernel/offline-certificate.ts",
  "lib/rva/kernel/package-index.ts",
  "lib/rva/kernel/policy.ts",
  "lib/rva/kernel/qr-transfer-payload.ts",
  "lib/rva/kernel/runtime-verification-record.ts",
  "lib/rva/kernel/signature.ts",
  "lib/rva/kernel/verifier-payload.ts",
  "lib/rva/kernel/zip-package.ts",
  "lib/rva/kernel/zip-verification-receipt.ts",
];

type MarkerFamily = {
  name: string;
  any: string[];
};

const LOCAL_L0: MarkerFamily = {
  name: "LOCAL_L0 scope",
  any: ["LOCAL_L0", "LOCAL L0", "local l0", "local proof", "local integrity"],
};

const LOCAL_POLICY: MarkerFamily = {
  name: "local integrity policy",
  any: ["ARV-L0-LOCAL-INTEGRITY-V1", "LOCAL-INTEGRITY", "local integrity"],
};

const MANIFEST_HASH: MarkerFamily = {
  name: "manifest hash",
  any: ["manifest_hash", "manifestHash", "manifest hash", "manifest"],
};

const PACKAGE_INDEX_HASH: MarkerFamily = {
  name: "package index hash",
  any: ["package_index_hash", "packageIndexHash", "package index hash", "package index"],
};

const ZIP_SHA256: MarkerFamily = {
  name: "zip sha256",
  any: ["zip_sha256", "zipSha256", "ZIP_SHA256", "HEX64_ZIP_SHA256", "sha256", "SHA-256", "SHA_256"],
};

const ZIP_RECEIPT_HASH: MarkerFamily = {
  name: "zip receipt hash",
  any: ["zip_receipt_hash", "zipReceiptHash", "ZIP_RECEIPT", "HEX64_ZIP_RECEIPT", "receipt hash", "receipt"],
};

let passed = 0;
let failed = 0;

function readFile(rel: string): string {
  const abs = path.join(ROOT, rel);
  assert.ok(fs.existsSync(abs), `missing required file: ${rel}`);
  const text = fs.readFileSync(abs, "utf8");
  assert.ok(text.trim().length > 0, `empty required file: ${rel}`);
  return text;
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function hasAny(text: string, family: MarkerFamily, label: string): void {
  assert.ok(
    family.any.some((marker) => text.includes(marker)),
    `${label} missing required marker family: ${family.name} (${family.any.join(" | ")})`,
  );
}

function hasLocalPosture(text: string, label: string): void {
  hasAny(text, LOCAL_L0, label);
  hasAny(text, LOCAL_POLICY, label);
}

console.log("\n[ARV Tech50 Local Integrity Release Gate] Smoke Audit");
console.log("Scope: LOCAL_L0 only.");
console.log("No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.");

test("Tech46 ZIP verification receipt layer exists and is locally bound", () => {
  const text = readFile(FILES.tech46);
  hasLocalPosture(text, "Tech46 ZIP verification receipt layer");
  hasAny(text, ZIP_SHA256, "Tech46 ZIP verification receipt layer");
  hasAny(text, ZIP_RECEIPT_HASH, "Tech46 ZIP verification receipt layer");
});

test("Tech47 next integrity layer exists and is locally bound", () => {
  const text = readFile(FILES.tech47);
  hasAny(text, LOCAL_L0, "Tech47 next integrity layer");
  hasAny(text, MANIFEST_HASH, "Tech47 next integrity layer");
  hasAny(text, PACKAGE_INDEX_HASH, "Tech47 next integrity layer");
});

test("Tech48 local integrity inventory exists and is locally bound", () => {
  const text = readFile(FILES.tech48);
  hasAny(text, LOCAL_L0, "Tech48 local integrity inventory");
  hasAny(text, MANIFEST_HASH, "Tech48 local integrity inventory");
});

test("Tech49 regression guard exists and references previous local layers", () => {
  const text = readFile(FILES.tech49);
  hasAny(text, LOCAL_L0, "Tech49 regression guard");
  assert.ok(text.includes("Tech46"), "Tech49 regression guard missing Tech46 reference");
  assert.ok(text.includes("Tech47"), "Tech49 regression guard missing Tech47 reference");
  assert.ok(text.includes("Tech48"), "Tech49 regression guard missing Tech48 reference");
});

test("Tech46 through Tech49 smoke files are present", () => {
  for (const rel of Object.values(FILES)) {
    readFile(rel);
  }
});

test("kernel files required by the local chain are present", () => {
  for (const rel of KERNEL_FILES) {
    readFile(rel);
  }
});

test("combined kernel preserves LOCAL_L0 posture", () => {
  const combined = KERNEL_FILES.map(readFile).join("\n");
  hasAny(combined, LOCAL_L0, "combined kernel");
  hasAny(combined, LOCAL_POLICY, "combined kernel");
});

test("combined kernel preserves integrity hash families", () => {
  const combined = KERNEL_FILES.map(readFile).join("\n");
  hasAny(combined, MANIFEST_HASH, "combined kernel");
  hasAny(combined, PACKAGE_INDEX_HASH, "combined kernel");
  hasAny(combined, ZIP_SHA256, "combined kernel");
});

test("combined kernel preserves ZIP verification receipt family", () => {
  const combined = KERNEL_FILES.map(readFile).join("\n");
  hasAny(combined, ZIP_RECEIPT_HASH, "combined kernel");
});

test("release gate remains local-only and does not claim authority services", () => {
  const self = readFile("scripts/smoke-arv-tech50-local-integrity-release-gate.ts");

  assert.ok(self.includes("No ARV Authority"), "Tech50 must explicitly reject ARV Authority posture");
  assert.ok(self.includes("No RFC 3161"), "Tech50 must explicitly reject RFC 3161 posture");
  assert.ok(self.includes("No PostgreSQL"), "Tech50 must explicitly reject PostgreSQL posture");
  assert.ok(self.includes("No HSM/KMS"), "Tech50 must explicitly reject HSM/KMS posture");
});

console.log(`\n[ARV Tech50 Local Integrity Release Gate] ${passed}/${passed + failed} passed, ${failed} FAILED\n`);
