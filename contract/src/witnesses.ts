import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
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
  getMaintainerSecret: ({
    privateState,
  }: WitnessContext<BugSealPrivateState>): [BugSealPrivateState, Uint8Array] => [
    privateState,
    privateState.maintainerSecret,
  ],
  getReportSecret: ({
    privateState,
  }: WitnessContext<BugSealPrivateState>): [BugSealPrivateState, ReportSecret] => [
    privateState,
    privateState.reportSecret,
  ],
};





