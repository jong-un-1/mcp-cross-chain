// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { Keypair } from '@solana/web3.js';

import { ChainId } from '../../../../types/chain-id';
import { EvmArbitraryCall } from '../../../../types/evm-arbitrary-call';
import { actionInit } from '../../../../utils/lit/action-init';
import { deserializeVersionedTxn } from '../../../../utils/solana/txn-serialization';
import bs58 from 'bs58';
import { GeniusActions } from '../../../../services/blockchain/genius-actions/genius-actions.service';
import { ActionTypeEnum } from '../../../../services/blockchain/genius-actions/genius-actions.types';
import { ExecutionHandlerLit } from '../../../../services/lit-services/execution-handler/execution-handler-lit';

/**
 * Rebalancing Execution Proxy Action
 *
 * @param {string} implementationIdTest
 * @param {ENVIRONMENT} env
 * @param {string} evmPkpAddress - optional ; to be used for evm transactions only
 * @param {string} evmPkpPublicKey - optional ; to be used for evm transactions only
 * @param {EncryptedData} orchestratorSolana - optional ; to be used for solana transactions only
 * @param {ENV_VARS} envVars - optional ; to be used for solana transactions only
 * @param {AccessControlConditions} accessControl - to be used for decrypting the orchestratorSolana and env
 * @param {string} instructionsResponse - the response from the rebalancing instructions
 */
export const go = async () => {
  console.log('Executing rebalancing execution proxy');
  const { orchestratorSolanaPk, rpcUrls } = await actionInit(
    orchestratorSolana,
    envVars,
    accessControl,
  );
  const geniusActions = new GeniusActions(env, rpcUrls);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const implementationId = await geniusActions.getActionImplementationId(
    ActionTypeEnum.REBALANCER,
  );

  const executionHandler = new ExecutionHandlerLit(
    evmPkpPublicKey,
    evmPkpAddress,
    orchestratorSolanaPk,
    rpcUrls,
  );

  let orchestratorSolanaPubKey: null | string = null;

  if (orchestratorSolanaPk) {
    const secretKeyBytes = bs58.decode(orchestratorSolanaPk);
    const keypair = Keypair.fromSecretKey(secretKeyBytes);
    orchestratorSolanaPubKey = keypair.publicKey.toString();
  }

  const params = {
    env,
    instructionsResponse,
    orchestratorSolanaPubKey,
    envVars,
    actionsBatch,
  };

  const resImpl = await Lit.Actions.call({
    ipfsId: implementationIdTest,
    params,
  });

  console.log('Solver implementation successfully called');
  console.log('Response:', resImpl);

  const response: {
    chainId: number;
    transaction: string[] | EvmArbitraryCall;
  }[] = JSON.parse(resImpl);

  const txnsPromises = response.map(async (res) => {
    if (res.chainId === ChainId.SOLANA) {
      const txnData = res.transaction as string[];
      return executionHandler.executeSolana(
        ChainId.SOLANA,
        txnData.map((t) => deserializeVersionedTxn(t)),
        envVars,
      );
    } else {
      const txn = res.transaction as EvmArbitraryCall;
      return executionHandler.executeEvm(res.chainId, txn);
    }
  });

  return await Promise.all(txnsPromises);
};

go();
