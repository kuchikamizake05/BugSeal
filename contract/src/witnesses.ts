import type { Witnesses } from './managed/bugseal/contract/index.js';

export type BugSealPrivateState = Record<string, never>;
export const witnesses: Witnesses<BugSealPrivateState> = {};

