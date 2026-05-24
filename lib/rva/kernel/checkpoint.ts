/**
 * ARV Trust Kernel — Witness Checkpoint v1
 * Scope: LOCAL_L0 only.
 * No ARV Authority · No RFC 3161 · No PostgreSQL · No HSM/KMS.
 * Append-only tamper-evident local checkpoint chain. Fully offline.
 */
import { canonicalize }        from './canonicalize';
import { sha256HexFromString } from './hash';

function isValidHex64(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

export type ARVCheckpointScope     = 'LOCAL_L0';
export type ARVCheckpointAlgorithm = 'SHA-256';

export interface ARVWitnessCheckpointInput {
  sequence:                  number;
  evidence_id:               string;
  payload_hash:              string;
  envelope_hash:             string;
  previous_checkpoint_hash?: string | null;
  created_at_utc?:           string;
  witness?:                  string;
}

export interface ARVWitnessCheckpoint {
  scope:                    ARVCheckpointScope;
  algorithm:                ARVCheckpointAlgorithm;
  sequence:                 number;
  evidence_id:              string;
  payload_hash:             string;
  envelope_hash:            string;
  previous_checkpoint_hash: string | null;
  checkpoint_hash:          string;
  created_at_utc:           string;
  witness:                  string;
}

/** Canonical checkpoint body — excludes checkpoint_hash to avoid circular preimage. */
function buildCheckpointBody(
  cp: Omit<ARVWitnessCheckpoint, 'checkpoint_hash'>,
): string {
  return canonicalize({
    scope:                    cp.scope,
    algorithm:                cp.algorithm,
    sequence:                 cp.sequence,
    evidence_id:              cp.evidence_id,
    payload_hash:             cp.payload_hash,
    envelope_hash:            cp.envelope_hash,
    previous_checkpoint_hash: cp.previous_checkpoint_hash,
    created_at_utc:           cp.created_at_utc,
    witness:                  cp.witness,
  });
}

async function computeCheckpointHash(
  cp: Omit<ARVWitnessCheckpoint, 'checkpoint_hash'>,
): Promise<string> {
  return sha256HexFromString(buildCheckpointBody(cp));
}

/** SHA-256 of canonical JSON of an ARVSignedEnvelope (or any object). */
export async function hashSignedEnvelope(envelope: unknown): Promise<string> {
  return sha256HexFromString(canonicalize(envelope));
}

/** Hard validation of input fields before checkpoint creation. */
function validateInput(input: ARVWitnessCheckpointInput): void {
  if (!Number.isInteger(input.sequence) || input.sequence < 1)
    throw new Error(`ARV checkpoint: sequence must be a positive integer, got ${input.sequence}`);
  if (!input.evidence_id?.trim())
    throw new Error('ARV checkpoint: evidence_id is required');
  if (!isValidHex64(input.payload_hash))
    throw new Error('ARV checkpoint: payload_hash must be 64-char lowercase hex');
  if (!isValidHex64(input.envelope_hash))
    throw new Error('ARV checkpoint: envelope_hash must be 64-char lowercase hex');
  if (input.previous_checkpoint_hash != null &&
      !isValidHex64(input.previous_checkpoint_hash))
    throw new Error('ARV checkpoint: previous_checkpoint_hash must be 64-char lowercase hex or null');
}

export async function createWitnessCheckpoint(
  input: ARVWitnessCheckpointInput,
): Promise<ARVWitnessCheckpoint> {
  validateInput(input);
  const body: Omit<ARVWitnessCheckpoint, 'checkpoint_hash'> = {
    scope:                    'LOCAL_L0',
    algorithm:                'SHA-256',
    sequence:                 input.sequence,
    evidence_id:              input.evidence_id,
    payload_hash:             input.payload_hash,
    envelope_hash:            input.envelope_hash,
    previous_checkpoint_hash: input.previous_checkpoint_hash ?? null,
    created_at_utc:           input.created_at_utc ?? new Date().toISOString(),
    witness:                  input.witness ?? 'ARV-LOCAL',
  };
  return { ...body, checkpoint_hash: await computeCheckpointHash(body) };
}

/**
 * Verify a single checkpoint:
 *   1. scope === "LOCAL_L0"
 *   2. algorithm === "SHA-256"
 *   3. sequence >= 1
 *   4. payload_hash is valid hex64
 *   5. envelope_hash is valid hex64
 *   6. previous_checkpoint_hash is null or valid hex64
 *   7. checkpoint_hash recomputes correctly from canonical body
 *   8. created_at_utc present
 *   9. witness present
 */
export async function verifyWitnessCheckpoint(
  checkpoint: ARVWitnessCheckpoint,
): Promise<boolean> {
  try {
    if (checkpoint.scope     !== 'LOCAL_L0') return false;
    if (checkpoint.algorithm !== 'SHA-256')  return false;
    if (!Number.isInteger(checkpoint.sequence) || checkpoint.sequence < 1) return false;
    if (!isValidHex64(checkpoint.payload_hash))  return false;
    if (!isValidHex64(checkpoint.envelope_hash)) return false;
    if (checkpoint.previous_checkpoint_hash !== null &&
        !isValidHex64(checkpoint.previous_checkpoint_hash)) return false;
    if (!checkpoint.created_at_utc?.trim()) return false;
    if (!checkpoint.witness?.trim())        return false;

    const expected = await computeCheckpointHash(checkpoint);
    return expected === checkpoint.checkpoint_hash;
  } catch {
    return false;
  }
}

/**
 * Verify an ordered chain of checkpoints.
 * Fails if:
 *   - chain is empty
 *   - any individual checkpoint fails verifyWitnessCheckpoint
 *   - sequence is not strictly increasing by 1 from first entry
 *   - duplicate sequence exists
 *   - previous_checkpoint_hash of cp[i] !== checkpoint_hash of cp[i-1]
 *   - cp[0].previous_checkpoint_hash is not null
 */
export async function verifyCheckpointChain(
  checkpoints: ARVWitnessCheckpoint[],
): Promise<boolean> {
  try {
    if (checkpoints.length === 0) return false;

    // Detect duplicates
    const seqs = checkpoints.map((c) => c.sequence);
    if (new Set(seqs).size !== seqs.length) return false;

    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];

      if (!await verifyWitnessCheckpoint(cp)) return false;

      if (i === 0) {
        if (cp.previous_checkpoint_hash !== null) return false;
      } else {
        const prev = checkpoints[i - 1];
        if (cp.sequence !== prev.sequence + 1) return false;
        if (cp.previous_checkpoint_hash !== prev.checkpoint_hash) return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

