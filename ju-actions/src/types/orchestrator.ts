import { IRelayPKP } from '@lit-protocol/types';

export interface IExtendedRelayPKP extends IRelayPKP {
  hexTokenId?: string;
  ciphertext: string;
  solanaAddress: string;
  dataToEncryptHash: string;
  ethAddress: string;
  additionalEthAddress?: string;
  additionalEthAddressDataToEncryptHash?: string;
  additionalEthAddressCiphertext?: string;
}
