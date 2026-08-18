# BugSeal Product and System Design

**Date:** 2026-08-18

**Status:** Approved for implementation planning

**Program target:** Midnight “New Moon to Full,” Levels 1–6

## 1. Executive summary

BugSeal is a privacy-preserving responsible-disclosure system for software vulnerabilities. It lets a security researcher prove that they disclosed a vulnerability to a project at a particular time without publicly revealing the vulnerability or their identity.

The product coordinates the path from private discovery to safe disclosure. Midnight records commitments, timestamps, authorization, and lifecycle events. Vulnerability details and evidence are encrypted on the researcher’s device for the maintainer and stored outside the chain. The reporter retains a private receipt that can later prove ownership of the original submission.

BugSeal is human-first and agent-ready. Human researchers, AI-assisted researchers, and autonomous security agents use the same private disclosure protocol. BugSeal does not attempt to build an AI scanner, automatically judge whether a vulnerability is valid, or generate patches itself.

**One-line pitch:** BugSeal lets security researchers prove they disclosed a vulnerability first, without revealing the vulnerability or their identity.

**Tagline:** Prove you reported it. Keep the exploit sealed.

## 2. Problem

Responsible disclosure often starts through email, a web form, or a community channel. This creates several problems:

- A researcher may have no portable proof of what they reported or when they reported it.
- Sensitive exploit details can be exposed to inbox providers, form operators, or compromised collaboration tools.
- Maintainers and researchers may disagree about whether a report was first, duplicated, acknowledged, or fixed.
- Anonymous reporters have difficulty establishing continuity across triage and patching.
- AI security agents can generate more findings than maintainers can safely validate, increasing spam, false positives, and duplicate reports.
- Public disclosure before a patch can put users at risk, while indefinite private handling gives the reporter little accountability.

BugSeal addresses the coordination and provenance problem. It does not replace vulnerability research, human triage, security audits, or legal safe-harbor agreements.

## 3. Product boundaries

### 3.1 Primary users

1. **Researchers:** independent bug hunters, cybersecurity students, auditors, open-source contributors, and AI-assisted security practitioners.
2. **Maintainers:** open-source maintainers, Web3 project teams, small software companies, DAOs, and security teams.
3. **Agents:** authorized security agents acting under a project’s published submission policy.
4. **Validators, introduced later:** trusted humans or services that attest that a report was reproduced or a patch was verified.

### 3.2 Core jobs

- Submit a vulnerability privately and obtain a tamper-evident receipt.
- Prove ownership of the original report without exposing it publicly.
- Let the designated maintainer acknowledge and triage the report.
- Preserve an auditable lifecycle from submission through patching.
- Reveal only the information the reporter and maintainer choose to disclose after remediation.
- Accept structured reports from humans and AI agents without making AI the authority.

### 3.3 Explicit non-goals

The first product will not:

- scan repositories or applications for vulnerabilities;
- determine vulnerability validity or severity automatically;
- guarantee the legal safety of vulnerability research;
- replace security audits or existing bug-bounty programs;
- publish exploit details automatically;
- operate bounty escrow, payments, arbitration, or dispute resolution;
- provide immutable storage for plaintext reports or attachments;
- claim absolute reporter anonymity.

## 4. Positioning and differentiation

BugSeal is a **proof-of-disclosure and coordination layer**, not a general whistleblowing portal and not another bounty marketplace.

Existing products such as GitHub Private Vulnerability Reporting, HackerOne, and Bugcrowd provide valuable intake and bounty workflows. BugSeal’s differentiator is a portable cryptographic receipt, privacy-preserving ownership proof, and an independently timestamped lifecycle that can be used across maintainers and tools.

Midnight projects such as CryptoTrust, SpillSafe, zkWhistle, and UnRedacted demonstrate demand for private reviews and anonymous reporting. BugSeal narrows the use case to software vulnerability disclosure and adds the domain-specific lifecycle of first-report proof, maintainer acknowledgment, duplicate handling, remediation, and controlled post-patch disclosure.

