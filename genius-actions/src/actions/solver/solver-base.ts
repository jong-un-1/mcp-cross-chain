import { GeniusEvmVault } from '../../services/blockchain/vault/genius-evm-vault';
import { GeniusSvmPool } from '../../services/blockchain/vault/genius-solana-pool';
import { Order } from '../../services/blockchain/vault/vault.types';
import { IErrorHandler } from '../../services/lit-services/error-handler/error-handler.interface';
import { ILitHelpers } from '../../services/lit-services/lit-helpers/lit-helpers.interface';
import { ENVIRONMENT } from '../../types/environment';
import { EvmArbitraryCall } from '../../types/evm-arbitrary-call';
import { publicKeyToHex, uint8ArrayToStr } from '../../utils/string-to-bytes32';
import { SolverFactory } from './core/SolverFactory';
import { OrderWithCalls, SolanaSolverTxnData } from './interfaces/types';
import { validateField } from './utils/validation';

/**
 * Solver Action Base Logic - Entry point
 *
 * @param {IErrorHandler} errorHandler
 * @param {ILitHelpers} litHelpers
 * @param {string} solanaOrchestratorPublicKey
 * @param {ENVIRONMENT} env
 * @param {{ [chain: number]: string[] }} rpcUrls
 * @param {Order[]} orders
 * @param {EvmArbitraryCall[]} swapCalls
 * @param {EvmArbitraryCall[]} arbitraryCalls
 *
 */
export const solverBase = async (
  errorHandler: IErrorHandler,
  litHelpers: ILitHelpers,
  solanaOrchestratorPublicKey: string | null,
  env: ENVIRONMENT,
  rpcUrls: { [chain: number]: string[] },
  orders: Order[],
  swapsCalls: (EvmArbitraryCall | null)[],
  arbitraryCalls: (EvmArbitraryCall | null)[],
): Promise<
  {
    chainId: number;
    transaction: SolanaSolverTxnData[] | EvmArbitraryCall;
  }[]
> => {
  return SolverFactory.executeSolver(
    errorHandler,
    litHelpers,
    solanaOrchestratorPublicKey,
    env,
    rpcUrls,
    orders,
    swapsCalls,
    arbitraryCalls,
  );
};

/**
 * Abstract base class for solvers
 * @deprecated Use SolverBase from './core/SolverBase' instead
 */
export abstract class SolverBase {
  protected errorHandler: IErrorHandler;
  protected litHelpers: ILitHelpers;
  protected rpcUrls: { [chain: number]: string[] };

  constructor(
    errorHandler: IErrorHandler,
    litHelpers: ILitHelpers,
    rpcUrls: { [chain: number]: string[] },
  ) {
    this.errorHandler = errorHandler;
    this.litHelpers = litHelpers;
    this.rpcUrls = rpcUrls;
  }

  abstract fillOrderBatch(orders: OrderWithCalls[]): Promise<{
    chainId: number;
    transaction: any;
  }>;

  public getOrderHashesToCheck(orders: Order[]): {
    [chain: number]: string[];
  } {
    const ordersToCheck: { [chain: string]: string[] } = {};
    orders.forEach((order) => {
      const orderHash = GeniusEvmVault.getOrderHash(order);
      if (!ordersToCheck[order.destChainId])
        ordersToCheck[order.destChainId] = [];
      if (!ordersToCheck[order.srcChainId])
        ordersToCheck[order.srcChainId] = [];

      ordersToCheck[order.srcChainId].push(orderHash);
      ordersToCheck[order.destChainId].push(orderHash);
    });
    return ordersToCheck;
  }

  protected async checkSvmOrderParams(
    order: Order,
    rpcs: string[],
    env: ENVIRONMENT,
  ): Promise<void> {
    const solanaPool = new GeniusSvmPool(rpcs, env);
    const orderHash = GeniusEvmVault.getOrderHash(order);
    const decodedOrder = await solanaPool.getOrder(orderHash);

    if (!decodedOrder) {
      throw new Error('Failed to get svm order');
    }

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
