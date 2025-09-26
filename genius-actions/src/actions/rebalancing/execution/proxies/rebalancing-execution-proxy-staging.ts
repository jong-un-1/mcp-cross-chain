// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { ENVIRONMENT } from '../../../../types/environment';
import { rebalancingExecutionProxy } from './rebalancing-execution-proxy';

/**
 * Rebalancing Execution Proxy Action STAGING
 *
 * @param {string} evmPkpAddress - optional ; to be used for evm transactions only
 * @param {string} evmPkpPublicKey - optional ; to be used for evm transactions only
 * @param {EncryptedData} orchestratorSolana - optional ; to be used for solana transactions only
 * @param {ENV_VARS} envVars - optional ; to be used for solana transactions only
 * @param {AccessControlConditions} accessControl - to be used for decrypting the orchestratorSolana and env
 * @param {string} instructionsResponse - the response from the rebalancing instructions
 * @param {size: number; index: number} actionsBatch - batch of actions to execute
 */
const go = async () => {
  const res = await rebalancingExecutionProxy(
    ENVIRONMENT.STAGING,
    evmPkpAddress,
    evmPkpPublicKey,
    orchestratorSolana,
    envVars,
    accessControl,
    instructionsResponse,
    actionsBatch,
  );
  return Lit.Actions.setResponse({ response: JSON.stringify(res) });
};

go();
