import {
  ARV_L0_POLICY,
  buildKernelManifest,
  buildMerkleRoot,
  bytesToHex,
  canonicalize,
  hashManifest,
  hexToBytes,
  isL0LocalStatus,
  requiresAuthorityRegistration,
  sha256HexFromBytes,
  sha256HexFromString,
  validateManifest,
  verifyL0Record,
} from '../lib/rva/kernel/index';

let passed = 0;

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`[ARV Kernel] FAILED: ${label}`);
  }

  passed += 1;
}

function assertThrows(fn: () => unknown, label: string): void {
  let thrown = false;

  try {
    fn();
  } catch {
    thrown = true;
  }

  assert(thrown, label);
}

async function main(): Promise<void> {
  const canonicalA = canonicalize({ b: 2, a: 1 });
  const canonicalB = canonicalize({ a: 1, b: 2 });
  assert(canonicalA === canonicalB, 'canonical object order is stable');

  assert(
    canonicalize(['b', 'a']) !== canonicalize(['a', 'b']),
    'canonical arrays preserve order',
  );

  assert(
    canonicalize({ z: { b: 2, a: 1 }, a: true }) === '{"a":true,"z":{"a":1,"b":2}}',
    'canonical nested objects are sorted',
  );

  assert(
    canonicalize({ quote: 'ARV "proof"' }).includes('\\"proof\\"'),
    'canonical strings are escaped',
  );

  assert(
    canonicalize({ a: 1, b: undefined }) === '{"a":1}',
    'canonical undefined object fields are omitted',
  );

  const abcHash = await sha256HexFromString('abc');
  assert(
    abcHash === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'sha256 known vector abc',
  );

  assert(
    abcHash === await sha256HexFromString('abc'),
    'sha256 string hashing is deterministic',
  );

  assert(
    abcHash === await sha256HexFromBytes(new TextEncoder().encode('abc')),
    'sha256 bytes equals string hash',
  );

  assert(hexToBytes('ff00').length === 2, 'hexToBytes converts valid hex');

  assertThrows(() => hexToBytes('abc'), 'hexToBytes rejects odd length');

  assertThrows(() => hexToBytes('zz'), 'hexToBytes rejects non-hex characters');

  assert(bytesToHex(hexToBytes('0a0bff')) === '0a0bff', 'hex round trip works');

  const fileContent = 'ARV Trust Kernel smoke test';
  const fileBytes = new TextEncoder().encode(fileContent);
  const documentHash = await sha256HexFromBytes(fileBytes);

  assert(
    await buildMerkleRoot([documentHash]) === documentHash,
    'single-file Merkle root equals document hash',
  );

  const secondHash = await sha256HexFromString('second leaf');
  const twoLeafRootA = await buildMerkleRoot([documentHash, secondHash]);
  const twoLeafRootB = await buildMerkleRoot([documentHash, secondHash]);

  assert(twoLeafRootA === twoLeafRootB, 'two-leaf Merkle root is deterministic');

  assert(twoLeafRootA !== documentHash, 'two-leaf Merkle root differs from first leaf');

  assert(
    await buildMerkleRoot([documentHash, secondHash, abcHash]) ===
      await buildMerkleRoot([documentHash, secondHash, abcHash]),
    'odd-leaf Merkle root is deterministic',
  );

  await buildMerkleRoot([documentHash]).then(() => assert(true, 'Merkle accepts valid leaf'));

  await buildMerkleRoot([]).then(
    () => assert(false, 'Merkle rejects empty leaves'),
    () => assert(true, 'Merkle rejects empty leaves'),
  );

  await buildMerkleRoot(['not-hex']).then(
    () => assert(false, 'Merkle rejects invalid leaf hash'),
    () => assert(true, 'Merkle rejects invalid leaf hash'),
  );

  const recordId = 'ARV-LOCAL-00000001';

  const manifest = buildKernelManifest({
    record_type: 'ARVRecord',
    record_id: recordId,
    status: 'LOCAL_UNREGISTERED',
    authority: 'Reality Validation Authority',
    canon: 'ARV Core Pack v1',
    exported_at_utc: '2026-05-23T00:00:00.000Z',
    includes: [
      `${recordId}.certificate.html`,
      `${recordId}.certificate.pdf`,
      `${recordId}.verification.json`,
      `${recordId}.manifest.json`,
      `${recordId}.record.json`,
    ],
  });

  assert(manifest.record_id === recordId, 'manifest keeps record id');

  assert(
    manifest.exported_at_utc === '2026-05-23T00:00:00.000Z',
    'manifest accepts deterministic exported_at_utc',
  );

  assert(manifest.includes.length === 5, 'manifest includes five artifacts');

  assert(validateManifest(manifest).ok, 'manifest validates required artifacts');

  assert(
    !validateManifest({ ...manifest, includes: [`${recordId}.record.json`] }).ok,
    'manifest validation fails when required artifacts are missing',
  );

  assert(
    (await hashManifest(manifest)) === (await hashManifest(manifest)),
    'manifest hash is deterministic',
  );

  assert(
    (await hashManifest(manifest)) !==
      (await hashManifest({ ...manifest, record_id: 'ARV-LOCAL-00000002' })),
    'manifest hash changes when record id changes',
  );

  assert(ARV_L0_POLICY.id === 'ARV-L0-LOCAL-INTEGRITY-v1', 'L0 policy id is canonical');

  assert(isL0LocalStatus('LOCAL_UNREGISTERED'), 'LOCAL_UNREGISTERED is L0 local status');

  assert(
    !requiresAuthorityRegistration('LOCAL_UNREGISTERED'),
    'LOCAL_UNREGISTERED does not require authority registration',
  );

  assert(
    requiresAuthorityRegistration('REGISTERED'),
    'REGISTERED requires authority registration',
  );

  const record = {
    id: recordId,
    status: 'LOCAL_UNREGISTERED',
    document_hash: documentHash,
    merkle_root: await buildMerkleRoot([documentHash]),
  };

  const verification = await verifyL0Record(record, fileBytes);

  assert(verification.ok, 'valid L0 record verifies');

  assert(
    verification.computed_document_hash === documentHash,
    'verification computes expected document hash',
  );

  assert(
    verification.computed_merkle_root === documentHash,
    'verification computes expected single-file Merkle root',
  );

  const alteredBytes = new TextEncoder().encode(`${fileContent} altered`);
  const alteredVerification = await verifyL0Record(record, alteredBytes);

  assert(!alteredVerification.ok, 'altered file fails verification');

  assert(
    alteredVerification.reasons.includes('document_hash_mismatch'),
    'altered file reports document_hash_mismatch',
  );

  const missingMerkleVerification = await verifyL0Record({
    id: recordId,
    status: 'LOCAL_UNREGISTERED',
    document_hash: documentHash,
  });

  assert(!missingMerkleVerification.ok, 'missing Merkle root fails verification');

  assert(
    missingMerkleVerification.reasons.includes('missing_merkle_root'),
    'missing Merkle root reports reason',
  );

  const expected = 37;

  if (passed !== expected) {
    throw new Error(`[ARV Kernel] Expected ${expected} tests, got ${passed}.`);
  }

  console.log(`[ARV Kernel] ✓ ${passed}/${expected} tests passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
