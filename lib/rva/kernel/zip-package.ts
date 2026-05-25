/**
 * ARV Trust Kernel — Evidence ZIP Package v1
 * Scope: LOCAL_L0 only.
 * No compression · No network · No ARV Authority · No RFC 3161.
 * Pure-TS minimal ZIP STORE writer. Deterministic output.
 */

import { canonicalize } from './canonicalize';
import { verifyEvidencePackageIndex } from './package-index';
import type { ARVEvidencePackageIndex } from './package-index';

export type ARVEvidenceZipPackageScope = 'LOCAL_L0';
export type ARVEvidenceZipPackageFormat = 'ARV-EVIDENCE-ZIP-PACKAGE-v1';
export type ARVEvidenceZipPackageAlgorithm = 'SHA-256';
export type ARVEvidenceZipPackageMethod = 'ZIP-STORE';

export interface ARVEvidenceZipPackageFileInput {
  file_name: string;
  content: string | Uint8Array;
}

export interface ARVEvidenceZipPackageInput {
  evidence_id: string;
  package_index: ARVEvidencePackageIndex;
  files: ARVEvidenceZipPackageFileInput[];
  created_at_utc?: string;
  policy?: string;
  producer?: string;
}

export interface ARVEvidenceZipPackageMetadata {
  format: ARVEvidenceZipPackageFormat;
  scope: ARVEvidenceZipPackageScope;
  algorithm: ARVEvidenceZipPackageAlgorithm;
  method: ARVEvidenceZipPackageMethod;
  evidence_id: string;
  package_index_hash: string;
  file_count: number;
  zip_size_bytes: number;
  zip_sha256: string;
  created_at_utc: string;
  policy: string;
  producer: string;
  zip_package_hash: string;
}

export interface ARVEvidenceZipPackageArtifact {
  metadata: ARVEvidenceZipPackageMetadata;
  zip_bytes: Uint8Array;
}

interface ZipBuildEntry {
  name: string;
  data: Uint8Array;
}

