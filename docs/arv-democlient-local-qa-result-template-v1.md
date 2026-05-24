# ARV DemoClient Local QA Result Template v1

## Purpose

This document is a fillable QA result template for recording the outcome of the ARV DemoClient Kernel Export Manual QA Checklist.

Related checklist:

```text
docs/arv-democlient-kernel-export-manual-qa-checklist-v1.md
```

This template records the actual manual QA result for a specific commit, browser, OS, test file, and QA run.

This is documentation-only. It does not introduce code changes, UI changes, new dependencies, ARV Authority registration, public ledger anchoring, RFC 3161 timestamping, HSM/KMS, PostgreSQL, or enterprise workflow behavior.

---

## QA Run Metadata

```text
QA Run ID:
Date UTC:
Tester:
Repository:
Branch:
Commit SHA:
Browser:
Browser Version:
OS:
Node Version:
npm Version:
```

---

## Pre-Run Validation

### Build

Command:

```powershell
npm run build
```

Result:

```text
PASS / FAIL:
Notes:
```

### Smoke Suite

Command:

```powershell
npx tsx scripts\smoke-arv-all.ts
```

Expected:

```text
[ARV Smoke Suite] all suites passed (11/11)
```

Result:

```text
PASS / FAIL:
Notes:
```

---

## Test File Metadata

Recommended test file:

```text
arv-manual-qa-sample.txt
```

Recommended content:

```text
ARV DemoClient Kernel Export Manual QA v1 sample file.
```

Actual test file used:

```text
File name:
MIME type:
Size bytes:
Expected SHA-256, if independently calculated:
```

Notes:

```text
Notes:
```

---

## Manual QA Result Summary

| Step | Area | Result | Notes |
|---:|---|---|---|
| 1 | Open DemoClient | PASS / FAIL | |
| 2 | Upload source file | PASS / FAIL | |
| 3 | Confirm QR rendering | PASS / FAIL | |
| 4 | View Certificate | PASS / FAIL | |
| 5 | Download Certificate PDF | PASS / FAIL | |
| 6 | Download Evidence Package ZIP | PASS / FAIL | |
| 7 | View Verification Payload | PASS / FAIL | |
| 8 | View L0 Record JSON | PASS / FAIL | |
| 9 | Confirm LOCAL_L0 safety boundaries | PASS / FAIL | |
| 10 | Browser console check | PASS / FAIL | |

Final result:

```text
PASS / FAIL
```

---

## Step 1 — Open DemoClient

Expected:

- DemoClient loads in browser
- Upload/drop area is visible
- No runtime error appears
- Main actions are visible or become visible after file upload

Observed result:

```text
PASS / FAIL:
Notes:
```

Evidence:

```text
Screenshot/file reference:
Console output:
```

---

## Step 2 — Upload Source File

Expected:

- File uploads or drag/drops successfully
- Local record is created
- No error message appears
- File hash is computed
- DemoClient remains responsive
- Original source file is retained for kernel-backed actions

Observed result:

```text
PASS / FAIL:
Notes:
```

Observed record ID:

```text
record.id:
```

Observed document hash:

```text
record.document_hash:
```

Evidence:

```text
Screenshot/file reference:
Console output:
```

---

## Step 3 — Confirm QR Rendering

Expected:

- QR image is visible
- QR is generated from `record.qr.payload`
- QR payload starts with `ARV1:`
- QR remains LOCAL_L0
- QR does not claim ARV Authority registration, RFC 3161, or public ledger anchoring

Observed result:

```text
PASS / FAIL:
Notes:
```

Observed QR payload prefix:

```text
ARV1: present? YES / NO
```

Evidence:

```text
Screenshot/file reference:
Console output:
```

---

## Step 4 — View Certificate

Expected:

- `View Certificate` opens a new tab
- Certificate HTML is generated through the kernel offline certificate path
- Certificate displays ARV identity
- Certificate displays evidence ID
- Certificate displays LOCAL_L0 scope
- Certificate does not claim authority registration
- Certificate does not claim public ledger anchoring
- Certificate does not claim RFC 3161 timestamping

Observed result:

```text
PASS / FAIL:
Notes:
```

Observed evidence ID in certificate:

```text
Evidence ID:
```

Observed scope:

```text
LOCAL_L0 present? YES / NO
```

Evidence:

```text
Screenshot/file reference:
Console output:
```

---

## Step 5 — Download Certificate PDF

Expected:

- PDF downloads successfully
- PDF file name follows:

```text
<record.id>.certificate.pdf
```

- PDF opens successfully
- PDF is rendered from kernel offline certificate HTML
- PDF includes ARV identity
- PDF includes evidence ID
- PDF includes LOCAL_L0 scope
- PDF does not claim authority registration
- PDF does not claim public ledger anchoring
- PDF does not claim RFC 3161 timestamping

Observed result:

```text
PASS / FAIL:
Notes:
```

Downloaded PDF filename:

```text
Filename:
```

Evidence:

