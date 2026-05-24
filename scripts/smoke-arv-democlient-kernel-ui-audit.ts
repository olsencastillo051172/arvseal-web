/**
 * ARV DemoClient Kernel UI Runtime Audit v1 — Smoke Test
 * Scope: LOCAL_L0 only.
 *
 * This test statically audits app/demo/DemoClient.tsx to ensure the visible
 * DemoClient runtime actions remain connected to the formal ARV kernel helpers.
 *
 * It does NOT render React and does NOT change UI.
 *
 * Run:
 * npx tsx scripts/smoke-arv-democlient-kernel-ui-audit.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed += 1;
  } catch (error: unknown) {
    console.log(`  ✗  ${name}`);
    console.log(`     ${error instanceof Error ? error.message : String(error)}`);
    failed += 1;
  }
}

function assert(condition: boolean, message?: string): void {
  if (!condition) throw new Error(message ?? 'assertion failed');
}

function readDemoClient(): string {
  const path = resolve(process.cwd(), 'app/demo/DemoClient.tsx');
  return readFileSync(path, 'utf8');
}

function includesAll(source: string, values: string[]): boolean {
  return values.every((value) => source.includes(value));
}

function extractFunctionBlock(source: string, functionName: string): string {
  const marker = `const ${functionName} =`;
  const markerIndex = source.indexOf(marker);

  if (markerIndex < 0) {
    throw new Error(`Could not find ${functionName}`);
  }

  const openBraceIndex = source.indexOf('{', markerIndex);

  if (openBraceIndex < 0) {
    throw new Error(`Could not find opening brace for ${functionName}`);
  }

  let depth = 0;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];

    if (char === '{') depth += 1;

    if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(markerIndex, index + 1);
      }
    }
  }

  throw new Error(`Could not extract function block for ${functionName}`);
}

function extractArtifactsImportBlock(source: string): string {
  const startMarker = "import {";
  const fromMarker = "} from '@/lib/rva/artifacts';";

  const start = source.indexOf(startMarker);
  const end = source.indexOf(fromMarker, start);

  if (start < 0 || end < 0) {
    throw new Error('Could not extract artifacts import block');
  }

  return source.slice(start, end + fromMarker.length);
}

function assertDoesNotContainAny(source: string, forbidden: string[], label: string): void {
  for (const item of forbidden) {
    assert(!source.includes(item), `${label} must not contain ${item}`);
  }
}

function main(): void {
  console.log('\n[ARV DemoClient Kernel UI Audit v1 — Smoke Test]');
  console.log('─'.repeat(72));

  const demoClient = readDemoClient();

  const artifactsImport = extractArtifactsImportBlock(demoClient);
  const handleOpenCertificate = extractFunctionBlock(demoClient, 'handleOpenCertificate');
  const handleExportPdf = extractFunctionBlock(demoClient, 'handleExportPdf');
  const handleExportZip = extractFunctionBlock(demoClient, 'handleExportZip');
  const handleOpenVerification = extractFunctionBlock(demoClient, 'handleOpenVerification');
  const processFile = extractFunctionBlock(demoClient, 'processFile');

  test('DemoClient imports the required ARV kernel-backed helpers', () => {
    assert(includesAll(artifactsImport, [
      'buildKernelEvidencePackageZipFromFile',
      'buildKernelOfflineCertificateHtmlFromFile',
      'buildKernelPublicVerificationRecordFromFile',
      'buildKernelCertificatePdfFromFile',
      'buildQRImage',
      'buildRecordJson',
    ]));
  });

  test('DemoClient does not import legacy export helpers from artifacts', () => {
    assert(!artifactsImport.includes('buildEvidencePackageZip'), 'must not import buildEvidencePackageZip');
    assert(!artifactsImport.includes('buildCertificatePdf,'), 'must not import buildCertificatePdf');
    assert(!artifactsImport.includes('buildPublicVerificationRecord'), 'must not import buildPublicVerificationRecord');
  });

  test('DemoClient stores the original source File in React state', () => {
    assert(demoClient.includes('const [sourceFile, setSourceFile] = useState<File | null>(null);'));
  });

  test('processFile stores sourceFile after building the local record', () => {
    assert(processFile.includes('const nextRecord = await buildLocalGigRecord(file, hash);'));
    assert(processFile.includes('setRecord(nextRecord);'));
    assert(processFile.includes('setSourceFile(file);'));
  });

  test('QR rendering remains driven by record.qr.payload', () => {
    assert(demoClient.includes('if (record?.qr?.payload)'));
    assert(demoClient.includes('buildQRImage(record.qr.payload)'));
  });

  test('View Certificate uses the kernel offline certificate helper', () => {
    assert(handleOpenCertificate.includes('sourceFile'));
    assert(handleOpenCertificate.includes('buildKernelOfflineCertificateHtmlFromFile(record, sourceFile)'));
    assert(handleOpenCertificate.includes('openHtmlInNewTab(html)'));

    assertDoesNotContainAny(handleOpenCertificate, [
      'buildCertificateHtmlWithQR',
      'buildCertificateHtml(',
      'buildPublicVerificationRecord',
      'buildEvidencePackageZip',
    ], 'handleOpenCertificate');
  });

  test('Download Certificate PDF uses the kernel certificate PDF helper', () => {
    assert(handleExportPdf.includes('sourceFile'));
    assert(handleExportPdf.includes('buildKernelCertificatePdfFromFile(record, sourceFile)'));
    assert(handleExportPdf.includes("type: 'application/pdf'"));
    assert(handleExportPdf.includes('.certificate.pdf'));

    assertDoesNotContainAny(handleExportPdf, [
      'buildCertificatePdf(record)',
      'buildCertificateHtmlWithQR',
      'buildPublicVerificationRecord',
      'buildEvidencePackageZip',
    ], 'handleExportPdf');
  });

  test('Download Evidence Package ZIP uses the kernel ZIP helper', () => {
    assert(handleExportZip.includes('sourceFile'));
    assert(handleExportZip.includes('buildKernelEvidencePackageZipFromFile(record, sourceFile)'));
    assert(handleExportZip.includes("type: 'application/zip'"));
    assert(handleExportZip.includes('.evidence-package.zip'));

    assertDoesNotContainAny(handleExportZip, [
      'buildEvidencePackageZip(record)',
      'buildCertificatePdf',
      'buildPublicVerificationRecord',
      'buildCertificateHtmlWithQR',
    ], 'handleExportZip');
  });

  test('View Verification Payload uses the file-backed consolidated kernel helper', () => {
    assert(handleOpenVerification.includes('sourceFile'));
    assert(handleOpenVerification.includes('buildKernelPublicVerificationRecordFromFile(record, sourceFile)'));
    assert(handleOpenVerification.includes('openTextInNewTab(kernelVerificationJson)'));

    assertDoesNotContainAny(handleOpenVerification, [
      'buildKernelPublicVerificationRecord(record)',
      'buildPublicVerificationRecord',
      'buildEvidencePackageZip',
      'buildCertificateHtmlWithQR',
    ], 'handleOpenVerification');
  });

  test('kernel actions guard against missing sourceFile', () => {
    assert(handleOpenCertificate.includes('Original source file is not available'));
    assert(handleExportPdf.includes('Original source file is not available'));
    assert(handleExportZip.includes('Original source file is not available'));
    assert(handleOpenVerification.includes('Original source file is not available'));
  });

  test('record JSON viewer remains record-only and does not claim kernel export', () => {
    const handleOpenRecord = extractFunctionBlock(demoClient, 'handleOpenRecord');

    assert(handleOpenRecord.includes('openTextInNewTab(recordJson)'));
    assert(!handleOpenRecord.includes('sourceFile'));
    assert(!handleOpenRecord.includes('buildKernel'));
  });

  test('DemoClient still creates ARV1 QR transfer payload through the kernel', () => {
    assert(demoClient.includes("import { createQrTransferPayload } from '@/lib/rva/kernel/qr-transfer-payload';"));
    assert(demoClient.includes('const qrTransfer = await createQrTransferPayload({'));
    assert(demoClient.includes('const qrPayload = qrTransfer.transfer_string;'));
    assert(demoClient.includes('payload: qrPayload'));
  });

  test('DemoClient remains LOCAL_L0 and does not claim authority registration', () => {
    assert(demoClient.includes("'LOCAL_L0'"));
    assert(demoClient.includes("'LOCAL_UNREGISTERED'"));
    assert(demoClient.includes("'ARV-L0-LOCAL-INTEGRITY-v1'"));

    assert(!demoClient.includes('ARV_REGISTERED'));
    assert(!demoClient.includes('AUTHORITY_REGISTERED'));
    assert(!demoClient.includes('RFC3161'));
  });

  test('DemoClient does not use legacy helpers in runtime button handlers', () => {
    const combinedHandlers = [
      handleOpenCertificate,
      handleExportPdf,
      handleExportZip,
      handleOpenVerification,
    ].join('\n');

    assertDoesNotContainAny(combinedHandlers, [
      'buildEvidencePackageZip',
      'buildCertificatePdf(record)',
      'buildPublicVerificationRecord',
      'buildCertificateHtmlWithQR',
    ], 'runtime button handlers');
  });

  console.log('\n' + '─'.repeat(72));

  const total = passed + failed;

  if (failed === 0) {
    console.log(`[ARV DemoClient Kernel UI Audit] all tests passed (${passed}/${total})\n`);
  } else {
    console.log(`[ARV DemoClient Kernel UI Audit] ✗ ${passed}/${total} passed, ${failed} FAILED\n`);
    process.exit(1);
  }
}

main();