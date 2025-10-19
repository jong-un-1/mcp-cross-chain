import { PublicKey, TokenAmount, VersionedTransaction } from '@solana/web3.js';
import { ChainId } from '../../../types/chain-id';
import {
  DecodedAsset,
  DecodedOrder,
  USDC_ADDRESS,
} from './constants/genius-svm-constants';
import { GENIUS_SVM_POOL_ADR } from '../../../utils/addresses';
import {
  ORDER_STATUS,
  FillOrderSvmParams,
  FillOrderTokenTransferParams,
  RemoveBridgeLiquidityParams,
  RevertOrderSvmParams,
} from './vault.types';
import { ConnectionManager } from './solana/svm-connection-manager';
import { AssetManager } from './solana/svm-asset-manager';
import { OrderManager } from './solana/svm-order-manager';
import { TransactionBuilder } from './solana/svm-transaction-builder';
import { AddressUtils } from './solana/svm-address-utils';
import { ENVIRONMENT } from '../../../types/environment';

/**
 * Main class for interacting with the Genius Solana Pool
 */
export class GeniusSvmPool {
  public chain: ChainId;
  protected stablecoin: PublicKey;
  public programId: PublicKey;

  // Manager instances
  private connectionManager: ConnectionManager;
  private assetManager: AssetManager;
  private orderManager: OrderManager;
  private transactionBuilder: TransactionBuilder;

  /**
   * Creates a new GeniusSvmPool instance
   * @param rpcUrls Array of Solana RPC URLs for redundancy
   */
  constructor(rpcUrls: string[], env: ENVIRONMENT) {
    this.chain = ChainId.SOLANA;
    this.stablecoin = USDC_ADDRESS;
    this.programId = new PublicKey(GENIUS_SVM_POOL_ADR(env));

    // Initialize managers
    this.connectionManager = new ConnectionManager(rpcUrls);
    this.assetManager = new AssetManager(
      this.connectionManager,
      this.programId,
      this.stablecoin,
    );
    this.orderManager = new OrderManager(
      this.connectionManager,
      this.programId,
    );
    this.transactionBuilder = new TransactionBuilder(
      this.connectionManager,
      this.programId,
      this.stablecoin,
    );
  }

  /**
   * Gets the global state PDA
   * @returns Public key of the global state account
   */
  getGlobalStateAddress(): PublicKey {
    return AddressUtils.getGlobalStateAddress(this.programId);
  }

  /**
   * Gets the vault PDA
   * @returns Public key of the vault account
   */
  static getVaultAddress(env: ENVIRONMENT): PublicKey {
    const programId = new PublicKey(GENIUS_SVM_POOL_ADR(env));
    return AddressUtils.getVaultAddress(programId);
  }

  /**
   * Gets the asset PDA
   * @returns Public key of the asset account
   */
  static getAssetAddress(env: ENVIRONMENT): PublicKey {
    const programId = new PublicKey(GENIUS_SVM_POOL_ADR(env));
    return AddressUtils.getAssetAddress(programId);
  }

  /**
   * Gets the orchestrator state PDA
   * @param orchestrator The orchestrator public key
   * @returns Public key of the orchestrator state account
   */
  getOrchestratorStateAccessAddress(orchestrator: PublicKey): PublicKey {
    return AddressUtils.getOrchestratorStateAddress(
      orchestrator,
      this.programId,
    );
  }

  /**
   * Gets the order PDA for a specific order hash
   * @param orderHash The order hash
   * @returns Public key of the order account
   */
  getOrderAddress(orderHash: string): PublicKey {
    console.log(`Generating order address for order hash ${orderHash}`);
    const orderAdd = AddressUtils.getOrderAddress(orderHash, this.programId);
    console.log(`Order address: ${orderAdd.toBase58()}`);
    return orderAdd;
  }

  /**
   * Gets asset information
   * @returns Decoded asset data or null if not found
   */
  async getAsset(): Promise<DecodedAsset | null> {
    return this.assetManager.getAsset();
  }

  /**
   * Gets the available liquidity (total balance minus unclaimed fees)
   * @returns Available liquidity as bigint
   */
  async getAvailableLiquidity(): Promise<bigint> {
    return this.assetManager.getAvailableLiquidity();
  }

  /**
   * Gets the stablecoin balance of the vault
   * @returns TokenAmount with the balance
   */
  async getStablecoinBalance(): Promise<TokenAmount> {
    return this.assetManager.getStablecoinBalance();
  }

  /**
   * Gets order information for a specific order hash
   * @param orderHash The order hash to look up
   * @returns Decoded order data or null if not found
   */
  async getOrder(orderHash: string): Promise<DecodedOrder | null> {
    return this.orderManager.getOrder(orderHash);
  }

  /**
   * Gets the status of an order
   * @param orderHash The order hash to check
   * @returns The order status enum value
   */
  async getOrderStatus(orderHash: string): Promise<ORDER_STATUS> {
    return this.orderManager.getOrderStatus(orderHash);
  }

  /**
   * Creates a transaction to fill an order
   * @param params The fill order parameters
   * @returns A versioned transaction
   */
  async getFillOrderTx(
    params: FillOrderSvmParams,
  ): Promise<VersionedTransaction> {
    return this.transactionBuilder.getFillOrderTx(params);
  }

  /**
   * Creates a transaction to transfer USDC
   * @param amountIn The amount to transfer
   * @param receiver The receiver hex string
   * @param orchestrator The orchestrator public key
   * @returns A versioned transaction
   */
  async getTransferUsdcTxn(
    amountIn: string,
    receiver: string,
    orchestrator: PublicKey,
  ): Promise<VersionedTransaction> {
    return this.transactionBuilder.getTransferUsdcTxn(
      amountIn,
      receiver,
      orchestrator,
    );
  }

  /**
   * Creates a transaction to fill an order with a token transfer
   * @param params The token transfer parameters
   * @returns A versioned transaction
   */
  async getFillOrderTokenTransferTx(
    params: FillOrderTokenTransferParams,
  ): Promise<VersionedTransaction> {
    return this.transactionBuilder.getFillOrderTokenTransferTx(params);
  }

  /**
   * Creates a transaction to revert an order
   * @param params The revert order parameters
   * @returns A versioned transaction
   */
  async getRevertOrderTx(
    params: RevertOrderSvmParams,
  ): Promise<VersionedTransaction> {
    return this.transactionBuilder.getRevertOrderTx(params);
  }

  /**
   * Creates a transaction to remove bridge liquidity
   * @param params The remove liquidity parameters
   * @returns A versioned transaction
   */
  async getRemoveBridgeLiquidityTx(
    params: RemoveBridgeLiquidityParams,
  ): Promise<VersionedTransaction> {
    return this.transactionBuilder.getRemoveBridgeLiquidityTx(params);
  }
}