The agentic-AI position is:

> The private coordination and provenance layer between AI security agents, researchers, and software maintainers.

## 5. Trust and privacy model

### 5.1 What Midnight proves

Midnight is responsible for:

- registering a project and its authorized maintainer authority;
- recording the report commitment and submission time;
- verifying knowledge of the private report preimage for ownership proofs;
- enforcing who may change the report’s public lifecycle status;
- recording immutable lifecycle and attestation events;
- exposing only the intentionally public fields.

### 5.2 What Midnight does not prove

The chain does not decide whether a vulnerability is real, determine severity, or guarantee that a maintainer acted fairly. Validity is a maintainer decision, optionally supported by later validation attestations. The ledger proves what was committed and which authorized party recorded an action.

### 5.3 Public data

- Project identifier
- Report identifier
- Commitment
- Submission timestamp
- Current lifecycle status
- Maintainer acknowledgment and subsequent public event timestamps
- Encryption-key version used by the report
- Public disclosure metadata, only when intentionally released

The project identifier is public in the MVP. This makes verification and routing understandable while keeping the reporter, exploit, and evidence private.

### 5.4 Private and encrypted data

Private witness data:

- Canonical report
- High-entropy random salt
- Reporter identity, if the reporter chooses to retain or reveal one
- Private receipt data

Client-encrypted off-chain data:

- Full vulnerability report
- Reproduction instructions and proof of concept
- Attachments
- Reporter–maintainer follow-up messages
- AI-origin and human-review declarations when the submission policy treats them as sensitive

The storage service receives ciphertext and cannot decrypt the report. A hash of the encrypted payload protects integrity.

### 5.5 Honest anonymity claim

BugSeal minimizes identity exposure but does not promise absolute anonymity. Network metadata, wallet history, browser fingerprinting, timing correlation, compromised devices, and information inside an uploaded report can reveal a reporter. The UI and documentation must communicate these limits and recommend appropriate operational security.

## 6. Core disclosure flow

### 6.1 Project registration

1. A maintainer registers a public project identifier.
2. The maintainer sets the authorized Midnight authority for lifecycle changes.
3. From Level 3 onward, the maintainer publishes an encryption public key and key version.
4. From Level 3 onward, the maintainer publishes a hash of its submission policy.

### 6.2 Report creation

1. The researcher selects the target project.
2. The client converts the report into one deterministic canonical representation.
3. The client generates a fresh, cryptographically secure salt.
4. The client derives a commitment from the project identifier, canonical report, and salt.
5. The client creates an encrypted private receipt containing the report identifier, project identifier, canonicalization version, salt, and commitment.
6. The researcher must save or confirm backup of the receipt before submission continues.

Conceptually:

```text
commitment = Hash(projectId || canonicalizationVersion || canonicalReport || salt)
```

The commitment function is a versioned protocol boundary. Its implementation must use a circuit-compatible hash primitive supported by the target Midnight toolchain, with one documented byte/field encoding shared by the client and Compact contract. A commitment version is stored with each report so a future hash migration cannot change the meaning of an existing receipt.

### 6.3 Encryption and storage

1. The client generates a new symmetric encryption key for each report.
2. The full report and attachments are encrypted locally.
3. The report key is wrapped for the maintainer’s registered encryption public key.
4. Ciphertext is uploaded to the deletable report relay.
5. The client verifies the returned content hash.
6. The encrypted content reference and hash are bound to the on-chain submission.

IPFS is not the default MVP storage because responsible disclosure may require enforceable retention and deletion. The report relay uses deletable encrypted object storage, while the on-chain ciphertext hash preserves tamper evidence.

### 6.4 Ledger submission and receipt

