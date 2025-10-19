import { PublicKey, TokenAmount } from '@solana/web3.js';
import BN from 'bn.js';
import { ConnectionManager } from './svm-connection-manager';
import { AddressUtils } from './svm-address-utils';
import { getAssociatedTokenAccount } from '../../../../utils/solana-utils';
import { DecodedAsset } from '../constants/genius-svm-constants';

export class AssetManager {
  private connectionManager: ConnectionManager;
  private programId: PublicKey;
  private stablecoin: PublicKey;

  /**
   * Creates an asset manager
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
   * Gets asset information from the program
   * @returns Decoded asset information or null if not found
   */
  async getAsset(): Promise<DecodedAsset | null> {
    const assetAddress = AddressUtils.getAssetAddress(this.programId);

    try {
      return await this.connectionManager.executeWithFallback(
        async (connection) => {
          const accountInfo = await connection.getAccountInfo(assetAddress);

          if (!accountInfo || !accountInfo.data) {
            console.log(`Asset accountInfo not found, returning null`);
            return null;
          }

          return this.decodeAssetData(accountInfo.data);
        },
      );
    } catch (error) {
      console.error('Failed to get asset state', error);
      throw new Error('Failed to get asset state');
    }
  }

  /**
   * Decodes raw asset data from the blockchain
   * @param data The raw account data
   * @returns Decoded asset information
   */
  private decodeAssetData(data: Buffer): DecodedAsset {
    // Parse the fields based on the Asset structure layout
    let offset = 0;

    // Discriminator (8 bytes)
    offset += 8;

    // Total fee collected (u64)
    const totalFeeCollected = new BN(data.subarray(offset, offset + 8), 'le');
    offset += 8;

    // Total fee collected (u64)
    const baseFeeCollected = new BN(data.subarray(offset, offset + 8), 'le');
    offset += 8;

    // Total fee collected (u64)
    const lpFeeCollected = new BN(data.subarray(offset, offset + 8), 'le');
    offset += 8;

    // Total fee collected (u64)
    const protocolFeeCollected = new BN(
      data.subarray(offset, offset + 8),
      'le',
    );
    offset += 8;

    // Total fee collected (u64)
    const insuranceFeeCollected = new BN(
      data.subarray(offset, offset + 8),
      'le',
    );
    offset += 8;

    // Total fee collected (u64)
    const unclaimedBaseFee = new BN(data.subarray(offset, offset + 8), 'le');
    offset += 8;

    // Total fee collected (u64)
    const unclaimedLpFee = new BN(data.subarray(offset, offset + 8), 'le');
    offset += 8;

    // Total fee collected (u64)
    const unclaimedProtocolFee = new BN(
      data.subarray(offset, offset + 8),
      'le',
    );
    offset += 8;

    // Total fee collected (u64)
    const unclaimedInsuranceFee = new BN(
      data.subarray(offset, offset + 8),
      'le',
    );
    offset += 8;

    // Return the decoded asset
    return {
      totalFeeCollected,
      baseFeeCollected,
      lpFeeCollected,
      protocolFeeCollected,
      insuranceFeeCollected,
      unclaimedBaseFee,
      unclaimedLpFee,
      unclaimedProtocolFee,
      unclaimedInsuranceFee,
    };
  }

  /**
   * Gets the stablecoin balance of the vault
   * @returns The token amount
   */
  async getStablecoinBalance(): Promise<TokenAmount> {
    if (!this.stablecoin) {
      throw new Error('Stablecoin not set');
    }

    const vault = AddressUtils.getVaultAddress(this.programId);
    const stableCoinAta = getAssociatedTokenAccount(vault, this.stablecoin);

    try {
      return await this.connectionManager.executeWithFallback(
        async (connection) => {
          const response =
            await connection.getTokenAccountBalance(stableCoinAta);
          console.log(`Stablecoin balance: ${response.value.amount}`);
          return response.value;
        },
      );
    } catch (error) {
      console.error('Failed to get stable coin balance', error);
      throw new Error('Failed to get stable coin balance');
    }
  }

  /**
   * Gets available liquidity (total balance minus unclaimed fees)
   * @returns Available liquidity as bigint
   */
  async getAvailableLiquidity(): Promise<bigint> {
    console.log('Fetching available liquidity...');
    const asset = await this.getAsset();
    if (!asset) {
      throw new Error('Asset threshold not found');
    }

    const totalVaultBalance = BigInt(
      (await this.getStablecoinBalance()).amount,
    );

    console.log(`Total vault balance: ${totalVaultBalance}`);

    const unclaimedFees =
      BigInt(asset.unclaimedBaseFee.toString()) +
      BigInt(asset.unclaimedLpFee.toString()) +
      BigInt(asset.unclaimedProtocolFee.toString());

    console.log(`Unclaimed fees: ${unclaimedFees}`);

    const availableLiquidity = totalVaultBalance - unclaimedFees;

    console.log(`Available liquidity: ${availableLiquidity}`);
    return availableLiquidity;
  }
}
