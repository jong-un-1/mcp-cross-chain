// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { AccessControlConditions } from '@lit-protocol/types';
import { EncryptedData } from '../../types/encrypted-data';
import { ILitHelpers, RunOnceConfig } from './lit-helpers.interface';

export class LitHelpers implements ILitHelpers {
  public async runOnce(
    config: RunOnceConfig,
    fn: () => Promise<string | undefined>,
  ): Promise<string | undefined> {
    console.log('Running once', config);
    const resp = await Lit.Actions.runOnce(config, fn);
    return resp || '';
  }

  public async decryptMessage(
    encryptedMessage: EncryptedData,
    access: AccessControlConditions,
  ): Promise<string | undefined> {
    try {
      return encryptedMessage && access
        ? await Lit.Actions.decryptAndCombine({
            accessControlConditions: access,
            ...encryptedMessage,
            authSig: null,
            chain: 'ethereum',
          })
        : undefined;
    } catch (error: any) {
      const errMessage = `Failed to decrypt ${JSON.stringify(encryptedMessage)} with ${JSON.stringify(access)}: ${error.message}`;
      console.error(errMessage);
      throw new Error(errMessage);
    }
  }
}
