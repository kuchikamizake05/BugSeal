import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { BugSealPrivateState, Contract, Witnesses } from '@bugseal/contract';

export const bugSealPrivateStateKey = 'bugSealPrivateState';
export type PrivateStateId = typeof bugSealPrivateStateKey;

export type PrivateStates = {
  readonly bugSealPrivateState: BugSealPrivateState;
};

export type BugSealContract = Contract<BugSealPrivateState, Witnesses<BugSealPrivateState>>;

export type BugSealCircuitKeys = Exclude<keyof BugSealContract['impureCircuits'], number | symbol>;

export type BugSealProviders = MidnightProviders<BugSealCircuitKeys, PrivateStateId, BugSealPrivateState>;

export type DeployedBugSealContract = FoundContract<BugSealContract>;
