// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { LitHelpers } from '../../../services/lit-services/lit-helpers/lit-helpers';
import { EXECUTOR_ADR_EVM } from '../../../utils/addresses';
import { isCallerAuthorizedLit } from '../../../utils/caller-auth-lit';
import { monkeyPatchFetch } from '../../../utils/monkey-fetch';
import { RPC_URLS } from '../../../utils/rpcs';
import { rebalancingExecutionImpl } from './rebalancing-execution-impl';

/**
 * Rebalancing Action DEV
 *
 * @param {string} env - environment
 * @param {string} orchestratorSolanaPubKey - orchestrator solana public key
 * @param {[key: string]: string} envVars - environment variables
 * @param {string} instructionsResponse - instructions response
 * @param {size: number; index: number} actionsBatch - batch of actions to execute
 */
const go = async () => {
  monkeyPatchFetch();
  if (!isCallerAuthorizedLit(EXECUTOR_ADR_EVM(env)))
    return `Caller is not authorized. Expected: ${EXECUTOR_ADR_EVM(env)}`;

  const startTime = new Date().getTime();
  const res = await rebalancingExecutionImpl(
    env,
    orchestratorSolanaPubKey,
    new LitHelpers(),
    RPC_URLS(envVars),
    JSON.parse(instructionsResponse),
    actionsBatch,
  );
  const endTime = new Date().getTime();
  const executionTime = endTime - startTime;
  console.log('Execution time:', executionTime, 'ms');
  console.log('Rebalancing Execution Result:', res);

  Lit.Actions.setResponse({ response: JSON.stringify(res) });
  return res;
};

go();
