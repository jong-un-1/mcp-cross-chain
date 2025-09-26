import { config } from 'dotenv';
import { PublicKey } from '@solana/web3.js';
import { AddressUtils } from '../../src/services/blockchain/vault/solana/svm-address-utils';
import { GeniusSvmPool } from '../../src/services/blockchain/vault/genius-solana-pool';
import { ENVIRONMENT } from '../../src/types/environment';

config();

const testOrderRead = async () => {
  const orderAdd = AddressUtils.getOrderAddress(
    '0x5f9892931765a2f1cb2a8d8a688e050a89a6ab1a459e049e513fdf0dce01e331',
    new PublicKey('A4pTmd31houG4UwNcZLVMUTjiQ9kYEf78TfKy8mVgDCR'),
  );

  console.log('order address', orderAdd.toBase58());

  const svmPool = new GeniusSvmPool(
    [`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`],
    ENVIRONMENT.STAGING,
  );
  const order = await svmPool.getOrder(
    '0x5f9892931765a2f1cb2a8d8a688e050a89a6ab1a459e049e513fdf0dce01e331',
  );
  console.log('order', order);

  const orderStatus = await svmPool.getOrderStatus(
    '0x5f9892931765a2f1cb2a8d8a688e050a89a6ab1a459e049e513fdf0dce01e331',
  );
  console.log('orderStatus', orderStatus);
};

testOrderRead();
