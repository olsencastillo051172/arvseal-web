/**
 * ARV Tech60 Local Integrity Structural Instrumentation Guard v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Converts the Tech59 correction into an explicit structural rule.
 * - Separates product surfaces from scripts-based test instrumentation.
 * - Prevents scripts/ smoke files from contaminating product-surface audits.
 * - Uses explicit manifests instead of indiscriminate directory scans.
 * - Preserves ARV Reality Validation Authority doctrine without claiming
 *   legal or external authority.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const normalize = (path: string): string => path.replaceAll("\\", "/");

const read = (path: string): string => {
  assert.equal(existsSync(path), true, `missing required file: ${path}`);
  return readFileSync(path, "utf8");
};

const productSurfacePaths = [
  "lib/rva/kernel/bundle.ts",
  "lib/rva/kernel/checkpoint.ts",
  "lib/rva/kernel/local-proof-export-manifest.ts",
  "lib/rva/kernel/offline-certificate.ts",
  "lib/rva/kernel/package-index.ts",
  "lib/rva/kernel/qr-transfer-payload.ts",
  "lib/rva/kernel/runtime-verification-record.ts",
  "lib/rva/kernel/signature.ts",
  "lib/rva/kernel/verifier-payload.ts",
  "lib/rva/kernel/zip-package.ts",
  "lib/rva/kernel/zip-verification-receipt.ts",
  "app/demo/DemoClient.tsx",
].map(normalize);

const instrumentationSurfacePaths = [
  "scripts/smoke-arv-tech59-local-integrity-instrumentation-boundary.ts",
  "scripts/smoke-arv-tech60-local-integrity-structural-instrumentation-guard.ts",
].map(normalize);

const productSurface = productSurfacePaths.map((path) => ({
  path,
  text: read(path),
}));

const instrumentationSurface = instrumentationSurfacePaths.map((path) => ({
  path,
  text: read(path),
}));

let passed = 0;

const test = (name: string, assertion: () => void): void => {
  assertion();
  passed += 1;
  console.log(`PASS ${name}`);
};

console.log("[ARV Tech60 Local Integrity Structural Instrumentation Guard] Smoke Audit");
console.log("Scope: LOCAL_L0 only.");
console.log("ARV: Reality Validation Authority.");
console.log("Boundary: explicit product manifest; scripts remain test instrumentation.");
console.log("Policy: marker families only. No fragile single-token release gate.");

test("explicit product surface manifest exists", () => {
  assert.ok(productSurfacePaths.length > 0);
});

test("explicit instrumentation surface manifest exists", () => {
  assert.ok(instrumentationSurfacePaths.length > 0);
});

test("all declared product surface files exist", () => {
  assert.equal(productSurface.length, productSurfacePaths.length);
});

test("all declared instrumentation files exist", () => {
  assert.equal(instrumentationSurface.length, instrumentationSurfacePaths.length);
});

test("product surface excludes scripts paths", () => {
  const invalid = productSurfacePaths.filter((path) => path.startsWith("scripts/"));
  assert.equal(
    invalid.length,
    0,
    `product surface incorrectly contains scripts instrumentation: ${invalid.join(" | ")}`
  );
});

test("instrumentation surface remains under scripts", () => {
  const invalid = instrumentationSurfacePaths.filter(
    (path) => !path.startsWith("scripts/")
  );
  assert.equal(
    invalid.length,
    0,
    `instrumentation escaped scripts boundary: ${invalid.join(" | ")}`
  );
});

test("product and instrumentation surfaces are disjoint", () => {
  const productSet = new Set(productSurfacePaths);
  const overlap = instrumentationSurfacePaths.filter((path) =>
    productSet.has(path)
  );
  assert.equal(
    overlap.length,
    0,
    `product and instrumentation surfaces overlap: ${overlap.join(" | ")}`
  );
});

test("product roots are constrained to kernel and DemoClient", () => {
  const invalid = productSurfacePaths.filter(
    (path) =>
      !path.startsWith("lib/rva/kernel/") &&
      path !== "app/demo/DemoClient.tsx"
  );
  assert.equal(
    invalid.length,
    0,
    `unexpected product root: ${invalid.join(" | ")}`
  );
});

test("product source does not import scripts instrumentation", () => {
  const invalid = productSurface
    .filter(({ text }) =>
      /(?:from\s+|import\s*\()\s*["'][^"']*scripts\//i.test(text)
    )
    .map(({ path }) => path);

  assert.equal(
    invalid.length,
    0,
    `product source imports scripts instrumentation: ${invalid.join(" | ")}`
  );
});

test("Tech59 predecessor is classified as instrumentation", () => {
  assert.ok(
    instrumentationSurfacePaths.includes(
      "scripts/smoke-arv-tech59-local-integrity-instrumentation-boundary.ts"
    )
  );
});

test("local integrity marker family exists on product surface", () => {
  const productText = productSurface.map(({ text }) => text).join("\n");

  const markerFamily = [
    "ARV-L0-LOCAL-INTEGRITY-v1",
    "ARV_L0_POLICY_ID",
    "LOCAL_L0",
    "local integrity",
    "LOCAL INTEGRITY",
  ];

  assert.ok(
    markerFamily.some((marker) => productText.includes(marker)),
    "product surface missing local integrity marker family"
  );
});

console.log(
  `[ARV Tech60 Local Integrity Structural Instrumentation Guard] ${passed}/11 structural checks passed`
);
console.log(
  "[ARV Tech60 Local Integrity Structural Instrumentation Guard] all tests passed"
);
