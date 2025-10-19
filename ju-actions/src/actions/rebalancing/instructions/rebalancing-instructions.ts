import { ChainId } from '../../../types/chain-id';
import { ENVIRONMENT } from '../../../types/environment';
import {
  SUPPORTED_CHAINS,
  STABLECOIN_ADR,
  STABLECOIN_DECIMALS,
} from '../../../utils/addresses';
import { RebalancingInstructions, VaultData } from '../rebalancing.types';
import { computeRebalancing } from './compute-rebalancing';
import { SignedResponse } from '../../../types/signed-response';
import { encodeSignature } from '../../../utils/encode-signature';
import { GeniusEvmVault } from '../../../services/blockchain/vault/genius-evm-vault';
import { GeniusSvmPool } from '../../../services/blockchain/vault/genius-solana-pool';
import { IExecutionHandler } from '../../../services/lit-services/execution-handler/execution-handler.interface';
import { ILitHelpers } from '../../../services/lit-services/lit-helpers/lit-helpers.interface';

/**
 * Rebalancing Action
 *
 * @param {ENVIRONMENT} env
 * @param {}
 *
 */
export const rebalancingInstructions = async (
  executionHandler: IExecutionHandler,
  litHelpers: ILitHelpers,
  rpcUrls: { [chain: number]: string[] },
  env: ENVIRONMENT,
  topHoldersAddresses: { [chainId: string]: string },
  ratios?: number[],
): Promise<SignedResponse<RebalancingInstructions>> => {
  console.log(`Fetching vaults data at ${new Date().getTime()}`);
  const vaults = await Promise.all(
    SUPPORTED_CHAINS.map((chainId) =>
      fetchVaultData(chainId, topHoldersAddresses[chainId], env, rpcUrls),
    ),
  );
  console.log('Vaults: ', vaults);

  const rebalanceActions = computeRebalancing(vaults, ratios);

  console.log('Rebalance actions: ', rebalanceActions);

  const timestamp = await litHelpers.runOnce(
    {
      name: 'getTimestamp',
      waitForResponse: true,
    },
    () => {
      return new Promise<string>((resolve) => {
        resolve(new Date().getTime().toString());
      });
    },
  );

  console.log(`Timestamp fetched with run once: ${timestamp}`);

  if (!timestamp) throw new Error('Timestamp not found');

  const finalAvailableBalances: { [chainId: string]: string } = {};
  vaults.forEach((vault) => {
    finalAvailableBalances[vault.network] = vault.availableBalance.toString();
  });

  const data: RebalancingInstructions = {
    actions: rebalanceActions.actions,
    finalAvailableBalances,
    timestamp: parseInt(timestamp),
    env,
  };

  const dataStringified = JSON.stringify(data);
  console.log(
    `Data stringified: ${dataStringified} at ${new Date().getTime()}`,
  );
  const signature = await executionHandler.signEvm(dataStringified);

  return {
    data,
    dataStringified,
    signature: encodeSignature(signature),
  };
};

const fetchVaultData = async (
  chainId: ChainId,
  topHolderAdr: string | null,
  env: ENVIRONMENT,
  rpcUrls: { [chain: number]: string[] },
): Promise<VaultData> => {
  if (chainId === ChainId.SOLANA) {
    const svmPool = new GeniusSvmPool(rpcUrls[ChainId.SOLANA], env);
    const [stablecoinBalance, availableBalance] = await Promise.all([
      svmPool.getStablecoinBalance(),
      svmPool.getAvailableLiquidity(),
    ]);
    return {
      network: chainId,
      stablecoin: STABLECOIN_ADR(chainId, env),
      decimals: STABLECOIN_DECIMALS(chainId),
      vaultBalance: BigInt(stablecoinBalance.amount),
      availableBalance: availableBalance,
      highestStakedAmount: BigInt(0),
    };
  } else {
    const vault = new GeniusEvmVault(chainId, env, rpcUrls);
    const [holderBalance, stablecoinBalance, availableBalance] =
      await Promise.all([
        (async () => {
          if (topHolderAdr) return await vault.balanceOf(topHolderAdr);
          else return null;
        })(),
        vault.stablecoinBalance(),
        vault.availableLiquidity(),
      ]);
    return {
      network: chainId,
      stablecoin: STABLECOIN_ADR(chainId, env),
      decimals: STABLECOIN_DECIMALS(chainId),
      vaultBalance: BigInt(stablecoinBalance.toString()),
      availableBalance: BigInt(availableBalance.toString()),
      highestStakedAmount: holderBalance
        ? BigInt(holderBalance.toString())
        : BigInt(0),
    };
  }
};
