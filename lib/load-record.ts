import fs from "fs";
import path from "path";

export type ValidationRecord = {
  validation_id: string;
  status: string;
  authority: string;
  system: string;
  canon: string;
  epoch_id: string;
  ledger_position: number | null;
  issued_by: string;
  institution: string;
  issued_for: string;
  document_type: string;
  source_file: {
    path: string;
    filename: string;
  };
  certificate_artifact: {
    path: string | null;
    filename: string | null;
  };
  document_hash: string;
  merkle_root: string;
  signature: {
    algorithm: string;
    value: string | null;
    public_key_fingerprint: string | null;
  };
  dual_seal: {
    mode: string;
    primary_seal_hash: string | null;
    secondary_seal_hash: string | null;
  };
  qr: {
    payload: string;
    signed: boolean;
    signature: string | null;
    image_path: string;
  };
  zk_proof: {
    type: string | null;
    value: string | null;
  } | null;
  verification_url: string;
  timestamp_utc: string;
};

export function loadRecord(id?: string): ValidationRecord | null {
  if (!id) return null;

  const filePath = path.join(process.cwd(), "data", `${id}.json`);

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as ValidationRecord;
  } catch {
    return null;
  }
}
