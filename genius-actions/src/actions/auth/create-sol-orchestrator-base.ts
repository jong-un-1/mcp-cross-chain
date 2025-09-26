import { Keypair } from '@solana/web3.js';
import { AccessControlConditions } from '@lit-protocol/types';

import bs58 from 'bs58';
import { IEncryptor } from '../../services/lit-services/encryptor/encryptor.interface';

export const createOrchestratorBase = async (
  encryptor: IEncryptor,
  ipfsHashs: string[],
): Promise<{
  publicKey: string;
  ciphertext: string;
  dataToEncryptHash: string;
}> => {
  // Create a new random Solana keypair
  const orchestrator = Keypair.generate();
  const orchestratorSecretKey = bs58.encode(orchestrator.secretKey);

  // Define access control conditions specific to Solana
  const accessControlPkOnlyAuthorizedAction: AccessControlConditions = [];

  for (const ipfsHash of ipfsHashs) {
    if (accessControlPkOnlyAuthorizedAction.length > 0) {
      accessControlPkOnlyAuthorizedAction.push({
        operator: 'or',
      });
    }
    accessControlPkOnlyAuthorizedAction.push({
      contractAddress: '',
      standardContractType: '',
      chain: 'ethereum',
      method: '',
      parameters: [':currentActionIpfsId'],
      returnValueTest: {
        comparator: '=',
        value: ipfsHash,
      },
    });
  }

  console.log(
    'accessControlPkOnlyAuthorizedAction=>',
    JSON.stringify(accessControlPkOnlyAuthorizedAction),
  );

  // Encrypt the private key with the provided encryptor
  const encryptedPk = await encryptor.encrypt(
    orchestratorSecretKey,
    accessControlPkOnlyAuthorizedAction,
  );

  return {
    publicKey: orchestrator.publicKey.toBase58(), // Convert to string for compatibility
    ...encryptedPk,
  };
};