interface ZipCentralEntry {
  name: string;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

function isHex64(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function toBytes(content: string | Uint8Array): Uint8Array {
  if (typeof content === 'string') {
    return new TextEncoder().encode(content);
  }

  return new Uint8Array(content);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256HexFromBytes(bytes: Uint8Array): Promise<string> {
  const ab = new ArrayBuffer(bytes.byteLength);
  const view = new Uint8Array(ab);
  view.set(bytes);

  const digest = await globalThis.crypto.subtle.digest('SHA-256', ab);
  return bytesToHex(new Uint8Array(digest));
}

async function sha256HexFromString(value: string): Promise<string> {
  return sha256HexFromBytes(new TextEncoder().encode(value));
}

function writeU16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
  buf[offset + 2] = (value >>> 16) & 0xff;
  buf[offset + 3] = (value >>> 24) & 0xff;
}

function readU16LE(buf: Uint8Array, offset: number): number {
  if (offset + 2 > buf.length) return -1;
  return buf[offset] | (buf[offset + 1] << 8);
}

function readU32LE(buf: Uint8Array, offset: number): number {
  if (offset + 4 > buf.length) return -1;
  return (
    (buf[offset] |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 24)) >>>
    0
  );
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    table[index] = crc >>> 0;
  }

  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (let index = 0; index < data.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

const ZIP_STORE_METHOD = 0;
const ZIP_VERSION_NEEDED = 20;
const ZIP_UTF8_FLAG = 0x0800;

// Deterministic DOS timestamp: 1980-01-01 00:00:00
const DOS_DATE = 0x0021;
const DOS_TIME = 0x0000;

function validateSafeFileName(fileName: string): void {
  if (!fileName?.trim()) {
    throw new Error('ARV zip: file_name is required');
  }

  if (fileName.startsWith('/') || /^[A-Za-z]:[\\/]/.test(fileName)) {
    throw new Error(`ARV zip: absolute file_name not allowed: "${fileName}"`);
  }

  if (fileName.includes('..')) {
    throw new Error(`ARV zip: parent traversal in file_name: "${fileName}"`);
  }

  if (fileName.includes('\\')) {
    throw new Error(`ARV zip: backslash in file_name: "${fileName}"`);
  }
}

function validateFileInputs(files: ARVEvidenceZipPackageFileInput[]): void {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('ARV zip: files must be non-empty');
  }

  const seen = new Set<string>();

  for (const file of files) {
    validateSafeFileName(file.file_name);

    if (seen.has(file.file_name)) {
      throw new Error(`ARV zip: duplicate file_name: "${file.file_name}"`);
    }

    seen.add(file.file_name);
  }
}

function buildPackageIndexFileName(evidenceId: string): string {
  return evidenceId + '.package-index.json';
}

function buildZip(entries: ZipBuildEntry[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const centralEntries: Array<{
    nameBytes: Uint8Array;
    data: Uint8Array;
    crc: number;
    localOffset: number;
  }> = [];

  let offset = 0;

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const fileCrc = crc32(entry.data);

    const localHeader = new Uint8Array(30 + nameBytes.length);

    writeU32LE(localHeader, 0, ZIP_LOCAL_FILE_HEADER_SIGNATURE);
    writeU16LE(localHeader, 4, ZIP_VERSION_NEEDED);
    writeU16LE(localHeader, 6, ZIP_UTF8_FLAG);
    writeU16LE(localHeader, 8, ZIP_STORE_METHOD);
    writeU16LE(localHeader, 10, DOS_TIME);
    writeU16LE(localHeader, 12, DOS_DATE);
    writeU32LE(localHeader, 14, fileCrc);
    writeU32LE(localHeader, 18, entry.data.length);
    writeU32LE(localHeader, 22, entry.data.length);
    writeU16LE(localHeader, 26, nameBytes.length);
    writeU16LE(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    centralEntries.push({
      nameBytes,
      data: entry.data,
      crc: fileCrc,
      localOffset: offset,
    });

    parts.push(localHeader, entry.data);
    offset += localHeader.length + entry.data.length;
  }

  const centralDirectoryOffset = offset;

  for (const entry of centralEntries) {
    const centralHeader = new Uint8Array(46 + entry.nameBytes.length);

    writeU32LE(centralHeader, 0, ZIP_CENTRAL_DIRECTORY_SIGNATURE);
    writeU16LE(centralHeader, 4, ZIP_VERSION_NEEDED);
    writeU16LE(centralHeader, 6, ZIP_VERSION_NEEDED);
    writeU16LE(centralHeader, 8, ZIP_UTF8_FLAG);
    writeU16LE(centralHeader, 10, ZIP_STORE_METHOD);
    writeU16LE(centralHeader, 12, DOS_TIME);
    writeU16LE(centralHeader, 14, DOS_DATE);
    writeU32LE(centralHeader, 16, entry.crc);
    writeU32LE(centralHeader, 20, entry.data.length);
    writeU32LE(centralHeader, 24, entry.data.length);
    writeU16LE(centralHeader, 28, entry.nameBytes.length);
    writeU16LE(centralHeader, 30, 0);
    writeU16LE(centralHeader, 32, 0);
    writeU16LE(centralHeader, 34, 0);
    writeU16LE(centralHeader, 36, 0);
    writeU32LE(centralHeader, 38, 0);
    writeU32LE(centralHeader, 42, entry.localOffset);
    centralHeader.set(entry.nameBytes, 46);

    parts.push(centralHeader);
    offset += centralHeader.length;
  }

  const centralDirectorySize = offset - centralDirectoryOffset;

  const endOfCentralDirectory = new Uint8Array(22);
  writeU32LE(endOfCentralDirectory, 0, ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE);
  writeU16LE(endOfCentralDirectory, 4, 0);
  writeU16LE(endOfCentralDirectory, 6, 0);
  writeU16LE(endOfCentralDirectory, 8, centralEntries.length);
  writeU16LE(endOfCentralDirectory, 10, centralEntries.length);
  writeU32LE(endOfCentralDirectory, 12, centralDirectorySize);
  writeU32LE(endOfCentralDirectory, 16, centralDirectoryOffset);
  writeU16LE(endOfCentralDirectory, 20, 0);

  parts.push(endOfCentralDirectory);

  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(totalLength);

  let position = 0;
  for (const part of parts) {
    out.set(part, position);
    position += part.length;
  }

  return out;
}

function validateMetadataFields(metadata: ARVEvidenceZipPackageMetadata): string | null {
  if (!metadata || typeof metadata !== 'object') return 'metadata missing';

  if (metadata.format !== 'ARV-EVIDENCE-ZIP-PACKAGE-v1') return 'format invalid';
  if (metadata.scope !== 'LOCAL_L0') return 'scope invalid';
  if (metadata.algorithm !== 'SHA-256') return 'algorithm invalid';
  if (metadata.method !== 'ZIP-STORE') return 'method invalid';

  if (!metadata.evidence_id?.trim()) return 'evidence_id missing';
  if (!isHex64(metadata.package_index_hash)) return 'package_index_hash invalid';

  if (!Number.isInteger(metadata.file_count) || metadata.file_count < 1) {
    return 'file_count invalid';
  }

  if (!Number.isInteger(metadata.zip_size_bytes) || metadata.zip_size_bytes < 1) {
    return 'zip_size_bytes invalid';
  }

  if (!isHex64(metadata.zip_sha256)) return 'zip_sha256 invalid';

  if (!metadata.created_at_utc?.trim()) return 'created_at_utc missing';
  if (!metadata.policy?.trim()) return 'policy missing';
  if (!metadata.producer?.trim()) return 'producer missing';

  if (!isHex64(metadata.zip_package_hash)) return 'zip_package_hash invalid';

  return null;
}

function metadataPreimage(
  metadata: Omit<ARVEvidenceZipPackageMetadata, 'zip_package_hash'>,
): Omit<ARVEvidenceZipPackageMetadata, 'zip_package_hash'> {
  return {
    format: metadata.format,
    scope: metadata.scope,
    algorithm: metadata.algorithm,
    method: metadata.method,
    evidence_id: metadata.evidence_id,
    package_index_hash: metadata.package_index_hash,
    file_count: metadata.file_count,
    zip_size_bytes: metadata.zip_size_bytes,
    zip_sha256: metadata.zip_sha256,
    created_at_utc: metadata.created_at_utc,
    policy: metadata.policy,
    producer: metadata.producer,
  };
}

export async function hashEvidenceZipPackageMetadata(
  metadata: Omit<ARVEvidenceZipPackageMetadata, 'zip_package_hash'>,
): Promise<string> {
  return sha256HexFromString(canonicalize(metadataPreimage(metadata)));
}

function getEndOfCentralDirectoryOffset(zipBytes: Uint8Array): number {
  if (zipBytes.length < 22) return -1;

  const offset = zipBytes.length - 22;

  if (readU32LE(zipBytes, offset) !== ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
    return -1;
  }

  const commentLength = readU16LE(zipBytes, offset + 20);
  if (commentLength !== 0) return -1;

  return offset;
}

function parseCentralDirectory(zipBytes: Uint8Array): ZipCentralEntry[] | null {
  const eocdOffset = getEndOfCentralDirectoryOffset(zipBytes);
  if (eocdOffset < 0) return null;

  const diskNumber = readU16LE(zipBytes, eocdOffset + 4);
  const centralDirectoryDisk = readU16LE(zipBytes, eocdOffset + 6);
  const entriesOnDisk = readU16LE(zipBytes, eocdOffset + 8);
  const totalEntries = readU16LE(zipBytes, eocdOffset + 10);
  const centralDirectorySize = readU32LE(zipBytes, eocdOffset + 12);
  const centralDirectoryOffset = readU32LE(zipBytes, eocdOffset + 16);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0) return null;
  if (entriesOnDisk !== totalEntries) return null;
  if (centralDirectoryOffset + centralDirectorySize !== eocdOffset) return null;

  const entries: ZipCentralEntry[] = [];
  let offset = centralDirectoryOffset;
  const decoder = new TextDecoder();

  for (let index = 0; index < totalEntries; index += 1) {
    if (readU32LE(zipBytes, offset) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE) return null;

    const generalPurposeFlag = readU16LE(zipBytes, offset + 8);
    const compressionMethod = readU16LE(zipBytes, offset + 10);
    const dosTime = readU16LE(zipBytes, offset + 12);
    const dosDate = readU16LE(zipBytes, offset + 14);
    const fileCrc = readU32LE(zipBytes, offset + 16);
    const compressedSize = readU32LE(zipBytes, offset + 20);
    const uncompressedSize = readU32LE(zipBytes, offset + 24);
    const fileNameLength = readU16LE(zipBytes, offset + 28);
    const extraFieldLength = readU16LE(zipBytes, offset + 30);
    const commentLength = readU16LE(zipBytes, offset + 32);
    const localOffset = readU32LE(zipBytes, offset + 42);

    if (generalPurposeFlag !== ZIP_UTF8_FLAG) return null;
    if (compressionMethod !== ZIP_STORE_METHOD) return null;
    if (dosTime !== DOS_TIME || dosDate !== DOS_DATE) return null;
    if (compressedSize !== uncompressedSize) return null;
    if (extraFieldLength !== 0 || commentLength !== 0) return null;

    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd > zipBytes.length) return null;

    const name = decoder.decode(zipBytes.slice(nameStart, nameEnd));
    validateSafeFileName(name);

    entries.push({
      name,
      crc: fileCrc,
      compressedSize,
      uncompressedSize,
      localOffset,
    });

    offset = nameEnd + extraFieldLength + commentLength;
  }

