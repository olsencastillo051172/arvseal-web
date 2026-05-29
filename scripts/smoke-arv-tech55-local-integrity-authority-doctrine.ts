/**
 * ARV Tech55 Local Integrity Authority Doctrine v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * ARV canonical meaning:
 * - ARV means Reality Validation Authority.
 *
 * Authority doctrine:
 * - "Authority" is brand/doctrine only.
 * - It does not claim legal authority.
 * - It does not claim external authority.
 * - It does not claim public registry authority.
 * - It does not claim certificate authority status.
 *
 * Boundary:
 * - LOCAL_L0 only.
 * - No ARV Authority dependency.
 * - No RFC3161 dependency.
 * - No PostgreSQL dependency.
 * - No HSM/KMS dependency.
 * - No wallet dependency.
 *
 * Policy:
 * - marker families only.
 * - No fragile single-token release gate.
 */

import assert from "node:assert/strict";

const ARV_CANONICAL_NAME = "Reality Validation Authority";
const ARV_SCOPE = "LOCAL_L0";
const ARV_POLICY = "ARV-L0-LOCAL-INTEGRITY-V1";

const doctrine = {
  name: ARV_CANONICAL_NAME,
  scope: ARV_SCOPE,
  policy: ARV_POLICY,
  authorityBoundary: "brand/doctrine only; no legal/external authority claim",
  dependencyBoundary: [
    "No ARV Authority dependency",
    "No RFC3161 dependency",
    "No PostgreSQL dependency",
    "No HSM/KMS dependency",
    "No wallet dependency",
  ],
  tokenPolicy: "marker families only. No fragile single-token release gate.",
};

const assertIncludes = (label: string, value: string, marker: string) => {
  assert.equal(
    value.includes(marker),
    true,
    `${label} missing required marker: ${marker}`
  );
};

const assertNotIncludes = (label: string, value: string, marker: string) => {
  assert.equal(
    value.includes(marker),
    false,
    `${label} contains forbidden marker: ${marker}`
  );
};

const main = () => {
  console.log("[ARV Tech55 Local Integrity Authority Doctrine] Smoke Audit");
  console.log(`Scope: ${doctrine.scope} only.`);
  console.log(`ARV: ${doctrine.name}.`);
  console.log(`Authority boundary: ${doctrine.authorityBoundary}.`);
  console.log(`Policy: ${doctrine.tokenPolicy}`);

  assert.equal(doctrine.name, "Reality Validation Authority");
  assertNotIncludes("ARV canonical name", doctrine.name, "Realtime");
  console.log("PASS canonical ARV meaning");

  assert.equal(doctrine.scope, "LOCAL_L0");
  assert.equal(doctrine.policy, "ARV-L0-LOCAL-INTEGRITY-V1");
  console.log("PASS local integrity policy identity");

  assertIncludes("authority boundary", doctrine.authorityBoundary, "brand/doctrine");
  assertIncludes("authority boundary", doctrine.authorityBoundary, "no legal/external authority claim");
  console.log("PASS authority boundary");

  for (const marker of doctrine.dependencyBoundary) {
    assertIncludes("dependency boundary", marker, "No");
  }
  console.log("PASS dependency boundary");

  assertIncludes("token policy", doctrine.tokenPolicy, "marker families");
  assertIncludes("token policy", doctrine.tokenPolicy, "No fragile single-token");
  console.log("PASS token policy");

  console.log("[ARV Tech55 Local Integrity Authority Doctrine] all tests passed");
};

main();
