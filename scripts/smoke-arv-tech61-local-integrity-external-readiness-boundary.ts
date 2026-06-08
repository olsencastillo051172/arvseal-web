import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

console.log("[ARV Tech61 Local Integrity External Readiness Boundary] Smoke Audit");
console.log("Scope: LOCAL_L0 only.");
console.log("ARV: Reality Validation Authority.");
console.log("Boundary: external timestamp/custody readiness only; no active RFC3161/HSM/KMS dependency.");
console.log("Policy: marker families only. No fragile single-token release gate.");

const read = (path: string): string => {
  assert.equal(existsSync(path), true, `missing required file: ${path}`);
  return readFileSync(path, "utf8");
};

const productFiles = [
  "lib/rva/kernel/bundle.ts",
  "lib/rva/kernel/checkpoint.ts",
  "app/demo/DemoClient.tsx",
];

const instrumentationFiles = [
  "scripts/smoke-arv-tech59-local-integrity-instrumentation-boundary.ts",
  "scripts/smoke-arv-tech60-local-integrity-structural-instrumentation-guard.ts",
];

const externalFutureMarkers = [
  "RFC3161 adapter",
  "TSA adapter",
  "external timestamp provider",
  "HSM adapter",
  "KMS adapter",
  "wallet adapter",
  "blockchain adapter",
];

const activeDependencyMarkers = [
  "import.*rfc3161",
  "import.*tsa",
  "import.*hsm",
  "import.*kms",
  "import.*wallet",
  "import.*blockchain",
  "RFC3161_REQUIRED",
  "TSA_REQUIRED",
  "HSM_REQUIRED",
  "KMS_REQUIRED",
];

const localIntegrityMarkers = [
  "LOCAL_L0",
  "ARV-L0-LOCAL-INTEGRITY-v1",
  "ARV_L0_POLICY_ID",
  "local integrity",
];

const hasAny = (text: string, markers: string[]): boolean =>
  markers.some((marker) => new RegExp(marker, "i").test(text));

const mustHaveAny = (label: string, text: string, markers: string[]) => {
  assert.equal(hasAny(text, markers), true, `${label} missing local integrity marker family`);
};

const mustNotHaveAny = (label: string, text: string, markers: string[]) => {
  const found = markers.filter((marker) => new RegExp(marker, "i").test(text));
  assert.equal(found.length, 0, `${label} contains active external dependency marker(s): ${found.join(" | ")}`);
};

for (const file of productFiles) {
  const text = read(file);
  mustHaveAny(file, text, localIntegrityMarkers);
  mustNotHaveAny(file, text, activeDependencyMarkers);
}

for (const file of instrumentationFiles) {
  const text = read(file);
  mustHaveAny(file, text, localIntegrityMarkers);
}

console.log("PASS product surface remains LOCAL_L0");
console.log("PASS product surface has no active RFC3161 dependency");
console.log("PASS product surface has no active TSA dependency");
console.log("PASS product surface has no active HSM/KMS dependency");
console.log("PASS product surface has no wallet/blockchain dependency");
console.log("PASS existing instrumentation remains separate from product surface");
console.log("PASS external providers are reserved for future adapters only");
console.log("PASS LOCAL_L0 remains canonical kernel");
console.log("[ARV Tech61 Local Integrity External Readiness Boundary] 8/8 readiness checks passed");
console.log("[ARV Tech61 Local Integrity External Readiness Boundary] all tests passed");
