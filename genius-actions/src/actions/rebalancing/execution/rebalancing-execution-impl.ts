import { keccak256 } from 'viem';
import { toUtf8Bytes } from 'ethers/lib/utils';
import { RebalanceAction, RebalancingInstructions } from '../rebalancing.types';
import { SignedResponse } from '../../../types/signed-response';
import { validateEthSignature } from '../../../utils/validate-eth-signature';
import { ChainId } from '../../../types/chain-id';
import { ENVIRONMENT } from '../../../types/environment';
import {
  GENIUS_VAULT_ADR,
  OWNER_ADR_EVM,
  REBALANCING_INSTRUCTIONS_SIGNER,
  SOLANA_OWNER_ADR,
  STABLECOIN_ADR,
} from '../../../utils/addresses';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { serializeVersionedTxn } from '../../../utils/solana/txn-serialization';
import { PublicKey } from '@solana/web3.js';
import { GeniusEvmVault } from '../../../services/blockchain/vault/genius-evm-vault';
import { GeniusSvmPool } from '../../../services/blockchain/vault/genius-solana-pool';
import { ILitHelpers } from '../../../services/lit-services/lit-helpers/lit-helpers.interface';
import { GeniusIntents, QuoteResponse } from 'genius-intents';

const SIGNATURE_VALIDITY_PERIOD = 1000 * 60 * 5; // 5 minutes

export const rebalancingExecutionImpl = async (
  env: ENVIRONMENT,
  orchestratorSolanaPubKey: string,
  litHelpers: ILitHelpers,
  rpcUrls: { [chain: number]: string[] },
  instructionsResponse: SignedResponse<RebalancingInstructions>,
  actionsBatch: {
    size: number;
    index: number;
  },
): Promise<
  {
    chainId: number;
    transaction: string[] | EvmArbitraryCall;
  }[]
> => {
  console.log('Executing rebalancing execution impl');
  const { data, signature, dataStringified } = instructionsResponse;
  if (
    !validateEthSignature(
      dataStringified,
      signature,
      REBALANCING_INSTRUCTIONS_SIGNER(env),
    )
  ) {
    throw new Error('Invalid signature');
  }

  const timestamp = data.timestamp;
  const currentTimestamp = new Date().getTime();

  if (
    currentTimestamp - timestamp > SIGNATURE_VALIDITY_PERIOD ||
    timestamp > currentTimestamp
  ) {
    throw new Error('Signature expired');
  }

  if (data.env !== env) {
    throw new Error(`Invalid environment. Expected ${env}, got ${data.env}`);
  }

  return await Promise.all(
    data.actions
      .slice(
        actionsBatch.index,
        Math.min(actionsBatch.index + actionsBatch.size, data.actions.length),
      )
      .map((action) =>
        getRebalancingTxData(
          orchestratorSolanaPubKey,
          litHelpers,
          action,
          env,
          rpcUrls,
        ),
      ),
  );
};

