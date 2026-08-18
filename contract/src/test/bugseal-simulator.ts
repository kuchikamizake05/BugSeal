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

  registerProject(projectId: Uint8Array): void {
    const results = this.contract.impureCircuits.registerProject(
      this.circuitContext,
      projectId,
    );
    this.circuitContext = results.context;
  }

  submitReport(projectId: Uint8Array): Uint8Array {
    const results = this.contract.impureCircuits.submitReport(
      this.circuitContext,
      projectId,
    );
    this.circuitContext = results.context;
    return results.result;
  }

  proveReportOwnership(projectId: Uint8Array, reportId: Uint8Array): void {
    const results = this.contract.impureCircuits.proveReportOwnership(
      this.circuitContext,
      projectId,
      reportId,
    );
    this.circuitContext = results.context;
  }

  acknowledgeReport(reportId: Uint8Array): Ledger {
    const results = this.contract.impureCircuits.acknowledgeReport(
      this.circuitContext,
      reportId,
    );
    this.circuitContext = results.context;
    return this.getLedger();
  }
}
