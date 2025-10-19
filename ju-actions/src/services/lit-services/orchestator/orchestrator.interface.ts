export interface IOrchestrator {
  getOrchestratorPrivateKey(
    ciphertext: string,
    dataToEncryptHash: string,
  ): Promise<string>;
}
