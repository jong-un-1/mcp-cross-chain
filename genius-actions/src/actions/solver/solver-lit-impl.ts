// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { ErrorHandlerLit } from '../../services/lit-services/error-handler/error-handler-lit';
import { solverBase } from './solver-base';
import { RPC_URLS } from '../../utils/rpcs';
import { LitHelpers } from '../../services/lit-services/lit-helpers/lit-helpers';
/**
 * Fill Order Action Implementation
 *
 * @param {ENVIRONMENT} env
 * @param {Order[]} orders
 * @param {(EvmArbitraryCall | null)[]} swapsCalls
 * @param {(EvmArbitraryCall | null)[]} arbitraryCalls
 * @param {Object} envVars - optional ; to be used for rpc urls
 * @param {string} orchestratorSolanaPubKey - to be used for solana transactions only
 *
 */
const go = async () => {
  const errorHandler = new ErrorHandlerLit();
  try {
    const startTime = new Date().getTime();

    const rpcs = RPC_URLS(envVars || {});

    const res = await solverBase(
      errorHandler,
      new LitHelpers(),
      orchestratorSolanaPubKey,
      env,
      rpcs,
      orders,
      swapsCalls,
      arbitraryCalls,
    );
    console.log('exec time=>', new Date().getTime() - startTime);
    console.log('res=>', res);
    Lit.Actions.setResponse({ response: JSON.stringify(res) });
    return res;
  } catch (error) {
    return errorHandler.handle(error);
  }
};

go();
