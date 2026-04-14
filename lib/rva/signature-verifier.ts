import fs from "fs";
import path from "path";
import crypto from "crypto";

type SignatureBlock = {
  algorithm: string;
  value: string | null;
  public_key_fingerprint: string | null;
};

type RecordShape = {
  validation_id: string;
  document_hash: string;
  merkle_root: string;
  epoch_id: string;
  ledger_position: number | null;
  verification_url: string;
  signature?: SignatureBlock | null;
};

export type SignatureVerificationResult = {
  isValid: boolean;
  algorithmOk: boolean;
  signaturePresent: boolean;
  publicKeyPresent: boolean;
  fingerprintMatches: boolean;
  expectedFingerprint: string | null;
  computedFingerprint: string | null;
  payload: string;
};

function sha256Hex(input: Buffer | string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function fingerprintPublicKey(publicPem: string): string {
  return sha256Hex(publicPem).slice(0, 24);
}

export function buildSignaturePayload(record: RecordShape): string {
  return JSON.stringify({
    validation_id: record.validation_id,
    document_hash: record.document_hash,
    merkle_root: record.merkle_root,
    epoch_id: record.epoch_id,
    ledger_position: record.ledger_position,
    verification_url: record.verification_url
  });
}

export function verifyRecordSignature(record: RecordShape): SignatureVerificationResult {
  const payload = buildSignaturePayload(record);
  const signatureBlock = record.signature ?? null;

  const algorithmOk = String(signatureBlock?.algorithm ?? "") === "Ed25519";
  const signaturePresent = Boolean(signatureBlock?.value);

  const publicKeyPath = path.join(process.cwd(), "data", "keys", "arv-public.pem");
  const publicKeyPresent = fs.existsSync(publicKeyPath);

  if (!algorithmOk || !signaturePresent || !publicKeyPresent) {
    return {
      isValid: false,
      algorithmOk,
      signaturePresent,
      publicKeyPresent,
      fingerprintMatches: false,
      expectedFingerprint: signatureBlock?.public_key_fingerprint ?? null,
      computedFingerprint: null,
      payload
    };
  }

  const publicPem = fs.readFileSync(publicKeyPath, "utf-8");
  const publicKey = crypto.createPublicKey(publicPem);

  const computedFingerprint = fingerprintPublicKey(publicPem);
  const expectedFingerprint = signatureBlock?.public_key_fingerprint ?? null;
  const fingerprintMatches = computedFingerprint === expectedFingerprint;

  let cryptoValid = false;

  try {
    cryptoValid = crypto.verify(
      null,
      Buffer.from(payload, "utf-8"),
      publicKey,
      Buffer.from(signatureBlock!.value!, "base64")
    );
  } catch {
    cryptoValid = false;
  }

  return {
    isValid: cryptoValid && fingerprintMatches,
    algorithmOk,
    signaturePresent,
    publicKeyPresent,
    fingerprintMatches,
    expectedFingerprint,
    computedFingerprint,
    payload
  };
}
