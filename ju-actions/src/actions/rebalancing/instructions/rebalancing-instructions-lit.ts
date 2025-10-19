// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
import { ExecutionHandlerLit } from '../../../services/lit-services/execution-handler/execution-handler-lit';
import { LitHelpers } from '../../../services/lit-services/lit-helpers/lit-helpers';
import { actionInit } from '../../../utils/lit/action-init';
import { rebalancingInstructions } from './rebalancing-instructions';

/**
 * Rebalancing instructions Action
 *
 * @param {string} evmPkpAddress - optional ; to be used for evm transactions only
 * @param {string} evmPkpPublicKey - optional ; to be used for evm transactions only
 * @param {ENV_VARS} envVars - optional ; to be used for solana transactions only
 * @param {AccessControlConditions} accessControl - to be used for decrypting the orchestratorSolana and env
 * @param {ENVIRONMENT} env - environment
 * @param { [chainId: string]: string } topHoldersAddresses - addresses of top holders for every chain
 * @param {number[]} ratios - optional - ratios for rebalancing, if not present, equal distribution is used
 */
const go = async () => {
  const startTime = new Date().getTime();
  const { rpcUrls } = await actionInit(null, envVars, accessControl);

  console.log(
    `Time taken to fetch RPC URLs: ${new Date().getTime() - startTime}`,
  );

  const executionHandler = new ExecutionHandlerLit(
    evmPkpPublicKey,
    evmPkpAddress,
    undefined,
    rpcUrls,
  );

  console.log(
    `Time taken to create execution handler: ${new Date().getTime() - startTime}`,
  );

  const response = await rebalancingInstructions(
    executionHandler,
    new LitHelpers(),
    rpcUrls,
    env,
    topHoldersAddresses,
    ratios,
  );

  console.log(
    `Time taken to get rebalancing instructions: ${new Date().getTime() - startTime}`,
  );

  Lit.Actions.setResponse({ response: JSON.stringify(response) });
  return response;
};

go();
