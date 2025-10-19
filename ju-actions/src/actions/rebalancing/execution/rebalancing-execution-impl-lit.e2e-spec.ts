import { describe, it, beforeAll, expect, jest } from '@jest/globals';
import { getLitNodeClient } from '../../../../scripts/utils/lit-client';
import { getExecutorSessionSigs } from '../../../../scripts/utils/lit-auth';
import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { SessionSigs } from '@lit-protocol/types';
import getLitAction from '../../../../scripts/utils/get-lit-action';
import { config } from 'dotenv';
import { ENVIRONMENT } from '../../../types/environment';
import { REBALANCING_INSTRUCTIONS_SIGNER } from '../../../utils/addresses';
import { RebalancingInstructions } from '../rebalancing.types';
import { ChainId } from '../../../types/chain-id';
import { Wallet } from 'ethers';
import { SignedResponse } from '../../../types/signed-response';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';

config();

jest.setTimeout(90000);

describe('Rebalancing Execution Impl Lit', () => {
  let litNodeClient: LitNodeClient;
  let sessionSigs: SessionSigs;
  let envVars: { [key: string]: string | undefined };

  const actionFile = getLitAction('REBALANCING_EXECUTION_IMPL');
  let instructionsResponse: string = '';

  beforeAll(async () => {
    litNodeClient = await getLitNodeClient('datil-dev', true);
    const res = await getExecutorSessionSigs('datil-dev');
    sessionSigs = res.sessionSigs;

    envVars = {
      ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
      QUICKNODE_BASE_KEY: process.env.QUICKNODE_BASE_KEY,
      QUICKNODE_OPTIMISM_KEY: process.env.QUICKNODE_OPTIMISM_KEY,
      QUICKNODE_ARBITRUM_KEY: process.env.QUICKNODE_ARBITRUM_KEY,
      QUICKNODE_BSC_KEY: process.env.QUICKNODE_BSC_KEY,
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    };

    const instructions: RebalancingInstructions = {
      timestamp: new Date().getTime(),
      env: ENVIRONMENT.DEV,
      actions: [
        {
          sourceNetwork: ChainId.BASE,
          targetNetwork: ChainId.OPTIMISM,
          amount: '1000000000',
        },
        {
          sourceNetwork: ChainId.SOLANA,
          targetNetwork: ChainId.BSC,
          amount: '1000000000',
        },
        {
          sourceNetwork: ChainId.SOLANA,
          targetNetwork: ChainId.ETHEREUM,
          amount: '1000000000',
        },
      ],
      finalAvailableBalances: {},
    };

    const dataStringified = JSON.stringify(instructions);
    const signerWallet = new Wallet(process.env.OWNER_PK as string);
    const signature = await signerWallet.signMessage(dataStringified);
    const signedResponse: SignedResponse<RebalancingInstructions> = {
      data: instructions,
      dataStringified,
      signature,
    };
    instructionsResponse = JSON.stringify(signedResponse);
  });

  it('should find rebalancing actions for dev', async () => {
    const output = await litNodeClient.executeJs({
      code: actionFile,
      sessionSigs: sessionSigs,
      jsParams: {
        env: ENVIRONMENT.DEV,
        orchestratorSolanaPubKey:
          'AmHX7SuAJd84cFYCZqNKskmVhL3M7qDJDxPpTAR3rSii',
        envVars,
        instructionsResponse,
        authorisedSigner: REBALANCING_INSTRUCTIONS_SIGNER(ENVIRONMENT.DEV),
      },
    });

    expect(output).toBeDefined();
    expect(output.response).toBeDefined();

    const executionData = JSON.parse(output.response as string) as {
      chainId: number;
      transaction: string[] | EvmArbitraryCall;
    }[];

    expect(executionData.length).toBe(3);
    expect(executionData[0].chainId).toBe(ChainId.BASE);
    expect(executionData[0].transaction).toBeDefined();
    expect(executionData[1].chainId).toBe(ChainId.SOLANA);
    expect(executionData[1].transaction).toBeDefined();
    expect(executionData[2].chainId).toBe(ChainId.SOLANA);
    expect(executionData[2].transaction).toBeDefined();
  });
});
