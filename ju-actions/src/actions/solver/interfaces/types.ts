import { Order } from '../../../services/blockchain/vault/vault.types';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';

/**
 * Order with optional swap and arbitrary call data
 */
export type OrderWithCalls = Order & {
  swapCall: EvmArbitraryCall | null;
  arbitraryCall: EvmArbitraryCall | null;
};

/**
 * Solana-specific transaction data
 */
export type SolanaSolverTxnData = {
  txnsToExecute: string[];
  fallbackTxn?: string;
};
