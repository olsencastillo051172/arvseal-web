/**
 * ARV Tech57 Local Integrity Canonical Identity Guard v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Locks ARV canonical meaning as Reality Validation Authority.
 * - Prevents RealTime/Realtime naming drift on product/runtime surfaces.
 * - Avoids false positives by not scanning smoke/guard scripts.
 * - Keeps authority as brand/doctrine identity only, not legal/external authority.
 * - Uses marker families, not fragile single-token checks.
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const CANONICAL_ARV = "Reality Validation Authority";

const FORBIDDEN_NAMING_DRIFT = [
  "RealTime Validation Authority",
  "Realtime Validation Authority",
];

const LOCAL_INTEGRITY_MARKER_FAMILIES = [
  "ARV-L0-LOCAL-INTEGRITY-V1",
  "ARV_L0_POLICY_ID",
  "LOCAL INTEGRITY",
  "local integrity",
];

const ROOT = process.cwd();

const PRODUCT_DIRS = [
  "app",
  "components",
  "lib",
];

const PRODUCT_FILE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".md",
  ".mdx",
  ".json",
]);

function read(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function collectProductFiles(dir: string): string[] {
  const absolute = path.join(ROOT, dir);

  if (!existsSync(absolute)) {
    return [];
  }

  const out: string[] = [];

  function walk(current: string): void {
    const entries = readdirSync(current);

    for (const entry of entries) {
      const full = path.join(current, entry);
      const relative = path.relative(ROOT, full).replaceAll("\\", "/");

      if (
        relative.includes("/node_modules/") ||
        relative.includes("/.next/") ||
        relative.includes("/.git/") ||
        relative.startsWith("scripts/")
      ) {
        continue;
      }

      const stat = statSync(full);

      if (stat.isDirectory()) {
        walk(full);
        continue;
      }

      const ext = path.extname(full);

      if (PRODUCT_FILE_EXTENSIONS.has(ext)) {
        out.push(full);
      }
    }
  }

  walk(absolute);
  return out;
}

function hasAnyFamily(text: string, families: string[]): boolean {
  return families.some((marker) => text.includes(marker));
}

function assertNoNamingDrift(filePath: string, text: string): void {
  const hits = FORBIDDEN_NAMING_DRIFT.filter((marker) => text.includes(marker));

  assert.equal(
    hits.length,
    0,
    `${path.relative(ROOT, filePath)} contains forbidden naming drift marker(s): ${hits.join(" | ")}`
  );
}

function assertCanonicalIdentity(): void {
  assert.equal(CANONICAL_ARV, "Reality Validation Authority");
  assert.notEqual(CANONICAL_ARV, "Realtime Validation Authority");
  assert.notEqual(CANONICAL_ARV, "RealTime Validation Authority");
}

function assertPreviousDoctrineExists(): void {
  const doctrineFile = path.join(ROOT, "scripts/smoke-arv-tech55-local-integrity-authority-doctrine.ts");
  const boundaryFile = path.join(ROOT, "scripts/smoke-arv-tech56-local-integrity-authority-boundary-guard.ts");

  assert.equal(existsSync(doctrineFile), true, "missing Tech55 authority doctrine smoke file");
  assert.equal(existsSync(boundaryFile), true, "missing Tech56 authority boundary guard smoke file");

  const doctrine = read(doctrineFile);
  const boundary = read(boundaryFile);

  assert.equal(doctrine.includes("Reality Validation Authority"), true, "Tech55 must preserve canonical ARV meaning");
  assert.equal(boundary.includes("Reality Validation Authority"), true, "Tech56 must preserve canonical ARV meaning");
}

function assertProductSurfacesDoNotDrift(): void {
  const files = PRODUCT_DIRS.flatMap(collectProductFiles);

  for (const file of files) {
    const text = read(file);
    assertNoNamingDrift(file, text);
  }
}

function assertLocalIntegrityFamilyStillExistsSomewhere(): void {
  const files = PRODUCT_DIRS.flatMap(collectProductFiles);
  const combined = files.map(read).join("\n");

  assert.equal(
    hasAnyFamily(combined, LOCAL_INTEGRITY_MARKER_FAMILIES),
    true,
    `product surfaces missing required local integrity marker family: ${LOCAL_INTEGRITY_MARKER_FAMILIES.join(" | ")}`
  );
}

function main(): void {
  console.log("[ARV Tech57 Local Integrity Canonical Identity Guard] Smoke Audit");
  console.log("Scope: LOCAL_L0 only.");
  console.log("ARV: Reality Validation Authority.");
  console.log("Authority boundary: brand/doctrine only; no legal/external authority claim.");
  console.log("Policy: marker families only. No fragile single-token release gate.");

  assertCanonicalIdentity();
  console.log("PASS canonical ARV identity");

  assertPreviousDoctrineExists();
  console.log("PASS Tech55/Tech56 canonical doctrine continuity");

  assertProductSurfacesDoNotDrift();
  console.log("PASS no Realtime/RealTime naming drift on product surfaces");

  assertLocalIntegrityFamilyStillExistsSomewhere();
  console.log("PASS local integrity marker family exists on product surfaces");

  console.log("[ARV Tech57 Local Integrity Canonical Identity Guard] all tests passed");
}

main();
