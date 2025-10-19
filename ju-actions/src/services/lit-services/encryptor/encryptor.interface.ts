export interface IEncryptor {
  encrypt(
    data: string,
    accessCondition: any[],
  ): Promise<{
    ciphertext: string;
    dataToEncryptHash: string;
  }>;
}
