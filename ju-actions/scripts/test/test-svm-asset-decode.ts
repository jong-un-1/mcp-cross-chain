import { config } from 'dotenv';
import { ENVIRONMENT } from '../../src/types/environment';
import { GeniusSvmPool } from '../../src/services/blockchain/vault/genius-solana-pool';

config();

export const testSvmAssetDecode = async () => {
  const svmPool = new GeniusSvmPool(
    [`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`],
    ENVIRONMENT.DEV,
  );
  const [stablecoinBalance, availableBalance] = await Promise.all([
    svmPool.getStablecoinBalance(),
    svmPool.getAvailableLiquidity(),
  ]);

  console.log('Stablecoin Balance:', stablecoinBalance.toString());
  console.log('Available Liquidity:', availableBalance.toString());
};

testSvmAssetDecode();
