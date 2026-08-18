# BugSeal Level 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, and deploy the first BugSeal Compact contract so a researcher can privately commit a vulnerability report, prove ownership, and receive an authorized maintainer acknowledgment.

**Architecture:** A single Compact contract stores public project authorities and report records keyed by their commitments. Report digest, salt, and maintainer secret remain in Midnight private state and enter circuits through witnesses. A small TypeScript API and CLI reuse Midnight’s official provider stack for local standalone verification and Preprod deployment.

**Tech Stack:** Compact language 0.23, Compact compiler 0.31.0, Midnight.js 4.1.1, Compact runtime 0.16.0, Node.js 24.11.1+, npm workspaces, TypeScript 5.9.3, Vitest 4.1, Docker proof server 8.0.3, WSL2 Ubuntu 24.04.

**Spec:** `docs/superpowers/specs/2026-08-18-bugseal-design.md`

## Global Constraints

- Work only in `C:\Users\ASUS\Documents\coding\BugSeal`; its WSL path is `/mnt/c/Users/ASUS/Documents/coding/BugSeal`.
- Run Compact, npm, tests, and Midnight deployment commands inside WSL2 Ubuntu 24.04 because Midnight does not support native Windows development.
- Resolve Compact from `$HOME/.compact/bin/compact`; never invoke Windows `C:\Windows\System32\compact.exe`.
- Pin the Level 1 compatibility set: Compact compiler `0.31.0`, language pragma `0.23`, Midnight.js packages `4.1.1`, Compact runtime `0.16.0`, and proof server `8.0.3`.
- Use the official bulletin-board example at commit `c1367da73d22675d0d2baf7b5953323c207da319` as the provider and CLI reference.
- Never store or log the report text, report digest, salt, maintainer secret, wallet seed, or private-state password.
- Public state contains only project ID, maintainer authority commitment, report commitment/ID, project association, and status.
- A report ID is its 32-byte commitment in Level 1; no second redundant identifier is created.
- Submission time is taken from finalized transaction/block metadata. The contract does not accept a user-supplied timestamp.
- All identity and report hashes use domain-separated `persistentHash` circuits.
- Generated files under `contract/src/managed/` are compiler output and must never be hand-edited.
- Level 1 statuses are exactly `SUBMITTED` and `ACKNOWLEDGED`; triage outcomes belong to Level 3.
- Do not add a frontend, encrypted relay, AI agent API, bounty logic, or post-patch disclosure in this plan.
- Before any Preprod transaction, obtain explicit user approval because it changes external network state.

## File Structure

```text
BugSeal/
├── .gitignore                         # Secrets, private state, generated build output
├── .npmrc                             # npm compatibility setting from official example
├── .nvmrc                             # Node 24.11.1 floor
├── package.json                       # npm workspaces and repository-wide commands
├── package-lock.json                  # Reproducible dependencies
├── README.md                          # Level 1 setup, privacy model, and demo guide
├── contract/
│   ├── package.json                   # Compact compile/build/test scripts
│   ├── tsconfig.json                  # Strict TypeScript configuration
│   ├── tsconfig.build.json            # Excludes tests from distributable package
│   ├── eslint.config.mjs              # Contract TypeScript lint rules
│   ├── js-resolver.cjs                # Generated JavaScript import resolver
│   └── src/
│       ├── bugseal.compact            # Ledger, hash helpers, and four Level 1 circuits
│       ├── index.ts                   # Typed compiled-contract export
│       ├── witnesses.ts               # Private-state schema and witness adapters
│       ├── managed/bugseal/            # Generated Compact artifacts
│       └── test/
│           ├── bugseal-simulator.ts   # Multi-actor Compact simulator wrapper
│           ├── bugseal.test.ts        # Contract behavior and privacy tests
│           └── test-data.ts           # Deterministic 32-byte test values
├── api/
│   ├── package.json                   # Reusable deployed-contract adapter
│   └── src/
│       ├── common-types.ts            # Provider, contract, and derived-state types
│       ├── encoding.ts                # Strict 32-byte hex and SHA-256 helpers
│       ├── encoding.test.ts           # Input and redaction regression tests
│       ├── privacy.ts                 # Shared secret-field redaction rules
│       ├── privacy.test.ts            # Redaction regression tests
│       └── index.ts                   # Deploy, join, and circuit-call API
├── cli/
│   ├── package.json                   # Local and Preprod launch commands
│   ├── compose.yml                    # Official local standalone stack
│   ├── proof-server-local.yml         # Pinned proof-server service
│   └── src/
│       ├── index.ts                   # Safe interactive Level 1 demo
│       ├── config.ts                  # Standalone/Preview/Preprod endpoints
│       ├── generate-dust.ts           # Wallet DUST preparation
│       ├── logger-utils.ts             # Redacted CLI logging
│       ├── midnight-wallet-provider.ts # Headless Midnight wallet adapter
│       ├── wallet-utils.ts             # Wallet sync and funding helpers
│       └── launcher/
│           ├── standalone.ts          # Local Docker entry point
│           ├── preview.ts             # Preview entry point
│           └── preprod.ts             # Preprod entry point
└── docs/
    ├── superpowers/specs/2026-08-18-bugseal-design.md
    ├── superpowers/plans/2026-08-18-bugseal-level-1.md
    └── evidence/level-1.md             # Contract address, transaction links, and test evidence
```

---

