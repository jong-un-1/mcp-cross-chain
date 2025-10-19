import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { ConnectionManager } from './svm-connection-manager';
import { AddressUtils } from './svm-address-utils';
import { DecodedOrder, ORDER_STATUS } from '../constants/genius-svm-constants';

export class OrderManager {
  private connectionManager: ConnectionManager;
  private programId: PublicKey;

  /**
   * Creates an order manager
   * @param connectionManager The connection manager to use
   * @param programId The program ID
   */
  constructor(connectionManager: ConnectionManager, programId: PublicKey) {
    this.connectionManager = connectionManager;
    this.programId = programId;
  }

  /**
   * Gets order information from the program
   * @param orderHash The hash of the order to get
   * @returns Decoded order information or null if not found
   */
  async getOrder(orderHash: string): Promise<DecodedOrder | null> {
    const orderAddress = AddressUtils.getOrderAddress(
      orderHash,
      this.programId,
    );

    console.log('svm-order-manager orderAddress', orderAddress);

    try {
      return await this.connectionManager.executeWithFallback(
        async (connection) => {
          const accountInfo = await connection.getAccountInfo(
            orderAddress,
            // 'processed',
          );
          console.log('svm-order-manager accountInfo', accountInfo);

          if (!accountInfo || !accountInfo.data) {
            console.log(`Order accountInfo not found, returning null`);
            return null;
          }

          const decodedData = this.decodeOrderData(accountInfo.data);
          console.log('svm-order-manager accountInfo', decodedData);
          return decodedData;
        },
      );
    } catch (error) {
      console.error('Failed to get order', error);
      throw new Error('Failed to get order');
    }
  }

  /**
   * Decodes raw order data from the blockchain
   * @param data The raw account data
   * @returns Decoded order information
   */
  private decodeOrderData(data: Buffer): DecodedOrder {
    // Parse the fields based on the Order structure layout
    let offset = 0;

    // Discriminator (8 bytes)
    offset += 8;

    // Seed (32 bytes)
    const seedBytes = data.subarray(offset, offset + 32);
    offset += 32;

    // Amount in (u64)
    const amountIn = new BN(data.subarray(offset, offset + 8), 'le');
    offset += 8;

    // Trader (32 bytes)
    const trader = data.subarray(offset, offset + 32);
    offset += 32;

    // Receiver (32 bytes)
    const receiver = data.subarray(offset, offset + 32);
    offset += 32;

    // Source chain ID (u32)
    const srcChainId = data.readUInt32LE(offset);
    offset += 4;

    // Destination chain ID (u32)
    const destChainId = data.readUInt32LE(offset);
    offset += 4;

    // Unused i64 (8 bytes)
    const unusedI641 = new BN(data.subarray(offset, offset + 8), 'le');
    offset += 8;

    // Token in (32 bytes)
    const tokenIn = data.subarray(offset, offset + 32);
    offset += 32;

    // Status (1 byte)
    const status = data.readUInt8(offset);
    offset += 1;

    // Fee (u64)
    const fee = new BN(data.subarray(offset, offset + 8), 'le');
    offset += 8;

    // Min amount out (String)
    const minAmountOutLength = data.readUInt32LE(offset); // Read length (4 bytes)
    offset += 4;
    const minAmountOutBytes = data.subarray(
      offset,
      offset + minAmountOutLength,
    );
    const minAmountOut = new TextDecoder().decode(minAmountOutBytes); // Decode UTF-8 string
    offset += minAmountOutLength;

    // Token out (32 bytes)
    const tokenOut = data.subarray(offset, offset + 32);
    offset += 32;

    // Unused u64 (8 bytes)
    const unusedU641 = new BN(data.subarray(offset, offset + 8), 'le');

    // Return the decoded order
    return {
      seed: seedBytes,
      amountIn,
      trader,
      receiver,
      srcChainId,
      destChainId,
      unusedI641,
      tokenIn,
      fee,
      minAmountOut,
      status,
      tokenOut,
      unusedU641,
    };
  }

  /**
   * Gets the status of an order
   * @param orderHash The hash of the order to check
   * @returns The order status
   */
  async getOrderStatus(orderHash: string): Promise<ORDER_STATUS> {
    try {
      const orderInfo = await this.getOrder(orderHash);

      if (!orderInfo) {
        console.log(`Order not found, returning status Nonexistant`);
        return ORDER_STATUS.Nonexistant;
      }

      // Map the numeric status to enum values
      switch (orderInfo.status) {
        case 0:
          return ORDER_STATUS.Nonexistant;
        case 1:
          return ORDER_STATUS.Created;
        case 2:
          return ORDER_STATUS.Filled;
        case 3:
          return ORDER_STATUS.Reverted;
        default:
          return ORDER_STATUS.Nonexistant;
      }
    } catch (error) {
      console.error('Failed to get order status', error);
      throw new Error('Failed to get order status');
    }
  }
}