The researcher submits the commitment and project identifier. From Level 4 onward, the submission also includes the encryption-key version and encrypted payload reference/hash. Before the relay exists, the report stays local to the researcher and can be shared directly with the maintainer for the demonstration flow. The reporter’s address is not stored as a public field of the report record. The resulting report identifier and timestamp are added to the local receipt.

If the ledger transaction fails after ciphertext upload, the ciphertext is treated as an orphan and deleted automatically after a short configured retention window.

### 6.5 Ownership proof

To prove ownership, the researcher supplies the canonical report and salt as private witness data. The circuit recomputes the commitment and proves that it matches the selected public report record. The report contents and salt remain private.

Losing the receipt and its salt means ownership cannot be recovered from the public ledger. The product must make this consequence clear and strongly encourage encrypted backup.

### 6.6 Maintainer triage and disclosure

The primary lifecycle is:

```text
SUBMITTED -> ACKNOWLEDGED -> VALID -> PATCHED -> DISCLOSED
                         \-> DUPLICATE -> CLOSED
                         \-> REJECTED  -> CLOSED
                         \-> VALID -> CLOSED
```

- Only the registered maintainer authority may acknowledge, classify, or mark a report patched.
- Every transition is timestamped and must follow the state machine.
- A duplicate or rejection explanation remains encrypted unless both sides choose to publish it.
- `DISCLOSED` means approved disclosure metadata exists; it does not force plaintext exploit details on-chain.
- The reporter may remain anonymous, take pseudonymous credit, publish a redacted summary, or intentionally open the original commitment after patching.

## 7. Agentic-AI extension

### 7.1 Principle

BugSeal is **human-first, agent-ready**. Humans remain responsible for authorization and high-impact decisions, while external agents can use a structured submission protocol. AI origin is provenance, not proof of quality.

### 7.2 Submission origins

Each encrypted report declares one of:

- `HUMAN`: discovered and prepared by a person;
- `AI_ASSISTED`: AI contributed, and a human reviewed the report before submission;
- `AGENT_GENERATED`: an autonomous agent prepared and submitted it.

Where policy requires public enforcement, the submission includes a minimal public policy-compliance claim without exposing sensitive tool or report details.

### 7.3 Structured evidence package

The shared schema supports:

- target project and software version;
- affected component;
- vulnerability class;
- reproduction environment;
- reproduction steps;
- impact statement;
- proof-of-concept hash;
- confidence score and its declared scale;
- originating tool/model identifier;
- human-review declaration;
- optional proposed-patch hash.

The schema is versioned. Unknown optional fields are ignored safely, while required fields are validated before encryption and submission.

### 7.4 Project submission policy

A maintainer may publish a versioned policy allowing, for example:

- all human submissions;
- AI-assisted reports only after human review;
- autonomous reports only with a reproducible proof of concept;
- agents only within an explicitly authorized target and test scope;
- rate or payload-size limits.

The full policy remains human-readable off-chain, with its version and hash anchored publicly. BugSeal enforces only structural conditions the contract can verify, such as the presence of a required registered attestation or a permitted origin value. It cannot prove that a self-declared origin or human review is truthful. BugSeal never interprets legal permission on the researcher’s behalf.

### 7.5 Validation and patch attestations

The core lifecycle remains small. Additional evidence is represented as signed attestations rather than multiplying status values:

- `HUMAN_REVIEWED`
- `REPRODUCED`
- `PATCH_PROPOSED`
- `PATCH_VERIFIED`

An attestation records its type, timestamp, authorized attestor, and private evidence commitment. It does not automatically change a report to `VALID` or `PATCHED`; the maintainer remains the lifecycle authority.

### 7.6 Agent interface

From Level 4, an SDK/API helps an authorized agent canonicalize a report, create and encrypt an evidence package, upload ciphertext, and prepare a Midnight transaction. The final transaction is signed by an agent-controlled compatible wallet or delegated signing authority. The relay API alone cannot create a trusted report record.

