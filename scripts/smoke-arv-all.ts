/**
 * ARV Smoke Suite Runner v1
 *
 * Runs all ARV smoke tests in the correct order.
 *
 * Run:
 * npx tsx scripts/smoke-arv-all.ts
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

type SmokeTest = {
  name: string;
  script: string;
};

const smokeTests: SmokeTest[] = [
  { name: 'ARV Kernel', script: 'scripts/smoke-arv-kernel.ts' },
  { name: 'ARV Signing', script: 'scripts/smoke-arv-signing.ts' },
  { name: 'ARV Checkpoint', script: 'scripts/smoke-arv-checkpoint.ts' },
  { name: 'ARV Bundle', script: 'scripts/smoke-arv-bundle.ts' },
  { name: 'ARV Verifier Payload', script: 'scripts/smoke-arv-verifier-payload.ts' },
  { name: 'ARV Offline Certificate', script: 'scripts/smoke-arv-offline-certificate.ts' },
  { name: 'ARV Package Index', script: 'scripts/smoke-arv-package-index.ts' },
  { name: 'ARV ZIP Package', script: 'scripts/smoke-arv-zip-package.ts' },
  { name: 'ARV QR Transfer Payload', script: 'scripts/smoke-arv-qr-transfer-payload.ts' },
  { name: 'ARV DemoClient Kernel Pipeline', script: 'scripts/smoke-arv-democlient-kernel-pipeline.ts' },
  { name: 'ARV DemoClient Kernel UI Audit', script: 'scripts/smoke-arv-democlient-kernel-ui-audit.ts' },
];

function normalizeScriptPath(script: string): string {
  return script.split('/').join(path.sep);
}

function localTsxCliPath(): string {
  return path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
}

function printHeader(): void {
  console.log('\n[ARV Smoke Suite Runner v1]');
  console.log('='.repeat(76));
  console.log(`Total smoke tests: ${smokeTests.length}`);
  console.log('='.repeat(76));
}

function printFooter(passed: number, failed: number, startedAt: number): void {
  const elapsedMs = Date.now() - startedAt;
  const elapsedSeconds = (elapsedMs / 1000).toFixed(2);
  const total = passed + failed;

  console.log('\n' + '='.repeat(76));

  if (failed === 0) {
    console.log(`[ARV Smoke Suite] all suites passed (${passed}/${total}) in ${elapsedSeconds}s`);
  } else {
    console.log(`[ARV Smoke Suite] ${passed}/${total} passed, ${failed} FAILED in ${elapsedSeconds}s`);
  }

  console.log('='.repeat(76) + '\n');
}

function runSmokeTest(test: SmokeTest, index: number): boolean {
  const scriptPath = normalizeScriptPath(test.script);
  const tsxCli = localTsxCliPath();

  console.log('\n' + '-'.repeat(76));
  console.log(`[${index + 1}/${smokeTests.length}] ${test.name}`);
  console.log(`Command: node ${tsxCli} ${scriptPath}`);
  console.log('-'.repeat(76));

  if (!existsSync(tsxCli)) {
    console.log(`\n✗ Local tsx CLI not found at: ${tsxCli}`);
    return false;
  }

  if (!existsSync(scriptPath)) {
    console.log(`\n✗ Smoke test script not found: ${scriptPath}`);
    return false;
  }

  const result = spawnSync(process.execPath, [tsxCli, scriptPath], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.log(`\n✗ ${test.name} failed to start`);
    console.log(result.error.message);
    return false;
  }

  if (result.status !== 0) {
    console.log(`\n✗ ${test.name} failed with exit code ${result.status}`);
    return false;
  }

  console.log(`\n✓ ${test.name} passed`);
  return true;
}

function main(): void {
  const startedAt = Date.now();
  let passed = 0;
  let failed = 0;

  printHeader();

  for (let index = 0; index < smokeTests.length; index += 1) {
    const ok = runSmokeTest(smokeTests[index], index);

    if (ok) passed += 1;
    else failed += 1;
  }

  printFooter(passed, failed, startedAt);

  if (failed > 0) {
    process.exit(1);
  }
}

main();