### Task 1: Bootstrap a Compileable Compact Workspace

**Files:**
- Create: `.nvmrc`
- Create: `.npmrc`
- Create: `.gitignore`
- Create: `package.json`
- Create: `contract/package.json`
- Create: `contract/tsconfig.json`
- Create: `contract/tsconfig.build.json`
- Create: `contract/eslint.config.mjs`
- Create: `contract/js-resolver.cjs`
- Create: `contract/src/bugseal.compact`
- Create: `contract/src/index.ts`
- Create: `package-lock.json` via `npm install`

**Interfaces:**
- Consumes: WSL2, Node.js `>=24.11.1`, Docker Desktop.
- Produces: `npm run compact`, `npm run build`, and the generated module at `contract/src/managed/bugseal/contract/index.js`.

- [ ] **Step 1: Verify the Linux toolchain and install the Midnight Compact binary**

Run in PowerShell:

```powershell
wsl -d Ubuntu-24.04 -- bash -lc 'cd /mnt/c/Users/ASUS/Documents/coding/BugSeal && node --version && npm --version && docker --version'
```

Expected: Node `v24.11.1` or newer, npm `10` or newer, and a Docker version line.

Run in WSL:

```bash
command -v compact || true
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
export PATH="$HOME/.compact/bin:$PATH"
compact update 0.31.0
test "$(command -v compact)" = "$HOME/.compact/bin/compact"
compact compile --version
```

Expected: the final command reports compiler `0.31.0`. If `compact update 0.31.0` is not accepted by the installed toolchain, run `compact update`, verify the reported compiler against the current official example, and update all pinned versions in one dedicated compatibility commit before feature work.

- [ ] **Step 2: Create the root workspace configuration**

Create `.nvmrc`:

```text
24.11.1
```

Create `.npmrc`:

```ini
legacy-peer-deps = true
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
.private-state/
private-state-*/
*.seed
*.secret
contract/src/managed/
docs/evidence/private/
```

Create root `package.json`:

```json
{
  "name": "bugseal",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24.11.1" },
  "workspaces": ["contract"],
  "scripts": {
    "compact": "npm run compact --workspace @bugseal/contract",
    "build": "npm run build --workspace @bugseal/contract",
    "test": "npm run test --workspace @bugseal/contract",
    "typecheck": "npm run typecheck --workspace @bugseal/contract",
    "lint": "npm run lint --workspace @bugseal/contract",
    "ci": "npm run compact && npm run typecheck && npm run lint && npm run build && npm test"
  }
}
```

- [ ] **Step 3: Create the contract package and strict TypeScript configuration**

Create `contract/package.json`:

```json
{
  "name": "@bugseal/contract",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "compact": "compact compile src/bugseal.compact ./src/managed/bugseal",
    "build": "rm -rf dist && tsc --project tsconfig.build.json && cp -Rf ./src/managed ./dist/managed && cp ./src/bugseal.compact ./dist",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint src",
    "ci": "npm run compact && npm run typecheck && npm run lint && npm run build && npm test"
  },
  "dependencies": {
    "@midnight-ntwrk/compact-runtime": "0.16.0",
    "@midnight-ntwrk/midnight-js-network-id": "4.1.1",
    "@midnight-ntwrk/midnight-js-protocol": "4.1.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "eslint": "^9.39.4",
    "eslint-config-prettier": "^10.1.8",
    "globals": "^17.9.0",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.61.0",
    "vitest": "^4.1.0"
  }
}
```

Create `contract/tsconfig.json`:

```json
{
  "include": ["src/**/*.ts"],
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "lib": ["ESNext"],
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strict": true,
    "isolatedModules": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

Create `contract/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["src/test/**/*.ts"],
  "compilerOptions": {}
}
```

Copy `contract/eslint.config.mjs` and `contract/js-resolver.cjs` verbatim from the pinned official example commit. Retain the Apache-2.0 headers.

- [ ] **Step 4: Add the smallest compileable BugSeal contract**

Create `contract/src/bugseal.compact`:

```compact
pragma language_version 0.23;

import CompactStandardLibrary;

export enum ReportStatus {
  SUBMITTED,
  ACKNOWLEDGED
}

export new type ProjectId = Bytes<32>;
export new type ReportId = Bytes<32>;
export new type MaintainerAuthority = Bytes<32>;

export struct ReportRecord {
  projectId: ProjectId;
  status: ReportStatus;
}

export ledger projects: Map<ProjectId, MaintainerAuthority>;
export ledger reports: Map<ReportId, ReportRecord>;

constructor() {}
```

Create `contract/src/index.ts`:

```ts
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
export * from './managed/bugseal/contract/index.js';
export * from './witnesses.js';
import * as CompiledBugSeal from './managed/bugseal/contract/index.js';
import * as Witnesses from './witnesses.js';

