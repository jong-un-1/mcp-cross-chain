import { ChainId } from '../../src/types/chain-id';

export const chainStablecoinDecimals = (chainId: ChainId): number => {
  switch (chainId) {
    case ChainId.BASE:
      return 6;
    case ChainId.BSC:
      return 18;
    case ChainId.POLYGON:
      return 6;
    case ChainId.AVALANCHE:
      return 6;
    case ChainId.OPTIMISM:
      return 6;
    case ChainId.ARBITRUM:
      return 6;
    case ChainId.SOLANA:
      return 6;
    case ChainId.ETHEREUM:
      return 6;
    case ChainId.SONIC:
      return 6;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
};
