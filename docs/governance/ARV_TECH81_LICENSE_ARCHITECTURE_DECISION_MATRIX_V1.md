# ARV TECH81 License Architecture Decision Matrix v1

## 1. Purpose

This document establishes the controlled license architecture decision matrix for ARV and ProofOps.

It defines how ARV separates:

- open-source technical inspection;
- reusable proof infrastructure;
- brand authority;
- official issuer authority;
- commercial engine authority;
- Evidence Certificate authority;
- Bundle Evidence Package authority;
- Dispute Pack authority;
- CRL authority;
- official verification authority;
- closed vertical authority;
- customer-facing ARV authority.

This document is a governance and technical boundary document only.

It does not itself publish a license, grant a license, authorize release, authorize deployment, authorize public API exposure, authorize official Evidence Certificate issuance, authorize commercial sale, authorize fork endorsement, authorize trademark use, authorize logo use, authorize CRL operation, authorize public verifier operation or authorize external distribution.

The governing principle is:

**License != Authority**

## 2. Governing Doctrine

ARV may publish a narrow, auditable, minimal open-source technical core.

ARV may allow inspection, controlled contribution and technical reuse of bounded proof infrastructure.

But open-source code does not equal ARV authority.

Open-source code does not equal official issuer authority.

Open-source code does not equal commercial service authority.

Open-source code does not equal Evidence Certificate authority.

Open-source code does not equal Bundle Evidence Package authority.

Open-source code does not equal Dispute Pack authority.

Open-source code does not equal CRL authority.

Open-source code does not equal public verifier authority.

Open-source code does not equal customer-facing ARV authority.

## 3. License Segmentation Principle

ARV licensing must be segmented by authority class.

No single license decision may collapse the distinction between:

- code reuse;
- brand use;
- certificate issuance;
- commercial monetization;
- SaaS operation;
- verification authority;
- revocation authority;
- dispute preparation authority;
- customer-facing representation;
- official ARV endorsement.

## 4. Component Classification Matrix

| Component Class | Examples | Default Exposure | License Direction | Authority Status |
|---|---|---:|---|---|
| OSS Core Proof Utilities | hashing, canonicalization, manifest generation, local verification primitives | Public candidate | permissive OSS candidate subject to TECH81 final legal review | no official authority |
| OSS Developer Tooling | CLI helpers, local proof inspection, deterministic output tools | Public candidate | permissive OSS candidate subject to TECH81 final legal review | no official authority |
| Documentation Core | README, technical docs, contribution docs | Public candidate | documentation license pending legal review | no official authority |
| Governance Boundary Docs | TECH64+, TECH77+, TECH80+, TECH81+ | Public or controlled public | governance publication only, not operating authorization | no operational authority |
| SDK / Integration Layer | API clients, examples, adapters | Controlled candidate | segmented by risk: OSS or source-available | no issuer authority |
| Public Verifier Surface | certificate lookup, verification endpoints, official status pages | Closed until approved | proprietary / official-service terms | official authority only if authorized |
| Evidence Certificate Engine | issuance workflow, certificate templates, signing process | Closed | proprietary / commercial | official issuer authority |
| Bundle Evidence Package Engine | bundle generation, packaging, commercial workflows | Closed | proprietary / commercial | commercial authority |
| Dispute Pack Engine | dispute organization, claim preparation support | Closed | proprietary / commercial | no legal authority unless separately authorized |
| CRL / Revocation Service | revocation registry, CRL keys, revocation audit logs | Closed | proprietary / controlled service | CRL authority |
| Brand Assets | logo, mark, name, visual identity | Closed / controlled public | trademark policy, not code license | brand authority |
| Commercial Verticals | gig work, academic certificates, supply chain, agents, enterprise workflows | Closed by default | commercial agreements | vertical authority |
| Custody Ledger / Official Registry | official custody records, public audit ledger, signed registries | Closed or controlled public | official terms | custody authority |

## 5. Candidate License Options

Candidate license choices must be evaluated by component, not by repository emotion.

No license may be selected only because it is popular, familiar or easy.

Each license candidate must be evaluated against:

- commercial leakage risk;
- SaaS exploitation risk;
- contribution friction;
- patent posture;
- ecosystem adoption;
- compatibility with dependencies;
- clarity for enterprise users;
- enforceability;
- separation from trademark rights;
- separation from official ARV authority.

## 6. OSS Core License Direction

The OSS Core may be considered for a permissive open-source license only if the component:

- does not issue official certificates;
- does not operate CRL authority;
- does not expose private signing material;
- does not include commercial workflow logic;
- does not include official verifier authority;
- does not include closed vertical logic;
- does not imply official ARV endorsement;
- can be forked without harming ARV authority;
- can be reused without surrendering the commercial engine.

Preferred candidate class:

- permissive OSS license for narrow technical proof utilities;
- separate trademark policy for ARV names and marks;
- separate commercial license for protected services;
- separate terms for official verifier and certificate issuance.

## 7. Source-Available / Commercial License Direction

Any component that enables or materially assists commercial substitution of ARV official services must be excluded from the OSS Core unless governance explicitly approves otherwise.

This includes:

- certificate issuance;
- official verification;
- public certificate lookup;
- CRL operation;
- revocation workflows;
- customer-facing evidence portals;
- commercial packaging;
- official report generation;
- paid workflow automation;
- dispute pack generation;
- bundle evidence packaging;
- custody authority services;
- official registry operation.

