// This file is part of midnightntwrk/example-bboard.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { createInterface, type Interface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WebSocket } from 'ws';
import {
  BugSealAPI,
  type BugSealProviders,
  type PrivateStateId,
  type SealedReportReceipt,
  parseHex32,
  hex32,
} from '@bugseal/api';
import { type WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { ledger, type Ledger, ReportStatus } from '@bugseal/contract';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { type Logger } from 'pino';
import { type Config, StandaloneConfig } from './config.js';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js-utils';
import { TestEnvironment } from '@midnight-ntwrk/testkit-js';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils.js';
import { generateDust } from './generate-dust.js';
import { type BugSealPrivateState } from '@bugseal/contract';
import { randomBytes } from 'node:crypto';

// @ts-expect-error: Needed to enable WebSocket usage through apollo/graphql
globalThis.WebSocket = WebSocket;

export const getBugSealLedgerState = async (
  providers: BugSealProviders,
  contractAddress: ContractAddress,
): Promise<Ledger | null> => {
  assertIsContractAddress(contractAddress);
  const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null ? ledger(contractState.data) : null;
};

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new BugSeal contract
  2. Join an existing BugSeal contract
  3. Exit
Which would you like to do? `;

const deployOrJoin = async (
  providers: BugSealProviders,
  rli: Interface,
  logger: Logger,
): Promise<BugSealAPI | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice.trim()) {
      case '1': {
        const api = await BugSealAPI.deploy(providers, logger);
        console.log(`Deployed contract at address: ${api.deployedContractAddress}`);
        return api;
      }
      case '2': {
        const address = await rli.question('What is the contract address (in hex)? ');
        const api = await BugSealAPI.join(providers, address.trim(), logger);
        console.log(`Joined contract at address: ${api.deployedContractAddress}`);
        return api;
      }
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        console.log(`Invalid choice: ${choice}`);
    }
  }
};

const displayPublicLedgerSummary = async (
  providers: BugSealProviders,
  contractAddress: ContractAddress,
): Promise<void> => {
  const ledgerState = await getBugSealLedgerState(providers, contractAddress);
  if (ledgerState === null) {
    console.log(`There is no BugSeal contract deployed at ${contractAddress}`);
    return;
  }

  const projects: [Uint8Array, Uint8Array][] = Array.from(ledgerState.projects);
  const reports: [Uint8Array, { projectId: Uint8Array; status: ReportStatus }][] = Array.from(ledgerState.reports);

  console.log('\n--- Public Ledger Summary ---');
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Total Projects: ${projects.length}`);
  console.log(`Total Reports: ${reports.length}`);

  if (projects.length > 0) {
    console.log('\nRegistered Projects:');
    for (const [projectId, authority] of projects) {
      console.log(`  - Project ID: ${hex32(projectId)} (Authority: ${hex32(authority)})`);
    }
  }

  if (reports.length > 0) {
    console.log('\nReports:');
    for (const [reportId, record] of reports) {
      const statusStr = record.status === ReportStatus.SUBMITTED ? 'SUBMITTED' : 'ACKNOWLEDGED';
      console.log(
        `  - Report ID: ${hex32(reportId)} | Project ID: ${hex32(record.projectId)} | Status: ${statusStr}`,
      );
    }
  }
  console.log('-----------------------------\n');
};

const MAIN_LOOP_QUESTION = `
You can do one of the following:
  1. Register project
  2. Seal report
  3. Prove report ownership from current session
  4. Acknowledge report
  5. Display public ledger summary
  6. Exit
Which would you like to do? `;

