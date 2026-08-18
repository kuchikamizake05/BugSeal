# BugSeal

Privacy-preserving responsible vulnerability disclosure on Midnight.

## What BugSeal proves

- Project registration binds a public 32-byte project ID to an authorized maintainer authority.
- Vulnerability report commitment is recorded on-chain with domain separation.
- Ownership of a submitted report can be proven privately using zero-knowledge circuits without disclosing report digest or salt.
- Only the registered project maintainer authority can acknowledge a submitted report.
- Report lifecycle state transitions follow strict contract rules (`SUBMITTED` -> `ACKNOWLEDGED`).

## What BugSeal does not prove

- Does not judge vulnerability validity, correctness, severity, or exploitability.
- Does not scan repositories or verify code patches automatically.
- Does not guarantee legal safe harbor or replace legal agreements.
- Does not guarantee absolute anonymity against external metadata analysis.

## Level 1 public data

- `projects`: Map of `ProjectId` (32 bytes) to `MaintainerAuthority` (32 bytes).
- `reports`: Map of `ReportId` (32-byte commitment) to `ReportRecord` (`projectId`, `status`).
- Finalized transaction metadata (transaction hash, block height, block timestamp).

## Level 1 private data

- Maintainer secret (`maintainerSecret`: 32 bytes).
- Vulnerability report canonical digest (`digest`: 32 bytes).
- High-entropy report salt (`salt`: 32 bytes).
- Vulnerability report text and exploit details (kept client-side only).

## Why report ID equals commitment

In Level 1, the report ID is defined directly as the 32-byte domain-separated cryptographic commitment:
`persistentHash(["bugseal:report:v1", projectId, digest, salt])`.
Using the commitment as the primary key eliminates redundant identifiers, prevents state bloat, and guarantees that each report record uniquely binds the exact project, private digest, and private salt.

## Why timestamps come from transaction metadata

Client-supplied timestamps are untrusted, manipulable, and cannot establish trustworthy disclosure ordering. BugSeal derives verifiable submission and acknowledgment time strictly from finalized Midnight transaction and block metadata recorded by the network consensus.

## WSL setup

Midnight toolchain requires Linux (WSL2 Ubuntu 24.04 recommended on Windows):

1. Install Compact toolchain:
   ```bash
   curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
   export PATH="$HOME/.compact/bin:$PATH"
   compact update 0.31.0
   ```
2. Ensure Node.js `>=24.11.1` and Docker Desktop with WSL2 integration are active.

## Compile and test

Inside WSL `/mnt/c/Users/ASUS/Documents/coding/BugSeal`:

```bash
export PATH="$HOME/.compact/bin:$PATH"
npm install
npm run compact
npm run typecheck
npm run lint
npm run build
npm test
npm run ci
```

Before running the CLI, set `BUGSEAL_PRIVATE_STORAGE_PASSWORD` to a unique secret of at least
16 characters, or enter it via the CLI's hidden prompt. Never reuse the former Level 1 demo
password and never commit this value.

## Local standalone demo

Run local standalone environment using Docker proof server and node:

```bash
docker compose -f cli/compose.yml up -d
npm run standalone
```

Follow the CLI prompts to deploy contract, register project, seal synthetic report, prove ownership, and acknowledge report.

## Preprod deployment

To deploy and test on Midnight Preprod network:

```bash
docker compose -f cli/proof-server-local.yml up -d
npm run preprod
```

Requires a funded Midnight Preprod wallet with test NIGHT and generated DUST.

## Security limitations

- **Wallet and Network Metadata Correlation Note:** BugSeal does not store reporter wallet addresses in public report records. However, transaction submission exposes on-chain gas payer addresses, transaction submission timing, and network IP metadata to network observers unless external network privacy measures (e.g. Tor/VPN, dedicated funding accounts) are employed.
- **Salt Loss:** If a researcher loses their local private receipt and salt, ownership of the report cannot be recovered or proven.
- **Off-chain Content:** BugSeal Level 1 verifies proof of disclosure and commitment integrity; plaintext report storage and secure delivery must be handled over secure out-of-band or encrypted relay channels.
