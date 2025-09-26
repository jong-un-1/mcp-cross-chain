import { AccessControlConditions } from '@lit-protocol/types';
import { EncryptedData } from '../../../types/encrypted-data';

export interface RunOnceConfig {
  waitForResponse: boolean;
  name: string;
}

export interface ILitHelpers {
  runOnce: (
    config: RunOnceConfig,
    fn: () => Promise<string | undefined>,
  ) => Promise<string | undefined>;

  decryptMessage: (
    encryptedMessage: EncryptedData,
    access: AccessControlConditions,
  ) => Promise<string | undefined>;
}
