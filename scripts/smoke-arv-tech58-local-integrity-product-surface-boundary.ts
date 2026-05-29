/**
 * ARV Tech58 Local Integrity Product Surface Boundary v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * Purpose:
 * - Defines what counts as ARV product surface.
 * - Prevents guards from scanning smoke/guard scripts as if they were product code.
 * - Confirms product-facing surfaces preserve Reality Validation Authority identity.
 * - Confirms local-only integrity doctrine stays separated from test instrumentation.
 * - Keeps ARV local integrity checks deterministic and non-fragile.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_PRODUCT_SURFACES = [
  "app",
  "lib/rva/kernel",
];

const EXCLUDED_INSTRUMENTAL_SURFACES = [
  "scripts",
  "node_modules",
  ".next",
  ".git",
];

const CANONICAL_IDENTITY_FAMILY = [
  "Reality Validation Authority",
  "ARV",
  "LOCAL_L0",
  "ARV-L0-LOCAL-INTEGRITY-v1",
  "local integrity",
];

const FORBIDDEN_NAMING_DRIFT = [
  "Realtime Validation Authority",
  "RealTime Validation Authority",
];

const FORBIDDEN_EXTERNAL_AUTHORITY_CLAIMS = [
  /\bHSM\s+required\b/i,
  /\bKMS\s+required\b/i,
  /\bPostgreSQL\s+required\b/i,
  /\bwallet\s+required\b/i,
  /\bMetaMask\s+required\b/i,
  /\bRFC\s*3161\s+required\b/i,
];

const read = (file: string): string => {
  assert.equal(existsSync(file), true, `missing required file: ${file}`);
  return readFileSync(file, "utf8");
};

const walkFiles = (dir: string): string[] => {
  if (!existsSync(dir)) return [];

  const out: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);

    if (st.isDirectory()) {
      out.push(...walkFiles(full));
      continue;
    }

    if (st.isFile() && /\.(ts|tsx|js|jsx|md|html|json)$/.test(full)) {
      out.push(full);
    }
  }

  return out;
};

const toPosix = (value: string): string => value.replaceAll("\\", "/");

const productFiles = (): string[] => {
  const files: string[] = [];

  for (const surface of REQUIRED_PRODUCT_SURFACES) {
    files.push(...walkFiles(path.join(ROOT, surface)));
  }

  return files.filter((file) => {
    const rel = toPosix(path.relative(ROOT, file));
    return !EXCLUDED_INSTRUMENTAL_SURFACES.some((excluded) => {
      return rel === excluded || rel.startsWith(`${excluded}/`);
    });
  });
};

const instrumentalFiles = (): string[] => {
  const files: string[] = [];

  for (const surface of EXCLUDED_INSTRUMENTAL_SURFACES) {
    files.push(...walkFiles(path.join(ROOT, surface)));
  }

  return files;
};

const hasAny = (haystack: string, needles: string[]): boolean => {
  return needles.some((needle) => haystack.includes(needle));
};

const assertRequiredSurfacesExist = (): void => {
  for (const surface of REQUIRED_PRODUCT_SURFACES) {
    assert.equal(
      existsSync(path.join(ROOT, surface)),
      true,
      `missing required product surface: ${surface}`,
    );
  }
};

const assertNoInstrumentalSurfaceLeaksIntoProductSet = (): void => {
  const files = productFiles();

  for (const file of files) {
    const rel = toPosix(path.relative(ROOT, file));

    for (const excluded of EXCLUDED_INSTRUMENTAL_SURFACES) {
      assert.equal(
        rel === excluded || rel.startsWith(`${excluded}/`),
        false,
        `instrumental surface leaked into product scan: ${rel}`,
      );
    }
  }
};

const assertProductSurfaceHasLocalIntegrityFamily = (): void => {
  const files = productFiles();
  assert.ok(files.length > 0, "product surface scan returned no files");

  const combined = files.map(read).join("\n");

  assert.equal(
    hasAny(combined, CANONICAL_IDENTITY_FAMILY),
    true,
    `product surface missing required local integrity marker family: ${CANONICAL_IDENTITY_FAMILY.join(" | ")}`,
  );
};

const assertNoCanonicalNamingDriftOnProductSurface = (): void => {
  const files = productFiles();

  for (const file of files) {
    const body = read(file);

    for (const forbidden of FORBIDDEN_NAMING_DRIFT) {
      assert.equal(
        body.includes(forbidden),
        false,
        `${toPosix(path.relative(ROOT, file))} contains forbidden naming drift marker: ${forbidden}`,
      );
    }
  }
};

const assertNoExternalAuthorityRequirementOnProductSurface = (): void => {
  const files = productFiles();

  for (const file of files) {
    const body = read(file);

    for (const forbidden of FORBIDDEN_EXTERNAL_AUTHORITY_CLAIMS) {
      assert.equal(
        forbidden.test(body),
        false,
        `${toPosix(path.relative(ROOT, file))} contains forbidden external authority requirement marker: ${forbidden}`,
      );
    }
  }
};

const assertScriptsRemainInstrumentalOnly = (): void => {
  const files = instrumentalFiles();

  assert.equal(
    files.some((file) => toPosix(path.relative(ROOT, file)).startsWith("scripts/")),
    true,
    "instrumental scripts surface was not detected",
  );

  assert.equal(
    productFiles().some((file) => toPosix(path.relative(ROOT, file)).startsWith("scripts/")),
    false,
    "scripts/ must never be scanned as product surface",
  );
};

async function main(): Promise<void> {
  console.log("[ARV Tech58 Local Integrity Product Surface Boundary] Smoke Audit");
  console.log("Scope: LOCAL_L0 only.");
  console.log("ARV: Reality Validation Authority.");
  console.log("Product surface: app/ + lib/rva/kernel/ only.");
  console.log("Instrumentation excluded: scripts/, node_modules/, .next/, .git/.");

  assertRequiredSurfacesExist();
  console.log("PASS required product surfaces exist");

  assertNoInstrumentalSurfaceLeaksIntoProductSet();
  console.log("PASS no instrumental surface leaked into product scan");

  assertProductSurfaceHasLocalIntegrityFamily();
  console.log("PASS product surface has local integrity marker family");

  assertNoCanonicalNamingDriftOnProductSurface();
  console.log("PASS no Realtime/RealTime naming drift on product surface");

  assertNoExternalAuthorityRequirementOnProductSurface();
  console.log("PASS no external authority requirement on product surface");

  assertScriptsRemainInstrumentalOnly();
  console.log("PASS scripts remain instrumental only");

  console.log("[ARV Tech58 Local Integrity Product Surface Boundary] all tests passed");
}

main();
