import { describe, it, beforeAll, expect, jest } from '@jest/globals';
import { getLitNodeClient } from '../../../../scripts/utils/lit-client';
import { getExecutorSessionSigs } from '../../../../scripts/utils/lit-auth';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import {
  AccessControlConditions,
  IRelayPKP,
  SessionSigs,
} from '@lit-protocol/types';
import getLitAction from '../../../../scripts/utils/get-lit-action';
import { config } from 'dotenv';
import { ENVIRONMENT } from '../../../types/environment';

config();

jest.setTimeout(60000);

describe('Rebalancing Instructions Lit', () => {
  let litNodeClient: LitNodeClient;
  let sessionSigs: SessionSigs;
  let pkps: IRelayPKP[];
  let envVars: string;

  const actionFile = getLitAction('REBALANCING_INSTRUCTIONS');
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

  beforeAll(async () => {
    litNodeClient = await getLitNodeClient('datil-dev', true);
    const res = await getExecutorSessionSigs('datil-dev');
    sessionSigs = res.sessionSigs;
    pkps = res.pkps;

    envVars = JSON.stringify({
      ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
      QUICKNODE_BASE_KEY: process.env.QUICKNODE_BASE_KEY,
      QUICKNODE_OPTIMISM_KEY: process.env.QUICKNODE_OPTIMISM_KEY,
      QUICKNODE_ARBITRUM_KEY: process.env.QUICKNODE_ARBITRUM_KEY,
      QUICKNODE_BSC_KEY: process.env.QUICKNODE_BSC_KEY,
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    });
  });

  it('should find rebalancing actions for dev', async () => {
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

    expect(output).toBeDefined();
    expect(output.response).toBeDefined();

    const parsedResponse = JSON.parse(output.response as string);

    expect(parsedResponse.signature).toBeDefined();
    expect(parsedResponse.dataStringified).toBeDefined();
    expect(parsedResponse.data.actions).toBeDefined();
    expect(parsedResponse.data.actions.length).toBeGreaterThan(0);
  });
});
