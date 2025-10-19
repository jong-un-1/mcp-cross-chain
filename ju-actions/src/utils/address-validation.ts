import { PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';

export const validateAddress = (address: string): void => {
  validateSolanaAddressOnCurve(address);
  validateAndChecksumEvmddress(address);
};

export const isSolanaAddressOnCurve = (address: string): boolean => {
  try {
    console.log('address=>', address);
    validateSolanaAddressOnCurve(address);
    return true;
  } catch {
    return false;
  }
};

export const isEvmAddressValid = (address: string): boolean => {
  try {
    validateAndChecksumEvmddress(address);
    return true;
  } catch {
    return false;
  }
};

export const validateSolanaAddress = (address: string): void => {
  try {
    PublicKey.isOnCurve(new PublicKey(address));
  } catch {
    throw new Error(`${address} is not a valid SOLANA address.`);
  }
};

export const validateSolanaAddressOnCurve = (address: string): void => {
  try {
    const isOnCurve = PublicKey.isOnCurve(new PublicKey(address));
    if (!isOnCurve) throw new Error(`${address} is not on ed25519 curve.`);
  } catch {
    throw new Error(`${address} is not a valid solana PublicKey.`);
  }
};

export const validateAndChecksumEvmddress = (address: string): string => {
  const result = ethers.utils.getAddress(address.toLowerCase());
  if (!result) throw new Error(`${address} is not a valid EVM address.`);
  else return result;
};
