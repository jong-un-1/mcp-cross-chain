import { ChainId } from '../types/chain-id';
import { ENVIRONMENT } from '../types/environment';
import {
  GENIUS_VAULT_ADR_DEV,
  GENIUS_PROXY_CALL_ADR_DEV,
  STABLECOIN_ADR_DEV,
  GENIUS_ACTIONS_DEV,
} from './addresses-dev';
import {
  GENIUS_ACTIONS_STAGING,
  GENIUS_PROXY_CALL_ADR_STAGING,
  GENIUS_VAULT_ADR_STAGING,
  STABLECOIN_ADR_STAGING,
} from './addresses-staging';

export const OWNER_ADR_EVM = (env: ENVIRONMENT): string => {
  if (env === ENVIRONMENT.DEV)
    return '0x5CC11Ef1DE86c5E00259a463Ac3F3AE1A0fA2909';
  else if (env === ENVIRONMENT.STAGING)
    return '0x5CC11Ef1DE86c5E00259a463Ac3F3AE1A0fA2909';
  throw new Error(`No owner address found for environment: ${env}`);
};

export const EXECUTOR_ADR_EVM = (env: ENVIRONMENT): string => {
  if (env === ENVIRONMENT.DEV)
    return '0x9cF35D7f611132ef0087DB95AEc6eEF8aE0E6972';
  else if (env === ENVIRONMENT.STAGING)
    return '0x9cF35D7f611132ef0087DB95AEc6eEF8aE0E6972';
  throw new Error(`No executor address found for environment: ${env}`);
};

export const SOLANA_OWNER_ADR = (env: ENVIRONMENT): string => {
  if (env === ENVIRONMENT.DEV)
    return '7Lw8XGW5r2xRv2yZgMChonNPLE9mPoq1AjhXZw5Qrkbp';
  else if (env === ENVIRONMENT.STAGING)
    return 'C7uBcCgpTqAVYqJWuyir9AD1f72G3c1LLrfKWpDxZ4fL';
  throw new Error(`No owner address found for environment: ${env}`);
};

export const MULTICALL3_ADR = (chainId: ChainId): string => {
  switch (chainId) {
    case ChainId.BASE:
    case ChainId.OPTIMISM:
    case ChainId.ARBITRUM:
    case ChainId.BSC:
    case ChainId.AVALANCHE:
    case ChainId.ETHEREUM:
    case ChainId.SONIC:
    case ChainId.POLYGON:
      return '0xcA11bde05977b3631167028862bE2a173976CA11';
  }
  throw new Error(`No MULTICALL3 address found for chainId: ${chainId}`);
};

export const GENIUS_VAULT_ADR = (
  chainId: ChainId,
  env: ENVIRONMENT,
): string => {
  switch (env) {
    case ENVIRONMENT.DEV:
      return GENIUS_VAULT_ADR_DEV(chainId);
    case ENVIRONMENT.STAGING:
      return GENIUS_VAULT_ADR_STAGING(chainId);
  }
  throw new Error(`Environment not found: ${env}`);
};

export const GENIUS_PROXY_CALL_ADR = (
  chainId: ChainId,
  env: ENVIRONMENT,
): string => {
  switch (env) {
    case ENVIRONMENT.DEV:
      return GENIUS_PROXY_CALL_ADR_DEV(chainId);
    case ENVIRONMENT.STAGING:
      return GENIUS_PROXY_CALL_ADR_STAGING(chainId);
  }
  throw new Error(`Environment not found: ${env}`);
};

export const STABLECOIN_ADR = (chainId: ChainId, env: ENVIRONMENT): string => {
  switch (env) {
    case ENVIRONMENT.DEV:
      return STABLECOIN_ADR_DEV(chainId);
    case ENVIRONMENT.STAGING:
      return STABLECOIN_ADR_STAGING(chainId);
  }
  throw new Error(`No stablecoin address found for chainId: ${chainId}`);
};

export const PERMIT2_ADR = (chainId: ChainId): string => {
  switch (chainId) {
    case ChainId.BASE:
    case ChainId.OPTIMISM:
    case ChainId.ARBITRUM:
    case ChainId.BSC:
    case ChainId.AVALANCHE:
      return '0x000000000022D473030F116dDEE9F6B43aC78BA3';
  }
  throw new Error(`No Permit2 address found for chainId: ${chainId}`);
};

export const GENIUS_SVM_POOL_ADR = (env: ENVIRONMENT): string => {
  switch (env) {
    case ENVIRONMENT.DEV:
      return '12sAiwLbrNJoL9pZCw9cfyK2GYv69Nh3gvPHSywEpfoZ';
    case ENVIRONMENT.STAGING:
      return 'A4pTmd31houG4UwNcZLVMUTjiQ9kYEf78TfKy8mVgDCR';
  }
  throw new Error(`Environment not found: ${env}`);
};

export const STABLECOIN_DECIMALS = (chainId: ChainId): number => {
  switch (chainId) {
    case ChainId.BSC:
      return 18;
    case ChainId.BASE:
    case ChainId.OPTIMISM:
    case ChainId.ARBITRUM:
    case ChainId.ETHEREUM:
    case ChainId.POLYGON:
    case ChainId.SONIC:
    case ChainId.AVALANCHE:
    case ChainId.SOLANA:
      return 6;
  }
  throw new Error(`No stablecoin decimals found for chainId: ${chainId}`);
};

export const GENIUS_API_URL = (env: ENVIRONMENT): string => {
  switch (env) {
    case ENVIRONMENT.DEV:
      return 'http://localhost:3002';
    case ENVIRONMENT.STAGING:
      return 'https:/genius.videau.io';
  }
  throw new Error(`Environment not found: ${env}`);
};

export const NATIVE_SOL = (): string => {
  return '11111111111111111111111111111111';
};

export const WRAPPED_SOL = (): string => {
  return 'So11111111111111111111111111111111111111112';
};

export const JUPITER_CONFIG = (): { uri: string } => {
  return {
    // uri: `https://jupiter-swap-api.quiknode.pro/${process.env.JUPITER_QUICKNODE_API_KEY}`,
    uri: `https://jupiter-swap-api.quiknode.pro/A66C9B4590C1`,
  };
};

export const SOLANA_USDC_ADDRESS =
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const SUPPORTED_CHAINS = [
  ChainId.BASE,
  ChainId.OPTIMISM,
  ChainId.SOLANA,
  ChainId.ARBITRUM,
  ChainId.AVALANCHE,
  ChainId.BSC,
  ChainId.SONIC,
  ChainId.ETHEREUM,
  ChainId.POLYGON,
];

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export const GENIUS_ACTIONS = (env: ENVIRONMENT) => {
  switch (env) {
    case ENVIRONMENT.DEV:
      return GENIUS_ACTIONS_DEV;
    case ENVIRONMENT.STAGING:
      return GENIUS_ACTIONS_STAGING;
  }
  throw new Error(`Environment not found: ${env}`);
};

export const REBALANCING_INSTRUCTIONS_SIGNER = (env: ENVIRONMENT): string => {
  if (env === ENVIRONMENT.DEV)
    return '0x8123268745b06abd40ec28afb346d8992345df87';
  else if (env === ENVIRONMENT.STAGING)
    return '0x30489947DF9E37D0d3a9f09B9f278461caafDE73';
  throw new Error(`No signer address found for environment: ${env}`);
};