Default status:

**Closed unless explicitly opened by governance.**

## 8. Trademark Separation

Code license does not grant brand license.

Forks may use the code only within the limits of the applicable code license.

Forks may not imply:

- official ARV status;
- ARV certification authority;
- ARV certificate issuance;
- ARV verification authority;
- ARV endorsement;
- ARV compatibility unless permitted by policy;
- ARV-controlled custody;
- ARV-backed dispute authority;
- ARV commercial authorization.

Trademark and brand rights remain separately governed.

## 9. Fork Policy Boundary

A fork may be technically valid as code.

A fork is not official ARV.

A fork may not issue official ARV certificates.

A fork may not operate an official ARV CRL.

A fork may not claim ARV verifier authority.

A fork may not use ARV marks, logos or confusingly similar identifiers without authorization.

A fork may not represent itself as an ARV-approved service unless ARV governance explicitly authorizes it.

Final fork rule:

**Fork != Official ARV**

## 10. Contribution IP Boundary

External contributions must not enter critical authority surfaces without IP controls.

Critical files include:

- license architecture;
- trademark policy;
- certificate issuance logic;
- CRL logic;
- signing logic;
- public verifier logic;
- custody ledger logic;
- governance boundaries;
- release signing workflows;
- security workflows;
- official registry workflows.

Default contribution posture:

- DCO may be acceptable for low-risk technical patches;
- CLA or equivalent written IP control is required for critical authority surfaces;
- CODEOWNERS must protect critical paths;
- no external contribution may create accidental authority.

## 11. Dependency License Boundary

No dependency may be introduced if it creates:

- incompatible license obligations;
- forced disclosure of closed modules;
- uncertainty over commercial use;
- patent risk not reviewed;
- copyleft spread into protected commercial engine;
- unclear attribution obligations;
- unclear redistribution obligations;
- unknown provenance.

Dependency acceptance requires license review before release.

## 12. SaaS Risk Boundary

Network-accessible proof services create elevated risk.

Any service that can be operated as a hosted substitute for ARV official services requires special review.

This includes:

- verifier APIs;
- certificate APIs;
- registry APIs;
- CRL APIs;
- custody APIs;
- evidence bundle APIs;
- dispute pack APIs;
- paid proof automation APIs.

Default rule:

**Hosted authority surfaces remain closed unless governance explicitly authorizes release.**

## 13. Dual-License Boundary

ARV may use dual-license architecture where appropriate.

Permitted model:

- narrow OSS core for technical trust and adoption;
- commercial license for official service use;
- trademark policy for brand control;
- private engine for monetization;
- private CRL and issuer controls for official authority.

Dual licensing may not be implemented casually.

It requires:

- legal signoff;
- component inventory;
- dependency review;
- contributor IP clearance;
- release gate approval;
- written decision record.

## 14. License Decision Table

| Component | Candidate License Class | Commercial Risk | Authority Risk | Default Decision |
|---|---|---:|---:|---|
| local hash utility | permissive OSS candidate | low | low | candidate open |
| canonicalization utility | permissive OSS candidate | medium | low | candidate open after review |
| local manifest generator | permissive OSS candidate | medium | low | candidate open after review |
| local proof verifier | permissive OSS candidate | medium | medium | candidate open only if no official status |
| SDK client | segmented | medium | medium | case-by-case |
| public verifier API | proprietary/service terms | high | high | closed |
| certificate issuance engine | proprietary/commercial | high | critical | closed |
| CRL service | proprietary/controlled | high | critical | closed |
| custody ledger | proprietary/controlled | high | critical | closed |
| dispute pack generator | proprietary/commercial | high | high | closed |
| bundle evidence package generator | proprietary/commercial | high | high | closed |
| brand assets | trademark policy | high | critical | controlled |
| commercial verticals | commercial/private | high | high | closed |

## 15. Required TECH81 Decisions

Before public launch, ARV governance must decide:

1. OSS Core license candidate.
2. Documentation license candidate.
3. SDK license candidate.
4. Whether any AGPL-style network reciprocity is useful or harmful.
5. Whether any source-available license is required.
6. Commercial license boundary.
7. Trademark policy boundary.
8. Contributor CLA / DCO split.
9. Dependency license review process.
10. Public verifier and CRL exclusion boundary.

No public release may proceed without these decisions.

## 16. Go / No-Go Gate

TECH81 status:

**NO-GO**

This document authorizes license architecture planning only.

It does not authorize final license publication, public release, deployment, commercial use, Evidence Certificate issuance, Bundle Evidence Package sale, Dispute Pack sale, CRL operation, public verifier operation, trademark use, fork endorsement or external distribution.

## 17. Audit Principle

ARV may open code.

ARV may protect authority.

ARV may publish proof utilities.

ARV may keep commercial engines closed.

ARV may allow forks.

ARV may deny official status to forks.

ARV may permit inspection.

ARV may prohibit brand misuse.

ARV may permit contribution.

ARV may reject authority leakage.

Final rule:

**License != Authority**

**Code != Brand**

**Fork != Official ARV**

**OSS Core != Commercial Engine**

**Public Verifier != Public Code**

**Certificate Issuance != Local Proof**