```text
Screenshot/file reference:
Console output:
```

---

## Step 6 — Download Evidence Package ZIP

Expected:

- ZIP downloads successfully
- ZIP file name follows:

```text
<record.id>.evidence-package.zip
```

Expected package contents include:

```text
source file
certificate HTML
verifier payload JSON
bundle manifest JSON
signed envelope JSON
witness checkpoint JSON
package index
```

Observed result:

```text
PASS / FAIL:
Notes:
```

Downloaded ZIP filename:

```text
Filename:
```

Observed ZIP contents:

```text
Files:
```

Evidence:

```text
Screenshot/file reference:
Console output:
```

---

## Step 7 — View Verification Payload

Expected:

- `View Verification Payload` opens a new tab
- JSON payload is readable
- Payload format is kernel-backed
- Payload is generated through the file-backed consolidated kernel pipeline
- Evidence ID matches the current record
- Source hash matches the current record document hash
- QR transfer payload is included or summarized
- Kernel hash fields are present
- Payload remains LOCAL_L0

Expected fields or equivalent sections:

```text
format
scope
algorithm
evidence_id
document_hash
source_file
kernel
artifacts
qr_transfer
consistency
policy
producer
note
```

Observed result:

```text
PASS / FAIL:
Notes:
```

Observed payload format:

```text
format:
```

Observed scope:

```text
scope:
```

Observed consistency fields:

```text
source_hash_matches_record_document_hash:
scope_is_local_l0:
package_index_evidence_id_matches_record:
verifier_payload_evidence_id_matches_record:
bundle_manifest_evidence_id_matches_record:
```

Evidence:

```text
Screenshot/file reference:
Console output:
```

---

## Step 8 — View L0 Record JSON

Expected:

- `View L0 Record JSON` opens a new tab
- JSON payload is readable
- Record JSON reflects the local DemoClient record
- Record status is local/unregistered
- `record.qr.payload` exists
- `record.qr.payload` starts with `ARV1:`
- `source_file` metadata exists
- `document_hash` exists
- `merkle_root` exists
- `signature.public_key_fingerprint` remains local/demo

Expected markers:

```text
LOCAL_UNREGISTERED
ARV1:
LOCAL-DEMO
```

Observed result:

```text
PASS / FAIL:
Notes:
```

Evidence:

```text
Screenshot/file reference:
Console output:
```

---

## Step 9 — LOCAL_L0 Safety Boundary Check

Across QR, certificate HTML, PDF, ZIP, verification payload, and record JSON, confirm no output claims:

```text
ARV Authority registration
official authority seal
public ledger anchoring
RFC 3161 timestamping
HSM/KMS signing
PostgreSQL persistence
enterprise registration
dispute/arbitration finality
```

Observed result:

```text
PASS / FAIL:
Notes:
```

Confirmed absent claims:

```text
ARV Authority registration absent? YES / NO
official authority seal absent? YES / NO
public ledger anchoring absent? YES / NO
RFC 3161 absent? YES / NO
HSM/KMS absent? YES / NO
PostgreSQL absent? YES / NO
enterprise registration absent? YES / NO
dispute/arbitration finality absent? YES / NO
```

---

## Step 10 — Browser Console Check

Expected:

- No uncaught runtime errors during upload
- No uncaught runtime errors during QR rendering
- No uncaught runtime errors during certificate open
- No uncaught runtime errors during PDF export
- No uncaught runtime errors during ZIP export
- No uncaught runtime errors during verification payload open
- No uncaught runtime errors during record JSON open

Observed result:

```text
PASS / FAIL:
Notes:
```

Console output:

```text
Console errors/warnings:
```

---

## Exported Artifacts Record

Record the names of downloaded/generated artifacts.

```text
Record ID:
Certificate HTML tab opened? YES / NO
PDF filename:
ZIP filename:
Verification payload opened? YES / NO
Record JSON opened? YES / NO
```

Optional hashes, if independently calculated:

```text
PDF SHA-256:
ZIP SHA-256:
```

---

## Defects Found

List any defects discovered during this QA run.

| ID | Step | Severity | Description | Status |
|---|---:|---|---|---|
| DEF-001 |  | Low / Medium / High / Critical |  | Open / Fixed / Deferred |

Notes:

```text
Notes:
```

---

## Final Decision

Final QA status:

```text
PASS / FAIL
```

Merge recommendation:

```text
APPROVE / BLOCK / APPROVE WITH NOTES
```

Reason:

```text
Reason:
```

Tester signature:

```text
Name:
Date UTC:
```

---

## Checkpoint Declaration Template

Use this only after a successful QA run.

```text
CHECKPOINT:
ARV DemoClient manual QA completed.
Build passed.
Smoke suite passed.
Upload, QR, certificate HTML, PDF, ZIP, verification payload, and record JSON manually validated.
LOCAL_L0 safety boundaries confirmed.
No authority registration, RFC 3161, or public-ledger claims observed.
Browser console checked.
Final QA result: PASS.
```