BugSeal deliberately does not include its own scanner, autonomous validity judge, patch generator, or bounty escrow in Levels 1–6.

## 8. System architecture

### 8.1 Compact contract

One Compact contract owns the core protocol, separated into narrowly scoped circuits or modules:

- project and maintainer registry;
- encryption-key version registry;
- report commitment submission;
- private ownership proof;
- lifecycle transition authorization;
- policy hash/version registration;
- validation and patch attestations.

The Level 1 contract implements only the minimum circuits needed for submission, ownership proof, and acknowledgment. Later circuits are introduced progressively without changing the privacy model.

### 8.2 Client privacy engine

A framework-independent TypeScript module handles:

- canonicalization;
- salt generation;
- commitment derivation;
- client-side encryption and decryption;
- evidence-package validation;
- receipt creation, encryption, export, and recovery;
- proof input preparation.

Keeping this separate from the UI makes the same protocol reusable by the web application and agent SDK.

### 8.3 Web application

The React/TypeScript application provides:

- Lace wallet connection and network checks;
- researcher submission flow;
- mandatory receipt-backup checkpoint;
- report-status and ownership-verification screens;
- maintainer inbox and triage dashboard;
- public project and report verifier;
- selective post-patch disclosure page.

### 8.4 Encrypted report relay

The relay stores only ciphertext, wrapped keys, attachments, and content metadata. It provides upload, authorized retrieval, configured retention, and deletion. It never receives plaintext or encryption private keys and can be replaced without changing the ledger protocol.

### 8.5 Indexer and notifications

A read-only indexer observes public contract events to power search, dashboards, and notifications. Notification failure cannot alter ledger state or block later retrieval. Notifications contain no vulnerability details.

## 9. Security and failure handling

### 9.1 Threats and mitigations

| Threat | Mitigation |
|---|---|
| Guessing a low-entropy report from its commitment | Fresh high-entropy random salt for every report |
| Relay operator reads the vulnerability | Encryption occurs on the client before upload |
| Relay modifies ciphertext | Content hash is checked by the client and bound to the report |
| Relay deletes ciphertext | Researcher receipt and optional encrypted backup; clear availability model |
| Another party claims the report | Ownership requires knowledge of the canonical report and salt |
| Maintainer rewrites history | Initial commitment, timestamp, and transitions are immutable |
| Unauthorized lifecycle update | Contract checks the registered maintainer authority |
| Lost or rotated maintainer key | Versioned keys; old private keys retained until linked reports close |
| Reporter loses the receipt | Mandatory backup checkpoint and recovery validation before submission |
| Spam or AI report flooding | Transaction cost, payload limits, relay rate limits, project policies, and rejection workflow |
| Sensitive data leaks through logs | Structured redaction and privacy-regression tests over logs, errors, and analytics |
| Invalid state sequence | Contract rejects transitions outside the defined state machine |

### 9.2 Submission failure sequence

1. Create the report, salt, commitment, and preliminary receipt locally.
2. Require receipt backup confirmation.
3. Encrypt and upload the payload.
4. Verify the relay content hash.
5. Submit the ledger transaction.
6. Finalize the local receipt with the ledger report identifier.
7. Delete orphaned ciphertext after the retention window if the transaction never succeeds.

Retry operations must be idempotent. A retry uses the same prepared report and commitment unless the user explicitly starts a new submission.

### 9.3 User-visible error cases

The UI must provide safe recovery instructions for:

- wallet missing or connection rejected;
- wrong Midnight network;
- transaction rejected or expired;
- proof generation failure;
- encryption or upload failure;
- relay content-hash mismatch;
- receipt not saved or unreadable;
- wrong maintainer key version;
- unauthorized or invalid lifecycle transition;
- ownership proof attempted with a different report, salt, project, or canonicalization version.

Errors must never echo report text, salts, encryption keys, or attachment content.

## 10. Testing strategy

### 10.1 Contract and circuit tests

