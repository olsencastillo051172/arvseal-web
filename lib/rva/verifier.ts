export type MerkleProofItem = {
  sibling: string;
  direction: "left" | "right";
};

export type VerificationResult = {
  isValid: boolean;
  expectedRoot: string;
  computedRoot: string;
  steps?: string[];
};

function normalizeHex(hex: string): string {
  return String(hex ?? "").trim().toLowerCase();
}

async function sha256Hex(hexA: string, hexB: string) {
  const cleanA = normalizeHex(hexA);
  const cleanB = normalizeHex(hexB);

  const bytes = new Uint8Array(
    cleanA.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
      .concat(cleanB.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
  );

  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyMerkleProof(
  leaf: string,
  proof: MerkleProofItem[],
  expectedRoot: string
): Promise<VerificationResult> {
  const steps: string[] = [];
  let current = normalizeHex(leaf);
  const normalizedExpected = normalizeHex(expectedRoot);

  steps.push(`leaf=${current}`);

  for (let idx = 0; idx < proof.length; idx++) {
  const p = proof[idx];
    const sibling = normalizeHex(p.sibling);

    if (p.direction === "left") {
      steps.push(`step ${idx + 1}: left sibling=${sibling}`);
      current = await sha256Hex(sibling, current);
    } else {
      steps.push(`step ${idx + 1}: right sibling=${sibling}`);
      current = await sha256Hex(current, sibling);
    }

    steps.push(`step ${idx + 1}: root=${current}`);
  }

  const normalizedComputed = normalizeHex(current);

  return {
    isValid: normalizedComputed === normalizedExpected,
    expectedRoot: normalizedExpected,
    computedRoot: normalizedComputed,
    steps
  };
}


