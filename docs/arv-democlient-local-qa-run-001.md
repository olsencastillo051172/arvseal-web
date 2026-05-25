# ARV DemoClient Local QA Run 001

## Status

PASS

This document records the first completed manual QA run for the ARV DemoClient kernel-backed export flow.

Related checklist:

docs/arv-democlient-kernel-export-manual-qa-checklist-v1.md

Related template:

docs/arv-democlient-local-qa-result-template-v1.md

---

## QA Run Metadata

QA Run ID: ARV-DEMOCLIENT-LOCAL-QA-RUN-001  
Date UTC: 2026-05-25T00:47:13.855Z  
Tester: Olsen Castillo  
Repository: olsencastillo051172/arvseal-web  
Branch: qa/arv-democlient-manual-qa-run-001-result-v1  
Browser: Microsoft Edge  
Browser Version: Not recorded  
OS: Windows  
Node Version: Not recorded in final document  
npm Version: Not recorded in final document  

---

## Pre-Run Validation

### Build

Command:

npm run build

Observed result:

PASS

Build completed successfully before manual browser QA.

### Smoke Suite

Command:

npx tsx scripts\smoke-arv-all.ts

Observed result:

PASS

[ARV Smoke Suite] all suites passed (11/11)

---

## Test File Metadata

Actual test file used:

File name: arv-manual-qa-sample.txt  
MIME type: text/plain  
Size bytes: 54  
Expected SHA-256, if independently calculated: Not independently calculated during manual QA  

Observed source hash from DemoClient:

171fc22b572f7a8d0414c24a6b959b5adfab283db3277330ddff8f94edb6bd8d

---

## Manual QA Result Summary

| Step | Area | Result | Notes |
|---:|---|---|---|
| 1 | Open DemoClient | PASS | DemoClient loaded with upload area and export actions visible. |
| 2 | Upload source file | PASS | `arv-manual-qa-sample.txt` loaded successfully. |
| 3 | Confirm QR rendering | PASS | Portable QR verifier rendered from ARV1 payload. |
| 4 | View Certificate | PASS | Kernel offline certificate HTML opened and displayed LOCAL_L0 scope. |
| 5 | Download Certificate PDF | PASS | Certificate PDF downloaded and opened successfully. |
| 6 | Download Evidence Package ZIP | PASS | Evidence ZIP downloaded and opened successfully. |
| 7 | View Verification Payload | PASS | Kernel verification JSON opened successfully. |
| 8 | View L0 Record JSON | PASS | L0 record JSON opened successfully. |
| 9 | Confirm LOCAL_L0 safety boundaries | PASS | No current authority registration, RFC3161, or public-ledger claims observed. |
| 10 | Browser console check | PASS | No blocking ARV runtime errors observed. |

Final result:

PASS

---

## Step 1 — Open DemoClient

Observed result:

PASS

DemoClient opened successfully in Microsoft Edge. Upload/drop area was visible. Export action buttons were visible. No fatal UI error was observed.

---

## Step 2 — Upload Source File

Observed result:

PASS

File loaded successfully. Local ARV evidence record was generated. Document hash and Merkle root were displayed. DemoClient remained responsive.

Observed record ID:

ARV-LOCAL-70033855

Observed document hash:

171fc22b572f7a8d0414c24a6b959b5adfab283db3277330ddff8f94edb6bd8d

Observed status:

LOCAL HASH COMPUTED — NOT YET REGISTERED

---

## Step 3 — Confirm QR Rendering

Observed result:

PASS

Portable QR verifier rendered successfully. QR payload displayed under the QR image.

Observed QR payload prefix:

ARV1: present? YES

Observed safety posture:

LOCAL_L0 / local proof / not yet registered

---

## Step 4 — View Certificate

Observed result:

PASS

View Certificate opened the kernel offline certificate HTML in a new browser tab. Certificate showed LOCAL_L0 scope and local/offline/unregistered safety language.

Observed evidence ID in certificate:

ARV-LOCAL-70033855

Observed scope:

LOCAL_L0 present? YES

Observed certificate fields:

File name: arv-manual-qa-sample.txt  
Policy: ARV-L0-LOCAL-INTEGRITY-v1  
Producer: ARV-LOCAL  
Embedded verifier payload JSON: present  
Embedded bundle manifest JSON: present  

Observed safety language:

local, offline, and unregistered evidence  
not official validation  
not a public ledger record  
not an authority seal  
No ledger anchor  
No RFC 3161  

---

## Step 5 — Download Certificate PDF

Observed result:

PASS

Certificate PDF downloaded and opened successfully in the browser. PDF rendered the kernel offline certificate content.

Downloaded PDF filename:

ARV-LOCAL-70033855.certificate.pdf

Observed PDF fields:

