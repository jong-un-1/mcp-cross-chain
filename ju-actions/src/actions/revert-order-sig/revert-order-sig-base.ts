import { ChainId } from '../../types/chain-id';
import { ENVIRONMENT } from '../../types/environment';

import { bytes32ToAddress } from '../../utils/address-transform';
import {
  isSolanaAddressOnCurve,
  isEvmAddressValid,
} from '../../utils/address-validation';
import { hexToPublicKey } from '../../utils/string-to-bytes32';
import { PublicKey } from '@solana/web3.js';
import { serializeVersionedTxn } from '../../utils/solana/txn-serialization';
import { GeniusEvmVault } from '../../services/blockchain/vault/genius-evm-vault';
import { GeniusSvmPool } from '../../services/blockchain/vault/genius-solana-pool';
import { Order } from '../../services/blockchain/vault/vault.types';
import { IExecutionHandler } from '../../services/lit-services/execution-handler/execution-handler.interface';

/**
 * Rebalancing Action
 *
 * @param {Order} order
 * @param {ENVIRONMENT} env
 *
 */
export const revertOrderSigBaseAction = async (
  executionHandler: IExecutionHandler,
  env: ENVIRONMENT,
  order: Order,
  rpcs: { [chain: number]: string[] },
): Promise<{ sig: string }> => {
  if (!isCreatedOrderValid(order)) {
    throw new Error('The order is not invalid and cannot be reverted');
  } else {
    if (order.srcChainId === ChainId.SOLANA.toString()) {
      const orchestrator = executionHandler.getSolanaSigner(ChainId.SOLANA);
      const revertOrderTxn = await getRevertOrderTx(
        order,
        orchestrator.publicKey,
        rpcs[ChainId.SOLANA],
        env,
      );
      const sig = await executionHandler.signSvm(revertOrderTxn);
      return { sig };
    } else {
      const vault = new GeniusEvmVault(ChainId.BASE, env, rpcs);
      const revertOrderDigest = vault.revertOrderDigest(order);
      const sig = await executionHandler.signEvm(revertOrderDigest);
      return { sig };
    }
  }
};

const getRevertOrderTx = async (
  order: Order,
  orchestrator: PublicKey,
  rpcs: string[],
  env: ENVIRONMENT,
): Promise<string> => {
  const solanaPool = new GeniusSvmPool(rpcs, env);
  const revertOrderTx = await solanaPool.getRevertOrderTx({
    order,
    orchestrator,
  });
  return serializeVersionedTxn(revertOrderTx);
};

const isCreatedOrderValid = (order: Order): boolean => {
  const destChainId = parseInt(order.destChainId);

  // Validate Solana address
  if (destChainId === ChainId.SOLANA) {
    const isValid = isSolanaAddressOnCurve(
      hexToPublicKey(order.receiver).toString(),
    );
    if (!isValid) {
      console.log('Invalid Solana receiver address');
      return false;
    }
  }

  // Validate EVM address
  if (destChainId !== ChainId.SOLANA) {
    const evmAddress = bytes32ToAddress(order.receiver);
    const isValid = isEvmAddressValid(evmAddress);
    if (!isValid) {
      console.log('Invalid EVM receiver address');
      return false;
    }
  }

  if (
    BigInt(order.amountIn) <= BigInt(0) ||
    BigInt(order.fee) > BigInt(order.amountIn)
  ) {
    console.log('Invalid amountIn or fee');
    return false;
  }

  return true;
};
