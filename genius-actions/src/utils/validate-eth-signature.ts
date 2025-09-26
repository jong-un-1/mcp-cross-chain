import { ethers } from 'ethers';

export const validateEthSignature = (
  message: string | ethers.Bytes,
  signature: string,
  address: string,
): boolean => {
  console.log(
    `Validating signature: ${signature} against address ${address} for message: ${message}`,
  );
  console.log(`Message hash: ${ethers.utils.hashMessage(message)}`);
  const recoveredAddress = ethers.utils.verifyMessage(message, signature);
  console.log(`Recovered address: ${recoveredAddress}`);
  return recoveredAddress.toLowerCase() === address.toLowerCase();
};
