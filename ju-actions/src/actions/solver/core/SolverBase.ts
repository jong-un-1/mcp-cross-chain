import { GeniusEvmVault } from '../../../services/blockchain/vault/genius-evm-vault';
import { GeniusSvmPool } from '../../../services/blockchain/vault/genius-solana-pool';
import { Order } from '../../../services/blockchain/vault/vault.types';
import { IErrorHandler } from '../../../services/lit-services/error-handler/error-handler.interface';
import { ILitHelpers } from '../../../services/lit-services/lit-helpers/lit-helpers.interface';
import { ChainId } from '../../../types/chain-id';
import { ENVIRONMENT } from '../../../types/environment';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import {
  publicKeyToHex,
  uint8ArrayToStr,
} from '../../../utils/string-to-bytes32';
import { ISolver } from '../interfaces/ISolver';
import { ISolverContext } from '../interfaces/ISolverContext';
import { OrderWithCalls } from '../interfaces/types';

/**
 * Abstract base class for solvers implementing common functionality
 */
export abstract class SolverBase implements ISolver {
  protected errorHandler: IErrorHandler;
  protected litHelpers: ILitHelpers;
  protected rpcUrls: { [chain: number]: string[] };
  protected env: ENVIRONMENT;

  constructor(context: ISolverContext) {
    this.errorHandler = context.errorHandler;
    this.litHelpers = context.litHelpers;
    this.rpcUrls = context.rpcUrls;
    this.env = context.environment;
  }

  /**
   * Fill a batch of orders
   * @param orders Orders to fill
   */
  abstract fillOrderBatch(orders: OrderWithCalls[]): Promise<{
    chainId: number;
    transaction: any;
  }>;

  /**
   * Verify order parameters
   * @param order Order to verify
   * @param arbitraryCall Optional arbitrary call data
   */
  public async verifyOrderParams(
    order: Order,
    arbitraryCall: EvmArbitraryCall | null,
    rpcs: { [chain: number]: string[] },
  ): Promise<void> {
    console.log('checking order parameters');
    if (order.srcChainId !== ChainId.SOLANA.toString()) {
      // ChainId.SOLANA.toString()
      if (
        arbitraryCall &&
        arbitraryCall.to &&
        arbitraryCall.data &&
        GeniusEvmVault.calldataToSeedSync(
          arbitraryCall.to,
          arbitraryCall.data,
        ) !== order.seed
      ) {
        throw new Error('Seed does not match');
      }
    } else {
      await this.checkSvmOrderParams(order, rpcs[ChainId.SOLANA]);
    }
  }

  /**
   * Check Solana-specific order parameters
   * @param order Order to check
   */
  protected async checkSvmOrderParams(
    order: Order,
    rpcs: string[],
  ): Promise<void> {
    const solanaPool = new GeniusSvmPool(rpcs, this.env);
    const orderHash = GeniusEvmVault.getOrderHash(order);
    const decodedOrder = await solanaPool.getOrder(orderHash);

    if (!decodedOrder) {
      throw new Error('Failed to get svm order');
    }

    // Helper function for validation
    const validateField = (
      decodedValue: string,
      passedValue: string,
      fieldName: string,
    ) => {
      if (decodedValue !== passedValue) {
        console.log(
          `Order ${fieldName} mismatch, decoded ${fieldName}: ${decodedValue}, passed ${fieldName}: ${passedValue}`,
        );
        throw new Error(`Order ${fieldName} mismatch`);
      }
    };

    validateField(decodedOrder.amountIn.toString(), order.amountIn, 'amountIn');
    validateField(decodedOrder.fee.toString(), order.fee, 'fee');
    validateField(
      decodedOrder.minAmountOut,
      order.minAmountOut,
      'minAmountOut',
    );
    validateField(
      publicKeyToHex(uint8ArrayToStr(decodedOrder.trader, false)),
      order.trader,
      'trader',
    );
    validateField(
      uint8ArrayToStr(decodedOrder.receiver, true),
      order.receiver,
      'receiver',
    );
    validateField(
      publicKeyToHex(uint8ArrayToStr(decodedOrder.tokenIn, false)),
      order.tokenIn,
      'tokenIn',
    );
    validateField(
      uint8ArrayToStr(decodedOrder.tokenOut, true),
      order.tokenOut,
      'tokenOut',
    );
    validateField(
      decodedOrder.srcChainId.toString(),
      order.srcChainId,
      'srcChainId',
    );
    validateField(
      decodedOrder.destChainId.toString(),
      order.destChainId,
      'destChainId',
    );
  }
}
