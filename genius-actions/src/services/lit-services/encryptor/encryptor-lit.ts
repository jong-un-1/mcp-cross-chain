// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { IEncryptor } from './encryptor.interface';

export class EncryptorLit implements IEncryptor {
  async encrypt(
    toEncrypt: string,
    accessCondition: any[],
  ): Promise<{
    ciphertext: string;
    dataToEncryptHash: string;
  }> {
    const utf8Encode = new TextEncoder();
    const encodedData = utf8Encode.encode(toEncrypt);

    try {
      const { ciphertext, dataToEncryptHash } = await Lit.Actions.encrypt({
        accessControlConditions: accessCondition,
        to_encrypt: encodedData,
      });
      return {
        ciphertext,
        dataToEncryptHash,
      };
    } catch (e: any) {
      console.log('error: ', e);
      return JSON.stringify({
        message: e.message,
        note: 'Error in encrypting the private key.',
      });
    }
  }
}