export const CompiledBugSealContract = CompiledContract.make<CompiledBugSeal.Contract>(
  'BugSeal',
  CompiledBugSeal.Contract,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./managed/bugseal'),
);
```

For the first compile only, create `contract/src/witnesses.ts`:

```ts
export type BugSealPrivateState = Record<string, never>;
export const witnesses = {};
```

Task 2 replaces both exports with the real private state.

- [ ] **Step 5: Install, compile, and build**

Run in WSL:

```bash
cd /mnt/c/Users/ASUS/Documents/coding/BugSeal
export PATH="$HOME/.compact/bin:$PATH"
npm install
npm run compact
npm run build
```

Expected: Compact compiles `bugseal.compact`, TypeScript emits `contract/dist`, and no native Windows `compact.exe` is invoked.

- [ ] **Step 6: Commit the compileable workspace**

```bash
git add .nvmrc .npmrc .gitignore package.json package-lock.json contract
git commit -m "build: bootstrap BugSeal Compact workspace"
```

---

### Task 2: Add Private State and Domain-Separated Hash Primitives

**Files:**
- Modify: `contract/src/bugseal.compact`
- Modify: `contract/src/witnesses.ts`
- Create: `contract/src/test/test-data.ts`
- Create: `contract/src/test/bugseal-simulator.ts`
- Create: `contract/src/test/bugseal.test.ts`

**Interfaces:**
- Consumes: generated `Contract`, `Ledger`, and `ReportSecret` types.
- Produces: `BugSealPrivateState`, `createBugSealPrivateState`, `deriveMaintainerAuthority(secret)`, and `reportCommitment(projectId, reportDigest, salt)`.

- [ ] **Step 1: Write failing hash and witness tests**

Create `contract/src/test/test-data.ts`:

```ts
import { createBugSealPrivateState, type BugSealPrivateState } from '../witnesses.js';

export const bytes = (fill: number): Uint8Array => new Uint8Array(32).fill(fill);

export const privateState = (
  maintainer: number,
  digest: number,
  salt: number,
): BugSealPrivateState => createBugSealPrivateState(bytes(maintainer), bytes(digest), bytes(salt));

export const hex = (value: Uint8Array): string =>
  Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
```

Add tests to `contract/src/test/bugseal.test.ts`:

```ts
import { ReportStatus, type Ledger } from '../managed/bugseal/contract/index.js';
import { BugSealSimulator } from './bugseal-simulator.js';
import { bytes, hex, privateState } from './test-data.js';

const PROJECT_ID = bytes(10);

it('derives the same maintainer authority from the same secret', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  expect(simulator.deriveMaintainerAuthority(bytes(1))).toEqual(
    simulator.deriveMaintainerAuthority(bytes(1)),
  );
});

it('domain-separates report commitments by project, digest, and salt', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  const base = simulator.reportCommitment(bytes(4), bytes(5), bytes(6));
  expect(simulator.reportCommitment(bytes(7), bytes(5), bytes(6))).not.toEqual(base);
  expect(simulator.reportCommitment(bytes(4), bytes(8), bytes(6))).not.toEqual(base);
  expect(simulator.reportCommitment(bytes(4), bytes(5), bytes(9))).not.toEqual(base);
});

it('keeps the configured witness values in private state', () => {
  const state = privateState(1, 2, 3);
  const simulator = new BugSealSimulator(state);
  expect(simulator.getPrivateState()).toEqual(state);
});
```

- [ ] **Step 2: Compile and run the tests to verify failure**

```bash
npm run compact
npm run test --workspace @bugseal/contract -- src/test/bugseal.test.ts
```

Expected: FAIL because the private-state witnesses and pure hash circuits do not exist.

- [ ] **Step 3: Define the private witness types and pure circuits**

Add to `contract/src/bugseal.compact`:

```compact
export new type ReportDigest = Bytes<32>;
export new type ReportSalt = Bytes<32>;

export struct ReportSecret {
  digest: ReportDigest;
  salt: ReportSalt;
}

witness getMaintainerSecret(): Bytes<32>;
witness getReportSecret(): ReportSecret;

export pure circuit deriveMaintainerAuthority(secret: Bytes<32>): MaintainerAuthority {
  return persistentHash<Vector<2, Bytes<32>>>([
    pad(32, "bugseal:maintainer:v1"),
    secret
  ]) as MaintainerAuthority;
}

export pure circuit reportCommitment(
  projectId: ProjectId,
  digest: ReportDigest,
  salt: ReportSalt
): ReportId {
  return persistentHash<Vector<4, Bytes<32>>>([
    pad(32, "bugseal:report:v1"),
    projectId as Bytes<32>,
    digest as Bytes<32>,
    salt as Bytes<32>
  ]) as ReportId;
}
```

Replace `contract/src/witnesses.ts` with:

```ts
import type { WitnessContext } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import type { ReportSecret } from './managed/bugseal/contract/index.js';

export type BugSealPrivateState = {
  readonly maintainerSecret: Uint8Array;
  readonly reportSecret: ReportSecret;
};

export const createBugSealPrivateState = (
  maintainerSecret: Uint8Array,
  digest: Uint8Array,
  salt: Uint8Array,
): BugSealPrivateState => ({
  maintainerSecret,
  reportSecret: { digest, salt },
});