  if (offset !== eocdOffset) return null;

  return entries;
}

async function verifyZipBytesAgainstPackageIndex(
  zipBytes: Uint8Array,
  packageIndex: ARVEvidencePackageIndex,
): Promise<boolean> {
  if (zipBytes.length < 22) return false;
  if (readU32LE(zipBytes, 0) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) return false;

  const centralEntries = parseCentralDirectory(zipBytes);
  if (!centralEntries) return false;

  const packageIndexFileContent = canonicalize(packageIndex);
  const packageIndexFileBytes = new TextEncoder().encode(packageIndexFileContent);
  const expectedEntries = [
    {
      file_name: buildPackageIndexFileName(packageIndex.evidence_id),
      sha256: await sha256HexFromBytes(packageIndexFileBytes),
      size_bytes: packageIndexFileBytes.byteLength,
      is_package_index_file: true,
    },
    ...packageIndex.artifacts.map((artifact) => ({
      ...artifact,
      is_package_index_file: false,
    })),
  ];

  if (centralEntries.length !== expectedEntries.length) return false;

  const decoder = new TextDecoder();

  for (let index = 0; index < expectedEntries.length; index += 1) {
    const expectedArtifact = expectedEntries[index];
    const centralEntry = centralEntries[index];

    if (centralEntry.name !== expectedArtifact.file_name) return false;

    const localOffset = centralEntry.localOffset;
    if (readU32LE(zipBytes, localOffset) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) return false;

    const generalPurposeFlag = readU16LE(zipBytes, localOffset + 6);
    const compressionMethod = readU16LE(zipBytes, localOffset + 8);
    const dosTime = readU16LE(zipBytes, localOffset + 10);
    const dosDate = readU16LE(zipBytes, localOffset + 12);
    const localCrc = readU32LE(zipBytes, localOffset + 14);
    const compressedSize = readU32LE(zipBytes, localOffset + 18);
    const uncompressedSize = readU32LE(zipBytes, localOffset + 22);
    const fileNameLength = readU16LE(zipBytes, localOffset + 26);
    const extraFieldLength = readU16LE(zipBytes, localOffset + 28);

    if (generalPurposeFlag !== ZIP_UTF8_FLAG) return false;
    if (compressionMethod !== ZIP_STORE_METHOD) return false;
    if (dosTime !== DOS_TIME || dosDate !== DOS_DATE) return false;
    if (compressedSize !== uncompressedSize) return false;
    if (compressedSize !== centralEntry.compressedSize) return false;
    if (uncompressedSize !== centralEntry.uncompressedSize) return false;
    if (localCrc !== centralEntry.crc) return false;
    if (extraFieldLength !== 0) return false;

    const localNameStart = localOffset + 30;
    const localNameEnd = localNameStart + fileNameLength;
    const dataStart = localNameEnd + extraFieldLength;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > zipBytes.length) return false;

    const localName = decoder.decode(zipBytes.slice(localNameStart, localNameEnd));
    if (localName !== expectedArtifact.file_name) return false;

    const data = zipBytes.slice(dataStart, dataEnd);

    if (crc32(data) !== centralEntry.crc) return false;

    const dataHash = await sha256HexFromBytes(data);
    if (dataHash !== expectedArtifact.sha256) return false;

    if (
      expectedArtifact.size_bytes !== undefined &&
      expectedArtifact.size_bytes !== data.byteLength
    ) {
      return false;
    }

    if (expectedArtifact.is_package_index_file && decoder.decode(data) !== packageIndexFileContent) {
      return false;
    }
  }

  return true;
}

