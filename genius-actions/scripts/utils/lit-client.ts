declare global {
  // eslint-disable-next-line no-var
  var _litNodeClients:
    | {
        [key: string]: LitNodeClient;
      }
    | undefined;
}

import { LitNodeClient } from '@lit-protocol/lit-node-client';

export class _LitNodeClient {
  static async getInstance(network: string, debug: boolean) {
    if (!global._litNodeClients) {
      global._litNodeClients = {};
    }
    if (!global._litNodeClients[network]) {
      global._litNodeClients[network] = new LitNodeClient({
        litNetwork: network as any,
        debug: debug,
      });
    }
    if (
      global._litNodeClients[network] &&
      !global._litNodeClients[network].ready
    ) {
      await global._litNodeClients[network].connect();
    }
    return global._litNodeClients[network];
  }
}

export const getLitNodeClient = (network: string, debug: boolean = false) =>
  _LitNodeClient.getInstance(network, debug);