export const witnesses = {
  getMaintainerSecret: ({ privateState }: WitnessContext): [BugSealPrivateState, Uint8Array] =>
    [privateState, privateState.maintainerSecret],
  getReportSecret: ({ privateState }: WitnessContext): [BugSealPrivateState, ReportSecret] =>
    [privateState, privateState.reportSecret],
};
```

- [ ] **Step 4: Implement the simulator wrapper**

Create `BugSealSimulator` using the official `CircuitContext`, `QueryContext`, `CostModel`, `createConstructorContext`, and `sampleContractAddress` pattern. Its public interface is:

```ts
export class BugSealSimulator {
  constructor(initialPrivateState: BugSealPrivateState);
  getLedger(): Ledger;
  getPrivateState(): BugSealPrivateState;
  setPrivateState(next: BugSealPrivateState): void;
  deriveMaintainerAuthority(secret: Uint8Array): Uint8Array;
  reportCommitment(projectId: Uint8Array, digest: Uint8Array, salt: Uint8Array): Uint8Array;
}
```

Instantiate `new Contract(witnesses)`, initialize it with `createConstructorContext(initialPrivateState, '0'.repeat(64))`, and update `circuitContext` after every impure circuit call.

- [ ] **Step 5: Recompile and verify the tests pass**

```bash
npm run compact
npm run test --workspace @bugseal/contract -- src/test/bugseal.test.ts
npm run typecheck
```

Expected: all three tests PASS and TypeScript reports no errors.

- [ ] **Step 6: Commit the private-state primitives**

```bash
git add contract/src
git commit -m "feat: add private BugSeal commitment primitives"
```

---

### Task 3: Register Projects and Submit Private Report Commitments

**Files:**
- Modify: `contract/src/bugseal.compact`
- Modify: `contract/src/test/bugseal-simulator.ts`
- Modify: `contract/src/test/bugseal.test.ts`

**Interfaces:**
- Consumes: `getMaintainerSecret()`, `getReportSecret()`, `deriveMaintainerAuthority()`, and `reportCommitment()`.
- Produces: `registerProject(projectId): []`, `submitReport(projectId): ReportId`, `BugSealSimulator.registerProject()`, and `BugSealSimulator.submitReport()`.

- [ ] **Step 1: Write failing registry and submission tests**

```ts
it('registers a public project with a witness-derived maintainer authority', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  const projectId = bytes(10);
  simulator.registerProject(projectId);
  expect(simulator.getLedger().projects.lookup(projectId)).toEqual(
    simulator.deriveMaintainerAuthority(bytes(1)),
  );
});

it('rejects duplicate project registration', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  const projectId = bytes(10);
  simulator.registerProject(projectId);
  expect(() => simulator.registerProject(projectId)).toThrow('Project already registered');
});

it('stores only the report commitment, project, and submitted status', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  const projectId = bytes(10);
  simulator.registerProject(projectId);
  const reportId = simulator.submitReport(projectId);
  const record = simulator.getLedger().reports.lookup(reportId);
  expect(record.projectId).toEqual(projectId);
  expect(record.status).toEqual(ReportStatus.SUBMITTED);
  expect(reportId).toEqual(simulator.reportCommitment(projectId, bytes(2), bytes(3)));
});

it('rejects reports for unregistered projects', () => {
  const simulator = new BugSealSimulator(privateState(1, 2, 3));
  expect(() => simulator.submitReport(bytes(10))).toThrow('Project is not registered');
});
```

- [ ] **Step 2: Run the focused tests to verify failure**

```bash
npm run compact
npm run test --workspace @bugseal/contract -- src/test/bugseal.test.ts
```

Expected: FAIL because `registerProject` and `submitReport` are not defined.

- [ ] **Step 3: Implement project registration and report submission**

Add to `contract/src/bugseal.compact`:

```compact
export circuit registerProject(projectId: ProjectId): [] {
  const publicProjectId = disclose(projectId);
  assert(!projects.member(publicProjectId), "Project already registered");
  const authority = deriveMaintainerAuthority(getMaintainerSecret());
  projects.insert(publicProjectId, disclose(authority));
}

export circuit submitReport(projectId: ProjectId): ReportId {
  const publicProjectId = disclose(projectId);
  assert(projects.member(publicProjectId), "Project is not registered");
  const secret = getReportSecret();
  const reportId = reportCommitment(projectId, secret.digest, secret.salt);
  const publicReportId = disclose(reportId);
  assert(!reports.member(publicReportId), "Report commitment already exists");
  const record = ReportRecord {
    projectId: publicProjectId,
    status: ReportStatus.SUBMITTED
  };
  reports.insert(publicReportId, disclose(record));
  return reportId;
}
```

Add simulator methods that call `contract.impureCircuits.registerProject` and `contract.impureCircuits.submitReport`, update `circuitContext`, and return the disclosed report ID from the circuit result.

- [ ] **Step 4: Run the tests and inspect the generated ledger type**

```bash
npm run compact
npm run test --workspace @bugseal/contract -- src/test/bugseal.test.ts
npm run typecheck
```

Expected: registration and submission tests PASS. The generated `Ledger` exposes `projects` and `reports`, with no private witness fields.

- [ ] **Step 5: Commit the first end-to-end disclosure primitive**

```bash
git add contract/src
git commit -m "feat: register projects and seal vulnerability reports"
```

---

### Task 4: Prove Report Ownership and Authorize Acknowledgment

**Files:**
- Modify: `contract/src/bugseal.compact`
- Modify: `contract/src/test/bugseal-simulator.ts`
- Modify: `contract/src/test/bugseal.test.ts`

**Interfaces:**
- Consumes: report map, project map, and both private witnesses.
- Produces: `proveReportOwnership(projectId, reportId): []`, `acknowledgeReport(reportId): []`, and matching simulator methods.

- [ ] **Step 1: Write failing ownership and authorization tests**

```ts
it('proves ownership with the original private digest and salt', () => {
  const { simulator, reportId } = submittedReport(privateState(1, 2, 3));
  expect(() => simulator.proveReportOwnership(PROJECT_ID, reportId)).not.toThrow();
});

