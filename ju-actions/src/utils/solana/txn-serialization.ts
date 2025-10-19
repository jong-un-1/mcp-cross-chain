import { VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

export const serializeVersionedTxn = (txn: VersionedTransaction): string => {
  return bs58.encode(txn.serialize());
};

export const deserializeVersionedTxn = (
  serializedTxn: string,
): VersionedTransaction => {
  return VersionedTransaction.deserialize(bs58.decode(serializedTxn));
};
