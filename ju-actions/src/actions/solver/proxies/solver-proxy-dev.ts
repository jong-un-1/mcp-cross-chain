// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { ENVIRONMENT } from '../../../types/environment';
import { solverProxyBase } from './solver-proxy-base';

/**
 * Fill Order Action DEV
 *
 * @param {Order[]} orders
 * @param {(EvmArbitraryCall | null)[]} swapsCalls
 * @param {(EvmArbitraryCall | null)[]} arbitraryCalls
 * @param {string} evmPkpAddress - optional ; to be used for evm transactions only
 * @param {string} evmPkpPublicKey - optional ; to be used for evm transactions only
 * @param {EncryptedData} orchestratorSolana - optional ; to be used for solana transactions only
 * @param {EnvVars} envVars - optional ; to be used for solana transactions only
 * @param {AccessControlConditions} accessControl - to be used for decrypting the orchestratorSolana and env
 *
 */
const go = async () => {
  const res = await solverProxyBase(
    ENVIRONMENT.DEV,
    orders,
    swapsCalls,
    arbitraryCalls,
    evmPkpAddress,
    evmPkpPublicKey,
    orchestratorSolana,
    envVars,
    accessControl,
  );
  return Lit.Actions.setResponse({ response: JSON.stringify(res) });
};

go();
