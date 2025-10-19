import { Contract, ethers } from 'ethers';
import {
  FillOrderBatchParams,
  FillOrderParams,
  Order,
  ORDER_STATUS,
} from './vault.types';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { ChainId } from '../../../types/chain-id';
import { GeniusVaultAbi } from '../abis/genius-vault.abi';
import { GENIUS_VAULT_ADR, MULTICALL3_ADR } from '../../../utils/addresses';
import { ENVIRONMENT } from '../../../types/environment';
import { Interface } from 'ethers/lib/utils';
import { multicall3Abi } from '../abis/multicall3.abi';
import { RPC_URLS } from '../../../utils/rpcs';

export class GeniusEvmVault {
  public chain: ChainId;
  public address: string;

  protected multicall3Providers: Contract[];
  protected vaultProviders: Contract[];

  constructor(
    chainId: ChainId,
    env: ENVIRONMENT,
    protected readonly rpcUrls: { [chain: number]: string[] },
  ) {
    this.chain = chainId;
    this.address = GENIUS_VAULT_ADR(this.chain, env);

    const rpcs = this.rpcUrls[chainId] || RPC_URLS()[chainId];

    const clients = rpcs.map(
      (rpc) => new ethers.providers.StaticJsonRpcProvider(rpc, chainId),
    );
    this.vaultProviders = clients.map(
      (client) => new Contract(this.address, GeniusVaultAbi, client),
    );
    this.multicall3Providers = clients.map(
      (client) =>
        new Contract(MULTICALL3_ADR(this.chain), multicall3Abi, client),
    );
  }

  public async getStablecoin(): Promise<string> {
    for (const vault of this.vaultProviders) {
      try {
        return await vault.STABLECOIN();
      } catch (e) {
        console.error(
          `Failed to get stablecoin from vault from rpc ${vault.provider}`,
          e,
        );
      }
    }

    throw new Error('Failed to get stablecoin from any provider');
  }

  public async getDecimals(): Promise<number> {
    for (const vault of this.vaultProviders) {
      try {
        const res = await vault.decimals();
        return Number(res);
      } catch (e) {
        console.error(
          `Failed to get decimals from vault from rpc ${vault.provider}`,
          e,
        );
      }
    }

    throw new Error('Failed to get decimals from any provider');
  }

  public async stablecoinBalance(): Promise<ethers.BigNumber> {
    for (let i = 0; i < this.vaultProviders.length; i++) {
      const vault = this.vaultProviders[i];
      try {
        return await vault.stablecoinBalance();
      } catch (e) {
        console.error(
          `Failed to get stablecoin balance from vault from rpc ${this.rpcUrls[i]}`,
          e,
        );
      }
    }
    throw new Error('Failed to get stablecoin balance from any provider');
  }

  public async availableLiquidity(): Promise<ethers.BigNumber> {
    for (let i = 0; i < this.vaultProviders.length; i++) {
      const vault = this.vaultProviders[i];
      try {
        return await vault.availableAssets();
      } catch (e) {
        console.error(
          `Failed to get available assets from vault from rpc ${this.rpcUrls[i]}`,
          e,
        );
      }
    }
    throw new Error('Failed to get available assets from any provider');
  }

  public async balanceOf(holder: string): Promise<ethers.BigNumber> {
    for (let i = 0; i < this.vaultProviders.length; i++) {
      const vault = this.vaultProviders[i];
      try {
        return await vault.balanceOf(holder);
      } catch (e) {
        console.error(
          `Failed to get balance of token from vault from rpc ${this.rpcUrls[i]}`,
          e,
        );
      }
    }
    throw new Error('Failed to get balance of token from any provider');
  }

  public async prepFillOrder(
    params: FillOrderParams,
  ): Promise<EvmArbitraryCall> {
    const tx = await this.vaultProviders[0].populateTransaction.fillOrder(
      params.order,
      params.swapTarget,
      params.swapData,
      params.callTarget,
      params.callData,
    );

    return {
      to: this.address,
      data: tx.data || '0x',
      value: '0',
    };
  }

