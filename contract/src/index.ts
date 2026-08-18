import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
export * from './managed/bugseal/contract/index.js';
export * from './witnesses.js';
import * as CompiledBugSeal from './managed/bugseal/contract/index.js';
import * as Witnesses from './witnesses.js';

export const CompiledBugSealContract = CompiledContract.make<
  CompiledBugSeal.Contract<Witnesses.BugSealPrivateState>
>(
  'BugSeal',
  CompiledBugSeal.Contract,
).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./managed/bugseal'),
);


