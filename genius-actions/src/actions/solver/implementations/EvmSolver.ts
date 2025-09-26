import { GeniusEvmVault } from '../../../services/blockchain/vault/genius-evm-vault';
import { ENVIRONMENT } from '../../../types/environment';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { ADDRESS0 } from '../../../types/globals';
import { SolverBase } from '../core/SolverBase';
import { ISolverContext } from '../interfaces/ISolverContext';
import { OrderWithCalls } from '../interfaces/types';

/**
 * EVM-specific solver implementation
 */
export class EvmSolver extends SolverBase {
  protected env: ENVIRONMENT;

  constructor(context: ISolverContext) {
    super(context);
    this.env = context.environment;
  }

  /**
   * Fill a batch of orders on an EVM chain
   * @param orders The orders to fill
   * @returns Transaction data with chain ID
   */
  async fillOrderBatch(orders: OrderWithCalls[]): Promise<{
    chainId: number;
    transaction: EvmArbitraryCall;
  }> {
    console.log('fillOrderBatchEvm');
    console.log('orders=>', JSON.stringify(orders));
    console.log('swapsCalls=>', JSON.stringify(orders.map((o) => o.swapCall)));
    console.log(
      'arbitraryCall=>',
      JSON.stringify(orders.map((o) => o.arbitraryCall)),
    );

    try {
      const targetVault = new GeniusEvmVault(
        Number(orders[0].destChainId),
        this.env,
        {},
      );

      const fillOrderBatchTx = await targetVault.prepFillOrderBatch({
        orders,
        swapsTargets: orders.map((order) =>
          order.swapCall ? order.swapCall.to : ADDRESS0,
        ),
        swapsData: orders.map((order) =>
          order.swapCall ? order.swapCall.data : '0x',
        ),
        callsTargets: orders.map((order) =>
          order.arbitraryCall ? order.arbitraryCall.to : ADDRESS0,
        ),
        callsData: orders.map((order) =>
          order.arbitraryCall ? order.arbitraryCall.data : '0x',
        ),
      });

      return {
        chainId: Number(orders[0].destChainId),
        transaction: fillOrderBatchTx,
      };
    } catch (e: any) {
      return this.errorHandler.handle(e);
    }
  }
}