function extractZipCentralEntryData(
  zipBytes: Uint8Array,
  centralEntry: ZipCentralEntry,
): Uint8Array | null {
  const localOffset = centralEntry.localOffset;

  if (readU32LE(zipBytes, localOffset) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) return null;

  const generalPurposeFlag = readU16LE(zipBytes, localOffset + 6);
  const compressionMethod = readU16LE(zipBytes, localOffset + 8);
  const dosTime = readU16LE(zipBytes, localOffset + 10);
  const dosDate = readU16LE(zipBytes, localOffset + 12);
  const localCrc = readU32LE(zipBytes, localOffset + 14);
  const compressedSize = readU32LE(zipBytes, localOffset + 18);
  const uncompressedSize = readU32LE(zipBytes, localOffset + 22);
  const fileNameLength = readU16LE(zipBytes, localOffset + 26);
  const extraFieldLength = readU16LE(zipBytes, localOffset + 28);

  if (generalPurposeFlag !== ZIP_UTF8_FLAG) return null;
  if (compressionMethod !== ZIP_STORE_METHOD) return null;
  if (dosTime !== DOS_TIME || dosDate !== DOS_DATE) return null;
  if (compressedSize !== uncompressedSize) return null;
  if (compressedSize !== centralEntry.compressedSize) return null;
  if (uncompressedSize !== centralEntry.uncompressedSize) return null;
  if (localCrc !== centralEntry.crc) return null;
  if (extraFieldLength !== 0) return null;

  const localNameStart = localOffset + 30;
  const localNameEnd = localNameStart + fileNameLength;
  const dataStart = localNameEnd + extraFieldLength;
  const dataEnd = dataStart + compressedSize;

  if (localNameEnd > zipBytes.length) return null;
  if (dataEnd > zipBytes.length) return null;

  const decoder = new TextDecoder();
  const localName = decoder.decode(zipBytes.slice(localNameStart, localNameEnd));

  if (localName !== centralEntry.name) return null;

  const data = zipBytes.slice(dataStart, dataEnd);

  if (crc32(data) !== centralEntry.crc) return null;

  return data;
}

