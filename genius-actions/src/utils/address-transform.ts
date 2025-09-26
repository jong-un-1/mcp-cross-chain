import { CHAIN_TYPE } from '../types/chain-id';
import { utils } from 'ethers';
/**
 * Converts a bytes32 value to an Ethereum address
 * @param _input The bytes32 input value
 * @returns The converted Ethereum address
 */
export const bytes32ToAddress = (_input: string): string => {
  // Convert bytes32 string to BigInt for bitwise operations
  const inputBigInt = BigInt(_input);

  // Check if first 12 bytes are zero by shifting right 160 bits and checking upper bits
  const upperBits = inputBigInt >> 160n;
  if (upperBits !== 0n) {
    throw new Error('First 12 bytes must be zero');
  }

  // Extract last 20 bytes (160 bits) for the address
  const addressBigInt = BigInt(inputBigInt & ((1n << 160n) - 1n));

  // Convert to hex string and ensure proper formatting
  const addressHex = addressBigInt.toString(16).padStart(40, '0');
  return `0x${addressHex}`;
};

/**
 * Converts an Ethereum address to bytes32 format
 * @param _input The Ethereum address
 * @returns The bytes32 representation
 */
export const addressToBytes32 = (_input: string): string => {
  // Remove '0x' prefix if present
  const cleanAddress = _input.replace('0x', '');

  // Convert address to BigInt
  const addressBigInt = BigInt(`0x${cleanAddress}`);

  // Convert to bytes32 (pad to 32 bytes/64 chars)
  const bytes32Hex = addressBigInt.toString(16).padStart(64, '0');
  return `0x${bytes32Hex}`;
};

export const isSolanaAddress = (address: string): boolean => {
  // Regular expression for Solana addresses (base58 encoding, 32-44 characters)
  const solanaRegex = /^[a-zA-Z0-9]{32,44}$/;
  return solanaRegex.test(address);
};

export const validateSolanaAddress = (address: string): void => {
  if (!isSolanaAddress(address)) {
    throw new Error('Invalid Solana address');
  }
};

export const isEthAddress = (address: string): boolean => {
  // Regular expression for Ethereum addresses
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethRegex.test(address);
};

export const validateEthAddress = (address: string): void => {
  if (!isEthAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }
};

export const formatAddress = (address: string): string => {
  const addressType = identifyAddress(address);
  if (!addressType) throw new Error(`Invalid address ${address}`);
  else if (addressType === CHAIN_TYPE.EVM)
    return utils.getAddress(address.toLowerCase());
  else return address;
};

export const identifyAddress = (address: string): false | CHAIN_TYPE => {
  // Check if the input is a string
  if (typeof address !== 'string') {
    return false;
  }

  if (isEthAddress(address)) return CHAIN_TYPE.EVM;
  else if (isSolanaAddress(address)) return CHAIN_TYPE.SOLANA;
  else return false;
};
