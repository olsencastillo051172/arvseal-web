# ARV Tech63 Pre-OSS Release Boundary Audit v1

## 1. Purpose

This document establishes the controlled pre-OSS release boundary for ARV — Reality Validation Authority.

Its purpose is to determine what may be prepared for a future public open-source export, what must remain protected, and which external protection and governance steps must be completed before any publication decision is authorized.

This document is a governance artifact. It does not publish product code, runtime dependencies, commercial implementation logic, secrets, signing material, telemetry, private adapters or managed-service components.

## 2. Foundational Doctrine

ARV preserves the distinction:

**Proof != Authority**

A cryptographic proof may establish integrity, traceability and provenance of a file or event within the scope of the captured evidence. It does not automatically establish the absolute material truth of a fact, the legal validity of a claim or a judicial determination.

The canonical local kernel remains governed by the **LOCAL_L0** isolation doctrine.

## 3. Controlled Public Candidate

A future OSS export may only include a deliberately minimized, separately reviewed surface such as:

- public schemas and test vectors;
- narrowly scoped local verification logic;
- interoperability wrappers expressly approved for publication;
- documentation and examples that do not expose protected implementation details;
- license notices and trademark exclusions;
- reproducible local tests that do not depend on managed infrastructure.

No repository, package or documentation file becomes public merely because it exists in the private development repository.

## 4. Protected Boundary

The following categories remain outside any automatic OSS publication path:

- official issuance and managed certification logic;
- commercial orchestration and managed-service implementation;
- private policy and dispute-resolution logic;
- production adapters and privileged connectors;
- telemetry and internal measurement mechanisms;
- signing keys, secrets and productive credentials;
- protected trademarks, emblems and certification seals;
- any implementation classified as private or managed by the existing governance documents.

The detailed internal classification remains governed by:

- `SURFACE_CLASSIFICATION.md`;
- `LICENSE_POLICY.md`;
- `TRADEMARK_POLICY.md`;
- `REPOSITORY_MAP.md`;
- `PUBLICATION_GO_NO_GO.md`;
- `SOFTWARE_COPYRIGHT_DEPOSIT_POLICY.md`.

## 5. External Protection Tracks

Before any OSS publication decision, the project must document the applicable protection tracks and their current status.

### 5.1 Identity and Distinctive Signs

The commercial identity layer must be managed independently from OSS licensing.

The project must evaluate and document the ONAPI strategy for:

- the ARV denominative mark;
- the Reality Validation Authority commercial name;
- the figurative identity;
- emblems;
- official certification seals;
- the relevant Nice Classification scope, including evaluation of **Clase 9** and **Clase 42**.

OSS licensing does not grant permission to use ARV trademarks, emblems, seals or official-certification identifiers.

### 5.2 Software Copyright Snapshot

Before exposing any approved OSS extract, ARV must prepare a controlled **Snapshot Pre-OSS** and document the applicable ONDA deposit process.

The deposited snapshot and the future OSS export are distinct artifacts. The public export must remain a minimized extract, not an uncontrolled copy of the private repository.

### 5.3 Corporate Track

The SRL process must be documented as an organizational and commercial track.

The SRL does not replace copyright protection, trademark protection, repository isolation or release-governance controls.

### 5.4 Patentability Review

Current governance status:

**Sin Gate Activo de Patentabilidad**

No patent filing is treated as an automatic prerequisite for the controlled OSS-preparation process unless a specialized technical and legal review identifies a concrete patentability strategy.

## 6. Mandatory Technical Controls Before Publication

A future public export remains blocked until the release candidate has passed a controlled audit confirming:

- exact repository and file inventory;
- explicit public-versus-protected surface classification;
- clean worktree;
- reproducible build;
- reproducible smoke tests;
- UTF-8 without BOM normalization;
- SHA-256 manifest generation;
- license review;
- trademark and seal exclusions;
- contributor-governance review;
- secret scanning;
- dependency review;
- absence of production credentials;
- absence of active managed-service coupling;
- absence of private implementation leakage;
- signed GO / NO-GO decision.

## 7. Current Decision

Current release decision:

**NO-GO**

The project is authorized to continue controlled preparation, documentation, private validation and protection-track execution.

The project is not yet authorized to publish an OSS repository or public release artifact.

## 8. Audit Principle

ARV will not publish its private repository by inertia.

Any future OSS publication must be an intentional, minimized and independently reviewed export whose scope is strictly limited to the approved public surface.

The protected commercial system remains isolated behind the governance boundary.
