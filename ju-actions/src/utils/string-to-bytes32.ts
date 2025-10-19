import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

const hexStringToUint8Array = (hexString: string): Uint8Array => {
  // Pad the hex string to 64 characters (32 bytes) if it's shorter
  if (hexString.length < 64) {
    hexString = hexString.padStart(64, '0'); // Left-pad with zeros
  }

  // Validate that the hex string length is now 64 characters
  if (hexString.length !== 64) {
    throw new Error('Hex string must represent 32 bytes.');
  }

  // Convert the hex string to a buffer
  const buffer = Buffer.from(hexString, 'hex');

  // Ensure the result is always a 32-byte Uint8Array
  const res = new Uint8Array(32);
  res.set(buffer); // Copy the buffer's data into the 32-byte Uint8Array
  return res;
};

const solanaStringtoUint8Array = (str: string): Uint8Array => {
  const decodedBuffer = bs58.decode(str);

  // Validate the buffer length
  if (decodedBuffer.length > 32) {
    throw new Error('Decoded buffer exceeds 32 bytes.');
  }

  // Create a Uint8Array of size 32 and copy the buffer into it
  const res = new Uint8Array(32);
  res.set(decodedBuffer, 32 - decodedBuffer.length); // Right-align the data (padding at the start)

  return res;
};

export const stringToUint8Array = (str: string): Uint8Array => {
  // Remove the '0x' prefix if present
  if (str.startsWith('0x')) {
    str = str.slice(2);

    return hexStringToUint8Array(str);
  } else {
    return solanaStringtoUint8Array(str);
  }
};

export const stringToBytes32 = (str: string): number[] => {
  const uint8Array = stringToUint8Array(str);

  return [...uint8Array];
};

const uint8ArrayToHex = (uint8Array: Uint8Array) => {
  if (uint8Array.length !== 32) {
    throw new Error('Uint8Array must be 32 bytes long.');
  }

  // Convert the Uint8Array to a hex string and prepend '0x'
  const hexString =
    '0x' +
    Array.from(uint8Array)
      .map((byte) => byte.toString(16).padStart(2, '0')) // Convert each byte to a 2-character hex string
      .join(''); // Join all hex strings together

  return hexString;
};

const uint8ArrayToSolanaAddress = (arr: Uint8Array): string => {
  if (arr.length !== 32) {
    throw new Error('Uint8Array must be 32 bytes long.');
  }

  // Encode the Uint8Array into a Solana address string
  const solAddress = bs58.encode(arr);
  return solAddress;
};

export const uint8ArrayToStr = (uint8Array: Uint8Array, isHex = true) => {
  if (isHex) {
    return uint8ArrayToHex(uint8Array);
  } else {
    return uint8ArrayToSolanaAddress(uint8Array);
  }
};

export const bytesStringToDecodedString = (
  bytesStr: string,
  isHex = true,
): string => {
  try {
    // Parse the string into an array of numbers
    const bytes = JSON.parse(bytesStr);

    // Validate that the parsed value is an array of numbers with a length of 32
    if (
      !Array.isArray(bytes) ||
      bytes.length !== 32 ||
      !bytes.every((n) => typeof n === 'number')
    ) {
      throw new Error('Invalid bytes string format.');
    }

    // Convert the array to a Uint8Array
    const uint8Array = new Uint8Array(bytes);

    return uint8ArrayToStr(uint8Array, isHex);
  } catch (error) {
    throw new Error('Failed to parse and decode bytes string: ' + error);
  }
};

export const decodeSolanaEncodedTraderAddress = (
  encodedStr: string,
): string => {
  // Parse the string into an array of numbers
  const bytes = JSON.parse(encodedStr);

  // Validate that the parsed value is an array of numbers with a length of 32
  if (
    !Array.isArray(bytes) ||
    bytes.length !== 32 ||
    !bytes.every((n) => typeof n === 'number')
  ) {
    throw new Error('Invalid bytes string format.');
  }

  // Convert the array to a Uint8Array
  const uint8Array = new Uint8Array(bytes);

  const pubKey = new PublicKey(uint8Array);

  return pubKey.toBase58();
};

export const publicKeyToHex = (addr: string): string => {
  const pk = new PublicKey(addr);
  // Get the byte array of the public key
  const byteArray = pk.toBytes();
  // Convert to a 32-byte hex string
  return '0x' + Buffer.from(byteArray).toString('hex');
};

export const hexToPublicKey = (hexString: string): PublicKey => {
  // Remove the "0x" prefix if present
  const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  // Convert the hex string back to a Uint8Array
  const byteArray = Uint8Array.from(Buffer.from(cleanHex, 'hex'));
  // Create a PublicKey from the byte array
  return new PublicKey(byteArray);
};
export const uint32ToBufferLE = (value: number): Buffer => {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setUint32(0, value, true); // true for little-endian
  return Buffer.from(new Uint8Array(buffer));
};
