/**
 * ARV Trust Kernel v1 — deterministic Merkle root.
 *
 * Single-file L0 package:
 * - Merkle root equals the only document hash.
 */

import { assertSha256Hex, concatHexPair, sha256HexFromBytes } from './hash';

export async function buildMerkleRoot(leafHashes: string[]): Promise<string> {
  if (leafHashes.length === 0) {
    throw new Error('Cannot build ARV Merkle root with zero leaves.');
  }

  for (const leaf of leafHashes) {
    assertSha256Hex(leaf, 'Merkle leaf hash');
  }

  if (leafHashes.length === 1) {
    return leafHashes[0].toLowerCase();
  }

  let level = leafHashes.map((hash) => hash.toLowerCase());

  while (level.length > 1) {
    const nextLevel: string[] = [];

    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      nextLevel.push(await sha256HexFromBytes(concatHexPair(left, right)));
    }

    level = nextLevel;
  }

  return level[0];
}
