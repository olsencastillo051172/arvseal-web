/**
 * ARV Tech56 Local Integrity Authority Boundary Guard v1 - Smoke Audit
 *
 * Scope: LOCAL_L0 only.
 *
 * ARV canonical meaning:
 * - ARV means Reality Validation Authority.
 *
 * Authority boundary:
 * - "Authority" is brand/doctrine only.
 * - No legal authority claim.
 * - No external authority claim.
 * - No public registry authority claim.
 * - No certificate authority claim.
 *
 * Kernel boundary:
 * - Kernel files must remain local-only.
 * - Kernel files may contain structured policy markers.
 * - Kernel files are not required to contain UI/doctrine wording.
 *
 * Policy:
 * - Marker families only.
 * - No fragile single-token release gate.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path: string): string => {
  assert.equal(existsSync(path), true, `missing required file: ${path}`);
  return readFileSync(path, "utf8");
};

const mustIncludeAny = (label: string, text: string, markers: string[]) => {
  assert.equal(
    markers.some((marker) => text.includes(marker)),
    true,
    `${label} missing required marker family: ${markers.join(" | ")}`
  );
};

const mustNotIncludeAny = (label: string, text: string, markers: RegExp[]) => {
  const hits = markers.filter((marker) => marker.test(text));
  assert.equal(
    hits.length,
    0,
    `${label} contains forbidden external authority marker(s): ${hits
      .map(String)
      .join(" | ")}`
  );
};

const files = {
  tech55: "scripts/smoke-arv-tech55-local-integrity-authority-doctrine.ts",
  bundle: "lib/rva/kernel/bundle.ts",
  checkpoint: "lib/rva/kernel/checkpoint.ts",
  localProof: "lib/rva/kernel/local-proof-export-manifest.ts",
  offlineCertificate: "lib/rva/kernel/offline-certificate.ts",
  packageIndex: "lib/rva/kernel/package-index.ts",
  qrTransferPayload: "lib/rva/kernel/qr-transfer-payload.ts",
  runtimeVerificationRecord: "lib/rva/kernel/runtime-verification-record.ts",
  verifierPayload: "lib/rva/kernel/verifier-payload.ts",
  zipPackage: "lib/rva/kernel/zip-package.ts",
  zipVerificationReceipt: "lib/rva/kernel/zip-verification-receipt.ts",
  demoClient: "app/demo/DemoClient.tsx",
};

const LOCAL_SCOPE_MARKERS = ["LOCAL_L0"];
const POLICY_MARKERS = ["ARV-L0-LOCAL-INTEGRITY-V1", "ARV_L0_POLICY_ID"];
const CANONICAL_NAME = "Reality Validation Authority";

const forbiddenCanonicalDrift = [/Realtime Validation Authority/g];
const forbiddenExternalAuthorityClaims = [
  /\bRFC\s*3161\s+required\b/gi,
  /\bPostgreSQL\s+required\b/gi,
  /\bHSM\s+required\b/gi,
  /\bKMS\s+required\b/gi,
  /\bwallet\s+required\b/gi,
  /\blegal\s+authority\s+claim\b/gi,
  /\bexternal\s+authority\s+claim\b/gi,
  /\bcertificate\s+authority\s+claim\b/gi,
];

const assertCanonicalDoctrine = () => {
  const text = read(files.tech55);

  mustIncludeAny("ARV canonical doctrine", text, [CANONICAL_NAME]);
  mustNotIncludeAny("ARV canonical doctrine", text, forbiddenCanonicalDrift);

  mustIncludeAny("Tech55 scope", text, LOCAL_SCOPE_MARKERS);
  mustIncludeAny("Tech55 policy", text, POLICY_MARKERS);

  console.log("PASS canonical ARV doctrine");
};

const assertKernelLocalOnly = (label: string, path: string) => {
  const text = read(path);

  mustIncludeAny(label, text, LOCAL_SCOPE_MARKERS);

  /*
   * Important:
   * Do not force UI/doctrine wording into kernel files.
   * Kernel files can prove local-only status through structured scope/policy code.
   */
  mustNotIncludeAny(label, text, forbiddenExternalAuthorityClaims);

  console.log(`PASS ${label}`);
};

const assertSurfaceLocalOnly = (label: string, path: string) => {
  const text = read(path);

  mustIncludeAny(label, text, LOCAL_SCOPE_MARKERS);
  mustNotIncludeAny(label, text, forbiddenExternalAuthorityClaims);

  console.log(`PASS ${label}`);
};

const main = () => {
  console.log("[ARV Tech56 Local Integrity Authority Boundary Guard] Smoke Audit");
  console.log("Scope: LOCAL_L0 only.");
  console.log(`ARV: ${CANONICAL_NAME}.`);
  console.log("Authority boundary: brand/doctrine only; no legal/external authority claim.");
  console.log("Policy: marker families only. No fragile single-token release gate.");

  assertCanonicalDoctrine();

  assertKernelLocalOnly("bundle kernel", files.bundle);
  assertKernelLocalOnly("checkpoint kernel", files.checkpoint);
  assertKernelLocalOnly("local proof export manifest", files.localProof);
  assertKernelLocalOnly("offline certificate", files.offlineCertificate);
  assertKernelLocalOnly("package index", files.packageIndex);
  assertKernelLocalOnly("QR transfer payload", files.qrTransferPayload);
  assertKernelLocalOnly("runtime verification record", files.runtimeVerificationRecord);
  assertKernelLocalOnly("verifier payload", files.verifierPayload);
  assertKernelLocalOnly("ZIP package", files.zipPackage);
  assertKernelLocalOnly("ZIP verification receipt", files.zipVerificationReceipt);

  assertSurfaceLocalOnly("DemoClient", files.demoClient);

  console.log("[ARV Tech56 Local Integrity Authority Boundary Guard] all tests passed");
};

main();
