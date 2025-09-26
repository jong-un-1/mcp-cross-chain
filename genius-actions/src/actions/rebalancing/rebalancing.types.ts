import { ChainId } from '../../types/chain-id';
import { ENVIRONMENT } from '../../types/environment';

export interface VaultData {
  network: ChainId;
  stablecoin: string;
  decimals: number;
  vaultBalance: bigint;
  availableBalance: bigint;
  highestStakedAmount: bigint;
}

export interface RebalanceAction {
  sourceNetwork: ChainId;
  targetNetwork: ChainId;
  amount: string;
}

export type RebalancingInstructions = {
  actions: RebalanceAction[];
  finalAvailableBalances: { [chainId: string]: string };
  timestamp: number;
  env: ENVIRONMENT;
};