export async function verifyEvidenceZipBytesWithEmbeddedPackageIndex(
  zipBytes: Uint8Array,
): Promise<boolean> {
  try {
    if (!(zipBytes instanceof Uint8Array)) return false;
    if (zipBytes.length < 22) return false;
    if (readU32LE(zipBytes, 0) !== ZIP_LOCAL_FILE_HEADER_SIGNATURE) return false;

    const centralEntries = parseCentralDirectory(zipBytes);
    if (!centralEntries) return false;

    const packageIndexEntries = centralEntries.filter((entry) =>
      entry.name.endsWith('.package-index.json'),
    );

    if (packageIndexEntries.length !== 1) return false;

    const packageIndexData = extractZipCentralEntryData(zipBytes, packageIndexEntries[0]);
    if (!packageIndexData) return false;

    const packageIndexText = new TextDecoder().decode(packageIndexData);
    const packageIndex = JSON.parse(packageIndexText) as ARVEvidencePackageIndex;

    if (!packageIndex || typeof packageIndex !== 'object') return false;
    if (packageIndexEntries[0].name !== buildPackageIndexFileName(packageIndex.evidence_id)) {
      return false;
    }

    if (canonicalize(packageIndex) !== packageIndexText) return false;

    if (!await verifyEvidencePackageIndex(packageIndex)) return false;

    return verifyZipBytesAgainstPackageIndex(zipBytes, packageIndex);
  } catch {
    return false;
  }
}


