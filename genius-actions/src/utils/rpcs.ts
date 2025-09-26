import { ChainId } from '../types/chain-id';

export const RPC_URLS = (
  env: { [key: string]: string | undefined } = {},
): { [chain: number]: string[] } => {
  // BASE
  const rpcs: { [chain: number]: string[] } = {};
  rpcs[ChainId.BASE] = [];
  if (env.QUICKNODE_BASE_KEY && env.QUICKNODE_BASE_ENDPOINT)
    rpcs[ChainId.BASE].push(
      `https://${env.QUICKNODE_BASE_ENDPOINT}.quiknode.pro/${env.QUICKNODE_BASE_KEY}/`,
    );
  if (env.ALCHEMY_API_KEY)
    rpcs[ChainId.BASE].push(
      `https://base-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}/`,
    );
  rpcs[ChainId.BASE] = [
    ...rpcs[ChainId.BASE],
    'https://base-pokt.nodies.app',
    'https://base.drpc.org',
    'https://base.meowrpc.com',
  ];

  // OPTIMISM
  rpcs[ChainId.OPTIMISM] = [];
  if (env.QUICKNODE_OPTIMISM_KEY && env.QUICKNODE_OPTIMISM_ENDPOINT)
    rpcs[ChainId.OPTIMISM].push(
      `https://${env.QUICKNODE_OPTIMISM_ENDPOINT}.quiknode.pro/${env.QUICKNODE_OPTIMISM_KEY}/`,
    );
  if (env.ALCHEMY_API_KEY)
    rpcs[ChainId.OPTIMISM].push(
      `https://opt-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}/`,
    );
  rpcs[ChainId.OPTIMISM] = [
    ...rpcs[ChainId.OPTIMISM],
    'https://optimism.llamarpc.com',
    'https://op-pokt.nodies.app',
    'https://optimism.drpc.org',
    'https://mainnet.optimism.io',
  ];

  // ARBITRUM
  rpcs[ChainId.ARBITRUM] = [];
  if (env.QUICKNODE_ARBITRUM_KEY && env.QUICKNODE_ARBITRUM_ENDPOINT)
    rpcs[ChainId.ARBITRUM].push(
      `https://${env.QUICKNODE_ARBITRUM_ENDPOINT}.quiknode.pro/${env.QUICKNODE_ARBITRUM_KEY}/`,
    );
  if (env.ALCHEMY_API_KEY)
    rpcs[ChainId.ARBITRUM].push(
      `https://arb-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}/`,
    );
  rpcs[ChainId.ARBITRUM] = [
    ...rpcs[ChainId.ARBITRUM],
    'https://arbitrum-one-rpc.publicnode.com',
    'https://endpoints.omniatech.io/v1/arbitrum/one/public',
    'https://arbitrum.llamarpc.com',
    'https://1rpc.io/arb',
  ];

  // BSC
  rpcs[ChainId.BSC] = [];
  if (env.QUICKNODE_BSC_KEY && env.QUICKNODE_BSC_ENDPOINT)
    rpcs[ChainId.BSC].push(
      `https://${env.QUICKNODE_BSC_ENDPOINT}.quiknode.pro/${env.QUICKNODE_BSC_KEY}/`,
    );
  if (env.ALCHEMY_API_KEY)
    rpcs[ChainId.BSC].push(
      `https://bnb-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}/`,
    );
  rpcs[ChainId.BSC] = [
    ...rpcs[ChainId.BSC],
    'https://bsc.blockrazor.xyz',
    'https://rpc.ankr.com/bsc',
    'https://bsc-pokt.nodies.app',
    'https://bsc.meowrpc.com',
    'https://1rpc.io/bnb',
  ];

  // AVALANCHE
  rpcs[ChainId.AVALANCHE] = [];
  if (env.QUICKNODE_AVALANCHE_KEY && env.QUICKNODE_AVALANCHE_ENDPOINT)
    rpcs[ChainId.AVALANCHE].push(
      `https://${env.QUICKNODE_AVALANCHE_ENDPOINT}.quiknode.pro/${env.QUICKNODE_AVALANCHE_KEY}/`,
    );
  if (env.ALCHEMY_API_KEY)
    rpcs[ChainId.AVALANCHE].push(
      `https://avax-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}/`,
    );
  rpcs[ChainId.AVALANCHE] = [
    ...rpcs[ChainId.AVALANCHE],
    'https://avax.meowrpc.com',
    'https://1rpc.io/avax/c',
    'https://avalanche-c-chain-rpc.publicnode.com',
    'https://avalanche.public-rpc.com',
    'https://avalanche.drpc.org',
  ];

  // ETHEREUM
  rpcs[ChainId.ETHEREUM] = [];
  if (env.QUICKNODE_ETHEREUM_KEY && env.QUICKNODE_ETHEREUM_ENDPOINT)
    rpcs[ChainId.ETHEREUM].push(
      `https://${env.QUICKNODE_ETHEREUM_ENDPOINT}.quiknode.pro/${env.QUICKNODE_ETHEREUM_KEY}/`,
    );
  if (env.ALCHEMY_API_KEY)
    rpcs[ChainId.ETHEREUM].push(
      `https://eth-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}/`,
    );
  rpcs[ChainId.ETHEREUM] = [
    ...rpcs[ChainId.ETHEREUM],
    'https://eth.llamarpc.com',
    'https://eth.blockrazor.xyz',
    'https://1rpc.io/eth',
  ];

  // POLYGON
  rpcs[ChainId.POLYGON] = [];
  if (env.QUICKNODE_POLYGON_KEY && env.QUICKNODE_POLYGON_ENDPOINT)
    rpcs[ChainId.POLYGON].push(
      `https://${env.QUICKNODE_POLYGON_ENDPOINT}.quiknode.pro/${env.QUICKNODE_POLYGON_KEY}/`,
    );
  if (env.ALCHEMY_API_KEY)
    rpcs[ChainId.POLYGON].push(
      `https://polygon-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}/`,
    );
  rpcs[ChainId.POLYGON] = [
    ...rpcs[ChainId.POLYGON],
    'https://polygon.llamarpc.com',
    'https://polygon.drpc.org',
    'https://polygon-pokt.nodies.app',
    'https://1rpc.io/matic',
  ];

  // SONIC
  rpcs[ChainId.SONIC] = [];
  if (env.ALCHEMY_API_KEY)
    rpcs[ChainId.SONIC].push(
      `https://sonic-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}/`,
    );
  rpcs[ChainId.SONIC] = [
    ...rpcs[ChainId.SONIC],
    'https://sonic.drpc.org',
    'https://rpc.soniclabs.com',
  ];

  // SOLANA
  rpcs[ChainId.SOLANA] = [];
  if (env.HELIUS_API_KEY)
    rpcs[ChainId.SOLANA].push(
      `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`,
    );
  rpcs[ChainId.SOLANA] = [
    ...rpcs[ChainId.SOLANA],
    'https://api.mainnet-beta.solana.com',
  ];

  return rpcs;
};

export const JITO_RPC_URLS = (
  env: { [key: string]: string | undefined } = {},
): string[] => {
  // JITO
  const jitoRpcs: string[] = [];
  if (env.QUICKNODE_JITO_KEY && env.QUICKNODE_JITO_ENDPOINT)
    jitoRpcs.push(
      `https://${env.QUICKNODE_JITO_ENDPOINT}.quiknode.pro/${env.QUICKNODE_JITO_KEY}/`,
    );
  return jitoRpcs;
};