export const getRebalancingTxData = async (
  orchestratorSolanaPubKey: string,
  litHelpers: ILitHelpers,
  rebalanceAction: RebalanceAction,
  env: ENVIRONMENT,
  rpcUrls: { [chain: number]: string[] } = {},
): Promise<{
  chainId: number;
  transaction: string[] | EvmArbitraryCall;
}> => {
  const { sourceNetwork, targetNetwork, amount } = rebalanceAction;
  const rebalancingId = keccak256(
    toUtf8Bytes(`${sourceNetwork}-${targetNetwork}-${amount}`),
  )
    .toString()
    .slice(0, 10);

  console.log(
    `Executing rebalancing of \$${amount} from ${sourceNetwork} to ${targetNetwork} (${rebalancingId}) at ${new Date().getTime()}`,
  );

  const geniusIntents = new GeniusIntents({
    rcps: Object.fromEntries(
      Object.entries(rpcUrls).map(([chain, rpcUrl]) => [chain, rpcUrl[0]]),
    ),
    method: 'best',
    acrossIntegratorId: '0xcafe',
  });

  console.log(
    `Fetching bridge quote at ${new Date().getTime()} for ${rebalancingId}`,
  );

  const from = getFromAddress(orchestratorSolanaPubKey, sourceNetwork, env);
  const to = getToAddress(targetNetwork, env);

  const authority = {
    networkInAddress:
      sourceNetwork === ChainId.SOLANA
        ? SOLANA_OWNER_ADR(env)
        : OWNER_ADR_EVM(env),
    networkOutAddress:
      targetNetwork === ChainId.SOLANA
        ? SOLANA_OWNER_ADR(env)
        : OWNER_ADR_EVM(env),
  };

  const quote = await geniusIntents.fetchQuote({
    networkIn: sourceNetwork,
    networkOut: targetNetwork,
    tokenIn: STABLECOIN_ADR(sourceNetwork, env),
    tokenOut: STABLECOIN_ADR(targetNetwork, env),
    slippage: 0.01,
    amountIn: rebalanceAction.amount.toString(),
    from,
    receiver: to,
    overrideParamsDebridge: {
      authority,
    },
  });

  if (!quote.result) {
    console.error('No quote found');
    throw new Error('No quote found');
  }

  console.log(`Fetched quote for ${rebalancingId}: `, quote);

  if (sourceNetwork === ChainId.SOLANA) {
    return await getSolanaRebalancingTxns(
      orchestratorSolanaPubKey,
      rebalanceAction,
      quote.result,
      rpcUrls[sourceNetwork],
      env,
    );
  } else {
    console.log(`Handling EVM rebalance execution at ${new Date().getTime()}`);
    return await getEvmRebalancingTxns(
      env,
      sourceNetwork,
      targetNetwork,
      rebalanceAction.amount.toString(),
      quote.result,
      rpcUrls,
    );
  }
};

const getFromAddress = (
  orchestratorSolanaPubKey: string,
  networkIn: ChainId,
  env: ENVIRONMENT,
): string => {
  return networkIn === ChainId.SOLANA
    ? orchestratorSolanaPubKey
    : GENIUS_VAULT_ADR(networkIn, env);
};

const getToAddress = (networkOut: ChainId, env: ENVIRONMENT): string => {
  return networkOut === ChainId.SOLANA
    ? GeniusSvmPool.getVaultAddress(env).toBase58()
    : GENIUS_VAULT_ADR(networkOut, env);
};

const getSolanaRebalancingTxns = async (
  orchestratorSolanaPubKey: string,
  rebalanceAction: RebalanceAction,
  quote: QuoteResponse,
  rpcUrls: string[],
  env: ENVIRONMENT,
): Promise<{
  chainId: number;
  transaction: string[] | EvmArbitraryCall;
}> => {
  const geniusSvmPool = new GeniusSvmPool(rpcUrls, env);

  const removeLiquidityFromVaultTxn =
    await geniusSvmPool.getRemoveBridgeLiquidityTx({
      orchestrator: new PublicKey(orchestratorSolanaPubKey),
      amount: rebalanceAction.amount.toString(),
    });

  if (!quote.svmExecutionPayload) {
    throw new Error('No SVM execution payload found');
  }

  return {
    chainId: ChainId.SOLANA,
    transaction: [
      serializeVersionedTxn(removeLiquidityFromVaultTxn),
      ...quote.svmExecutionPayload,
    ],
  };
};

const getEvmRebalancingTxns = async (
  env: ENVIRONMENT,
  networkIn: ChainId,
  networkOut: ChainId,
  amount: string,
  quote: QuoteResponse,
  rpcUrls: { [chain: number]: string[] },
): Promise<{
  chainId: number;
  transaction: string[] | EvmArbitraryCall;
}> => {
  const vault = new GeniusEvmVault(networkIn, env, rpcUrls);

  if (!quote.evmExecutionPayload) {
    throw new Error('No EVM execution payload found');
  }

  const txnData = await vault.prepRebalanceLiquidity(
    amount,
    networkOut,
    quote.evmExecutionPayload.transactionData.data,
    quote.evmExecutionPayload.transactionData.to,
  );

  return {
    chainId: networkIn,
    transaction: {
      ...txnData,
      value: quote.evmExecutionPayload.transactionData.value || '0',
    },
  };
};
