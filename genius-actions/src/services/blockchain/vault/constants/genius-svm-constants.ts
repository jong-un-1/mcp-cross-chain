import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export const GLOBAL_STATE_SEED = 'genius-global-state-seed';
export const GLOBAL_AUTHORITY_SEED = 'genius-global-authority';
export const ASSET_SEED = 'asset-seed';
export const PROTOCOL_FEE_FRACTION_SEED = 'protocol-fee-fraction-seed';
export const ORCHESTRATOR_SEED = 'genius-orchestrator-seed';
export const TARGET_CHAIN_MIN_FEE_SEED = 'genius-target-chain-min-fee';
export const VAULT_SEED = 'genius-vault';
export const ORDER_SEED = 'genius-order';
export const USDC_DECIMALS: number = 6;

export const JUPITER_PROGRAM_ID = new PublicKey(
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
);

export const USDC_ADDRESS = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
);

export interface DecodedOrder {
  seed: Uint8Array;
  amountIn: BN;
  trader: Uint8Array;
  receiver: Uint8Array;
  srcChainId: number;
  destChainId: number;
  unusedI641: BN;
  tokenIn: Uint8Array;
  status: number; // Enum value for status
  fee: BN;
  minAmountOut: string;
  tokenOut: Uint8Array;
  unusedU641: BN;
}

export interface DecodedAsset {
  totalFeeCollected: BN;
  baseFeeCollected: BN;
  lpFeeCollected: BN;
  protocolFeeCollected: BN;
  insuranceFeeCollected: BN;
  unclaimedBaseFee: BN;
  unclaimedLpFee: BN;
  unclaimedProtocolFee: BN;
  unclaimedInsuranceFee: BN;
}

export enum ORDER_STATUS {
  Nonexistant = 0,
  Created = 1,
  Filled = 2,
  Reverted = 3,
}