  public async prepFillOrderBatch(
    params: FillOrderBatchParams,
  ): Promise<EvmArbitraryCall> {
    const tx = await this.vaultProviders[0].populateTransaction.fillOrderBatch(
      params.orders,
      params.swapsTargets,
      params.swapsData,
      params.callsTargets,
      params.callsData,
    );

    return {
      to: this.address,
      data: tx.data || '0x',
      value: '0',
    };
  }

  public async prepRebalanceLiquidity(
    amountIn: ethers.BigNumberish,
    dstChainId: number,
    target: string,
    data: string,
    value: ethers.BigNumberish = '0',
  ): Promise<EvmArbitraryCall> {
    const tx =
      await this.vaultProviders[0].populateTransaction.rebalanceLiquidity(
        amountIn,
        dstChainId,
        target,
        data,
      );

    return {
      to: this.address,
      data: tx.data || '0x',
      value: value.toString(),
    };
  }

  public async orderStatusBatch(
    orderHashes: string[],
  ): Promise<ORDER_STATUS[]> {
    for (let i = 0; i < this.multicall3Providers.length; i++) {
      const multicall3 = this.multicall3Providers[i];
      try {
        const vaultInterface = new Interface(GeniusVaultAbi);

        // Prepare calls array
        const calls = orderHashes.map((hash) => ({
          target: this.address,
          allowFailure: true,
          callData: vaultInterface.encodeFunctionData('orderStatus', [hash]),
        }));

        // Make single RPC call using multicall
        const results = await multicall3.callStatic.aggregate3(calls);

        // Parse results
        return results.map(
          (
            result: { success: any; returnData: ethers.utils.BytesLike },
            index: number,
          ) => {
            if (!result.success) {
              throw new Error(
                `Failed to get status for order ${orderHashes[index]}`,
              );
            }

            const status = vaultInterface.decodeFunctionResult(
              'orderStatus',
              result.returnData,
            )[0];

            return Number(status) as ORDER_STATUS;
          },
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e: any) {
        console.error(
          `Failed to get order status batch from multicall3 from rpc ${this.rpcUrls[i]}`,
          e,
        );
      }
    }

    throw new Error('Failed to get order status batch from any provider');
  }

  public async orderStatus(orderHash: string): Promise<ORDER_STATUS> {
    for (let i = 0; i < this.vaultProviders.length; i++) {
      const vault = this.vaultProviders[i];

      try {
        const status = await vault.orderStatus(orderHash);
        return Number(status) as ORDER_STATUS;
      } catch (e) {
        console.error(
          `Failed to get order status from vault from rpc ${this.rpcUrls[i]}`,
          e,
        );
      }
    }
    throw new Error('Failed to get order status from any provider');
  }

  static getOrderHash(order: Order): string {
    return ethers.utils.solidityKeccak256(
      [
        'bytes32',
        'bytes32',
        'bytes32',
        'bytes32',
        'bytes32',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
      ],
      [
        order.seed,
        order.trader,
        order.receiver,
        order.tokenIn,
        order.tokenOut,
        order.amountIn,
        order.minAmountOut,
        order.srcChainId,
        order.destChainId,
        order.fee,
      ],
    );
  }

  public revertOrderDigest(order: Order): string {
    return ethers.utils.keccak256(
      ethers.utils.solidityPack(
        ['string', 'bytes32'],
        ['PREFIX_CANCEL_ORDER_HASH', GeniusEvmVault.getOrderHash(order)],
      ),
    );
  }

  public async getOrderHashAsync(order: Order): Promise<string> {
    return this.vaultProviders[0].orderHash(order);
  }

  static calldataToSeedSync(callTarget: string, calldata: string): string {
    return ethers.utils.keccak256(
      ethers.utils.concat([
        ethers.utils.hexZeroPad(ethers.utils.getAddress(callTarget), 20),
        ethers.utils.keccak256(calldata),
      ]),
    );
  }
}
