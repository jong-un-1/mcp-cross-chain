// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { AccessControlConditions } from '@lit-protocol/types';
import { EncryptedData } from '../../types/encrypted-data';
import { ENVIRONMENT } from '../../types/environment';
import { revertOrderSigBaseAction } from './revert-order-sig-base';
import { EnvVars } from '../../types/env-vars';
import { actionInit } from '../../utils/lit/action-init';
import { Order } from '../../services/blockchain/vault/vault.types';
import { ErrorHandlerLit } from '../../services/lit-services/error-handler/error-handler-lit';
import { ExecutionHandlerLit } from '../../services/lit-services/execution-handler/execution-handler-lit';

/**
 * Revert Order Signature Lit
 *
 * @param {ENVIRONMENT} env
 * @param {Order} order
 * @param {string} evmPkpAddress - optional ; to be used for evm transactions only
 * @param {string} evmPkpPublicKey - optional ; to be used for evm transactions only
 * @param {EncryptedData} orchestratorSolana - optional ; to be used for solana transactions only
 * @param {EnvVars} envVars - optional ; to be used for solana transactions only
 * @param {AccessControlConditions} accessControl - to be used for decrypting the orchestratorSolana and env
 */
export const revertOrderSigLit = async (
  env: ENVIRONMENT,
  order: Order,
  evmPkpAddress: string,
  evmPkpPublicKey: string,
  orchestratorSolana: EncryptedData,
  envVars: EnvVars,
  accessControl: AccessControlConditions,
) => {
  const errorHandler = new ErrorHandlerLit();
  try {
    const startTime = new Date().getTime();

    const { orchestratorSolanaPk, rpcUrls } = await actionInit(
      orchestratorSolana,
      envVars,
      accessControl,
    );

    const executionHandler = new ExecutionHandlerLit(
      evmPkpPublicKey,
      evmPkpAddress,
      orchestratorSolanaPk,
      rpcUrls,
    );

    const res = await revertOrderSigBaseAction(
      executionHandler,
      env,
      order,
      rpcUrls,
    );
    console.log('exec time=>', new Date().getTime() - startTime);
    console.log('res=>', res);
    return Lit.Actions.setResponse({ response: res });
  } catch (error) {
    return errorHandler.handle(error);
  }
};
