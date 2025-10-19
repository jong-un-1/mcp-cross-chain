export type EvmArbitraryCall = {
  from?: string;
  to: string;
  data: string;
  value: string;
  gasPrice?: string;
  gasLimit?: string;
};
