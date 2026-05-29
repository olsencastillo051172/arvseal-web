/**
 * ARV Tech55 Local Integrity Authority Doctrine v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Canonizes ARV as "Reality Validation Authority".
 * - Separates ARV brand/doctrine meaning from legal/external authority claims.
 * - Confirms LOCAL_L0 remains local-only, evidence-bound, offline-verifiable.
 * - Uses marker families, not fragile single-token release checks.
 * - Avoids false positives from prior smoke-test regex/code internals.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path: string): string => {
  assert.equal(existsSync(path), true, `missing required file: ${path}`);
  return readFileSync(path, "utf8");
};

const kernelPaths = [
  "lib/rva/kernel/bundle.ts",
  "lib/rva/kernel/checkpoint.ts",
  "lib/rva/kernel/local-proof-export-manifest.ts",
  "lib/rva/kernel/offline-certificate.ts",
  "lib/rva/kernel/package-index.ts",
  "lib/rva/kernel/qr-transfer-payload.ts",
  "lib/rva/kernel/runtime-verification-record.ts",
  "lib/rva/kernel/verifier-payload.ts",
  "lib/rva/kernel/zip-package.ts",
  "lib/rva/kernel/zip-verification-receipt.ts",
];

const demoPaths = [
  "app/demo/DemoClient.tsx",
];

const smokePaths = [
  "scripts/smoke-arv-tech47-next-integrity-layer.ts",
  "scripts/smoke-arv-tech48-local-integrity-inventory.ts",
  "scripts/smoke-arv-tech49-local-integrity-regression-guard.ts",
  "scripts/smoke-arv-tech50-local-integrity-release-gate.ts",
  "scripts/smoke-arv-tech51-local-integrity-inventory-map.ts",
  "scripts/smoke-arv-tech52-local-integrity-continuity-guard.ts",
  "scripts/smoke-arv-tech53-local-integrity-surface-map.ts",
  "scripts/smoke-arv-tech54-local-integrity-boundary-fence.ts",
];

const allPaths = [...kernelPaths, ...demoPaths, ...smokePaths];

const contents = allPaths.map((path) => ({ path, text: read(path) }));
const kernelContents = contents.filter((x) => kernelPaths.includes(x.path));
const demoContents = contents.filter((x) => demoPaths.includes(x.path));
const smokeContents = contents.filter((x) => smokePaths.includes(x.path));

const combinedKernel = kernelContents.map((x) => `\n--- ${x.path} ---\n${x.text}`).join("\n");
const combinedDemo = demoContents.map((x) => `\n--- ${x.path} ---\n${x.text}`).join("\n");
const combinedSmoke = smokeContents.map((x) => `\n--- ${x.path} ---\n${x.text}`).join("\n");
const combinedAll = `${combinedKernel}\n${combinedDemo}\n${combinedSmoke}`;

const doctrine = {
  name: "ARV",
  canonicalMeaning: "Reality Validation Authority",
  scope: "LOCAL_L0",
  policy: "ARV-L0-LOCAL-INTEGRITY-V1",
  authorityBoundary:
    "ARV may use Authority as part of its brand/doctrine name, but LOCAL_L0 does not claim legal, registry, RFC3161, wallet, or third-party certification authority.",
};

const markerFamilies = [
  ["LOCAL_L0", "LOCAL L0", "local"],
  ["ARV-L0-LOCAL-INTEGRITY-V1", "ARV_L0_POLICY_ID", "LOCAL INTEGRITY", "local integrity"],
  ["manifest_hash", "manifest hash", "manifest"],
  ["package_index_hash", "package index", "package_index"],
];

const localOnlyBoundaryFamilies = [
  ["LOCAL_L0", "LOCAL L0"],
  ["No ARV Authority", "does not claim authority", "does not claim authority registration"],
  ["No RFC 3161", "No RFC3161"],
  ["No PostgreSQL"],
  ["No HSM/KMS"],
  ["No wallet dependency", "No wallet"],
];

const forbiddenProductClaims = [
  /\bARV\s+is\s+a\s+legal\s+authority\b/i,
  /\bARV\s+is\s+a\s+certificate\s+authority\b/i,
  /\bARV\s+is\s+a\s+timestamping\s+authority\b/i,
  /\bARV\s+is\s+a\s+public\s+registry\b/i,
  /\brequires\s+MetaMask\b/i,
  /\brequires\s+wallet\b/i,
  /\brequires\s+PostgreSQL\b/i,
  /\brequires\s+HSM\b/i,
  /\brequires\s+KMS\b/i,
  /\brequires\s+RFC\s*3161\b/i,
];

const assertHasAny = (label: string, text: string, markers: string[]) => {
  assert.equal(
    markers.some((marker) => text.includes(marker)),
    true,
    `${label} missing required marker family: ${markers.join(" | ")}`
  );
};

const assertMarkerFamilies = (label: string, text: string) => {
  for (const family of markerFamilies) {
    assertHasAny(label, text, family);
  }
};

const assertNoForbiddenProductClaims = (label: string, text: string) => {
  const matches = forbiddenProductClaims
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);

  assert.equal(
    matches.length,
    0,
    `${label} contains forbidden product authority claim marker(s): ${matches.join(" | ")}`
  );
};

const assertCanonicalMeaning = () => {
  assert.equal(doctrine.name, "ARV");
  assert.equal(doctrine.canonicalMeaning, "Reality Validation Authority");
  assert.equal(doctrine.scope, "LOCAL_L0");
  assert.equal(doctrine.policy, "ARV-L0-LOCAL-INTEGRITY-V1");
  assert.ok(doctrine.authorityBoundary.includes("brand/doctrine"));
  assert.ok(doctrine.authorityBoundary.includes("does not claim legal"));
};

const assertNoRealtimeDrift = () => {
  assert.equal(
    /\bRealtime\s+Validation\s+Authority\b/i.test(combinedAll),
    false,
    "ARV meaning drift detected: use Reality Validation Authority, not Realtime Validation Authority"
  );
};

const assertKernelAuthorityBoundary = () => {
  for (const surface of kernelContents) {
    assertHasAny(surface.path, surface.text, ["LOCAL_L0", "LOCAL L0", "local"]);
    assertNoForbiddenProductClaims(surface.path, surface.text);
  }
};

const assertDemoAuthorityBoundary = () => {
  for (const surface of demoContents) {
    assertHasAny(surface.path, surface.text, ["LOCAL_L0", "LOCAL L0", "local"]);
    assertNoForbiddenProductClaims(surface.path, surface.text);
  }
};

const assertSmokeContinuity = () => {
  for (const surface of smokeContents) {
    assertHasAny(surface.path, surface.text, ["LOCAL_L0", "LOCAL L0", "local"]);
  }
};

const assertBoundaryLanguage = () => {
  for (const family of localOnlyBoundaryFamilies) {
    assertHasAny("combined local-only boundary doctrine", combinedAll, family);
  }
};

const main = () => {
  console.log("[ARV Tech55 Local Integrity Authority Doctrine] Smoke Audit");
  console.log("Scope: LOCAL_L0 only.");
  console.log("ARV: Reality Validation Authority.");
  console.log("Authority boundary: brand/doctrine only; no legal/external authority claim.");
  console.log("Policy: marker families only. No fragile single-token release gate.");

  assertCanonicalMeaning();
  console.log("PASS canonical ARV meaning");

  assertNoRealtimeDrift();
  console.log("PASS no Realtime/Reality naming drift");

  assertKernelAuthorityBoundary();
  console.log("PASS kernel authority boundary");

  assertDemoAuthorityBoundary();
  console.log("PASS demo authority boundary");

  assertSmokeContinuity();
  console.log("PASS smoke continuity authority boundary");

  assertBoundaryLanguage();
  console.log("PASS local-only boundary language");

  assertMarkerFamilies("combined local integrity surfaces", combinedAll);
  console.log("PASS marker families");

  console.log("[ARV Tech55 Local Integrity Authority Doctrine] all tests passed");
};

main();
