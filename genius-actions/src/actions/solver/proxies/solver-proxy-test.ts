// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { GeniusActions } from '../../../services/blockchain/genius-actions/genius-actions.service';
import { ActionTypeEnum } from '../../../services/blockchain/genius-actions/genius-actions.types';
import { ExecutionHandlerLit } from '../../../services/lit-services/execution-handler/execution-handler-lit';
import { IExecutionHandler } from '../../../services/lit-services/execution-handler/execution-handler.interface';
import { ChainId } from '../../../types/chain-id';
import { ENVIRONMENT } from '../../../types/environment';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { actionInit } from '../../../utils/lit/action-init';
import { deserializeVersionedTxn } from '../../../utils/solana/txn-serialization';
import { SolanaSolverTxnData } from '../solver.types';
import bs58 from 'bs58';
import { EnvVars } from '../../../types/env-vars';

/**
 * Fill Order Action DEV
 *
 * @param {string} implementationIdTest
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
export const go = async () => {
  const { orchestratorSolanaPk, rpcUrls } = await actionInit(
    orchestratorSolana,
    envVars,
    accessControl,
  );

  const geniusActions = new GeniusActions(env, rpcUrls);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const implementationId = await geniusActions.getActionImplementationId(
    ActionTypeEnum.SOLVER,
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
    env: ENVIRONMENT.DEV,
    orders,
    swapsCalls,
    arbitraryCalls,
    orchestratorSolanaPubKey,
    envVars,
  };

  const resImpl = await Lit.Actions.call({
    ipfsId: implementationIdTest,
    params,
  });

  console.log('Solver implementation successfully called');
  console.log('Response:', resImpl);

  const response: {
    chainId: number;
    transaction: SolanaSolverTxnData[] | EvmArbitraryCall;
  }[] = JSON.parse(resImpl);

  const txnsPromises = response.map(async (res) => {
    if (res.chainId === ChainId.SOLANA) {
      const txnData = res.transaction as SolanaSolverTxnData[];
      const solanaTxns = txnData.map((txn) =>
        executeSolanaTransactions(
          executionHandler,
          ChainId.SOLANA.toString(),
          txn.txnsToExecute.map((t) => deserializeVersionedTxn(t)),
          deserializeVersionedTxn(txn.fallbackTxn),
          envVars,
        ),
      );
      return (async () => {
        const response = [];
        for (const txn of solanaTxns) {
          const res = await txn;
          response.push(res);
        }
        return response;
      })();
    } else {
      const txn = res.transaction as EvmArbitraryCall;
      return executionHandler.executeEvm(res.chainId, txn);
    }
  });

  return await Promise.all(txnsPromises);
};

const executeSolanaTransactions = async (
  executionHandler: IExecutionHandler,
  destChainId: string,
  txnsToExecute: VersionedTransaction[],
  transferUsdcTxn: VersionedTransaction,
  envVars: EnvVars,
) => {
  let mainTxnExecutionResp: string[];
  let fallbackTxnExecutionResp: string[];
  try {
    mainTxnExecutionResp = await executionHandler.executeSolana(
      Number(destChainId),
      txnsToExecute,
      envVars,
    );
  } catch (e: any) {
    console.log(`Error executing SVM txn: ${e}`);
  }

  try {
    const updatedTxnsToExecute = [txnsToExecute[0], transferUsdcTxn];

    fallbackTxnExecutionResp = await executionHandler.executeSolana(
      Number(destChainId),
      updatedTxnsToExecute,
      envVars,
    );
  } catch (e: any) {
    console.log(`Error executing SVM txn: ${e}`);
  }

  if (mainTxnExecutionResp) {
    return mainTxnExecutionResp;
  }
  if (fallbackTxnExecutionResp) {
    return fallbackTxnExecutionResp;
  }

  throw new Error('Simulation failed for both transaction sets.');
};

go();
