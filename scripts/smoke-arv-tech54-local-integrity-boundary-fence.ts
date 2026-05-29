/**
 * ARV Tech54 Local Integrity Boundary Fence v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Confirms local-only integrity boundary after Tech47-Tech53.
 * - Uses marker families, not fragile single-token checks.
 * - Prevents external authority dependency intent from entering local proof surfaces.
 * - Ignores explicit negative/no-dependency statements so they do not create false positives.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path: string): string => {
  assert.equal(existsSync(path), true, `missing required file: ${path}`);
  return readFileSync(path, "utf8");
};

const hasAny = (text: string, markers: string[]): boolean =>
  markers.some((marker) => text.toLowerCase().includes(marker.toLowerCase()));

const missingFamilies = (text: string, families: string[][]): string[] =>
  families
    .filter((family) => !hasAny(text, family))
    .map((family) => family.join(" | "));

const stripAllowedNegativeDependencyClaims = (text: string): string =>
  text
    .replace(/No\s+ARV\s+Authority/gi, "NO_EXTERNAL_AUTHORITY")
    .replace(/No\s+RFC\s*3161/gi, "NO_TIMESTAMP_AUTHORITY")
    .replace(/No\s+PostgreSQL/gi, "NO_EXTERNAL_DATABASE")
    .replace(/No\s+HSM\/KMS/gi, "NO_EXTERNAL_KEY_MANAGER")
    .replace(/No\s+HSM/gi, "NO_EXTERNAL_KEY_MANAGER")
    .replace(/No\s+KMS/gi, "NO_EXTERNAL_KEY_MANAGER")
    .replace(/No\s+wallet\s+dependency/gi, "NO_EXTERNAL_WALLET")
    .replace(/no\s+wallet\s+dependency/gi, "NO_EXTERNAL_WALLET")
    .replace(/No\s+fragile\s+single-token\s+release\s+gate/gi, "NO_FRAGILE_RELEASE_GATE")
    .replace(/marker\s+families\s+only/gi, "MARKER_FAMILY_POLICY");

const assertFamilies = (name: string, text: string, families: string[][]): void => {
  const missing = missingFamilies(text, families);
  assert.equal(
    missing.length,
    0,
    `${name} missing required marker family: ${missing.join(" || ")}`
  );
};

const assertNoForbiddenDependencyIntent = (name: string, text: string): void => {
  const sanitized = stripAllowedNegativeDependencyClaims(text);

  const forbiddenFamilies = [
    ["ARV Authority", "authority registration", "registered external authority"],
    ["RFC3161", "RFC 3161", "timestamp authority"],
    ["PostgreSQL", "postgres"],
    ["HSM", "hardware security module"],
    ["KMS", "key management service"],
    ["MetaMask", "wallet dependency", "connect wallet", "ethereum wallet"],
  ];

  const present = forbiddenFamilies
    .filter((family) => hasAny(sanitized, family))
    .map((family) => family.join(" | "));

  assert.equal(
    present.length,
    0,
    `${name} contains forbidden external dependency marker(s): ${present.join(" || ")}`
  );
};

const localIntegrityFamilies = [
  ["LOCAL_L0", "LOCAL L0", "local_l0", "local only", "local-only"],
  ["ARV-L0-LOCAL-INTEGRITY-v1", "ARV_L0_POLICY_ID", "LOCAL INTEGRITY", "local integrity"],
];

const kernelSurfaces = [
  ["bundle kernel", "lib/rva/kernel/bundle.ts"],
  ["checkpoint kernel", "lib/rva/kernel/checkpoint.ts"],
  ["local proof export manifest", "lib/rva/kernel/local-proof-export-manifest.ts"],
  ["offline certificate", "lib/rva/kernel/offline-certificate.ts"],
  ["package index", "lib/rva/kernel/package-index.ts"],
  ["QR transfer payload", "lib/rva/kernel/qr-transfer-payload.ts"],
  ["runtime verification record", "lib/rva/kernel/runtime-verification-record.ts"],
  ["verifier payload", "lib/rva/kernel/verifier-payload.ts"],
  ["ZIP package", "lib/rva/kernel/zip-package.ts"],
  ["ZIP verification receipt", "lib/rva/kernel/zip-verification-receipt.ts"],
];

const demoSurfaces = [
  ["DemoClient", "app/demo/DemoClient.tsx"],
];

const smokeSurfaces = [
  ["Tech47 next integrity layer smoke", "scripts/smoke-arv-tech47-next-integrity-layer.ts"],
  ["Tech48 local integrity inventory smoke", "scripts/smoke-arv-tech48-local-integrity-inventory.ts"],
  ["Tech49 local integrity regression guard smoke", "scripts/smoke-arv-tech49-local-integrity-regression-guard.ts"],
  ["Tech50 local integrity release gate smoke", "scripts/smoke-arv-tech50-local-integrity-release-gate.ts"],
  ["Tech51 local integrity inventory map smoke", "scripts/smoke-arv-tech51-local-integrity-inventory-map.ts"],
  ["Tech52 local integrity continuity guard smoke", "scripts/smoke-arv-tech52-local-integrity-continuity-guard.ts"],
  ["Tech53 local integrity surface map smoke", "scripts/smoke-arv-tech53-local-integrity-surface-map.ts"],
];

const assertLocalOnlySurface = (name: string, path: string): void => {
  const text = read(path);
  assertFamilies(name, text, localIntegrityFamilies);
  assertNoForbiddenDependencyIntent(name, text);
  console.log(`PASS ${name}`);
};

const main = (): void => {
  console.log("[ARV Tech54 Local Integrity Boundary Fence] Smoke Audit");
  console.log("Scope: LOCAL_L0 only.");
  console.log("No ARV Authority. No RFC3161. No PostgreSQL. No HSM/KMS. No wallet dependency.");
  console.log("Policy: marker families only. No fragile single-token release gate.");

  for (const [name, path] of kernelSurfaces) {
    assertLocalOnlySurface(name, path);
  }

  for (const [name, path] of demoSurfaces) {
    assertLocalOnlySurface(name, path);
  }

  for (const [name, path] of smokeSurfaces) {
    assertLocalOnlySurface(name, path);
  }

  console.log("[ARV Tech54 Local Integrity Boundary Fence] boundary fence passed");
  console.log("[ARV Tech54 Local Integrity Boundary Fence] all tests passed");
};

main();
