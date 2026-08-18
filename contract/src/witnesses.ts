import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger, ReportSecret, Witnesses } from './managed/bugseal/contract/index.js';

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

export const witnesses: Witnesses<BugSealPrivateState> = {
  getMaintainerSecret: ({
    privateState,
  }: WitnessContext<Ledger, BugSealPrivateState>): [BugSealPrivateState, Uint8Array] => [
    privateState,
    privateState.maintainerSecret,
  ],
  getReportSecret: ({
    privateState,
  }: WitnessContext<Ledger, BugSealPrivateState>): [BugSealPrivateState, ReportSecret] => [
    privateState,
    privateState.reportSecret,
  ],
};





