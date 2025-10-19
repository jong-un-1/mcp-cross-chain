import { config } from 'dotenv';
import { getLitNodeClient } from '../utils/lit-client';
import { Wallet } from 'ethers';
import { ChainId } from '../../src/types/chain-id';
import { ENVIRONMENT } from '../../src/types/environment';
import { REBALANCING_INSTRUCTIONS_SIGNER } from '../../src/utils/addresses';
import getLitAction from '../utils/get-lit-action';
import { getExecutorSessionSigs } from '../utils/lit-auth';
import { AccessControlConditions } from '@lit-protocol/types';
import { encryptString } from '../utils/encrypt-string';

config();

const testRebalancingExecution = async () => {
  try {
    // Initialize Lit client and session signatures
    const litNodeClient = await getLitNodeClient('datil-dev', true);
    const res = await getExecutorSessionSigs('datil-dev');
    const sessionSigs = res.sessionSigs;
    const pkps = res.pkps;

    // Set up environment variables for the Lit Action
    const envVars = {
      ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
      QUICKNODE_BASE_KEY: process.env.QUICKNODE_BASE_KEY,
      QUICKNODE_OPTIMISM_KEY: process.env.QUICKNODE_OPTIMISM_KEY,
      QUICKNODE_ARBITRUM_KEY: process.env.QUICKNODE_ARBITRUM_KEY,
      QUICKNODE_BSC_KEY: process.env.QUICKNODE_BSC_KEY,
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
      QUICKNODE_JITO_KEY: process.env.QUICKNODE_JITO_KEY,
      QUICKNODE_JITO_ENDPOINT: process.env.QUICKNODE_JITO_ENDPOINT,
      QUICKNODE_BASE_ENDPOINT: process.env.QUICKNODE_BASE_ENDPOINT,
      QUICKNODE_OPTIMISM_ENDPOINT: process.env.QUICKNODE_OPTIMISM_ENDPOINT,
      QUICKNODE_ARBITRUM_ENDPOINT: process.env.QUICKNODE_ARBITRUM_ENDPOINT,
      QUICKNODE_BSC_ENDPOINT: process.env.QUICKNODE_BSC_ENDPOINT,
      QUICKNODE_AVALANCHE_ENDPOINT: process.env.QUICKNODE_AVALANCHE_ENDPOINT,
      QUICKNODE_POLYGON_ENDPOINT: process.env.QUICKNODE_POLYGON_ENDPOINT,
    };

    const accessControl: AccessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: 'ethereum',
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: '0',
        },
      },
    ];

    const orchestratorSolana = await encryptString(
      process.env.ORCHESTRATOR_PK_SOLANA as string,
      accessControl,
      litNodeClient,
    );

    // Create rebalancing instructions
    const instructions = {
      timestamp: new Date().getTime(),
      env: ENVIRONMENT.DEV,
      actions: [
        {
          sourceNetwork: ChainId.SOLANA,
          targetNetwork: ChainId.OPTIMISM,
          amount: '1641768',
        },
      ],
      finalAvailableBalances: {},
    };

    // Sign the instructions
    const dataStringified = JSON.stringify(instructions);
    const signerWallet = new Wallet(process.env.OWNER_PK as string);
    const signature = await signerWallet.signMessage(dataStringified);
    const signedResponse = {
      data: instructions,
      dataStringified,
      signature,
    };
    const instructionsResponse = JSON.stringify(signedResponse);

    // Get and execute the Lit Action
    const actionFile = getLitAction('REBALANCING_EXECUTION_PROXY_TEST');

    const implementationIdTest =
      'QmbAJNyLVfPcrZUd8UbvhGne5gGyWTQF4cZ7TMGbhPugoF';
    const output = await litNodeClient.executeJs({
      code: actionFile,
      sessionSigs: sessionSigs,
      jsParams: {
        implementationIdTest,
        env: ENVIRONMENT.DEV,
        envVars,
        instructionsResponse,
        evmPkpAddress: pkps[0].ethAddress,
        evmPkpPublicKey: pkps[0].publicKey,
        orchestratorSolana,
        accessControl,
        authorisedSigner: REBALANCING_INSTRUCTIONS_SIGNER(ENVIRONMENT.DEV),
        actionsBatch: {
          size: 6,
          index: 0,
        },
      },
    });

    console.log('Output:');
    console.log(JSON.stringify(output, null, 2));
  } catch (error: any) {
    console.error('Error executing rebalancing:', error);
    console.log('Short message:', error.message || error);
  }
};

testRebalancingExecution();