it('rejects ownership with a different salt', () => {
  const { simulator, reportId } = submittedReport(privateState(1, 2, 3));
  simulator.setPrivateState(privateState(1, 2, 99));
  expect(() => simulator.proveReportOwnership(PROJECT_ID, reportId)).toThrow(
    'Private report does not match commitment',
  );
});

it('rejects ownership under a different project', () => {
  const { simulator, reportId } = submittedReport(privateState(1, 2, 3));
  expect(() => simulator.proveReportOwnership(bytes(88), reportId)).toThrow(
    'Report belongs to another project',
  );
});

it('allows only the registered maintainer to acknowledge', () => {
  const { simulator, reportId } = submittedReport(privateState(1, 2, 3));
  simulator.acknowledgeReport(reportId);
  expect(simulator.getLedger().reports.lookup(reportId).status).toEqual(
    ReportStatus.ACKNOWLEDGED,
  );
});

it('rejects acknowledgment by another maintainer secret', () => {
  const { simulator, reportId } = submittedReport(privateState(1, 2, 3));
  simulator.setPrivateState(privateState(77, 2, 3));
  expect(() => simulator.acknowledgeReport(reportId)).toThrow(
    'Only the registered maintainer can acknowledge',
  );
});

it('rejects a second acknowledgment', () => {
  const { simulator, reportId } = submittedReport(privateState(1, 2, 3));
  simulator.acknowledgeReport(reportId);
  expect(() => simulator.acknowledgeReport(reportId)).toThrow(
    'Report is not submitted',
  );
});
```

Define the helper in `contract/src/test/bugseal.test.ts`:

```ts
const submittedReport = (state: BugSealPrivateState) => {
  const simulator = new BugSealSimulator(state);
  simulator.registerProject(PROJECT_ID);
  const reportId = simulator.submitReport(PROJECT_ID);
  return { simulator, reportId };
};
```

- [ ] **Step 2: Run the tests to verify failure**

```bash
npm run compact
npm run test --workspace @bugseal/contract -- src/test/bugseal.test.ts
```

Expected: FAIL because the proof and acknowledgment circuits do not exist.

- [ ] **Step 3: Implement ownership proof and acknowledgment**

Add to `contract/src/bugseal.compact`:

```compact
export circuit proveReportOwnership(projectId: ProjectId, reportId: ReportId): [] {
  const publicProjectId = disclose(projectId);
  const publicReportId = disclose(reportId);
  assert(reports.member(publicReportId), "Report does not exist");
  const record = reports.lookup(publicReportId);
  assert(record.projectId == publicProjectId, "Report belongs to another project");
  const secret = getReportSecret();
  const expected = reportCommitment(projectId, secret.digest, secret.salt);
  assert(expected == reportId, "Private report does not match commitment");
}

export circuit acknowledgeReport(reportId: ReportId): [] {
  const publicReportId = disclose(reportId);
  assert(reports.member(publicReportId), "Report does not exist");
  const record = reports.lookup(publicReportId);
  assert(record.status == ReportStatus.SUBMITTED, "Report is not submitted");
  const authority = projects.lookup(record.projectId);
  assert(
    authority == deriveMaintainerAuthority(getMaintainerSecret()),
    "Only the registered maintainer can acknowledge"
  );
  const updated = ReportRecord {
    projectId: record.projectId,
    status: ReportStatus.ACKNOWLEDGED
  };
  reports.insert(publicReportId, disclose(updated));
}
```

Add simulator methods with exact signatures:

```ts
proveReportOwnership(projectId: Uint8Array, reportId: Uint8Array): void;
acknowledgeReport(reportId: Uint8Array): Ledger;
```

- [ ] **Step 4: Verify success and negative paths**

```bash
npm run compact
npm run test --workspace @bugseal/contract -- src/test/bugseal.test.ts
npm run typecheck
```

Expected: all ownership and authorization cases PASS.

- [ ] **Step 5: Commit the complete Level 1 circuit set**

```bash
git add contract/src
git commit -m "feat: prove report ownership and acknowledge disclosures"
```

---

### Task 5: Harden Privacy Tests and Contract Documentation

**Files:**
- Modify: `contract/src/test/bugseal.test.ts`
- Modify: `contract/package.json`
- Create: `README.md`

**Interfaces:**
- Consumes: all four Level 1 impure circuits and two pure hash circuits.
- Produces: a repeatable `npm run ci` privacy and quality gate.

- [ ] **Step 1: Add failing privacy-regression assertions**

Add a serializer that converts `Uint8Array` values to hex and `bigint` values to decimal strings:

```ts
const serializeLedger = (ledgerState: Ledger): string =>
  JSON.stringify(ledgerState, (_key, value: unknown) => {
    if (typeof value === 'bigint') return value.toString();
    if (value instanceof Uint8Array) return hex(value);
    return value;
  });
```

Then add:

```ts
it('does not expose digest, salt, or maintainer secret in public ledger state', () => {
  const state = privateState(41, 42, 43);
  const { simulator } = submittedReport(state);
  const publicLedger = serializeLedger(simulator.getLedger());
  expect(publicLedger).not.toContain(hex(state.maintainerSecret));
  expect(publicLedger).not.toContain(hex(state.reportSecret.digest));
  expect(publicLedger).not.toContain(hex(state.reportSecret.salt));
  expect(publicLedger).not.toContain('maintainerSecret');
  expect(publicLedger).not.toContain('reportSecret');
  expect(publicLedger).not.toContain('digest');
  expect(publicLedger).not.toContain('salt');
  expect(publicLedger).not.toContain('reporter');
});

