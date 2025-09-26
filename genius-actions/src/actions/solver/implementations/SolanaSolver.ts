import { Connection, PublicKey } from '@solana/web3.js';
import { chainStablecoinDecimals } from '../../../../scripts/utils/chain-stablecoin-decimals';
import { USDC_DECIMALS } from '../../../services/blockchain/vault/constants/genius-svm-constants';
import { GeniusEvmVault } from '../../../services/blockchain/vault/genius-evm-vault';
import { GeniusSvmPool } from '../../../services/blockchain/vault/genius-solana-pool';
import { Order } from '../../../services/blockchain/vault/vault.types';
import { ChainId } from '../../../types/chain-id';
import { SOLANA_USDC_ADDRESS } from '../../../utils/addresses';
import convertDecimals from '../../../utils/solana/decimals.util';
import { serializeVersionedTxn } from '../../../utils/solana/txn-serialization';
import { hexToPublicKey } from '../../../utils/string-to-bytes32';
import { handleSwapIfNeeded } from '../../../utils/swap/fill-order-swap-quote-util';
import { SolverBase } from '../core/SolverBase';
import { ISolverContext } from '../interfaces/ISolverContext';
import { OrderWithCalls, SolanaSolverTxnData } from '../interfaces/types';
import { ENVIRONMENT } from '../../../types/environment';

/**
 * Solana-specific solver implementation
 */
export class SolanaSolver extends SolverBase {
  private solanaOrchestratorPublicKey: string;
  protected env: ENVIRONMENT;

  constructor(context: ISolverContext) {
    super(context);
    if (!context.solanaOrchestratorPublicKey) {
      throw new Error('Solana orchestrator public key is required');
    }
    this.solanaOrchestratorPublicKey = context.solanaOrchestratorPublicKey;
    this.env = context.environment;
  }

  /**
   * Fill a batch of orders on Solana
   * @param orders Orders to fill
   * @returns Transaction data with chain ID
   */
  async fillOrderBatch(orders: OrderWithCalls[]): Promise<{
    chainId: number;
    transaction: SolanaSolverTxnData[];
  }> {
    const results: SolanaSolverTxnData[] = [];
    for (const order of orders) {
      const res = await this.fillOrderSvm(order);
      results.push(res);
    }
    return {
      chainId: ChainId.SOLANA,
      transaction: results,
    };
  }

  /**
   * Fill a single order on Solana
   * @param order Order to fill
   * @returns Solana transaction data
   */
  private async fillOrderSvm(order: Order): Promise<SolanaSolverTxnData> {
    try {
      const connection = new Connection(this.rpcUrls[ChainId.SOLANA][0]);
      const txnsToExecute: string[] = [];

      // Getting order hash before converting decimals (and therefore altering the order & orderHash)
      const orderHash = GeniusEvmVault.getOrderHash(order);

      const fromDecimals = chainStablecoinDecimals(parseInt(order.srcChainId));
      const toDecimals = USDC_DECIMALS;
      const effectiveAmountIn = convertDecimals(
        BigInt(order.amountIn),
        fromDecimals,
        toDecimals,
      );
      const effectiveFee = convertDecimals(
        BigInt(order.fee),
        fromDecimals,
        toDecimals,
      );

      order.amountIn = effectiveAmountIn.toString();
      order.fee = effectiveFee.toString();

      const fillOrderTx = await this.generateFillOrderTx(order, orderHash);
      txnsToExecute.push(fillOrderTx);

      const { tokenOut, receiver } = this.getTokenAddresses(order);
      const swapTxs = await this.getSolanaSwapTx(
        order,
        tokenOut,
        receiver,
        SOLANA_USDC_ADDRESS,
        connection,
      );

      if (swapTxs) {
        console.log('swapTxs len:', swapTxs.length);
      } else {
        console.log('swapTxs: null');
      }

      const transferUsdcTxn = await this.generateTransferUsdcTxn(order);

      if (swapTxs) {
        try {
          for (const swapTx of swapTxs) {
            txnsToExecute.push(swapTx);
          }

          const transferTokenTxn = await this.generateTransferTokenTxn(order);
          txnsToExecute.push(transferTokenTxn);
        } catch (e: any) {
          return this.errorHandler.handle(e);
        }
      } else {
        txnsToExecute.push(transferUsdcTxn);
      }

      return {
        txnsToExecute,
        fallbackTxn: transferUsdcTxn,
      };
    } catch (e: any) {
      return this.errorHandler.handle(e);
    }
  }

