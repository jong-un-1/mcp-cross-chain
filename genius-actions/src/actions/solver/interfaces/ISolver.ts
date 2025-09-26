import { Order } from '../../../services/blockchain/vault/vault.types';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { OrderWithCalls } from './types';
import { SolanaSolverTxnData } from './types';

/**
 * Core Solver interface that all solver implementations must implement
 */
export interface ISolver {
  /**
   * Fill a batch of orders on a specific chain
   * @param orders The orders to fill
   * @returns Object containing chain ID and transaction data
   */
  fillOrderBatch(orders: OrderWithCalls[]): Promise<{
    chainId: number;
    transaction: SolanaSolverTxnData[] | EvmArbitraryCall;
  }>;

  /**
   * Verify order parameters
   * @param order Order to verify
   * @param arbitraryCall Optional arbitrary call data
   */
  verifyOrderParams(
    order: Order,
    arbitraryCall: EvmArbitraryCall | null,
    rpcs: { [chain: number]: string[] },
  ): Promise<void>;
}