const mainLoop = async (
  providers: BugSealProviders,
  rli: Interface,
  logger: Logger,
): Promise<void> => {
  const bugSealApi = await deployOrJoin(providers, rli, logger);
  if (bugSealApi === null) {
    return;
  }

  let latestReceipt: SealedReportReceipt | undefined;

  while (true) {
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    try {
      switch (choice.trim()) {
        case '1': {
          const hexInput = await rli.question('Enter 32-byte Project ID (64 hex characters): ');
          const projectId = parseHex32(hexInput.trim());
          const receipt = await bugSealApi.registerProject(projectId);
          console.log(`Project registered successfully.`);
          console.log(`Transaction Hash: ${receipt.txHash}`);
          console.log(`Block Height: ${receipt.blockHeight}`);
          break;
        }
        case '2': {
          const hexInput = await rli.question('Enter 32-byte Project ID (64 hex characters): ');
          const projectId = parseHex32(hexInput.trim());
          const reportText = await rli.question('Enter vulnerability report details: ');
          const receipt = await bugSealApi.submitReport(projectId, reportText);
          latestReceipt = receipt;
          console.log(`Report sealed and submitted successfully.`);
          console.log(`Report ID (Commitment): ${hex32(receipt.reportId)}`);
          console.log(`Transaction Hash: ${receipt.txHash}`);
          console.log(`Block Height: ${receipt.blockHeight}`);
          break;
        }
        case '3': {
          if (!latestReceipt) {
            console.log('No report sealed in current session. Cannot prove ownership without local secrets.');
            break;
          }
          const receipt = await bugSealApi.proveOwnership(latestReceipt);
          console.log(`Report ownership proven successfully.`);
          console.log(`Transaction Hash: ${receipt.txHash}`);
          console.log(`Block Height: ${receipt.blockHeight}`);
          break;
        }
        case '4': {
          const hexInput = await rli.question('Enter 32-byte Report ID (64 hex characters): ');
          const reportId = parseHex32(hexInput.trim());
          const receipt = await bugSealApi.acknowledgeReport(reportId);
          console.log(`Report acknowledged successfully.`);
          console.log(`Transaction Hash: ${receipt.txHash}`);
          console.log(`Block Height: ${receipt.blockHeight}`);
          break;
        }
        case '5': {
          await displayPublicLedgerSummary(providers, bugSealApi.deployedContractAddress);
          break;
        }
        case '6':
          logger.info('Exiting...');
          return;
        default:
          console.log(`Invalid choice: ${choice}`);
      }
    } catch (e) {
      logError(logger, e);
      console.log('Error executing operation. Returning to main menu...');
    }
  }
};

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (
  config: Config,
  rli: Interface,
  logger: Logger,
): Promise<string | undefined> => {
  if (config instanceof StandaloneConfig) {
    return GENESIS_MINT_WALLET_SEED;
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice.trim()) {
      case '1':
        return randomBytes(32).toString('hex');
      case '2': {
        const seed = await rli.question('Enter your wallet seed: ');
        return seed.trim();
      }
      case '3':
        logger.info('Exiting...');
        return undefined;
      default:
        console.log(`Invalid choice: ${choice}`);
    }
  }
};

export const run = async (
  config: Config,
  testEnv: TestEnvironment,
  logger: Logger,
): Promise<void> => {
  const rli = createInterface({ input, output, terminal: true });
  const providersToBeStopped: MidnightWalletProvider[] = [];
  try {
    const envConfiguration = await testEnv.start();
    logger.info('Environment started');
    const seed = await buildWallet(config, rli, logger);
    if (seed === undefined) {
      return;
    }
    const walletProvider = await MidnightWalletProvider.build(logger, envConfiguration, seed);
    providersToBeStopped.push(walletProvider);
    const walletFacade: WalletFacade = walletProvider.wallet;

    await walletProvider.start();

    const unshieldedState = await waitForUnshieldedFunds(
      logger,
      walletFacade,
      envConfiguration,
      unshieldedToken(),
    );
    const nightBalance = unshieldedState.balances[unshieldedToken().raw];
    if (nightBalance === undefined) {
      logger.info('No funds received, exiting...');
      return;
    }
    logger.info(`Your NIGHT wallet balance is: ${nightBalance}`);

    if (config.generateDust) {
      const dustGeneration = await generateDust(logger, seed, unshieldedState, walletFacade);
      if (dustGeneration) {
        logger.info(`Submitted dust generation registration transaction: ${dustGeneration}`);
        await syncWallet(logger, walletFacade);
      }
    }

    const zkConfigProvider = new NodeZkConfigProvider<
      'registerProject' | 'submitReport' | 'proveReportOwnership' | 'acknowledgeReport'
    >(config.zkConfigPath);
    const providers: BugSealProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, BugSealPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => {
          return 'BugSeal-Level1-Storage-Password!';
        },
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(
        envConfiguration.indexer,
        envConfiguration.indexerWS,
      ),
      zkConfigProvider: zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider: walletProvider,
      midnightProvider: walletProvider,
    };
    await mainLoop(providers, rli, logger);
  } catch (e) {
    logError(logger, e);
    logger.info('Exiting...');
  } finally {
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logError(logger, e);
    } finally {
      try {
        for (const wallet of providersToBeStopped) {
          logger.info('Stopping wallet...');
          await wallet.stop();
        }
        if (testEnv) {
          logger.info('Stopping test environment...');
          await testEnv.shutdown();
        }
      } catch (e) {
        logError(logger, e);
      }
    }
  }
};

function logError(logger: Logger, e: unknown) {
  if (e instanceof Error) {
    logger.error(`Found error '${e.message}'`);
    logger.debug(`${e.stack}`);
  } else {
    logger.error(`Found error (unknown type)`);
  }
}
