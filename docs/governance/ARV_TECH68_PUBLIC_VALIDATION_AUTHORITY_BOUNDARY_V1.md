# ARV Tech68 Public Validation Authority Boundary v1

## 1. Purpose

This document establishes the public validation authority boundary for ARV and ProofOps.

It defines what a public, open-source or externally visible ARV verifier may validate, and what it must never imply, issue, certify, adjudicate or authorize.

This document does not authorize publication, release, packaging, repository exposure, public API release or external distribution of any protected ARV commercial system.

Its purpose is to preserve the distinction between cryptographic verification and institutional authority.

The governing principle remains:

**Proof != Authority**

A public verifier may prove that specific evidence artifacts are internally consistent, traceable and cryptographically verifiable.

A public verifier must not represent itself as a legal authority, certification authority, judicial authority, commercial entitlement authority, customer-facing service authority or official ARV issuance authority.

## 2. Governing Doctrine

ARV separates four different concepts:

1. evidence integrity;
2. evidence provenance;
3. evidentiary interpretation;
4. institutional authority.

Cryptographic proof may support the first two concepts.

Cryptographic proof does not automatically establish the last two concepts.

No public candidate, open-source verifier, demo utility, documentation artifact, user interface, command-line tool, hosted preview, deployment artifact or repository workflow may collapse these categories.

The canonical local kernel remains governed by the **LOCAL_L0** isolation doctrine.

## 3. Current Controlled-Export Status

Current controlled-export status:

**NO-GO**

This document authorizes boundary planning only.

It does not authorize external publication of:

- public validation services;
- hosted verification portals;
- public API validators;
- public ARV certificate issuance;
- official ARV Snap issuance;
- customer-facing validation workflows;
- dispute automation;
- legal validity statements;
- judicial admissibility statements;
- compliance determinations;
- commercial entitlement checks;
- managed gateway validation;
- protected signing infrastructure;
- protected validation keys;
- privileged connector logic;
- private implementation logic.

## 4. Allowed Public Validation Surface

A future public candidate may only be considered for allowlist review if it is deliberately minimized and limited to technical verification.

Potentially allowable public validation classes include:

- local file hash verification;
- manifest consistency verification;
- artifact existence verification;
- deterministic receipt parsing;
- chain-of-custody structure inspection;
- timestamp field presence checks;
- local signature format inspection;
- local provenance graph rendering;
- evidence package completeness checks;
- reproducible local smoke tests;
- non-authoritative verification reports;
- machine-readable verification summaries;
- human-readable technical audit summaries.

These classes remain candidates only.

They are not approved for public release until separately reviewed under the applicable allowlist, extraction, security, dependency, licensing, governance and publication gates.

## 5. Prohibited Public Authority Claims

No public candidate may claim, imply or represent that ARV has issued any of the following unless the protected commercial system has explicitly authorized that action through a separate controlled process:

- legal certification;
- judicial certification;
- evidentiary admissibility;
- official evidentiary truth;
- official identity validation;
- official signer authority;
- customer entitlement approval;
- commercial approval;
- payment authorization;
- dispute outcome determination;
- fraud determination;
- regulatory compliance;
- tax compliance;
- labor compliance;
- platform compliance;
- contractual breach determination;
- official ARV Snap issuance;
- official Evidence Certificate issuance;
- official Dispute Pack issuance;
- official Bundle Evidence Package issuance;
- official ProofOps managed-service validation.

## 6. Required Public Language Boundary

Any future public verifier must use strictly technical language.

Allowed language examples:

- "hash matched";
- "manifest parsed";
- "artifact present";
- "receipt structure valid";
- "signature format recognized";
- "local chain structure is internally consistent";
- "verification completed within supplied evidence scope";
- "no authority determination performed."

Prohibited language examples:

- "certified";
- "legally valid";
- "court-ready";
- "officially approved";
- "ARV-authorized";
- "judicially admissible";
- "commercially accepted";
- "customer verified";
- "identity approved";
- "dispute resolved";
- "fraud confirmed";
- "compliance approved";
- "certificate issued";
- "Snap issued";
- "Evidence Certificate generated";
- "Dispute Pack approved."

No UI label, API response, CLI output, documentation line, README badge, hosted preview, automated comment or deployment status may imply public authority by wording, color, badge, seal, icon, domain placement or workflow position.