it('rejects duplicate report commitments', () => {
  const { simulator } = submittedReport(privateState(1, 2, 3));
  expect(() => simulator.submitReport(PROJECT_ID)).toThrow('Report commitment already exists');
});

it('does not change private state during any Level 1 circuit', () => {
  const state = privateState(1, 2, 3);
  const simulator = new BugSealSimulator(state);
  simulator.registerProject(PROJECT_ID);
  const reportId = simulator.submitReport(PROJECT_ID);
  simulator.proveReportOwnership(PROJECT_ID, reportId);
  simulator.acknowledgeReport(reportId);
  expect(simulator.getPrivateState()).toEqual(state);
});
```

Temporarily introduce one ledger field containing the digest to prove the privacy test fails, run the test, then remove that field before continuing. Do not commit the intentional leak.

- [ ] **Step 2: Run the privacy test to verify it catches the intentional leak**

```bash
npm run test --workspace @bugseal/contract -- src/test/bugseal.test.ts -t "does not expose"
```

Expected: FAIL while the intentional leak exists, then PASS after it is removed.

- [ ] **Step 3: Document the Level 1 protocol and honest privacy boundary**

Create `README.md` with these exact sections:

1. `What BugSeal proves`
2. `What BugSeal does not prove`
3. `Level 1 public data`
4. `Level 1 private data`
5. `Why report ID equals commitment`
6. `Why timestamps come from transaction metadata`
7. `WSL setup`
8. `Compile and test`
9. `Local standalone demo`
10. `Preprod deployment`
11. `Security limitations`

State explicitly that wallet and network metadata may correlate a submission even though no reporter address is stored in the BugSeal report record.

- [ ] **Step 4: Run the full contract quality gate**

```bash
export PATH="$HOME/.compact/bin:$PATH"
npm run ci
git diff --check
```

Expected: Compact compilation, typecheck, lint, build, and all tests PASS; `git diff --check` is clean.

- [ ] **Step 5: Commit the privacy gate and documentation**

```bash
git add contract README.md
git commit -m "test: enforce BugSeal Level 1 privacy boundary"
```

---

### Task 6: Add the Minimal Deployment API and Safe CLI

**Files:**
- Modify: `package.json`
- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `api/tsconfig.build.json`
- Create: `api/src/common-types.ts`
- Create: `api/src/encoding.ts`
- Create: `api/src/encoding.test.ts`
- Create: `api/src/privacy.ts`
- Create: `api/src/privacy.test.ts`
- Create: `api/src/index.ts`
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`
- Create: `cli/tsconfig.build.json`
- Create: `cli/compose.yml`
- Create: `cli/proof-server-local.yml`
- Create: `cli/src/index.ts`
- Create: `cli/src/config.ts`
- Create: `cli/src/generate-dust.ts`
- Create: `cli/src/logger-utils.ts`
- Create: `cli/src/midnight-wallet-provider.ts`
- Create: `cli/src/wallet-utils.ts`
- Create: `cli/src/launcher/standalone.ts`
- Create: `cli/src/launcher/preview.ts`
- Create: `cli/src/launcher/preprod.ts`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `CompiledBugSealContract`, `BugSealPrivateState`, and the circuits from Tasks 2–4.
- Produces: `BugSealAPI.deploy`, `BugSealAPI.join`, `registerProject`, `submitReport`, `proveOwnership`, `acknowledgeReport`, and standalone/Preview/Preprod launch commands.

- [ ] **Step 1: Import only the official provider foundation from the pinned commit**

Clone the reference outside the repository and copy these files while preserving license headers:

```bash
reference_dir="$(mktemp -d)"
git clone --depth 1 https://github.com/midnightntwrk/example-bboard.git "$reference_dir"
git -C "$reference_dir" checkout c1367da73d22675d0d2baf7b5953323c207da319
```

Copy and rename:

| Official source | BugSeal destination | Treatment |
|---|---|---|
| `bboard-cli/src/config.ts` | `cli/src/config.ts` | Replace private-state store prefix with `bugseal-level1` |
| `bboard-cli/src/wallet-utils.ts` | `cli/src/wallet-utils.ts` | Copy provider logic unchanged |
| `bboard-cli/src/midnight-wallet-provider.ts` | `cli/src/midnight-wallet-provider.ts` | Update local import paths only |
| `bboard-cli/src/generate-dust.ts` | `cli/src/generate-dust.ts` | Copy provider logic unchanged |
| `bboard-cli/src/logger-utils.ts` | `cli/src/logger-utils.ts` | Add secret-field redaction listed below |
| `bboard-cli/src/launcher/*.ts` | `cli/src/launcher/*.ts` | Import BugSeal `run` function |
| `bboard-cli/compose.yml` | `cli/compose.yml` | Pin existing images; do not use `latest` |
| `bboard-cli/proof-server-local.yml` | `cli/proof-server-local.yml` | Pin proof server `8.0.3` |

Do not copy the bulletin-board domain API, messages, UI, or contract source.

- [ ] **Step 2: Write failing encoding and log-safety tests**

