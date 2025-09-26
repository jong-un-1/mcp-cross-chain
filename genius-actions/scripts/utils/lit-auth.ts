import { Wallet, ethers } from 'ethers';
import { config } from 'dotenv';
import { AuthMethod, IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { getLitNodeClient } from './lit-client';
import { getWalletAuthSig } from './wallet-auth-sig';
import {
  AUTH_METHOD_TYPE,
  LIT_ABILITY,
  AUTH_METHOD_SCOPE,
} from '@lit-protocol/constants';
import { BaseProvider } from '@lit-protocol/lit-auth-client';
import { LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers';
import { LitRelay, EthWalletProvider } from '@lit-protocol/lit-auth-client';

config();

export const getExecutorSessionSigs = async (
  network: 'datil-dev' | 'datil-test',
): Promise<{
  sessionSigs: SessionSigs;
  pkps: IRelayPKP[];
}> => {
  const nodeClient = await getLitNodeClient(network, true);

  const relay = new LitRelay({ relayApiKey: process.env.LIT_RELAY_API_KEY });
  const authProvider = new EthWalletProvider({
    relay,
    litNodeClient: nodeClient,
  });

  // const litAuthClient = new LitAuthClient({
  //   litRelayConfig: {
  //     relayApiKey: process.env.LIT_RELAY_API_KEY,
  //   },
  //   debug: true,
  //   rpcUrl: process.env.LIT_RPC_URL,
  //   litNodeClient: nodeClient,
  // });

  // litAuthClient.initProvider(ProviderType.EthWallet);

  const provider = new ethers.providers.StaticJsonRpcProvider(
    process.env.LIT_RPC_URL,
  );
  const actionExecutor = new Wallet(process.env.EXECUTOR_PK || '', provider);

  const authSig = await getWalletAuthSig(actionExecutor);
  const authMethod = {
    authMethodType: AUTH_METHOD_TYPE.EthWallet,
    accessToken: JSON.stringify(authSig),
  };

  // const authProvider = litAuthClient.getProvider(ProviderType.EthWallet);

  if (!authProvider) throw new Error('No auth provider found');

  let pkps = await authProvider.fetchPKPs(authMethod);

  if (pkps.length === 0) {
    const options = {
      permittedAuthMethodScopes: [[AUTH_METHOD_SCOPE.SignAnything]],
    };

    await authProvider.mintPKPThroughRelayer(authMethod, options);

    pkps = await authProvider.fetchPKPs(authMethod);
  }

  console.log('pkps=>', pkps);

  const sessionSigs = await nodeClient.getPkpSessionSigs({
    pkpPublicKey: pkps[0].publicKey,
    authMethods: [authMethod],
    expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    resourceAbilityRequests: [
      {
        resource: new LitPKPResource('*'),
        ability: LIT_ABILITY.PKPSigning,
      },
      {
        resource: new LitActionResource('*'),
        ability: LIT_ABILITY.LitActionExecution,
      },
    ],
  });
  return { sessionSigs, pkps };
};

export const mintPkp = async (
  authMethod: AuthMethod,
  provider: BaseProvider,
): Promise<void> => {
  const options = {
    permittedAuthMethodScopes: [[AUTH_METHOD_SCOPE.SignAnything]],
  };
  // Mint PKP using the auth method
  await provider.mintPKPThroughRelayer(authMethod, options);
};

export const fetchPkps = async (
  authMethod: AuthMethod,
  provider: BaseProvider,
): Promise<IRelayPKP[]> => {
  return await provider.fetchPKPsThroughRelayer(authMethod);
};

// const LIT_ACTION = fs.readFileSync(path, 'utf8');

// AddLitActionAuth(LIT_ACTION);
