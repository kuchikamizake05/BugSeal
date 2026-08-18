import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
  type CircuitContext,
  type ContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
} from '../managed/bugseal/contract/index.js';
import { witnesses, type BugSealPrivateState } from '../witnesses.js';

export class BugSealSimulator {
  readonly contract: Contract<BugSealPrivateState>;
  readonly contractAddress: ContractAddress;
  circuitContext: CircuitContext<BugSealPrivateState>;

  constructor(initialPrivateState: BugSealPrivateState) {
    this.contract = new Contract<BugSealPrivateState>(witnesses);
    this.contractAddress = sampleContractAddress();
    const constructorContext = createConstructorContext(
      initialPrivateState,
      '0'.repeat(64),
    );
    const { currentPrivateState, currentContractState } =
      this.contract.initialState(constructorContext);
    this.circuitContext = createCircuitContext(
      this.contractAddress,
      '0'.repeat(64),
      currentContractState,
      currentPrivateState,
    );
  }

  getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  getPrivateState(): BugSealPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  setPrivateState(next: BugSealPrivateState): void {
    this.circuitContext = {
      ...this.circuitContext,
      currentPrivateState: next,
    };
  }

  deriveMaintainerAuthority(secret: Uint8Array): Uint8Array {
    return pureCircuits.deriveMaintainerAuthority(secret);
  }

  reportCommitment(
    projectId: Uint8Array,
    digest: Uint8Array,
    salt: Uint8Array,
  ): Uint8Array {
    return pureCircuits.reportCommitment(projectId, digest, salt);
  }
}
