import { AccessControlConditions } from '@lit-protocol/types';
import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { encryptString as litEncryptString } from '@lit-protocol/encryption';

import { webcrypto } from 'crypto';

// Polyfill for crypto
if (!global.crypto) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.crypto = webcrypto;
}

export const encryptString = async (
  message: string,
  conditions: AccessControlConditions,
  client: LitJsSdk.LitNodeClient,
): Promise<{
  ciphertext: string;
  dataToEncryptHash: string;
}> => {
  const { ciphertext, dataToEncryptHash } = await litEncryptString(
    {
      accessControlConditions: conditions,
      dataToEncrypt: message,
    },
    client,
  );

  // Return the ciphertext and dataToEncryptHash
  return {
    ciphertext,
    dataToEncryptHash,
  };
};
