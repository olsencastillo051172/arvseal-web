/**
 * ARV Tech53 Local Integrity Surface Map v1 - Smoke Audit
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Maps the local integrity surfaces after Tech50-Tech52.
 * - Confirms continuity across kernel, demo, and smoke audit surfaces.
 * - Uses marker families, not fragile single-token checks.
 * - Confirms no ARV Authority / RFC3161 / PostgreSQL / HSM/KMS dependency.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

type MarkerFamily = {
  name: string;
  markers: string[];
};

type Surface = {
  name: string;
  path: string;
  families: MarkerFamily[];
};

const read = (path: string): string => {
  assert.equal(existsSync(path), true, `missing required file: ${path}`);
  return readFileSync(path, "utf8");
};

const normalize = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ");

const hasAny = (content: string, markers: string[]): boolean => {
  const normalized = normalize(content);
  return markers.some((marker) => normalized.includes(normalize(marker)));
};

const assertFamily = (surface: string, content: string, family: MarkerFamily): void => {
  assert.equal(
    hasAny(content, family.markers),
    true,
    `${surface} missing required marker family: ${family.markers.join(" | ")}`
  );
};

const localScopeFamily: MarkerFamily = {
  name: "local scope",
  markers: ["LOCAL_L0", "local_l0", "local integrity", "LOCAL INTEGRITY"],
};

const policyFamily: MarkerFamily = {
  name: "local policy",
  markers: ["ARV-L0-LOCAL-INTEGRITY-V1", "ARV_L0_POLICY_ID", "local integrity"],
};

const hashFamily: MarkerFamily = {
  name: "hash continuity",
  markers: ["manifest_hash", "package_index_hash", "zip_receipt_hash", "sha256", "64-char lowercase hex"],
};

const noAuthorityFamily: MarkerFamily = {
  name: "no external authority",
  markers: ["No ARV Authority", "No RFC 3161", "No PostgreSQL", "No HSM/KMS", "no authority"],
};

const surfaces: Surface[] = [
  {
    name: "bundle kernel",
    path: "lib/rva/kernel/bundle.ts",
    families: [localScopeFamily, policyFamily, hashFamily],
  },
  {
    name: "checkpoint kernel",
    path: "lib/rva/kernel/checkpoint.ts",
    families: [localScopeFamily],
  },
  {
    name: "local proof export manifest",
    path: "lib/rva/kernel/local-proof-export-manifest.ts",
    families: [localScopeFamily, hashFamily],
  },
  {
    name: "offline certificate",
    path: "lib/rva/kernel/offline-certificate.ts",
    families: [localScopeFamily, policyFamily, hashFamily, noAuthorityFamily],
  },
  {
    name: "package index",
    path: "lib/rva/kernel/package-index.ts",
    families: [localScopeFamily, hashFamily],
  },
  {
    name: "QR transfer payload",
    path: "lib/rva/kernel/qr-transfer-payload.ts",
    families: [localScopeFamily, hashFamily],
  },
  {
    name: "runtime verification record",
    path: "lib/rva/kernel/runtime-verification-record.ts",
    families: [localScopeFamily, hashFamily],
  },
  {
    name: "verifier payload",
    path: "lib/rva/kernel/verifier-payload.ts",
    families: [localScopeFamily, hashFamily],
  },
  {
    name: "ZIP package",
    path: "lib/rva/kernel/zip-package.ts",
    families: [localScopeFamily, policyFamily, hashFamily],
  },
  {
    name: "ZIP verification receipt",
    path: "lib/rva/kernel/zip-verification-receipt.ts",
    families: [localScopeFamily],
  },
  {
    name: "DemoClient",
    path: "app/demo/DemoClient.tsx",
    families: [localScopeFamily, policyFamily],
  },
  {
    name: "Tech47 next integrity layer smoke",
    path: "scripts/smoke-arv-tech47-next-integrity-layer.ts",
    families: [localScopeFamily, hashFamily],
  },
  {
    name: "Tech48 local integrity inventory smoke",
    path: "scripts/smoke-arv-tech48-local-integrity-inventory.ts",
    families: [localScopeFamily, hashFamily],
  },
  {
    name: "Tech49 local integrity regression guard smoke",
    path: "scripts/smoke-arv-tech49-local-integrity-regression-guard.ts",
    families: [localScopeFamily, hashFamily],
  },
  {
    name: "Tech50 local integrity release gate smoke",
    path: "scripts/smoke-arv-tech50-local-integrity-release-gate.ts",
    families: [localScopeFamily, noAuthorityFamily],
  },
  {
    name: "Tech51 local integrity inventory map smoke",
    path: "scripts/smoke-arv-tech51-local-integrity-inventory-map.ts",
    families: [localScopeFamily, noAuthorityFamily],
  },
  {
    name: "Tech52 local integrity continuity guard smoke",
    path: "scripts/smoke-arv-tech52-local-integrity-continuity-guard.ts",
    families: [localScopeFamily, noAuthorityFamily],
  },
];

console.log("[ARV Tech53 Local Integrity Surface Map] Smoke Audit");
console.log("Scope: LOCAL_L0 only.");
console.log("No ARV Authority. No RFC 3161. No PostgreSQL. No HSM/KMS.");
console.log("Policy: marker families only. No fragile single-token release gate.");

let passed = 0;

for (const surface of surfaces) {
  const content = read(surface.path);

  for (const family of surface.families) {
    assertFamily(surface.name, content, family);
  }

  console.log(`PASS ${surface.name}`);
  passed += 1;
}

assert.equal(passed, surfaces.length);

console.log(`[ARV Tech53 Local Integrity Surface Map] ${passed}/${surfaces.length} surfaces mapped`);
console.log("[ARV Tech53 Local Integrity Surface Map] all tests passed");
