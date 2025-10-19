import { AccessControlConditions } from '@lit-protocol/types';
import { EncryptedData } from '../../../types/encrypted-data';
import { ILitHelpers, RunOnceConfig } from './lit-helpers.interface';

export class LitHelpersMock implements ILitHelpers {
  public async runOnce(
    config: RunOnceConfig,
    fn: () => Promise<string | undefined>,
  ): Promise<string | undefined> {
    return fn();
  }

  public async decryptMessage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    encryptedMessage: EncryptedData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    access: AccessControlConditions,
  ): Promise<string | undefined> {
    return undefined;
  }
}