export async function createEvidenceZipPackage(
  input: ARVEvidenceZipPackageInput,
): Promise<ARVEvidenceZipPackageArtifact> {
  if (!input || typeof input !== 'object') {
    throw new Error('ARV zip: input is required');
  }

  if (!input.evidence_id?.trim()) {
    throw new Error('ARV zip: evidence_id is required');
  }

  const indexOk = await verifyEvidencePackageIndex(input.package_index);
  if (!indexOk) {
    throw new Error('ARV zip: package_index failed verification');
  }

  if (input.package_index.scope !== 'LOCAL_L0') {
    throw new Error('ARV zip: package_index.scope must be LOCAL_L0');
  }

  if (input.evidence_id !== input.package_index.evidence_id) {
    throw new Error('ARV zip: input.evidence_id !== package_index.evidence_id');
  }

  validateFileInputs(input.files);

  const requiredNames = new Set(input.package_index.artifacts.map((artifact) => artifact.file_name));
  const fileMap = new Map<string, Uint8Array>();

  for (const file of input.files) {
    if (!requiredNames.has(file.file_name)) {
      throw new Error(`ARV zip: unexpected file "${file.file_name}" is not listed in package_index`);
    }

    fileMap.set(file.file_name, toBytes(file.content));
  }

  for (const artifact of input.package_index.artifacts) {
    const data = fileMap.get(artifact.file_name);

    if (!data) {
      throw new Error(`ARV zip: required file "${artifact.file_name}" not found in files`);
    }

    const actualHash = await sha256HexFromBytes(data);
    if (actualHash !== artifact.sha256) {
      throw new Error(`ARV zip: file "${artifact.file_name}" sha256 mismatch`);
    }

    if (artifact.size_bytes !== undefined && artifact.size_bytes !== data.byteLength) {
      throw new Error(`ARV zip: file "${artifact.file_name}" size_bytes mismatch`);
    }
  }

  const packageIndexFileName = buildPackageIndexFileName(input.evidence_id);
  validateSafeFileName(packageIndexFileName);

  const packageIndexFileContent = canonicalize(input.package_index);
  const orderedFiles = [
    {
      name: packageIndexFileName,
      data: toBytes(packageIndexFileContent),
    },
    ...input.package_index.artifacts.map((artifact) => ({
      name: artifact.file_name,
      data: fileMap.get(artifact.file_name)!,
    })),
  ];

  const zipBytes = buildZip(orderedFiles);
  const zipSha256 = await sha256HexFromBytes(zipBytes);

  const body: Omit<ARVEvidenceZipPackageMetadata, 'zip_package_hash'> = {
    format: 'ARV-EVIDENCE-ZIP-PACKAGE-v1',
    scope: 'LOCAL_L0',
    algorithm: 'SHA-256',
    method: 'ZIP-STORE',
    evidence_id: input.evidence_id,
    package_index_hash: input.package_index.package_index_hash,
    file_count: orderedFiles.length,
    zip_size_bytes: zipBytes.length,
    zip_sha256: zipSha256,
    created_at_utc: input.created_at_utc ?? new Date().toISOString(),
    policy: input.policy ?? 'ARV-L0-LOCAL-INTEGRITY-v1',
    producer: input.producer ?? 'ARV-LOCAL',
  };

  const metadata: ARVEvidenceZipPackageMetadata = {
    ...body,
    zip_package_hash: await hashEvidenceZipPackageMetadata(body),
  };

  return {
    metadata,
    zip_bytes: zipBytes,
  };
}

export async function verifyEvidenceZipPackageArtifact(
  artifact: ARVEvidenceZipPackageArtifact,
  packageIndex: ARVEvidencePackageIndex,
): Promise<boolean> {
  try {
    if (!artifact || typeof artifact !== 'object') return false;
    if (!(artifact.zip_bytes instanceof Uint8Array)) return false;

    const indexOk = await verifyEvidencePackageIndex(packageIndex);
    if (!indexOk) return false;

    if (packageIndex.scope !== 'LOCAL_L0') return false;

    const metadataError = validateMetadataFields(artifact.metadata);
    if (metadataError) return false;

    const metadata = artifact.metadata;

    if (metadata.evidence_id !== packageIndex.evidence_id) return false;
    if (metadata.package_index_hash !== packageIndex.package_index_hash) return false;
    const expectedFileCount = packageIndex.artifacts.length + 1;
    if (metadata.file_count !== expectedFileCount) return false;
    if (metadata.zip_size_bytes !== artifact.zip_bytes.length) return false;

    const expectedZipSha256 = await sha256HexFromBytes(artifact.zip_bytes);
    if (expectedZipSha256 !== metadata.zip_sha256) return false;

    const { zip_package_hash: _ignored, ...body } = metadata;
    const expectedZipPackageHash = await hashEvidenceZipPackageMetadata(body);
    if (expectedZipPackageHash !== metadata.zip_package_hash) return false;

    if (!await verifyZipBytesAgainstPackageIndex(artifact.zip_bytes, packageIndex)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}