## 7. Public Validator Output Rule

A public validator must produce outputs that are technical, bounded and non-authoritative.

A valid public validation output must identify:

- the artifact being checked;
- the hash or digest checked;
- the manifest or receipt field checked;
- the local verification operation performed;
- the result of that operation;
- the limitation that no legal, commercial, judicial or certification authority is being exercised.

A valid public validation output must not issue:

- certificates;
- commercial acceptance;
- legal conclusions;
- dispute conclusions;
- judicial conclusions;
- customer-specific determinations;
- official ARV issuance;
- protected service decisions.

## 8. No Authority by Deployment

Authority cannot arise merely because a validation tool is deployed.

The following facts do not create ARV authority:

- being hosted on a public URL;
- being deployed through Vercel or any other hosting system;
- being linked from a repository;
- being triggered by CI;
- being presented in a pull request;
- being rendered in a browser;
- being accessible through a public route;
- being called through an API;
- being referenced by documentation;
- being used by a third party;
- being copied into another repository;
- being used in a demo.

Deployment is not authority.

Availability is not authority.

Visibility is not authority.

Automation is not authority.

## 9. No Authority by Repository Structure

Authority cannot arise by repository placement.

The following repository locations do not create ARV authority:

- `/docs`;
- `/governance`;
- `/examples`;
- `/demo`;
- `/scripts`;
- `/tests`;
- `/public`;
- `/api`;
- `/tools`;
- `/packages`;
- `/apps`.

A file path may help organize public material.

A file path does not authorize certification, issuance, adjudication, commercial validation or customer-facing service authority.

## 10. No Authority by Cryptographic Success

A cryptographic success result is not an authority result.

A successful hash match means that a file matched an expected digest.

A successful manifest check means that a manifest satisfied a technical rule.

A successful signature format check means that a signature structure satisfied a technical rule.

A successful chain inspection means that the supplied chain data was internally inspectable.

None of these outcomes means that ARV has:

- certified the artifact;
- approved the artifact;
- validated a legal claim;
- accepted commercial liability;
- accepted customer evidence;
- resolved a dispute;
- issued a certificate;
- issued an official record;
- performed regulated validation;
- exercised judicial or institutional authority.

## 11. Protected Authority Surfaces

The following authority surfaces remain protected unless separately approved:

- official ARV Snap issuance authority;
- Evidence Certificate issuance authority;
- Bundle Evidence Package issuance authority;
- Dispute Pack issuance authority;
- customer-facing validation authority;
- commercial workflow approval authority;
- dispute logic;
- policy engine logic;
- private signer logic;
- protected key custody;
- certification seals;
- authority marks;
- managed gateway decisions;
- privileged connector decisions;
- customer-specific evidence decisions;
- internal measurement mechanisms;
- telemetry-based decision mechanisms;
- monetization-linked validation mechanisms;
- protected commercial orchestration.

## 12. Public Candidate Review Requirements

Before any public validator may be approved, it must pass:

- explicit allowlist approval;
- candidate inventory approval;
- extraction procedure approval;
- dependency and license review;
- secret and credential scanning;
- reproducible local smoke tests;
- non-authoritative wording review;
- UI authority-language review;
- API response authority-language review;
- hosted-preview authority-language review;
- independent governance review;
- signed GO / NO-GO decision.

No public validator may bypass the publication gate.

## 13. Required Disclaimer Doctrine

Any future public validator must preserve a disclaimer equivalent to:

"This tool performs technical verification only. It does not issue legal, judicial, commercial, evidentiary, certification, customer-facing or ARV service authority."

The disclaimer must be visible wherever a human-readable validation result is displayed.

Machine-readable outputs must contain an equivalent bounded-authority field.

## 14. Audit Principle

ARV will not create public authority by accident.

Any future public validation surface must be deliberately allowed, deliberately extracted, minimized, separately reviewed and independently auditable.

The protected commercial authority system remains isolated behind the governance boundary.

## 15. Current Outcome

Current outcome:

**NO-GO**

This document authorizes public validation authority boundary planning only.

It does not authorize implementation, publication, release, deployment, packaging, public API exposure, official certificate issuance, official Snap issuance, commercial validation, dispute validation, customer-facing validation or external distribution.