import { PublicKey } from '@solana/web3.js';

export type Order = {
  seed: string;
  trader: string;
  receiver: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  srcChainId: string;
  destChainId: string;
  fee: string;
};

export type FillOrderParams = {
  order: Order;
  swapTarget: string;
  swapData: string;
  callTarget: string;
  callData: string;
};

export type FillOrderBatchParams = {
  orders: Order[];
  swapsTargets: string[];
  swapsData: string[];
  callsTargets: string[];
  callsData: string[];
};

export type FillOrderSvmParams = {
  order: Order;
  orchestrator: PublicKey;
  orderHash: string;
};

export type FillOrderTokenTransferParams = {
  order: Order;
  orchestrator: PublicKey;
};

export type RevertOrderSvmParams = {
  order: Order;
  orchestrator: PublicKey;
};

export type RemoveBridgeLiquidityParams = {
  orchestrator: PublicKey;
  amount: string;
};

export enum ORDER_STATUS {
  Nonexistant,
  Created,
  Filled,
  Reverted,
}
