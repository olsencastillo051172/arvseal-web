import crypto from "crypto";

export type MerkleProofItem = {
  sibling: string;
  direction: "left" | "right";
};

function normalizeHex(hex: string): string {
  return String(hex ?? "").trim().toLowerCase();
}

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(normalizeHex(hex), "hex");
}

function sha256HexPair(leftHex: string, rightHex: string): string {
  const left = hexToBuffer(leftHex);
  const right = hexToBuffer(rightHex);
  return crypto.createHash("sha256").update(Buffer.concat([left, right])).digest("hex");
}

export function buildMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return "";
  }

  let level = leaves.map(normalizeHex);

  while (level.length > 1) {
    const next: string[] = [];

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      next.push(sha256HexPair(left, right));
    }

    level = next;
  }

  return level[0];
}

export function buildMerkleProof(leaves: string[], targetIndex: number): MerkleProofItem[] {
  const proof: MerkleProofItem[] = [];
  let index = targetIndex;
  let level = leaves.map(normalizeHex);

  while (level.length > 1) {
    const next: string[] = [];

    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;

      if (i === index) {
        proof.push({
          sibling: right,
          direction: "right"
        });
        index = Math.floor(next.length);
      } else if (i + 1 === index) {
        proof.push({
          sibling: left,
          direction: "left"
        });
        index = Math.floor(next.length);
      }

      next.push(sha256HexPair(left, right));
    }

    level = next;
  }

  return proof;
}
