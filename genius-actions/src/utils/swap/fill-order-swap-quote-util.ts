import { Connection } from '@solana/web3.js';
import { Order } from '../../services/blockchain/vault/vault.types';
import { ChainId } from '../../types/chain-id';
import { GeniusIntents } from 'genius-intents';

export const handleSwapIfNeeded = async (
  order: Order,
  tokenOut: string,
  receiver: string,
  stableCoinAddress: string,
  orchestrator: string,
  connection: Connection,
): Promise<{ swapTxs: string[] | null }> => {
  console.log(`Starting swap handling`, {
    orderId: order.seed,
    tokenOut,
    stableCoinAddress,
  });

  try {
    if (parseInt(order.destChainId) !== ChainId.SOLANA) {
      throw new Error(
        'Only Solana is supported for generating swap quotes in Lit Action',
      );
    }

    if (!connection) {
      throw new Error('Solana connection is required');
    }

    const swapNeeded =
      tokenOut.toLowerCase() !== stableCoinAddress.toLowerCase();
    console.log(
      `tokenOut: ${tokenOut.toLowerCase()} stableCoinAddress: ${stableCoinAddress.toLowerCase()} swapNeeded: ${swapNeeded}`,
    );

    if (!swapNeeded) {
      console.log(`Swap not needed - tokenOut matches stablecoin`, {
        orderId: order.seed,
      });
      return { swapTxs: null };
    }

    const network = parseInt(order.destChainId);

    const geniusIntents = new GeniusIntents({
      rcps: {
        [network]: connection.rpcEndpoint,
      },
      method: 'race',
    });

    const amountIn = (BigInt(order.amountIn) - BigInt(order.fee)).toString();

    const res = await geniusIntents.fetchQuote({
      networkIn: network,
      networkOut: network,
      tokenIn: stableCoinAddress,
      tokenOut,
      amountIn,
      slippage: 1, // TODO: Set adequate slippage
      from: orchestrator,
      receiver,
    });

    if (!res.result || !res.result.svmExecutionPayload) {
      console.error(
        'No quote found for swap quote in fill-order-swap-quote-util',
      );
      return { swapTxs: null };
    }

    return { swapTxs: res.result.svmExecutionPayload };
  } catch (e: any) {
    console.log(`Error handling swap if needed: ${e.message}`);
    return { swapTxs: null };
  }
};
