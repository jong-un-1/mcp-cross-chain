import { ChainId } from '../types/chain-id';

export const GENIUS_VAULT_ADR_STAGING = (chainId: ChainId): string => {
  switch (chainId) {
    case ChainId.BASE:
      return '0x862915858D2a5271F421c5D86096725F1551D3ba';
    case ChainId.OPTIMISM:
      return '0x74501B8EA784300C1f2330c704A36d01c16Fa676';
    case ChainId.ARBITRUM:
      return '0xB8C75a235257123bBA47D8F4f1c77eC8740Ba423';
    case ChainId.AVALANCHE:
      return '0xea5834d87C3C9c12c2453114FF52e59DBc05b820';
    case ChainId.ETHEREUM:
      return '0x5B246B77A398E50d1647D85A6cfD2D6B8B57485f';
    case ChainId.BSC:
      return '0xe2ae7327cBC79aBCe7956B68Dc0D74aba3C93892';
    case ChainId.POLYGON:
      return '0xc1e979934e3920d869e19f7d81aE309da9A5e5e1';
    case ChainId.SONIC:
      return '0xB820A29D82aD13b4B2aD8BF77ae586A13caa00DA';
  }
  throw new Error(`No Genius Vault address found for chainId: ${chainId}`);
};

export const GENIUS_PROXY_CALL_ADR_STAGING = (chainId: ChainId): string => {
  switch (chainId) {
    case ChainId.BASE:
      return '0x98A36D5e077f9851b2497a6d7153482E3811b245';
    case ChainId.OPTIMISM:
      return '0x9C781d6413980fC6a8D1afdb4cf3a462b6324C4a';
    case ChainId.ARBITRUM:
      return '0x039c52281b97Eb83C49FcD42f3FF6d63b0a89Ea2';
    case ChainId.AVALANCHE:
      return '0x54903D40Cb080AF0eAd69f5e940F09B6C4cD66bc';
    case ChainId.ETHEREUM:
      return '0xb905133BaD23648D38e1C6d83612BCbc15E4D248';
    case ChainId.BSC:
      return '0x2dA0Ebc116Dd872201c16D90C9302D6B86426b18';
    case ChainId.POLYGON:
      return '0xf29010BE09A27eD65f9e893547C4338EDae54211';
    case ChainId.SONIC:
      return '0x69017CAF9655c8d54cFBF6b030E3e2f02baB7268';
  }
  throw new Error(`No Genius Proxy Call address found for chainId: ${chainId}`);
};

export const STABLECOIN_ADR_STAGING = (chainId: ChainId): string => {
  switch (chainId) {
    case ChainId.BASE:
      return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    case ChainId.OPTIMISM:
      return '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
    case ChainId.ARBITRUM:
      return '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    case ChainId.AVALANCHE:
      return '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
    case ChainId.ETHEREUM:
      return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    case ChainId.BSC:
      return '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';
    case ChainId.POLYGON:
      return '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';
    case ChainId.SONIC:
      return '0x29219dd400f2Bf60E5a23d13Be72B486D4038894';
    case ChainId.SOLANA:
      return 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  }
  throw new Error(`No Stablecoin address found for chainId: ${chainId}`);
};

export const GENIUS_ACTIONS_STAGING = {
  address: '0xFd2Df4fdCd2bFB6930062364C65E65Dee70F4E4b',
  chain: ChainId.BASE,
};
