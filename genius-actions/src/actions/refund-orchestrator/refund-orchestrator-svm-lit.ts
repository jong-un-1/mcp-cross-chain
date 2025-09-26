// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { Keypair } from '@solana/web3.js';

import { ChainId } from '../../types/chain-id';
import { actionInit } from '../../utils/lit/action-init';
import { refundOrchestratorSvmBase } from './refund-orchestrator-svm-base';
import bs58 from 'bs58';
import { ErrorHandlerLit } from '../../services/lit-services/error-handler/error-handler-lit';
import { ExecutionHandlerLit } from '../../services/lit-services/execution-handler/execution-handler-lit';
import { LitHelpers } from '../../services/lit-services/lit-helpers/lit-helpers';

/**
 * Solana Refund Orchestrator Action
 *
 * @param {EncryptedData} orchestratorSolana - encrypted orchestrator solana
 * @param {ENV_VARS} envVars -  encrypted env
 * @param {AccessControlConditions} accessControl - access control conditions
 * @param {string} ownerSignature - owner's signature
 * @param {ENVIRONMENT} env - environment
 * @param {number | null} priorityFee - priority fee
 */
const go = async () => {
  const errorHandler = new ErrorHandlerLit();
  try {
    const startTime = new Date().getTime();

    console.log('refund orchestrator sol lit');
    const { orchestratorSolanaPk, rpcUrls } = await actionInit(
      orchestratorSolana,
      envVars,
      accessControl,
    );

    const executionHandler = new ExecutionHandlerLit(
      undefined,
      undefined,
      orchestratorSolanaPk,
      rpcUrls,
    );

    const svmOrchestratorKeypair = Keypair.fromSecretKey(
      bs58.decode(orchestratorSolanaPk),
    );

    const res = await refundOrchestratorSvmBase(
      executionHandler,
      new LitHelpers(),
      ChainId.SOLANA,
      svmOrchestratorKeypair.publicKey,
      ownerSignature,
      env,
      envVars,
      priorityFee || undefined,
    );
    console.log('exec time=>', new Date().getTime() - startTime);
    console.log('res=>', res);
    return Lit.Actions.setResponse({ response: { txHash: res } });
  } catch (error) {
    return errorHandler.handle(error);
  }
};
go();
