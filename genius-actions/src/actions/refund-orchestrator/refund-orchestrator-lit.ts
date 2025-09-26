// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { ErrorHandlerLit } from '../../services/lit-services/error-handler/error-handler-lit';
import { ExecutionHandlerLit } from '../../services/lit-services/execution-handler/execution-handler-lit';
import { LitHelpers } from '../../services/lit-services/lit-helpers/lit-helpers';
import { RPC_URLS } from '../../utils/rpcs';
import { refundOrchestratorBase } from './refund-orchestrator-base';

/**
 * Rebalancing Action
 *
 * @param {ChainId} chainId
 * @param {string} orchestratorAddress
 * @param {string} evmPkpPublicKey
 * @param {string} ownerSignature
 * @param {ENVIRONMENT} env
 * @param {EnvVars} envVars
 * @param {string | null} gasLimit
 * @param {string | null} gasPrice
 */
const go = async () => {
  const errorHandler = new ErrorHandlerLit();
  try {
    const startTime = new Date().getTime();

    console.log('refund orchestrator lit');
    const executionHandler = new ExecutionHandlerLit(
      evmPkpPublicKey,
      orchestratorAddress,
      RPC_URLS(envVars),
    );
    const res = await refundOrchestratorBase(
      executionHandler,
      new LitHelpers(),
      chainId,
      orchestratorAddress,
      ownerSignature,
      env,
      envVars,
      gasLimit || undefined,
      gasPrice || undefined,
    );
    console.log('exec time=>', new Date().getTime() - startTime);
    console.log('res=>', res);
    return Lit.Actions.setResponse({ response: { txHash: res } });
  } catch (error) {
    return errorHandler.handle(error);
  }
};
go();