  /**
   * Generate fill order transaction
   * @param order Order to fill
   * @param orderHash Order hash
   * @returns Serialized transaction
   */
  private async generateFillOrderTx(
    order: Order,
    orderHash: string,
  ): Promise<string> {
    const resp = await this.litHelpers.runOnce(
      { waitForResponse: true, name: `getFillOrderTx:${order.seed}` },
      async () => {
        const solanaPool = new GeniusSvmPool(
          this.rpcUrls[ChainId.SOLANA],
          this.env,
        );
        const fillOrderTx = await solanaPool.getFillOrderTx({
          order,
          orchestrator: new PublicKey(this.solanaOrchestratorPublicKey),
          orderHash,
        });
        return serializeVersionedTxn(fillOrderTx);
      },
    );

    if (!resp) throw new Error('Failed to get fill order txn');
    else return resp;
  }

  /**
   * Get token addresses from order
   * @param order Order with addresses
   * @returns Token addresses
   */
  private getTokenAddresses(order: Order) {
    const stablecoin = SOLANA_USDC_ADDRESS;
    let tokenOut;
    try {
      tokenOut = hexToPublicKey(order.tokenOut).toBase58();
    } catch (e: any) {
      console.error(`Error converting tokenOut to PublicKey: ${e}`);
      tokenOut = stablecoin;
    }
    return { tokenOut, receiver: hexToPublicKey(order.receiver).toBase58() };
  }

  /**
   * Generate USDC transfer transaction
   * @param order Order with amount
   * @returns Serialized transaction
   */
  private async generateTransferUsdcTxn(order: Order): Promise<string> {
    const amount = (parseInt(order.amountIn) - parseInt(order.fee)).toString();
    const resp = await this.litHelpers.runOnce(
      { waitForResponse: true, name: `getTransferUsdcTxn:${order.seed}` },
      async () => {
        const solanaPool = new GeniusSvmPool(
          this.rpcUrls[ChainId.SOLANA],
          this.env,
        );
        const transferUsdcTxn = await solanaPool.getTransferUsdcTxn(
          amount,
          order.receiver,
          new PublicKey(this.solanaOrchestratorPublicKey),
        );
        return serializeVersionedTxn(transferUsdcTxn);
      },
    );
    if (!resp) throw new Error('Failed to get transfer usdc txn');
    else return resp;
  }

  /**
   * Generate token transfer transaction
   * @param order Order with amount
   * @param tokenOut Token to transfer
   * @returns Serialized transaction
   */
  private async generateTransferTokenTxn(order: Order): Promise<string> {
    const resp = await this.litHelpers.runOnce(
      { waitForResponse: true, name: `getTransferTokenTxn:${order.seed}` },
      async () => {
        const solanaPool = new GeniusSvmPool(
          this.rpcUrls[ChainId.SOLANA],
          this.env,
        );
        const transferUsdcTxn = await solanaPool.getFillOrderTokenTransferTx({
          order,
          orchestrator: new PublicKey(this.solanaOrchestratorPublicKey),
        });
        return serializeVersionedTxn(transferUsdcTxn);
      },
    );
    if (!resp) throw new Error('Failed to get transfer token txn');
    else return resp;
  }

  /**
   * Get Solana swap transaction
   * @param order Order to swap
   * @param tokenOut Output token
   * @param receiver Receiver address
   * @param stableCoinAddress Stablecoin address
   * @param connection Solana connection
   * @returns Serialized transactions or null
   */
  private async getSolanaSwapTx(
    order: Order,
    tokenOut: string,
    receiver: string,
    stableCoinAddress: string,
    connection: Connection,
  ): Promise<string[] | null> {
    const resp = await this.litHelpers.runOnce(
      { waitForResponse: true, name: `getSwapTx:${order.seed}` },
      async () => {
        const res = await handleSwapIfNeeded(
          order,
          tokenOut,
          receiver,
          stableCoinAddress,
          this.solanaOrchestratorPublicKey,
          connection,
        );
        if (res && res.swapTxs && res.swapTxs.length > 0) {
          return JSON.stringify(res.swapTxs);
        } else {
          return '';
        }
      },
    );
    if (resp && resp != '') {
      return JSON.parse(resp);
    }
    return null;
  }
}
