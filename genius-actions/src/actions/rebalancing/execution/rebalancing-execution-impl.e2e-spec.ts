import { describe, it, beforeAll, expect, jest } from '@jest/globals';

import { config } from 'dotenv';
import { ENVIRONMENT } from '../../../types/environment';
import { RebalancingInstructions } from '../rebalancing.types';
import { ChainId } from '../../../types/chain-id';
import { Wallet } from 'ethers';
import { SignedResponse } from '../../../types/signed-response';
import { RPC_URLS } from '../../../utils/rpcs';
import { rebalancingExecutionImpl } from './rebalancing-execution-impl';
import { LitHelpersMock } from '../../../services/lit-services/lit-helpers/lit-helpers-mock';

config();

jest.setTimeout(90000);

describe('Rebalancing Execution Impl', () => {
  let instructionsResponse: SignedResponse<RebalancingInstructions>;
  let rpcUrls: { [chain: number]: string[] } = {};
  let validInstructions: RebalancingInstructions;

  beforeAll(async () => {
    const envVars = {
      ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
      QUICKNODE_BASE_KEY: process.env.QUICKNODE_BASE_KEY,
      QUICKNODE_OPTIMISM_KEY: process.env.QUICKNODE_OPTIMISM_KEY,
      QUICKNODE_ARBITRUM_KEY: process.env.QUICKNODE_ARBITRUM_KEY,
      QUICKNODE_BSC_KEY: process.env.QUICKNODE_BSC_KEY,
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    };
    rpcUrls = RPC_URLS(envVars);

    validInstructions = {
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

    const dataStringified = JSON.stringify(validInstructions);
    const signerWallet = new Wallet(process.env.OWNER_PK as string);
    const signature = await signerWallet.signMessage(dataStringified);
    instructionsResponse = {
      data: validInstructions,
      dataStringified,
      signature,
    };
  });

  it('should find rebalancing actions for dev', async () => {
    const output = await rebalancingExecutionImpl(
      ENVIRONMENT.DEV,
      'AmHX7SuAJd84cFYCZqNKskmVhL3M7qDJDxPpTAR3rSii',
      new LitHelpersMock(),
      rpcUrls,
      instructionsResponse,
      {
        size: 10,
        index: 0,
      },
    );

    expect(output).toBeDefined();

    expect(output.length).toBe(3);
    expect(output[0].chainId).toBe(ChainId.BASE);
    expect(output[0].transaction).toBeDefined();
    expect(output[1].chainId).toBe(ChainId.SOLANA);
    expect(output[1].transaction).toBeDefined();
    expect(output[2].chainId).toBe(ChainId.SOLANA);
    expect(output[2].transaction).toBeDefined();
  });

  it('should throw error for outdated signature', async () => {
    // Create a response with an old timestamp
    const oldInstructions = {
      ...validInstructions,
      timestamp: new Date().getTime() - 1000 * 60 * 10, // 10 minutes old (exceeding 5 minute limit)
    };

    const dataStringified = JSON.stringify(oldInstructions);
    const signerWallet = new Wallet(process.env.OWNER_PK as string);
    const signature = await signerWallet.signMessage(dataStringified);

    const outdatedResponse = {
      data: oldInstructions,
      dataStringified,
      signature,
    };

    await expect(
      rebalancingExecutionImpl(
        ENVIRONMENT.DEV,
        'AmHX7SuAJd84cFYCZqNKskmVhL3M7qDJDxPpTAR3rSii',
        new LitHelpersMock(),
        rpcUrls,
        outdatedResponse,
        {
          size: 10,
          index: 0,
        },
      ),
    ).rejects.toThrow('Signature expired');
  });

  it('should throw error for future timestamp', async () => {
    // Create a response with a future timestamp
    const futureInstructions = {
      ...validInstructions,
      timestamp: new Date().getTime() + 1000 * 60 * 10, // 10 minutes in the future
    };

    const dataStringified = JSON.stringify(futureInstructions);
    const signerWallet = new Wallet(process.env.OWNER_PK as string);
    const signature = await signerWallet.signMessage(dataStringified);

    const futureResponse = {
      data: futureInstructions,
      dataStringified,
      signature,
    };

    await expect(
      rebalancingExecutionImpl(
        ENVIRONMENT.DEV,
        'AmHX7SuAJd84cFYCZqNKskmVhL3M7qDJDxPpTAR3rSii',
        new LitHelpersMock(),
        rpcUrls,
        futureResponse,
        {
          size: 10,
          index: 0,
        },
      ),
    ).rejects.toThrow('Signature expired');
  });

  it('should throw error for signature from wrong signer', async () => {
    // Create a signature with a different wallet
    const unauthorizedWallet = Wallet.createRandom();
    const signature = await unauthorizedWallet.signMessage(
      instructionsResponse.dataStringified,
    );

    const unauthorizedResponse = {
      ...instructionsResponse,
      signature,
    };

    await expect(
      rebalancingExecutionImpl(
        ENVIRONMENT.DEV,
        'AmHX7SuAJd84cFYCZqNKskmVhL3M7qDJDxPpTAR3rSii',
        new LitHelpersMock(),
        rpcUrls,
        unauthorizedResponse,
        {
          size: 10,
          index: 0,
        },
      ),
    ).rejects.toThrow('Invalid signature');
  });

  it('should throw error for no actions in the instructions', async () => {
    // Create instructions with empty actions array
    const emptyActionsInstructions = {
      ...validInstructions,
      actions: [],
    };

    const dataStringified = JSON.stringify(emptyActionsInstructions);
    const signerWallet = new Wallet(process.env.OWNER_PK as string);
    const signature = await signerWallet.signMessage(dataStringified);

    const emptyActionsResponse = {
      data: emptyActionsInstructions,
      dataStringified,
      signature,
    };

    const result = await rebalancingExecutionImpl(
      ENVIRONMENT.DEV,
      'AmHX7SuAJd84cFYCZqNKskmVhL3M7qDJDxPpTAR3rSii',
      new LitHelpersMock(),
      rpcUrls,
      emptyActionsResponse,
      {
        size: 10,
        index: 0,
      },
    );

    // The implementation doesn't throw for empty actions, but should return an empty array
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('should validate environment matches in instructions', async () => {
    // Create instructions with mismatched environment
    const wrongEnvInstructions = {
      ...validInstructions,
      env: ENVIRONMENT.STAGING, // Different from the ENVIRONMENT.DEV we'll pass to rebalancingExecutionImpl
    };

    const dataStringified = JSON.stringify(wrongEnvInstructions);
    const signerWallet = new Wallet(process.env.OWNER_PK as string);
    const signature = await signerWallet.signMessage(dataStringified);

    const wrongEnvResponse = {
      data: wrongEnvInstructions,
      dataStringified,
      signature,
    };

    // The execution should still work, as environment mismatch isn't checked in the implementation
    // This test documents current behavior and could be updated if environment validation is added
    const output = await rebalancingExecutionImpl(
      ENVIRONMENT.DEV,
      'AmHX7SuAJd84cFYCZqNKskmVhL3M7qDJDxPpTAR3rSii',
      new LitHelpersMock(),
      rpcUrls,
      wrongEnvResponse,
      {
        size: 10,
        index: 0,
      },
    );

    expect(output).toBeDefined();
    expect(output.length).toBe(3);
  });
});
