import { AccessControlConditions } from '@lit-protocol/types';
import { EncryptedData } from '../../types/encrypted-data';
import { RPC_URLS } from '../rpcs';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { EnvVars } from '../../types/env-vars';
import { LitHelpers } from '../../services/lit-services/lit-helpers/lit-helpers';

export const actionInit = async (
  orchestratorSolana: EncryptedData | null,
  envVars: EnvVars,
  accessControl: AccessControlConditions,
): Promise<{
  orchestratorSolanaPk?: string;
  rpcUrls: { [chainId: number]: string[] };
}> => {
  const litHelpers = new LitHelpers();

  console.log('Trying to decrypt orchestrator solana pk');

  const getOrchestratorSolanaPk = async () => {
    if (orchestratorSolana && accessControl)
      return litHelpers.decryptMessage(orchestratorSolana, accessControl);
    else return undefined;
  };

  console.log('Decrypting orchestrator solana pk and env');

  const [orchestratorSolanaPk] = await Promise.all([getOrchestratorSolanaPk()]);

  if (orchestratorSolanaPk) {
    const keypair = Keypair.fromSecretKey(
      bs58.decode(orchestratorSolanaPk || ''),
    );

    console.log(
      `Successfully decrypted orchestrator solana pk of: ${keypair.publicKey.toString()}`,
    );
  }

  const rpcUrls = RPC_URLS(envVars);

  return {
    orchestratorSolanaPk,
    rpcUrls,
  };
};
