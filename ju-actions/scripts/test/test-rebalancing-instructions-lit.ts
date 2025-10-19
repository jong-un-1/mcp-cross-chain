import { config } from 'dotenv';
import { AccessControlConditions } from '@lit-protocol/types';
import { getLitNodeClient } from '../utils/lit-client';
import { getExecutorSessionSigs } from '../utils/lit-auth';
import getLitAction from '../utils/get-lit-action';
import { ENVIRONMENT } from '../../src/types/environment';

config();

const testRebalancing = async () => {
  try {
    const litNodeClient = await getLitNodeClient('datil-test', true);
    const { sessionSigs, pkps } = await getExecutorSessionSigs('datil-test');

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

    console.log('orchestratorAccess=>', accessControl);
    console.log('process.env.ORCHESTRATOR_PK=>', process.env.ORCHESTRATOR_PK);

    const envVars = {
      ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
      QUICKNODE_BASE_KEY: process.env.QUICKNODE_BASE_KEY,
      QUICKNODE_OPTIMISM_KEY: process.env.QUICKNODE_OPTIMISM_KEY,
      QUICKNODE_ARBITRUM_KEY: process.env.QUICKNODE_ARBITRUM_KEY,
      QUICKNODE_BSC_KEY: process.env.QUICKNODE_BSC_KEY,
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    };

    const actionFile = getLitAction('REBALANCING_INSTRUCTIONS');

    const output = await litNodeClient.executeJs({
      code: actionFile,
      sessionSigs: sessionSigs,
      jsParams: {
        env: ENVIRONMENT.DEV,
        evmPkpAddress: pkps[0].ethAddress,
        evmPkpPublicKey: pkps[0].publicKey,
        accessControl,
        envVars,
        topHoldersAddresses: {
          10: '0x5CC11Ef1DE86c5E00259a463Ac3F3AE1A0fA2909',
          8453: '0x5CC11Ef1DE86c5E00259a463Ac3F3AE1A0fA2909',
          43114: '0x5CC11Ef1DE86c5E00259a463Ac3F3AE1A0fA2909',
          42161: '0x5CC11Ef1DE86c5E00259a463Ac3F3AE1A0fA2909',
          56: '0x5CC11Ef1DE86c5E00259a463Ac3F3AE1A0fA2909',
        },
        ratios: null,
      },
    });

    console.log('output');
    console.log(output);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: any) {
    console.error('Error executing rebalancing:', error);
    console.log('short message');
    console.log((error as any).shortMessage);
  }
};

testRebalancing();