Create `api/src/encoding.test.ts`:

```ts
import { expect, it } from 'vitest';
import { digestReport, hex32, parseHex32 } from './encoding.js';

it('parses exactly 32 bytes of lowercase or uppercase hex', () => {
  expect(parseHex32('AA'.repeat(32))).toEqual(new Uint8Array(32).fill(0xaa));
});

it('rejects non-hex and wrong-length identifiers', () => {
  expect(() => parseHex32('zz'.repeat(32))).toThrow('Expected 64 hexadecimal characters');
  expect(() => parseHex32('aa')).toThrow('Expected 64 hexadecimal characters');
});

it('hashes report text locally without returning the text', () => {
  const digest = digestReport('private exploit details');
  expect(digest).toHaveLength(32);
  expect(hex32(digest)).not.toContain('private exploit details');
});

```

Create `api/src/privacy.test.ts`:

```ts
import { expect, it } from 'vitest';
import { redactSecrets } from './privacy.js';

it('redacts every Level 1 secret field', () => {
  expect(redactSecrets({ reportText: 'x', digest: 'y', salt: 'z', seed: 's' })).toEqual({
    reportText: '[REDACTED]',
    digest: '[REDACTED]',
    salt: '[REDACTED]',
    seed: '[REDACTED]',
  });
});
```

- [ ] **Step 3: Implement encoding and redaction utilities**

Create `api/src/encoding.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto';

const HEX_32 = /^[0-9a-fA-F]{64}$/;

export const parseHex32 = (value: string): Uint8Array => {
  if (!HEX_32.test(value)) throw new Error('Expected 64 hexadecimal characters');
  return Uint8Array.from(Buffer.from(value, 'hex'));
};

export const hex32 = (value: Uint8Array): string => {
  if (value.length !== 32) throw new Error('Expected exactly 32 bytes');
  return Buffer.from(value).toString('hex');
};

export const digestReport = (reportText: string): Uint8Array =>
  Uint8Array.from(createHash('sha256').update(reportText, 'utf8').digest());

export const randomSecret32 = (): Uint8Array => Uint8Array.from(randomBytes(32));
```

`digestReport` must never log or return the input string.

Create `api/src/privacy.ts`:

```ts
export const SECRET_FIELD_NAMES = [
  'reportText',
  'digest',
  'salt',
  'maintainerSecret',
  'seed',
  'walletSeed',
  'storagePassword',
] as const;

export const redactSecrets = (input: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      (SECRET_FIELD_NAMES as readonly string[]).includes(key) ? '[REDACTED]' : value,
    ]),
  );
```

`cli/src/logger-utils.ts` imports `SECRET_FIELD_NAMES` and configures Pino redaction for each direct field plus `*.fieldName` and `*.*.fieldName` nested paths.

- [ ] **Step 4: Implement the deployed contract adapter**

Define `bugSealPrivateStateKey = 'bugSealPrivateState'`. `BugSealAPI` must provide:

```ts
export interface DeployedBugSealAPI {
  readonly deployedContractAddress: ContractAddress;
  registerProject(projectId: Uint8Array): Promise<TransactionReceipt>;
  submitReport(projectId: Uint8Array, reportText: string): Promise<SealedReportReceipt>;
  proveOwnership(receipt: SealedReportReceipt): Promise<TransactionReceipt>;
  acknowledgeReport(reportId: Uint8Array): Promise<TransactionReceipt>;
}

export type TransactionReceipt = {
  readonly txHash: string;
  readonly blockHeight: string;
};

export type SealedReportReceipt = {
  readonly projectId: Uint8Array;
  readonly reportId: Uint8Array;
  readonly digest: Uint8Array;
  readonly salt: Uint8Array;
  readonly txHash: string;
  readonly blockHeight: string;
};
```

`submitReport` performs this order:

1. Hash report text locally.
2. Generate a random 32-byte salt.
3. Update the private-state provider with the digest and salt.
4. Compute the report ID with generated `pureCircuits.reportCommitment`.
5. Call `deployedContract.callTx.submitReport(projectId)`.
6. Return the receipt in memory without logging its digest or salt.

`proveOwnership` restores the receipt’s digest and salt into private state before calling `proveReportOwnership`. `deploy` and `join` follow the official `deployContract` and `findDeployedContract` pattern using `CompiledBugSealContract`.

- [ ] **Step 5: Implement the safe interactive Level 1 menu**

The CLI menu contains exactly:

```text
1. Register project
2. Seal report
3. Prove report ownership from current session
4. Acknowledge report
5. Display public ledger summary
6. Exit
```

Requirements:

- Project IDs and report IDs are displayed as 64-character hex.
- Report text input is never echoed by application logging.
- The ledger summary displays project count, report count, project IDs, report IDs, and statuses only.
- The CLI never includes a “display private state” action.
- Wallet seeds and storage passwords are never included in Pino output.
- The CLI prints `txHash` and `blockHeight` after every finalized transaction; these provide the verifiable submission ordering/time evidence.

- [ ] **Step 6: Wire workspace scripts and pinned dependencies**

Change root workspaces to `['contract', 'api', 'cli']`. Add scripts:

```json
{
  "build": "npm run build --workspaces --if-present",
  "test": "npm run test --workspaces --if-present",
  "typecheck": "npm run typecheck --workspaces --if-present",
  "lint": "npm run lint --workspaces --if-present",
  "standalone": "npm run standalone --workspace @bugseal/cli",
  "preview": "npm run preview --workspace @bugseal/cli",
  "preprod": "npm run preprod --workspace @bugseal/cli"
}
```

