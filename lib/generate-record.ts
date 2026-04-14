import fs from "fs";
import path from "path";
import crypto from "crypto";

type GenerateRecordInput = {
  issued_by: string;
  institution: string;
  issued_for: string;
  document_type: string;
  source_file_path: string;
  authority?: string;
  system?: string;
  base_url?: string;
};

type ValidationRecord = {
  validation_id: string;
  status: "VALID";
  authority: string;
  system: string;
  issued_by: string;
  institution: string;
  issued_for: string;
  document_type: string;
  document_hash: string;
  verification_url: string;
  timestamp_utc: string;
};

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getUtcTimestamp(): string {
  return new Date().toISOString();
}

function getYearFromTimestamp(timestamp: string): string {
  return timestamp.slice(0, 4);
}

function buildNextValidationId(recordsDir: string, year: string): string {
  ensureDir(recordsDir);

  const prefix = `ARV-${year}-`;
  const files = fs.readdirSync(recordsDir).filter((name) => {
    return name.startsWith(prefix) && name.endsWith(".json");
  });

  let maxSeq = 0;

  for (const file of files) {
    const match = file.match(/^ARV-(\d{4})-(\d{6})\.json$/);
    if (!match) continue;
    const seq = Number(match[2]);
    if (seq > maxSeq) maxSeq = seq;
  }

  const nextSeq = String(maxSeq + 1).padStart(6, "0");
  return `ARV-${year}-${nextSeq}`;
}

function sha256File(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

function appendLedgerLine(ledgerPath: string, record: ValidationRecord) {
  ensureDir(path.dirname(ledgerPath));

  const ledgerEntry = {
    validation_id: record.validation_id,
    status: record.status,
    authority: record.authority,
    issued_by: record.issued_by,
    institution: record.institution,
    issued_for: record.issued_for,
    document_type: record.document_type,
    document_hash: record.document_hash,
    verification_url: record.verification_url,
    timestamp_utc: record.timestamp_utc
  };

  fs.appendFileSync(ledgerPath, JSON.stringify(ledgerEntry) + "\n", "utf8");
}

export function generateRecord(input: GenerateRecordInput): ValidationRecord {
  const authority = input.authority ?? "Reality Validation Authority";
  const system = input.system ?? "A System by Intelligence Olsen";
  const baseUrl = input.base_url ?? "https://arvseal.com";

  const rootDir = process.cwd();
  const dataRecordsDir = path.join(rootDir, "data", "records");
  const publicRecordsDir = path.join(rootDir, "public", "vault", "records");
  const dataLedgerPath = path.join(rootDir, "data", "ledger", "public-ledger.jsonl");
  const publicLedgerPath = path.join(rootDir, "public", "vault", "ledger", "public-ledger.jsonl");

  ensureDir(dataRecordsDir);
  ensureDir(publicRecordsDir);

  if (!fs.existsSync(input.source_file_path)) {
    throw new Error(`Source file not found: ${input.source_file_path}`);
  }

  const timestampUtc = getUtcTimestamp();
  const year = getYearFromTimestamp(timestampUtc);
  const validationId = buildNextValidationId(dataRecordsDir, year);
  const documentHash = sha256File(input.source_file_path);
  const verificationUrl = `${baseUrl}/verify?id=${validationId}`;

  const record: ValidationRecord = {
    validation_id: validationId,
    status: "VALID",
    authority,
    system,
    issued_by: input.issued_by,
    institution: input.institution,
    issued_for: input.issued_for,
    document_type: input.document_type,
    document_hash: documentHash,
    verification_url: verificationUrl,
    timestamp_utc: timestampUtc
  };

  const recordJson = JSON.stringify(record, null, 2);
  const dataRecordPath = path.join(dataRecordsDir, `${validationId}.json`);
  const publicRecordPath = path.join(publicRecordsDir, `${validationId}.json`);

  fs.writeFileSync(dataRecordPath, recordJson, "utf8");
  fs.writeFileSync(publicRecordPath, recordJson, "utf8");

  appendLedgerLine(dataLedgerPath, record);
  appendLedgerLine(publicLedgerPath, record);

  return record;
}
