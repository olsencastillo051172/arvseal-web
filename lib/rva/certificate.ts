export type VerificationCertificate = {
  certificate_id: string;
  issued_at: string;
  engine: string;
  engine_version: string;
  mode: string;
  verification_status: 'VERIFIED' | 'FAILED';
  document_hash: string;
  expected_root: string;
  computed_root: string;
  is_valid: boolean;
  merkle_proof_length: number;
  proof_steps: string[];
  anchor_source: string;
  audit_note: string;
};

export function buildVerificationCertificate(input: {
  documentHash: string;
  expectedRoot: string;
  computedRoot: string;
  isValid: boolean;
  proofLength: number;
  steps?: string[];
  anchorSource?: string;
}): VerificationCertificate {
  const issuedAt = new Date().toISOString();
  const certificateId = `ARV-${issuedAt.replace(/[:.]/g, '-')}-${input.documentHash.slice(0, 12)}`;

  return {
    certificate_id: certificateId,
    issued_at: issuedAt,
    engine: 'Reality Validation Authority',
    engine_version: '1.0',
    mode: 'OFFLINE VERIFICATION',
    verification_status: input.isValid ? 'VERIFIED' : 'FAILED',
    document_hash: input.documentHash,
    expected_root: input.expectedRoot,
    computed_root: input.computedRoot,
    is_valid: input.isValid,
    merkle_proof_length: input.proofLength,
    proof_steps: input.steps ?? [],
    anchor_source: input.anchorSource ?? 'local-demo',
    audit_note: input.isValid
      ? 'Integrity verified mathematically against anchor root.'
      : 'Verification failed: computed root does not match anchor root.',
  };
}