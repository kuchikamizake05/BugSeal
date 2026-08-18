import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';
import {
  type BugSealContract,
  type BugSealProviders,
  type DeployedBugSealContract,
  bugSealPrivateStateKey,
} from './common-types.js';
import {
  CompiledBugSealContract,
  createBugSealPrivateState,
  pureCircuits,
  type BugSealPrivateState,
} from '@bugseal/contract';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { digestReport, randomSecret32 } from './encoding.js';

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

export interface DeployedBugSealAPI {
  readonly deployedContractAddress: ContractAddress;
  registerProject(projectId: Uint8Array): Promise<TransactionReceipt>;
  submitReport(projectId: Uint8Array, reportText: string): Promise<SealedReportReceipt>;
  proveOwnership(receipt: SealedReportReceipt): Promise<TransactionReceipt>;
  acknowledgeReport(reportId: Uint8Array): Promise<TransactionReceipt>;
}

export class BugSealAPI implements DeployedBugSealAPI {
  readonly deployedContractAddress: ContractAddress;

  private constructor(
    public readonly deployedContract: DeployedBugSealContract,
    private readonly providers: BugSealProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
  }

  async registerProject(projectId: Uint8Array): Promise<TransactionReceipt> {
    this.logger?.info('registerProject');
    const txData = await this.deployedContract.callTx.registerProject(projectId);
    const receipt: TransactionReceipt = {
      txHash: txData.public.txHash,
      blockHeight: txData.public.blockHeight.toString(),
    };
    this.logger?.trace({
      transactionAdded: {
        circuit: 'registerProject',
        ...receipt,
      },
    });
    return receipt;
  }

  async submitReport(projectId: Uint8Array, reportText: string): Promise<SealedReportReceipt> {
    this.logger?.info('submitReport');
    const digest = digestReport(reportText);
    const salt = randomSecret32();

    const currentPrivateState =
      (await this.providers.privateStateProvider.get(bugSealPrivateStateKey)) ??
      createBugSealPrivateState(randomSecret32(), new Uint8Array(32), new Uint8Array(32));

    const nextPrivateState = createBugSealPrivateState(currentPrivateState.maintainerSecret, digest, salt);
    await this.providers.privateStateProvider.set(bugSealPrivateStateKey, nextPrivateState);

    const reportId = pureCircuits.reportCommitment(projectId, digest, salt);

    const txData = await this.deployedContract.callTx.submitReport(projectId);
    const receipt: SealedReportReceipt = {
      projectId,
      reportId,
      digest,
      salt,
      txHash: txData.public.txHash,
      blockHeight: txData.public.blockHeight.toString(),
    };

    this.logger?.trace({
      transactionAdded: {
        circuit: 'submitReport',
        txHash: receipt.txHash,
        blockHeight: receipt.blockHeight,
      },
    });

    return receipt;
  }

  async proveOwnership(receipt: SealedReportReceipt): Promise<TransactionReceipt> {
    this.logger?.info('proveReportOwnership');
    const currentPrivateState =
      (await this.providers.privateStateProvider.get(bugSealPrivateStateKey)) ??
      createBugSealPrivateState(randomSecret32(), new Uint8Array(32), new Uint8Array(32));

    const nextPrivateState = createBugSealPrivateState(
      currentPrivateState.maintainerSecret,
      receipt.digest,
      receipt.salt,
    );
    await this.providers.privateStateProvider.set(bugSealPrivateStateKey, nextPrivateState);

    const txData = await this.deployedContract.callTx.proveReportOwnership(receipt.projectId, receipt.reportId);
    const txReceipt: TransactionReceipt = {
      txHash: txData.public.txHash,
      blockHeight: txData.public.blockHeight.toString(),
    };

    this.logger?.trace({
      transactionAdded: {
        circuit: 'proveReportOwnership',
        ...txReceipt,
      },
    });

    return txReceipt;
  }

  async acknowledgeReport(reportId: Uint8Array): Promise<TransactionReceipt> {
    this.logger?.info('acknowledgeReport');
    const txData = await this.deployedContract.callTx.acknowledgeReport(reportId);
    const txReceipt: TransactionReceipt = {
      txHash: txData.public.txHash,
      blockHeight: txData.public.blockHeight.toString(),
    };

    this.logger?.trace({
      transactionAdded: {
        circuit: 'acknowledgeReport',
        ...txReceipt,
      },
    });

    return txReceipt;
  }

  static async deploy(providers: BugSealProviders, logger?: Logger): Promise<BugSealAPI> {
    logger?.info('deployContract');

    const initialPrivateState = createBugSealPrivateState(
      randomSecret32(),
      new Uint8Array(32),
      new Uint8Array(32),
    );

    const deployedBugSealContract = await deployContract(providers, {
      compiledContract: CompiledBugSealContract,
      privateStateId: bugSealPrivateStateKey,
      initialPrivateState,
    });

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedBugSealContract.deployTxData.public,
      },
    });

    return new BugSealAPI(deployedBugSealContract, providers, logger);
  }

  static async join(
    providers: BugSealProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<BugSealAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedBugSealContract = await findDeployedContract<BugSealContract>(providers, {
      contractAddress,
      compiledContract: CompiledBugSealContract,
      privateStateId: bugSealPrivateStateKey,
      initialPrivateState: await BugSealAPI.getPrivateState(providers, contractAddress),
    });

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedBugSealContract.deployTxData.public,
      },
    });

    return new BugSealAPI(deployedBugSealContract, providers, logger);
  }

  private static async getPrivateState(
    providers: BugSealProviders,
    contractAddress: ContractAddress,
  ): Promise<BugSealPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(bugSealPrivateStateKey);
    return (
      existingPrivateState ??
      createBugSealPrivateState(randomSecret32(), new Uint8Array(32), new Uint8Array(32))
    );
  }
}

export * from './common-types.js';
export * from './encoding.js';
export * from './privacy.js';
