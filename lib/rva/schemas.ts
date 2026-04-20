export type ARVStatus =
  | 'LOCAL_UNREGISTERED'
  | 'REGISTERED'
  | 'VALID'
  | 'INVALID'
  | 'REVOKED'
  | 'PENDING_ANCHOR'
  | 'DISPUTE_READY'
  | 'ARCHIVED';

export type ARVSourceMode =
  | 'upload'
  | 'generated'
  | 'imported'
  | 'evidence-bundle';

export type ARVTimestampType =
  | 'local'
  | 'rfc3161'
  | 'system'
  | 'external';

export interface ARVSignature {
  algorithm: 'Ed25519' | string;
  value: string | null;
  public_key_fingerprint: string | null;
}

export interface ARVDualSeal {
  mode: string | null;
  primary_seal_hash: string | null;
  secondary_seal_hash: string | null;
}

export interface ARVQRPayload {
  payload: string;
  image_path: string | null;
}

export interface ARVSourceFile {
  filename: string;
  mime_type: string | null;
  size_bytes: number;
  source_mode: ARVSourceMode;
  captured_at_utc: string;
}

export interface ARVTimestamp {
  type: ARVTimestampType;
  authority: string | null;
  token: string | null;
  policy_oid: string | null;
}

export interface ARVRecord {
  id: string;
  status: ARVStatus;
  authority: string;
  system: string;
  canon: string;
  epoch_id: string | null;
  ledger_position: number | null;
  document_hash: string;
  merkle_root: string;
  timestamp_utc: string;
  issued_at_utc: string;
  signature: ARVSignature;
  dual_seal: ARVDualSeal;
  qr: ARVQRPayload;
  verification_url: string | null;
  source_file: ARVSourceFile;
  timestamp: ARVTimestamp;
  tags?: string[];
  notes?: string | null;
}

export interface AcademicCredentialRecord extends ARVRecord {
  issuer_name: string;
  institution_name: string;
  holder_name: string;
  program_name: string;
  award_type: string;
  issue_date: string;
  graduation_date?: string | null;
  student_id?: string | null;
  cohort?: string | null;
  academic_status?: string | null;
}

export interface GigEvidenceRecord extends ARVRecord {
  worker_name: string;
  client_name: string;
  project_name: string;
  deliverable_type: string;
  delivery_date: string;
  engagement_reference?: string | null;
  counterparty_reference?: string | null;
  evidence_bundle_type?: string | null;
  dispute_status?: string | null;
}

export interface ComplianceAUFAMLRecord extends ARVRecord {
  regulated_entity_name: string;
  compliance_framework: string;
  case_reference: string;
  finding_id?: string | null;
  risk_level?: 'low' | 'medium' | 'high' | 'critical' | null;
  control_category?: string | null;
  obligation_reference?: string | null;
  evidence_type: string;
  remediation_status?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  reporting_period?: string | null;
  jurisdiction?: string | null;
  chain_of_custody_ref?: string | null;
}