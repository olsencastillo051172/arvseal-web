# ARV Tech65 Controlled OSS Extraction Procedure v1

## 1. Purpose

This document establishes the controlled extraction procedure required before any future ARV open-source candidate may be prepared, reviewed, packaged, released or externally distributed.

It does not authorize publication, release, packaging, repository exposure or external distribution.

Its purpose is to define a reproducible, independently auditable extraction path from the protected private development repository into a deliberately minimized public-candidate surface.

## 2. Governing Doctrine

ARV preserves the foundational distinction:

**Proof != Authority**

Cryptographic evidence may establish integrity, traceability and provenance within the scope of captured evidence. It does not automatically establish absolute material truth, legal validity or judicial authority.

The canonical local kernel remains governed by the **LOCAL_L0** isolation doctrine.

No extraction procedure may transform protected commercial implementation into public material by inertia, convenience, tooling default, repository structure or packaging pressure.

## 3. Current Controlled-Export Status

Current controlled-export status:

**NO-GO**

The project may continue documentation, private validation, controlled inventory preparation and protection-track execution.

No OSS repository, public package, public artifact, public API release or external distribution is authorized by this document.

## 4. Extraction Principle

A future OSS candidate must be produced only by explicit extraction.

The public candidate must not be created by copying the private repository wholesale.

The extraction must be:

- intentional;
- minimized;
- reproducible;
- separately reviewed;
- independently auditable;
- cryptographically fingerprinted;
- aligned with the controlled candidate inventory;
- isolated from protected commercial implementation.

## 5. Source Boundary

The private repository is the protected development source.

The public candidate is a separately prepared export artifact.

The existence of a file, component, schema, wrapper, adapter, test, example, note, script or package inside the private repository does not make it eligible for publication.

Eligibility requires affirmative classification, review and inclusion in the approved extraction manifest.

## 6. Required Inputs Before Extraction

Before any extraction attempt, the project must have:

- a validated main checkpoint;
- a controlled candidate inventory document;
- an explicit public-versus-protected classification;
- an approved candidate file allowlist;
- an explicit protected-surface exclusion list;
- license review;
- trademark and seal review;
- contributor-governance review;
- dependency review;
- secret scanning;
- credential scanning;
- telemetry review;
- managed-service coupling review;
- private adapter review;
- production connector review;
- reproducible local smoke-test plan;
- signed GO / NO-GO decision.

## 7. Candidate Allowlist Rule

Only files expressly listed in the approved extraction allowlist may enter a future public candidate.

The allowlist must identify each approved item by:

- repository-relative path;
- candidate classification;
- extraction rationale;
- review owner;
- licensing status;
- dependency status;
- test status;
- SHA-256 fingerprint after extraction.

No wildcard inclusion is permitted unless separately justified and independently reviewed.

## 8. Protected Exclusion Rule

The extraction procedure must exclude protected material including, at minimum:

- official ARV Snap issuance;
- ProofOps commercial orchestration;
- Baul de pruebas;
- Evidence Certificate;
- Bundle Evidence Package;
- Dispute Pack;
- Policy Engine;
- Dispute Logic;
- enterprise API;
- managed Gateway;
- productive adapters;
- privileged connectors;
- telemetry;
- internal measurement mechanisms;
- signing keys;
- secrets;
- production credentials;
- managed-service components;
- private implementation logic;
- protected trademarks;
- emblems;
- certification seals.

Protected exclusions override allowlist ambiguity.

## 9. Extraction Workspace Rule

A future extraction must occur in a clean, controlled workspace.

The extraction workspace must be created from a validated source checkpoint and must not contain:

- untracked files unrelated to the extraction;
- unstaged tracked changes;
- staged changes outside the approved candidate;
- generated artifacts not explicitly permitted;
- local secrets;
- environment credentials;
- private configuration;
- production tokens;
- uncontrolled build output.

## 10. Extraction Manifest Rule

Every future extraction must generate an extraction manifest containing:

- source repository identifier;
- source branch;
- source commit;
- extraction timestamp;
- extraction operator;
- extraction procedure version;
- approved candidate file list;
- excluded protected categories;
- per-file SHA-256 fingerprints;
- aggregate manifest SHA-256;
- build and smoke-test result references;
- signed GO / NO-GO decision reference.

The extraction manifest must be preserved as an auditable governance artifact.

## 11. Technical Controls During Extraction

The extraction process must verify:

- exact source checkpoint;
- exact candidate allowlist;
- absence of unapproved files;
- absence of protected implementation leakage;
- absence of secrets and productive credentials;
- UTF-8 without BOM normalization where applicable;
- deterministic line endings where applicable;
- dependency boundaries;
- license compatibility;
- trademark and seal exclusions;
- reproducible local tests;
- SHA-256 manifest generation;
- clean post-extraction worktree;
- independently reviewable diff.

## 12. Publication Gate

A future public candidate remains blocked until the project has completed:

- candidate inventory approval;
- extraction procedure approval;
- allowlist approval;
- protected-surface exclusion approval;
- dependency and license review;
- secret and credential scanning;
- reproducible local smoke tests;
- independent governance review;
- signed GO / NO-GO decision.

No technical artifact may bypass the publication gate.

## 13. Audit Principle

ARV will not publish its private repository by inertia.

Any future public export must be deliberately extracted, minimized, separately reviewed and independently auditable.

The protected commercial system remains isolated behind the governance boundary.

## 14. Current Outcome

Current outcome:

**NO-GO**

This document authorizes controlled extraction planning only.

It does not authorize OSS publication, package release, repository exposure, public API release or external distribution.