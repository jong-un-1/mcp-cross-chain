import {
  AccountMeta,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { Buffer } from 'buffer';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import { ConnectionManager } from './svm-connection-manager';
import { AddressUtils } from './svm-address-utils';
import { GeniusEvmVault } from '../../vault/genius-evm-vault';
import { getAssociatedTokenAccount } from '../../../../utils/solana-utils';

import {
  hexToPublicKey,
  stringToUint8Array,
  uint32ToBufferLE,
} from '../../../../utils/string-to-bytes32';
import {
  FillOrderSvmParams,
  FillOrderTokenTransferParams,
  RemoveBridgeLiquidityParams,
  RevertOrderSvmParams,
} from '../vault.types';
import { USDC_DECIMALS } from '../constants/genius-svm-constants';

// Define instruction discriminator constants
const INSTRUCTION_DISCRIMINATORS = {
  FILL_ORDER: Buffer.from([232, 122, 115, 25, 199, 143, 136, 162]),
  FILL_ORDER_TOKEN_TRANSFER: Buffer.from([
    236, 90, 146, 166, 223, 97, 164, 222,
  ]),
  REVERT_ORDER: Buffer.from([74, 239, 245, 154, 77, 42, 141, 19]),
  REMOVE_BRIDGE_LIQUIDITY: Buffer.from([179, 49, 66, 73, 130, 250, 201, 55]),
};

export class TransactionBuilder {
  private connectionManager: ConnectionManager;
  private programId: PublicKey;
  private stablecoin: PublicKey;

  /**
   * Creates a transaction builder
   * @param connectionManager The connection manager to use
   * @param programId The program ID
   * @param stablecoin The stablecoin address
   */
  constructor(
    connectionManager: ConnectionManager,
    programId: PublicKey,
    stablecoin: PublicKey,
  ) {
    this.connectionManager = connectionManager;
    this.programId = programId;
    this.stablecoin = stablecoin;
  }

  /**
   * Creates and returns a versioned transaction
   * @param instructions The instructions to include in the transaction
   * @param payer The payer public key
   * @returns A versioned transaction
   */
  private async createVersionedTransaction(
    instructions: TransactionInstruction[],
    payer: PublicKey,
  ): Promise<VersionedTransaction> {
    try {
      return await this.connectionManager.executeWithFallback(
        async (connection) => {
          const blockhash = (await connection.getLatestBlockhash()).blockhash;
          return new VersionedTransaction(
            new TransactionMessage({
              instructions,
              payerKey: payer,
              recentBlockhash: blockhash,
            }).compileToV0Message(),
          );
        },
      );
    } catch (error) {
      throw new Error(`Failed to create versioned transaction: ${error}`);
    }
  }

  /**
   * Helper to safely convert hex string to PublicKey
   * @param hexString The hex string to convert
   * @returns The converted PublicKey
   */
  private hexStringToPublicKey(hexString: string): PublicKey {
    try {
      return hexToPublicKey(hexString);
    } catch (e) {
      throw new Error(`Failed to convert hex string to PublicKey: ${e}`);
    }
  }

  /**
   * Creates a transaction to fill an order
   * @param params The parameters for filling an order
   * @returns A versioned transaction
   */
  async getFillOrderTx(
    params: FillOrderSvmParams,
  ): Promise<VersionedTransaction> {
    const order = params.order;

    // Convert hex strings to PublicKeys
    const receiver = this.hexStringToPublicKey(order.receiver);
    const tokenOut = this.hexStringToPublicKey(order.tokenOut);

    // Get all required addresses
    const orderAddress = AddressUtils.getOrderAddress(
      params.orderHash,
      this.programId,
    );
    const orchestratorState = AddressUtils.getOrchestratorStateAddress(
      params.orchestrator,
      this.programId,
    );
    const globalState = AddressUtils.getGlobalStateAddress(this.programId);
    const asset = AddressUtils.getAssetAddress(this.programId);
    const vault = AddressUtils.getVaultAddress(this.programId);

    // Get token accounts
    const ataOrchestrator = getAssociatedTokenAccount(
      params.orchestrator,
      this.stablecoin,
    );
    const ataVault = getAssociatedTokenAccount(vault, this.stablecoin);

    // Create instruction keys
    const keys: AccountMeta[] = [
      { pubkey: params.orchestrator, isSigner: true, isWritable: true },
      { pubkey: receiver, isSigner: false, isWritable: true },
      { pubkey: orchestratorState, isSigner: false, isWritable: false },
      { pubkey: globalState, isSigner: false, isWritable: false },
      { pubkey: asset, isSigner: false, isWritable: false },
      { pubkey: ataOrchestrator, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: false },
      { pubkey: ataVault, isSigner: false, isWritable: true },
      { pubkey: this.stablecoin, isSigner: false, isWritable: false },
      { pubkey: tokenOut, isSigner: false, isWritable: true },
      { pubkey: orderAddress, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    // Encode minAmountOut as a string
    const minAmountOutBuffer = new TextEncoder().encode(order.minAmountOut);
    const minAmountOutLengthBuffer = Buffer.alloc(4);
    minAmountOutLengthBuffer.writeUInt32LE(minAmountOutBuffer.length, 0);

    // Concatenate length + data
    const minAmountOutEncoded = Buffer.concat([
      minAmountOutLengthBuffer,
      minAmountOutBuffer,
    ]);

    // Build instruction data
    const data = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.FILL_ORDER,
      new BN(order.amountIn).toArrayLike(Buffer, 'le', 8), // amount (u64)
      stringToUint8Array(order.seed), // seed (32 bytes)
      stringToUint8Array(params.orderHash), // order hash (32 bytes)
      stringToUint8Array(order.trader), // trader (32 bytes)
      uint32ToBufferLE(Number(order.srcChainId)), // src_chain_id (u32)
      uint32ToBufferLE(Number(order.destChainId)), // dest_chain_id (u32)
      stringToUint8Array(order.tokenIn), // token_in (32 bytes)
      new BN(order.fee).toArrayLike(Buffer, 'le', 8), // fee (u64)
      minAmountOutEncoded, // min_amount_out as a UTF-8 Uint8Array
    ]);

    // Create the instruction and return transaction
    const fillOrderIx = new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });

    return this.createVersionedTransaction([fillOrderIx], params.orchestrator);
  }

  /**
   * Creates a transaction to transfer USDC
   * @param amountIn The amount to transfer
   * @param receiver The receiver (hex string)
   * @param orchestrator The orchestrator public key
   * @returns A versioned transaction
   */
  async getTransferUsdcTxn(
    amountIn: string,
    receiver: string,
    orchestrator: PublicKey,
  ): Promise<VersionedTransaction> {
    // Convert receiver to PublicKey
    const receiverPk = this.hexStringToPublicKey(receiver);
    const tokenMint = this.stablecoin;
    const tokenDecimal: number = USDC_DECIMALS;

    const ataReceiver = getAssociatedTokenAccount(receiverPk, tokenMint);
    let ataReceiverInx: TransactionInstruction | null = null;

    // Check if receiver's ATA exists
    try {
      await this.connectionManager.executeWithFallback(async (connection) => {
        const accountInfo = await connection.getAccountInfo(ataReceiver);

        if (!accountInfo || !accountInfo.data) {
          console.log('Receiver ATA not found, creating one');
          ataReceiverInx = createAssociatedTokenAccountInstruction(
            orchestrator,
            ataReceiver,
            receiverPk,
            tokenMint,
          );
        }
        return true;
      });
    } catch (error) {
      console.error('Failed to check receiver ATA', error);
    }

    // Create transfer instruction
    const ataOrchestrator = getAssociatedTokenAccount(orchestrator, tokenMint);
    const transferInstruction = createTransferCheckedInstruction(
      ataOrchestrator,
      tokenMint,
      ataReceiver,
      orchestrator,
      BigInt(amountIn),
      tokenDecimal,
    );

    // Build instructions array
    const instructions = [];
    if (ataReceiverInx) {
      instructions.push(ataReceiverInx);
    }
    instructions.push(transferInstruction);

    return this.createVersionedTransaction(instructions, orchestrator);
  }

  /**
   * Creates a transaction to fill an order with a token transfer
   * @param params The parameters for the token transfer
   * @returns A versioned transaction
   */
  async getFillOrderTokenTransferTx(
    params: FillOrderTokenTransferParams,
  ): Promise<VersionedTransaction> {
    const order = params.order;

    // Convert hex strings to PublicKeys
    const receiver = this.hexStringToPublicKey(order.receiver);
    const tokenOut = this.hexStringToPublicKey(order.tokenOut);

    // Get required addresses
    const orchestratorState = AddressUtils.getOrchestratorStateAddress(
      params.orchestrator,
      this.programId,
    );
    const globalState = AddressUtils.getGlobalStateAddress(this.programId);

    // Get token accounts
    const receiverTokenOutATA = getAssociatedTokenAccount(receiver, tokenOut);
    const orchestratorTokenOutATA = getAssociatedTokenAccount(
      params.orchestrator,
      tokenOut,
    );

    // Get orchestrator's token balance
    let orchestratorTokenOutATABalance: string = '0';
    try {
      orchestratorTokenOutATABalance =
        await this.connectionManager.executeWithFallback(async (connection) => {
          return (
            await connection.getTokenAccountBalance(orchestratorTokenOutATA)
          ).value.amount;
        });
    } catch (error) {
      console.error('Failed to get token account balance', error);
    }

    // Create instruction keys
    const keys: AccountMeta[] = [
      { pubkey: params.orchestrator, isSigner: true, isWritable: true },
      { pubkey: receiver, isSigner: false, isWritable: true },
      { pubkey: globalState, isSigner: false, isWritable: false },
      { pubkey: orchestratorState, isSigner: false, isWritable: false },
      { pubkey: orchestratorTokenOutATA, isSigner: false, isWritable: true },
      { pubkey: receiverTokenOutATA, isSigner: false, isWritable: true },
      { pubkey: tokenOut, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    // Build instruction data
    const data = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.FILL_ORDER_TOKEN_TRANSFER,
      new BN(order.minAmountOut).toArrayLike(Buffer, 'le', 8), // minAmountOut (u64)
      new BN(orchestratorTokenOutATABalance).toArrayLike(Buffer, 'le', 8), // previousBalance (u64)
    ]);

    // Create the instruction
    const fillOrderTokenTransferIx = new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });

    return this.createVersionedTransaction(
      [fillOrderTokenTransferIx],
      params.orchestrator,
    );
  }

  /**
   * Creates a transaction to revert an order
   * @param params The parameters for reverting an order
   * @returns A versioned transaction
   */
  async getRevertOrderTx(
    params: RevertOrderSvmParams,
  ): Promise<VersionedTransaction> {
    const order = params.order;

    // Get required addresses
    const orchestratorState = AddressUtils.getOrchestratorStateAddress(
      params.orchestrator,
      this.programId,
    );
    const globalState = AddressUtils.getGlobalStateAddress(this.programId);
    const asset = AddressUtils.getAssetAddress(this.programId);
    const orderHash = GeniusEvmVault.getOrderHash(order);
    const orderAddress = AddressUtils.getOrderAddress(
      orderHash,
      this.programId,
    );
    const vault = AddressUtils.getVaultAddress(this.programId);

    // Convert trader to PublicKey
    const trader = this.hexStringToPublicKey(order.trader);

    // Get token accounts
    const ataTrader = getAssociatedTokenAccount(trader, this.stablecoin);
    const ataVault = getAssociatedTokenAccount(vault, this.stablecoin);

    // Create instruction keys
    const keys: AccountMeta[] = [
      { pubkey: params.orchestrator, isSigner: true, isWritable: true },
      { pubkey: trader, isSigner: true, isWritable: true },
      { pubkey: orchestratorState, isSigner: false, isWritable: false },
      { pubkey: globalState, isSigner: false, isWritable: false },
      { pubkey: asset, isSigner: false, isWritable: true },
      { pubkey: orderAddress, isSigner: false, isWritable: true },
      { pubkey: ataTrader, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: false },
      { pubkey: ataVault, isSigner: false, isWritable: true },
      { pubkey: this.stablecoin, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    // Build instruction data
    const data = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.REVERT_ORDER,
      stringToUint8Array(order.seed),
    ]);

    // Create the instruction
    const revertOrderIx = new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });

    return this.createVersionedTransaction(
      [revertOrderIx],
      params.orchestrator,
    );
  }

  /**
   * Creates a transaction to remove bridge liquidity
   * @param params The parameters for removing bridge liquidity
   * @returns A versioned transaction
   */
  async getRemoveBridgeLiquidityTx(
    params: RemoveBridgeLiquidityParams,
  ): Promise<VersionedTransaction> {
    // Get required addresses
    const orchestratorState = AddressUtils.getOrchestratorStateAddress(
      params.orchestrator,
      this.programId,
    );
    const globalState = AddressUtils.getGlobalStateAddress(this.programId);
    const asset = AddressUtils.getAssetAddress(this.programId);
    const vault = AddressUtils.getVaultAddress(this.programId);

    // Get token accounts
    const ataOrchestrator = getAssociatedTokenAccount(
      params.orchestrator,
      this.stablecoin,
    );
    const ataVault = getAssociatedTokenAccount(vault, this.stablecoin);

    // Create instruction keys
    const keys: AccountMeta[] = [
      { pubkey: params.orchestrator, isSigner: true, isWritable: true },
      { pubkey: globalState, isSigner: false, isWritable: false },
      { pubkey: asset, isSigner: false, isWritable: false },
      { pubkey: orchestratorState, isSigner: false, isWritable: false },
      { pubkey: ataOrchestrator, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: false },
      { pubkey: ataVault, isSigner: false, isWritable: true },
      { pubkey: this.stablecoin, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    // Build instruction data
    const data = Buffer.concat([
      INSTRUCTION_DISCRIMINATORS.REMOVE_BRIDGE_LIQUIDITY,
      new BN(params.amount).toArrayLike(Buffer, 'le', 8), // amount (u64)
    ]);

    // Create the instruction
    const removeBridgeLiquidityIx = new TransactionInstruction({
      keys,
      programId: this.programId,
      data,
    });

    return this.createVersionedTransaction(
      [removeBridgeLiquidityIx],
      params.orchestrator,
    );
  }
}