- Correct private witness proves ownership.
- A changed report fails ownership proof.
- A wrong salt, project identifier, or canonicalization version fails.
- An unauthorized authority cannot update lifecycle state.
- Illegal transitions are rejected.
- Key versions and policy hashes resolve to the intended project.
- Private report data and salt never appear in public outputs.
- Attestations cannot impersonate an unregistered attestor.

### 10.2 Privacy-engine tests

- Canonicalization is deterministic across supported clients.
- Salt generation uses a cryptographically secure source and never repeats in test samples.
- Encryption/decryption succeeds only with the intended key.
- Modified ciphertext and attachments are detected.
- Receipt export and recovery reconstruct the exact proof inputs.
- Evidence schemas reject missing required fields and safely accept supported optional fields.

### 10.3 Integration and end-to-end tests

- Submit, upload, commit, retrieve, decrypt, acknowledge, classify, patch, and disclose.
- Recover a report from an exported receipt.
- Handle wallet rejection, network mismatch, relay outage, retry, and orphan cleanup.
- Rotate a maintainer encryption key while keeping earlier reports decryptable.
- Accept a policy-compliant agent report and reject machine-checkable policy violations.
- Add a reproduction or patch-verification attestation without exposing its evidence.

### 10.4 Privacy regression suite

Automated checks inspect ledger-visible values, relay metadata, application logs, error reporting, notifications, and analytics payloads for plaintext reports, salts, keys, filenames, and unintended identity fields.

## 11. Level 1–6 delivery roadmap

### Level 1 — Private proof primitive

Deliver:

- Compact project/maintainer registration;
- report commitment and timestamp;
- private report-and-salt witness;
- ownership proof;
- maintainer acknowledgment;
- at least three focused contract/circuit tests;
- deployment to the program’s required Preview or Preprod environment.

Success means a judge can submit a commitment, prove ownership privately, and see that plaintext report data never becomes public.

### Level 2 — Usable researcher flow

Deliver:

- Lace wallet connection;
- report form and deterministic canonicalization;
- local salt and commitment creation;
- encrypted receipt download and recovery check;
- contract call, status page, and ownership verification;
- submission-origin and structured-evidence schema support.

The report may remain local at this level; encrypted relay storage is not required yet.

### Level 3 — Production discipline

Deliver:

- full lifecycle authorization and valid/duplicate/rejected outcomes;
- encryption-key versioning;
- versioned submission-policy commitments;
- unit, integration, end-to-end, and privacy-regression suites;
- CI/CD, threat model, operating assumptions, and project proposal.

### Level 4 — Live private inbox and agent interface

Deliver:

- encrypted report relay and attachment handling;
- maintainer inbox and triage dashboard;
- acknowledgment and classification workflow;
- privacy-safe notifications;
- public verification page;
- agent SDK/API for encrypted structured submissions;
- live Preprod MVP, documentation, and demo material.

### Level 5 — 50-user validation

Deliver an isolated, intentionally vulnerable training application with multiple planted bugs and explicit rules of engagement. Run an online responsible-disclosure challenge for cybersecurity students, Web3 developers, CTF participants, and open-source contributors.

Target:

- at least 50 distinct participating users/wallets;
- volunteer maintainers triaging reports through BugSeal;
- human, AI-assisted, and agent-generated reports where safe and authorized;
- measured submission completion, ownership-proof success, receipt recovery, acknowledgment time, duplicate rate, reproduction rate, and privacy confidence;
- implementation of the two or three highest-impact findings from user feedback.

The challenge environment must be isolated from real production systems and must state clearly that testing outside the listed targets is unauthorized.

### Level 6 — Pilot-ready proof chain

Deliver only improvements supported by Level 5 evidence, selected from:

