import { ethers } from 'ethers';
import {
  arrayify,
  hexlify,
  defaultAbiCoder,
  isAddress,
} from 'ethers/lib/utils';

interface MultiCallTransaction {
  target: string;
  value: string | number;
  data: string;
}

/**
 * Encodes multiple transactions into a single multicall transaction
 * @param transactions Array of transactions containing target address, value, and calldata
 * @returns Encoded bytes ready for multicall execution
 */
export function encodeMulticallTransaction(
  transactions: MultiCallTransaction[],
): string {
  // Validate input arrays
  if (!transactions.length) {
    throw new Error('Empty transaction array');
  }

  // Initialize empty byte array
  let encoded = '0x';

  // Encode each transaction
  for (const tx of transactions) {
    // Validate address
    if (!isAddress(tx.target)) {
      throw new Error(`Invalid target address: ${tx.target}`);
    }

    // Convert value to BigNumber and validate
    const value = ethers.BigNumber.from(tx.value);
    if (value.isNegative()) {
      throw new Error('Value cannot be negative');
    }

    // Validate data
    if (!tx.data.startsWith('0x')) {
      throw new Error('Data must be hex string starting with 0x');
    }

    // Remove '0x' prefix from data for length calculation
    const data = tx.data.slice(2);
    const dataLength = data.length / 2; // Convert hex string length to byte length

    // Encode components:
    // 1. operation (0 for call) - 1 byte
    // 2. target address - 20 bytes
    // 3. value - 32 bytes
    // 4. data length - 32 bytes
    // 5. data - dynamic length
    const encodedParts = [
      '0x00', // operation (0 for call)
      tx.target,
      hexlify(ethers.utils.zeroPad(hexlify(value), 32)),
      hexlify(ethers.utils.zeroPad(hexlify(dataLength), 32)),
      tx.data,
    ];

    encoded = hexlify(
      ethers.utils.concat([
        arrayify(encoded),
        ...encodedParts.map((part) => arrayify(part)),
      ]),
    );
  }

  // Encode with multiSend selector
  const multiSendSelector = '0x8d80ff0a'; // keccak256('multiSend(bytes)')

  // Encode the final data with the selector and encoded transactions
  const data = hexlify(
    ethers.utils.concat([
      arrayify(multiSendSelector),
      arrayify(defaultAbiCoder.encode(['bytes'], [encoded])),
    ]),
  );

  return data;
}

// Example usage:
/*
const transactions = [
  {
    target: '0x1234567890123456789012345678901234567890',
    value: '1000000000000000000', // 1 ETH
    data: '0x123456'
  }
];

const encodedData = encodeMulticallTransaction(transactions);
*/
