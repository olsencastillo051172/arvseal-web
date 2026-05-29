/**
 * ARV Tech59 Local Integrity Instrumentation Boundary Guard v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Separates product surface from smoke/test instrumentation.
 * - Prevents scripts/ from being scanned as product source.
 * - Confirms local integrity markers exist on product surface.
 * - Confirms Reality Validation Authority remains canonical.
 * - Prevents Realtime/RealTime naming drift on product surface.
 * - Prevents wallet/legal/external authority dependency claims on product surface.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const PRODUCT_SURFACE = [
  "app/demo/DemoClient.tsx",
  "lib/rva/kernel",
];

const INSTRUMENTATION_SURFACE = [
  "scripts",
];

const MARKER_FAMILIES = [
  "ARV-L0-LOCAL-INTEGRITY-v1",
  "ARV_L0_POLICY_ID",
  "LOCAL INTEGRITY",
  "local integrity",
  "LOCAL_L0",
];

const FORBIDDEN_NAMING_DRIFT = [
  "Realtime Validation Authority",
  "RealTime Validation Authority",
  "Real Time Validation Authority",
];

const FORBIDDEN_EXTERNAL_AUTHORITY_CLAIMS = [
  /\bMetaMask\b/i,
  /\bwallet\s+required\b/i,
  /\bwallet\s+dependency\b/i,
  /\bWeb3\s+required\b/i,
  /\bethers\s+required\b/i,
  /\bHSM\s+required\b/i,
  /\bKMS\s+required\b/i,
  /\bPostgreSQL\s+required\b/i,
  /\bRFC\s*3161\s+required\b/i,
  /\blegal\/external\s+authority\s+claim\b/i,
];

const read = (filePath: string): string => {
  assert.equal(existsSync(filePath), true, `missing required file: ${filePath}`);
  return readFileSync(filePath, "utf8");
};

const collectTsFiles = (target: string): string[] => {
  if (!existsSync(target)) return [];

  const current = statSync(target);

  if (current.isFile()) {
    return /\.(ts|tsx)$/.test(target) ? [target] : [];
  }

  const out: string[] = [];

  for (const entry of readdirSync(target)) {
    const full = path.join(target, entry);
    const stats = statSync(full);

    if (stats.isDirectory()) {
      out.push(...collectTsFiles(full));
      continue;
    }

    if (stats.isFile() && /\.(ts|tsx)$/.test(full)) {
      out.push(full);
    }
  }

  return out;
};

const normalize = (value: string): string =>
  value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const hasAny = (value: string, markers: string[]): boolean =>
  markers.some((marker) => value.includes(marker));

const assertNoFamily = (label: string, value: string, families: string[]): void => {
  const found = families.filter((family) => value.includes(family));
  assert.equal(
    found.length,
    0,
    `${label} contains forbidden marker family: ${found.join(" | ")}`
  );
};

const assertNoPatternFamily = (
  label: string,
  value: string,
  patterns: RegExp[],
): void => {
  const found = patterns.filter((pattern) => pattern.test(value)).map(String);
  assert.equal(
    found.length,
    0,
    `${label} contains forbidden external dependency/authority marker(s): ${found.join(" | ")}`
  );
};

const assertProductSurfaceDoesNotIncludeInstrumentation = (): void => {
  for (const productPath of PRODUCT_SURFACE) {
    const normalized = productPath.replace(/\\/g, "/");
    for (const instrumentationPath of INSTRUMENTATION_SURFACE) {
      assert.equal(
        normalized.startsWith(`${instrumentationPath}/`) || normalized === instrumentationPath,
        false,
        `product surface must not include instrumentation path: ${productPath}`
      );
    }
  }
};

const assertInstrumentationSurfaceExistsButIsExcluded = (): void => {
  for (const instrumentationPath of INSTRUMENTATION_SURFACE) {
    assert.equal(
      existsSync(instrumentationPath),
      true,
      `missing instrumentation surface: ${instrumentationPath}`
    );
  }

  const productFiles = PRODUCT_SURFACE.flatMap(collectTsFiles);

  for (const file of productFiles) {
    const normalized = file.replace(/\\/g, "/");
    assert.equal(
      normalized.startsWith("scripts/"),
      false,
      `instrumentation leaked into product scan: ${file}`
    );
  }
};

const assertProductSurfaceHasLocalIntegrityMarkers = (): void => {
  const productFiles = PRODUCT_SURFACE.flatMap(collectTsFiles);
  assert.ok(productFiles.length > 0, "product surface scan returned no files");

  const combined = normalize(productFiles.map(read).join("\n"));

  assert.equal(
    hasAny(combined, MARKER_FAMILIES),
    true,
    `product surface missing local integrity marker family: ${MARKER_FAMILIES.join(" | ")}`
  );
};

const assertProductSurfaceNamingBoundary = (): void => {
  const productFiles = PRODUCT_SURFACE.flatMap(collectTsFiles);

  for (const file of productFiles) {
    const content = normalize(read(file));
    assertNoFamily(file, content, FORBIDDEN_NAMING_DRIFT);
  }
};

const assertProductSurfaceAuthorityBoundary = (): void => {
  const productFiles = PRODUCT_SURFACE.flatMap(collectTsFiles);

  for (const file of productFiles) {
    const content = normalize(read(file));
    assertNoPatternFamily(file, content, FORBIDDEN_EXTERNAL_AUTHORITY_CLAIMS);
  }
};

const main = (): void => {
  console.log("[ARV Tech59 Local Integrity Instrumentation Boundary Guard] Smoke Audit");
  console.log("Scope: LOCAL_L0 only.");
  console.log("ARV: Reality Validation Authority.");
  console.log("Boundary: product surface excludes smoke/test instrumentation.");
  console.log("Policy: marker families only. No fragile single-token release gate.");

  assertProductSurfaceDoesNotIncludeInstrumentation();
  console.log("PASS product surface excludes instrumentation paths");

  assertInstrumentationSurfaceExistsButIsExcluded();
  console.log("PASS scripts remain instrumentation only");

  assertProductSurfaceHasLocalIntegrityMarkers();
  console.log("PASS product surface local integrity marker family");

  assertProductSurfaceNamingBoundary();
  console.log("PASS no Realtime/RealTime naming drift on product surface");

  assertProductSurfaceAuthorityBoundary();
  console.log("PASS no external authority dependency claim on product surface");

  console.log("[ARV Tech59 Local Integrity Instrumentation Boundary Guard] all tests passed");
};

main();
