import { config } from 'dotenv';
import { IOrchestrator } from './orchestrator.interface';

config();

export class OrchestratorNoDecrypt implements IOrchestrator {
  async getOrchestratorPrivateKey(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ciphertext: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataToEncryptHash: string,
  ): Promise<string> {
    return process.env.ORCHESTRATOR_PK || '';
  }
}
