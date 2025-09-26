import { Order } from '../../services/blockchain/vault/vault.types';
import { EvmArbitraryCall } from '../../types/evm-arbitrary-call';

export type OrderWithCalls = Order & {
  swapCall: EvmArbitraryCall | null;
  arbitraryCall: EvmArbitraryCall | null;
};

export type SolanaSolverTxnData = {
  txnsToExecute: string[];
  fallbackTxn: string;
};