- multi-maintainer authorization;
- encrypted follow-up conversation;
- encryption-key rotation and recovery workflow;
- selective disclosure pages;
- pseudonymous researcher credit;
- configurable retention and deletion;
- audit-log export;
- `HUMAN_REVIEWED`, `REPRODUCED`, `PATCH_PROPOSED`, and `PATCH_VERIFIED` attestations;
- discovery-to-patch provenance view.

Complete the program’s required Mainnet or final deployment and pilot with at least three small open-source projects and twenty researchers. A successful pilot includes at least one report completing the full submission-to-patch flow; planted training reports may be used if no real vulnerability can be disclosed safely during the program window.

## 12. Adoption and business model

### 12.1 Initial distribution

The Level 5 challenge is both product validation and user acquisition. Likely early communities include university cybersecurity clubs, CTF groups, Web3 developer communities, OSS maintainer communities, and security researchers active on social platforms.

The first real-project pilots should target small maintainers with no formal disclosure infrastructure. The offer is a private, verifiable inbox that is easier to adopt than a complete bounty program.

### 12.2 Sustainable model

**Free OSS tier:** one public project, basic private inbox, single maintainer, standard retention, and public verification.

**Paid team tier:** multiple private or public projects, multi-maintainer access, custom retention, notification integrations, audit export, analytics, policy controls, and API capacity for authorized agents.

Bounty escrow is intentionally excluded until the core disclosure workflow has demonstrated real usage, reliable triage, and clear demand.

## 13. Product success criteria

BugSeal succeeds if it demonstrates all of the following:

1. A researcher can create a private disclosure receipt and later prove ownership without revealing the report.
2. A maintainer can decrypt, acknowledge, and progress the report through an authorized lifecycle.
3. The public record contains no plaintext vulnerability, salt, reporter identity, evidence, or private communication.
4. A relay compromise exposes ciphertext but not usable report content.
5. Human and agent clients use the same protocol and respect a project’s machine-checkable submission policy.
6. At least 50 users complete the Level 5 validation exercise.
7. At least three projects and twenty researchers participate in the Level 6 pilot.
8. At least one report reaches a verifiable patched or patch-verified outcome.

## 14. Key design decisions

- Use **BugSeal** as the product name; **ProofPatch** may name the patch-verification feature or technical narrative.
- Keep the project identifier public while keeping the reporter, report, exploit, and evidence private.
- Store encrypted payloads in deletable off-chain storage rather than permanent IPFS storage.
- Store an integrity hash and lifecycle provenance on Midnight.
- Make the receipt essential and require a backup checkpoint.
- Keep the lifecycle authority with the maintainer and represent independent validation as attestations.
- Support AI provenance and agent submissions without building a scanner or automated judge.
- Prioritize a polished proof-of-disclosure flow over a broad bounty marketplace.

## 15. Research references

- [Midnight virtual hackathon winners](https://midnight.network/blog/virtual-hackathon-winners)
- [Midnight Cardano Tech Week hackathon winners](https://midnight.network/blog/hackathon-winners-cardano-tech-week)
- [Builders Unleashed mini-dApp hackathon](https://midnight.network/blog/builders-unleashed-max-impact-with-mini-dapp-hackathon)
- [Hilo hackathon winners](https://midnight.network/blog/hilo-hackathon-winners-keep-privacy-on-track-across-four-categories)
- [Midnight Devpost project gallery](https://midnight-hackathon.devpost.com/project-gallery)
- [GitHub Private Vulnerability Reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/report-privately)
- [HackerOne Code of Conduct and AI requirements](https://www.hackerone.com/policies/code-of-conduct)
- [Google: reducing maintainer burden with automated patches](https://blog.google/security/from-finding-to-fixing-reducing-maintainer-burden-with-automated-patches/)
- [Google Project Zero: Big Sleep vulnerability discovery](https://googleprojectzero.blogspot.com/2024/11/)
- [OpenAI: Introducing Aardvark](https://openai.com/index/introducing-aardvark/)
- [OpenAI: Daybreak](https://openai.com/daybreak/)
