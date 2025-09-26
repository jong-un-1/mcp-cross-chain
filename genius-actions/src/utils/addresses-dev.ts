import { ChainId } from '../types/chain-id';

export const GENIUS_VAULT_ADR_DEV = (chainId: ChainId): string => {
  switch (chainId) {
    case ChainId.BASE:
      return '0x05167A214DBC6EBB561dABe07d78e542B1C372B2';
    case ChainId.OPTIMISM:
      return '0x3008e2B07E90b68108E4B2326856125f6Ef05535';
    case ChainId.ARBITRUM:
      return '0xB0C54E20c45D79013876DBD69EC4bec260f24F83';
    case ChainId.BSC:
      return '0x87D1Fc6EC47823593bc32108dA795A74C65d520B';
    case ChainId.AVALANCHE:
      return '0xD3eDbBaAE3A37b00Ea569aea91a63bbc25589189';
    case ChainId.ETHEREUM:
      return '0xD92243Cd4A97CC71E4B8b447D7Ad243EBdb31fc0';
    case ChainId.SONIC:
      return '0x9A24A2841d6fd518822C632e8b746f4c15A803f9';
    case ChainId.POLYGON:
      return '0xA3372621d29e65fb1853BbeF2D78f63db135A2c2';
  }
  throw new Error(`No Genius Vault address found for chainId: ${chainId}`);
};

export const GENIUS_PROXY_CALL_ADR_DEV = (chainId: ChainId): string => {
  switch (chainId) {
    case ChainId.BASE:
      return '0x2a2d18179721e4F67aC2f417259eDd9239196b62';
    case ChainId.OPTIMISM:
      return '0x8A1c0E832f60bf45bBB5DD777147706Ed5cB6602';
    case ChainId.ARBITRUM:
      return '0xc315ac7b54E50d5fa1eB3c84Dd516aFdfB07eeF4';
    case ChainId.BSC:
      return '0x808967E61B32E753C9916f75A3B62F156C1dccEF';
    case ChainId.AVALANCHE:
      return '0xFD905e4574Bc4225ce45C3ef89282201cBCcD685';
    case ChainId.ETHEREUM:
      return '0x4c542aA81Df4CA58A20e79c716045Be9D65994F9';
    case ChainId.SONIC:
      return '0x123F3DFb58c0AA5ba59CfA35B113522252Ee465A';
    case ChainId.POLYGON:
      return '0x90A7e0E1F2e97d8a4C558C6e47b3228517d0bED5';
  }
  throw new Error(`No Genius Proxy Call address found for chainId: ${chainId}`);
};

export const STABLECOIN_ADR_DEV = (chainId: ChainId): string => {
  switch (chainId) {
    case ChainId.BASE:
      return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    case ChainId.OPTIMISM:
      return '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85';
    case ChainId.ARBITRUM:
      return '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    case ChainId.BSC:
      return '0x55d398326f99059fF775485246999027B3197955';
    case ChainId.AVALANCHE:
      return '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
    case ChainId.SOLANA:
      return 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    case ChainId.ETHEREUM:
      return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    case ChainId.SONIC:
      return '0x29219dd400f2Bf60E5a23d13Be72B486D4038894';
    case ChainId.POLYGON:
      return '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
  }
  throw new Error(`No stablecoin address found for chainId: ${chainId}`);
};

export const GENIUS_ACTIONS_DEV = {
  address: '0x822DA52FBf82966A4bf573E5997F1b4487a92Ca6',
  chain: ChainId.BASE,
};
