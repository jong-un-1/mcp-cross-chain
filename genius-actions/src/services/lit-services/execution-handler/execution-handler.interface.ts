import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import { ChainId } from '../../../types/chain-id';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { EnvVars } from '../../../types/env-vars';

export interface IExecutionHandler {
  executeEvm: (
    chain: ChainId,
    executionData: EvmArbitraryCall,
  ) => Promise<string>;
  signEvm: (message: string) => Promise<string>;
  signSvm: (txn: string) => Promise<string>;
  executeSolana: (
    chain: ChainId,
    transactions: VersionedTransaction[],
    envVars: EnvVars,
  ) => Promise<string[]>;
  getSolanaSigner: (chainId: ChainId) => Keypair;
  getSolanaProvider: (chainId: ChainId) => Connection;
}