ARV identity: present  
Evidence ID: ARV-LOCAL-70033855  
Scope: LOCAL_L0  
Policy: ARV-L0-LOCAL-INTEGRITY-v1  
Producer: ARV-LOCAL  
Cryptographic proof fields: present  
Embedded verifier payload: present  
Embedded bundle manifest: present  

Safety posture:

No authority seal claim observed.  
No ledger anchor claim observed.  
No RFC 3161 claim observed.  

---

## Step 6 — Download Evidence Package ZIP

Observed result:

PASS

Evidence package ZIP downloaded and opened successfully.

Downloaded ZIP filename:

ARV-LOCAL-70033855.evidence-package.zip

Observed ZIP contents:

ARV-LOCAL-70033855.bundle-manifest.json  
ARV-LOCAL-70033855.certificate.html  
ARV-LOCAL-70033855.signed-envelope.json  
ARV-LOCAL-70033855.verifier-payload.json  
ARV-LOCAL-70033855.witness-checkpoint.json  
arv-manual-qa-sample.txt  

Notes:

ZIP package content matched current implementation with 6 visible files. Package index integrity is covered by the automated kernel smoke suite.

---

## Step 7 — View Verification Payload

Observed result:

PASS

View Verification Payload opened a readable JSON payload in a new browser tab. Payload was generated through the file-backed consolidated kernel pipeline.

Observed payload format:

ARV-DEMOCLIENT-KERNEL-VERIFICATION-PAYLOAD-v1

Observed scope:

LOCAL_L0

Observed fields:

format  
scope  
algorithm  
evidence_id  
status  
document_hash  
merkle_root  
timestamp_utc  
issued_at_utc  
source_file  
kernel  
artifacts  
policy  
producer  

Observed evidence ID:

ARV-LOCAL-70033855

Observed status:

LOCAL_UNREGISTERED

---

## Step 8 — View L0 Record JSON

Observed result:

PASS

View L0 Record JSON opened a readable local record JSON payload in a new browser tab.

Observed markers:

arv_level: L0  
arv_policy: ARV-L0-LOCAL-INTEGRITY-v1  
id: ARV-LOCAL-70033855  
status: LOCAL_UNREGISTERED  
qr.payload: ARV1:...  
source_file: present  
timestamp.type: local  

Observed safety notice:

LOCAL PROOF. Authority fields are omitted by design. Register with ARV Authority to activate official validation, registered ledger position, authority seal, and institutional verification.

This notice is acceptable because it describes future/optional registration and does not claim that this local record is already registered.

---

## Step 9 — LOCAL_L0 Safety Boundary Check

Observed result:

PASS

Across QR, certificate HTML, PDF, ZIP, verification payload, and record JSON, the flow remained local/offline/unregistered.

Confirmed absent claims:

ARV Authority registration absent as current status? YES  
official authority seal absent as current status? YES  
public ledger anchoring absent as current status? YES  
RFC 3161 absent as current status? YES  
HSM/KMS absent as current status? YES  
PostgreSQL absent as current status? YES  
enterprise registration absent as current status? YES  
dispute/arbitration finality absent as current status? YES  

---

## Step 10 — Browser Console Check

Observed result:

PASS

Microsoft Edge DevTools was opened. Console was checked after the DemoClient actions. No blocking ARV runtime error was observed after the tested actions.

Console output:

No blocking ARV runtime errors observed. Any prior development-server noise was not tied to a failed ARV action.

---

## Exported Artifacts Record

Record ID: ARV-LOCAL-70033855  
Certificate HTML tab opened? YES  
PDF filename: ARV-LOCAL-70033855.certificate.pdf  
ZIP filename: ARV-LOCAL-70033855.evidence-package.zip  
Verification payload opened? YES  
Record JSON opened? YES  

Optional hashes, if independently calculated:

PDF SHA-256: Not independently calculated  
ZIP SHA-256: Not independently calculated  

---

## Defects Found

| ID | Step | Severity | Description | Status |
|---|---:|---|---|---|
| None | N/A | N/A | No functional defects observed during this manual QA run. | N/A |

Notes:

Manual QA run completed successfully.

---

## Final Decision

Final QA status:

PASS

Merge recommendation:

APPROVE

Reason:

Build passed, smoke suite passed, and manual browser QA passed for upload, QR, certificate HTML, PDF, ZIP, verification payload, L0 record JSON, LOCAL_L0 safety boundaries, and console check.

Tester signature:

Name: Olsen Castillo  
Date UTC: 2026-05-25T00:47:13.855Z  

---

## Checkpoint Declaration

CHECKPOINT 023:
ARV DemoClient Manual QA Run 001 completed.
Build passed.
Smoke suite passed.
Upload, QR, certificate HTML, PDF, ZIP, verification payload, and record JSON manually validated.
LOCAL_L0 safety boundaries confirmed.
No authority registration, RFC 3161, or public-ledger claims observed as current status.
Browser console checked.
Final QA result: PASS.