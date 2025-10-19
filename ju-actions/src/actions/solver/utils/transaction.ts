import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { Order } from '../../../services/blockchain/vault/vault.types';
import { ADDRESS0 } from '../../../types/globals';
import { GeniusEvmVault } from '../../../services/blockchain/vault/genius-evm-vault';
import { ENVIRONMENT } from '../../../types/environment';

/**
 * Prepare EVM order batch transaction
 *
 * @param orders Orders to process
 * @param chainId Destination chain ID
 * @param env Current environment
 * @returns Transaction data
 */
export const prepareEvmOrderBatchTransaction = async (
  orders: Order[],
  chainId: number,
  env: ENVIRONMENT,
): Promise<EvmArbitraryCall> => {
  const targetVault = new GeniusEvmVault(chainId, env, {});

  return targetVault.prepFillOrderBatch({
    orders,
    swapsTargets: orders.map((order: any) =>
      order.swapCall ? order.swapCall.to : ADDRESS0,
    ),
    swapsData: orders.map((order: any) =>
      order.swapCall ? order.swapCall.data : '0x',
    ),
    callsTargets: orders.map((order: any) =>
      order.arbitraryCall ? order.arbitraryCall.to : ADDRESS0,
    ),
    callsData: orders.map((order: any) =>
      order.arbitraryCall ? order.arbitraryCall.data : '0x',
    ),
  });
};