Use the package versions from the pinned example: Midnight.js `4.1.1`, wallet SDK `1.2.0`, DApp connector `4.0.1`, TypeScript `5.9.3`, and proof server `8.0.3`. Run `npm install` to regenerate the root lockfile.

- [ ] **Step 7: Run tests, build, and the local standalone demonstration**

```bash
npm run compact
npm test
npm run typecheck
npm run lint
npm run build
docker compose -f cli/compose.yml up -d
npm run standalone
```

In the CLI, deploy the contract, register one project, seal one synthetic report, prove ownership, acknowledge it, and display the public ledger summary. Use only synthetic text such as `training-only: authorization bypass in demo route`.

Expected: all operations finalize, status changes from `SUBMITTED` to `ACKNOWLEDGED`, and neither terminal nor Docker logs contain the synthetic report text, digest, salt, or wallet seed.

- [ ] **Step 8: Commit the deployable Level 1 application**

```bash
git add package.json package-lock.json api cli
git commit -m "feat: add BugSeal Level 1 deployment CLI"
```

---

### Task 7: Deploy to Preprod and Capture Submission Evidence

**Files:**
- Modify: `README.md`
- Create: `docs/evidence/level-1.md`

**Interfaces:**
- Consumes: `npm run preprod`, funded test wallet, local proof server, and completed CI gate.
- Produces: a reproducible Level 1 demonstration with public contract and transaction evidence.

- [ ] **Step 1: Run the final local release gate**

```bash
git status --short
npm ci
npm run ci
docker compose -f cli/proof-server-local.yml up -d
curl --fail http://127.0.0.1:6300/health
```

Expected: clean worktree before evidence edits, all checks PASS, and proof server health returns success.

- [ ] **Step 2: Stop for explicit approval before external deployment**

Present the user with:

- target network: Midnight Preprod;
- compiled contract version and git commit;
- expected actions: deploy, register one synthetic project, submit one synthetic report commitment, prove ownership, acknowledge;
- expected use of test NIGHT/DUST;
- confirmation that no real vulnerability details will be used.

Do not submit a transaction until the user explicitly approves this deployment.

- [ ] **Step 3: Fund the Preprod wallet and deploy**

After approval:

```bash
npm run preprod
```

Create or restore the dedicated test wallet through the CLI, fund it from the official Preprod faucet, generate DUST, deploy the contract, and record the finalized contract address. Never copy the wallet seed into the repository, evidence document, shell history, or chat.

- [ ] **Step 4: Execute the synthetic proof flow**

Use:

- project label: `bugseal-training-project-v1` hashed locally into a 32-byte project ID;
- report text: `training-only: authorization bypass in demo route`;
- operations: register project, seal report, prove ownership, acknowledge report.

Record only contract address, project ID, report ID/commitment, transaction hashes, block heights, statuses, UTC dates obtained from the explorer/indexer, and public explorer links.

- [ ] **Step 5: Write the evidence document**

Create `docs/evidence/level-1.md` only after all public values have been captured. Populate it directly with the observed values; never create or commit empty evidence fields. It must contain:

- title `BugSeal Level 1 Evidence`;
- build git commit, Compact compiler `0.31.0`, and network `Midnight Preprod`;
- contract address, deployment transaction, and explorer link;
- a four-row table for register, submit, ownership proof, and acknowledgment, with the actual transaction hash, block height, UTC date, and public result in every row;
- the exact public fields observed and the private fields confirmed absent;
- the log-scan command and its zero-match result;
- reproduction commands `npm run compact`, `npm run ci`, and `npm run preprod`.

- [ ] **Step 6: Verify evidence contains no secrets or placeholders**

```bash
rg -n -i 'reportText|maintainerSecret|walletSeed|storagePassword|private exploit' docs/evidence README.md
git diff --check
npm run ci
```

Expected: no secret-bearing fields, no placeholder markers, clean diff check, and full CI PASS.

- [ ] **Step 7: Commit the Level 1 evidence**

```bash
git add README.md docs/evidence/level-1.md
git commit -m "docs: record BugSeal Level 1 Preprod evidence"
git status --short --branch
```

Expected: clean branch and a reproducible Level 1 submission artifact.

## Plan Completion Criteria

Level 1 is complete only when:

1. Compact compiles with the pinned WSL toolchain.
2. All positive and negative simulator tests pass.
3. Public ledger serialization contains no digest, salt, maintainer secret, report text, or reporter field.
4. The local standalone flow reaches `ACKNOWLEDGED`.
5. The contract is deployed to Preprod after explicit approval.
6. Public evidence identifies the contract and all four flow transactions.
7. The repository has no uncommitted changes and no committed secrets.

## Primary References

- [Midnight toolchain installation](https://docs.midnight.network/getting-started/installation)
- [Official bulletin-board DApp guide](https://docs.midnight.network/examples/dapps/bboard)
- [Official example-bboard repository at the pinned baseline](https://github.com/midnightntwrk/example-bboard/tree/c1367da73d22675d0d2baf7b5953323c207da319)
- [Current Midnight SDK compatibility matrix](https://github.com/midnightntwrk/midnight-sdk/blob/main/COMPATIBILITY.md)
