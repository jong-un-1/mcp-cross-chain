import { ChainId } from '../../../types/chain-id';
import { ENVIRONMENT } from '../../../types/environment';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { ISolverContext } from '../interfaces/ISolverContext';
import { EvmSolver } from '../implementations/EvmSolver';
import { SolanaSolver } from '../implementations/SolanaSolver';
import { OrderWithCalls } from '../interfaces/types';
import { IErrorHandler } from '../../../services/lit-services/error-handler/error-handler.interface';
import { GeniusEvmVault } from '../../../services/blockchain/vault/genius-evm-vault';
import { GeniusSvmPool } from '../../../services/blockchain/vault/genius-solana-pool';
import {
  Order,
  ORDER_STATUS,
} from '../../../services/blockchain/vault/vault.types';
import { ILitHelpers } from '../../../services/lit-services/lit-helpers/lit-helpers.interface';

/**
 * Factory for creating solver instances and orchestrating the solving process
 */
export class SolverFactory {
  /**
   * Execute the solver process
   *
   * @param errorHandler Error handling service
   * @param litHelpers Lit helpers service
   * @param solanaOrchestratorPublicKey Solana orchestrator public key
   * @param env Current environment
   * @param rpcUrls RPC URLs by chain ID
   * @param orders Orders to process
   * @param swapsCalls Swap calls for each order
   * @param arbitraryCalls Arbitrary calls for each order
   * @returns Transaction data by chain
   */
  public static async executeSolver(
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
      transaction: any;
    }[]
  > {
    if (orders.length === 0) throw new Error('No orders to fill');

    // Create context
    const context: ISolverContext = {
      errorHandler,
      litHelpers,
      rpcUrls,
      environment: env,
      solanaOrchestratorPublicKey,
    };

    // Create solver instances
    const solanaSolver = context.solanaOrchestratorPublicKey
      ? new SolanaSolver(context)
      : null;
    const evmSolver = new EvmSolver(context);

    // Get order statuses
    const ordersToCheck = SolverFactory.getOrderHashesToCheck(orders);
    const statusesPerChain = await SolverFactory.getOrderStatuses(
      ordersToCheck,
      env,
      rpcUrls,
    );

    console.log('statusesPerChain=>', statusesPerChain);

    // Map orders with their calls and filter valid ones
    let ordersToProcess: OrderWithCalls[] = orders
      .map((order: Order, index: number) => {
        return {
          ...order,
          swapCall: swapsCalls[index],
          arbitraryCall: arbitraryCalls[index],
        };
      })
      .filter((order) => {
        const orderHash = GeniusEvmVault.getOrderHash(order);
        const sourceStatus = statusesPerChain[order.srcChainId][orderHash];
        const destStatus = statusesPerChain[order.destChainId][orderHash];

        return (
          sourceStatus === ORDER_STATUS.Created &&
          destStatus === ORDER_STATUS.Nonexistant &&
          // Only process Solana orders if orchestrator public key is provided
          (order.destChainId === ChainId.SOLANA.toString()
            ? !!solanaSolver
            : true)
        );
      });

    console.log('ordersToProcess=>', ordersToProcess);

    // Verify order parameters
    const results = await Promise.allSettled(
      ordersToProcess.map(async (order) => {
        if (order.srcChainId === ChainId.SOLANA.toString()) {
          if (solanaSolver)
            await solanaSolver.verifyOrderParams(
              order,
              order.arbitraryCall,
              rpcUrls,
            );
        } else {
          await evmSolver.verifyOrderParams(
            order,
            order.arbitraryCall,
            rpcUrls,
          );
        }
      }),
    );

    ordersToProcess = ordersToProcess.filter(
      (_, index) => results[index].status === 'fulfilled',
    );

    // Group orders by destination chain
    const ordersByChain: Record<string, OrderWithCalls[]> = {};
    ordersToProcess.forEach((order) => {
      if (!ordersByChain[order.destChainId]) {
        ordersByChain[order.destChainId] = [];
      }
      ordersByChain[order.destChainId].push(order);
    });

    // Process orders by chain
    const resultsByChain = await Promise.all(
      Object.entries(ordersByChain)
        .filter(([chainId]) =>
          chainId === ChainId.SOLANA.toString() ? !!solanaSolver : true,
        )
        .map(async ([chainId, chainOrders]) => {
          if (chainId === ChainId.SOLANA.toString() && solanaSolver) {
            return solanaSolver.fillOrderBatch(chainOrders);
          } else {
            return evmSolver.fillOrderBatch(chainOrders);
          }
        }),
    );

    return resultsByChain;
  }

  /**
   * Get order statuses from all relevant chains
   *
   * @param ordersToCheck Orders to check by chain
   * @param env Current environment
   * @param rpcUrls RPC URLs by chain
   * @returns Order statuses by chain and order hash
   */
  private static async getOrderStatuses(
    ordersToCheck: { [chain: number]: string[] },
    env: ENVIRONMENT,
    rpcUrls: { [chain: number]: string[] },
  ): Promise<{ [chain: string]: { [orderHash: string]: number } }> {
    return (
      await Promise.all(
        Object.entries(ordersToCheck).map(async ([chainId, orderHashes]) => {
          if (chainId === ChainId.SOLANA.toString()) {
            const solanaPool = new GeniusSvmPool(rpcUrls[ChainId.SOLANA], env);
            const statuses = await Promise.all(
              orderHashes.map(async (orderHash) => {
                const status = await solanaPool.getOrderStatus(orderHash);
                return [orderHash, status];
              }),
            );
            return [chainId, Object.fromEntries(statuses)];
          } else {
            const vault = new GeniusEvmVault(Number(chainId), env, rpcUrls);
            const statuses = await vault.orderStatusBatch(orderHashes);
            const statusMap = Object.fromEntries(
              orderHashes.map((hash, index) => [hash, statuses[index]]),
            );
            return [chainId, statusMap];
          }
        }),
      )
    ).reduce<{ [chain: string]: { [orderHash: string]: number } }>(
      (acc, [chain, statuses]) => {
        acc[chain] = statuses;
        return acc;
      },
      {},
    );
  }

  /**
   * Get order hashes to check on each chain
   * @param orders List of orders
   * @returns Map of chain IDs to order hash arrays
   */
  protected static getOrderHashesToCheck(orders: Order[]): {
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
}
