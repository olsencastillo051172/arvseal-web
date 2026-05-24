/**
 * ARV Trust Kernel — Local Signing Envelope v1
 * Scope: LOCAL_L0 only.
 * No ARV Authority · No RFC 3161 · No HSM/KMS · No ledger anchor.
 * Offline, browser-safe. Ed25519 via tweetnacl.
 */
import nacl from 'tweetnacl';
import { canonicalize }                    from './canonicalize';
import { sha256HexFromString, hexToBytes } from './hash';

export type ARVSignatureAlgorithm = 'Ed25519';

export interface ARVLocalKeyPair {
  algorithm: ARVSignatureAlgorithm;
  public_key_hex: string;
  secret_key_hex: string;
  public_key_fingerprint: string;
}

export interface ARVSignedEnvelope {
  algorithm: ARVSignatureAlgorithm;
  payload_hash: string;
  public_key_hex: string;
  public_key_fingerprint: string;
  signature_hex: string;
  signed_at_utc: string;
  scope: 'LOCAL_L0';
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** SHA-256(public_key_hex_string).slice(0,16) — real fingerprint, async. */
export async function fingerprintPublicKey(publicKeyHex: string): Promise<string> {
  return (await sha256HexFromString(publicKeyHex)).slice(0, 16);
}

/** async — fingerprint is real (SHA-256 based), not a slice of the key. */
export async function generateLocalSigningKeyPair(seed?: Uint8Array): Promise<ARVLocalKeyPair> {
  const kp = seed ? nacl.sign.keyPair.fromSeed(seed) : nacl.sign.keyPair();
  const public_key_hex = bytesToHex(kp.publicKey);
  return {
    algorithm: 'Ed25519',
    public_key_hex,
    secret_key_hex: bytesToHex(kp.secretKey),
    public_key_fingerprint: await fingerprintPublicKey(public_key_hex),
  };
}

export async function signCanonicalPayload(
  payload: unknown,
  secretKeyHex: string,
  options?: { signed_at_utc?: string },
): Promise<ARVSignedEnvelope> {
  const canonical    = canonicalize(payload);
  const payloadBytes = new TextEncoder().encode(canonical);
  const secretKey    = hexToBytes(secretKeyHex);

  if (secretKey.length !== 64)
    throw new Error(`ARV signing: secret key must be 64 bytes, got ${secretKey.length}`);

  const signature      = nacl.sign.detached(payloadBytes, secretKey);
  const public_key_hex = bytesToHex(secretKey.slice(32));

  const [payload_hash, public_key_fingerprint] = await Promise.all([
    sha256HexFromString(canonical),
    fingerprintPublicKey(public_key_hex),
  ]);

  return {
    algorithm: 'Ed25519',
    payload_hash,
    public_key_hex,
    public_key_fingerprint,
    signature_hex: bytesToHex(signature),
    signed_at_utc: options?.signed_at_utc ?? new Date().toISOString(),
    scope: 'LOCAL_L0',
  };
}

/**
 * Full envelope integrity check before Ed25519 verification:
 *   1. algorithm === "Ed25519"
 *   2. scope === "LOCAL_L0"
 *   3. recomputed payload_hash === envelope.payload_hash
 *   4. recomputed fingerprint  === envelope.public_key_fingerprint
 *   5. Ed25519 signature valid
 */
export async function verifySignedEnvelope(
  payload: unknown,
  envelope: ARVSignedEnvelope,
): Promise<boolean> {
  try {
    if (envelope.algorithm !== 'Ed25519')   return false;
    if (envelope.scope     !== 'LOCAL_L0')  return false;

    const canonical    = canonicalize(payload);
    const payloadBytes = new TextEncoder().encode(canonical);

    const [computedHash, computedFP] = await Promise.all([
      sha256HexFromString(canonical),
      fingerprintPublicKey(envelope.public_key_hex),
    ]);

    if (computedHash !== envelope.payload_hash)           return false;
    if (computedFP   !== envelope.public_key_fingerprint) return false;

    const publicKey = hexToBytes(envelope.public_key_hex);
    const signature = hexToBytes(envelope.signature_hex);

    if (publicKey.length !== 32 || signature.length !== 64) return false;

    return nacl.sign.detached.verify(payloadBytes, signature, publicKey);
  } catch {
    return false;
  }
}
