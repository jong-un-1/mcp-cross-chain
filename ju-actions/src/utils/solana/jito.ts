import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import axios from 'axios';
import { JITO_RPC_URLS } from '../rpcs';
import { EnvVars } from '../../types/env-vars';

// Logger utility class
export class Logger {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  log(...args: any[]): void {
    console.log(`[${this.namespace}]`, ...args);
  }
}

// Interface for priority fee response
interface PriorityFeeResponse {
  result: {
    per_compute_unit: {
      low: number;
      medium: number;
      high: number;
    };
  };
}

// Transaction simulation results interface
export interface TXSimulationResults {
  jitoSimulations?: any;
  simsPassed: boolean;
  status: 'success' | 'error';
  error?: string;
}

// Main Jito Service class
export class JitoService {
  private readonly logger: Logger;
  private readonly DEFAULT_JITO_FEE = 200000;
  private readonly jitoTipAccounts = [
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  ];
  private readonly jitoEndpoints = [
    'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
  ];
  private readonly simulationRpcUrls: string[];

  constructor(envVars: EnvVars) {
    this.logger = new Logger('JITO');
    this.simulationRpcUrls = JITO_RPC_URLS(envVars);
  }

  /**
   * Gets a random validator key from the validator list
   */
  private getRandomValidatorKey(): PublicKey {
    const randomValidator =
      this.jitoTipAccounts[
        Math.floor(Math.random() * this.jitoTipAccounts.length)
      ];
    return new PublicKey(randomValidator);
  }

  /**
   * Gets dynamic priority fee with a 2-second timeout
   */
  public async getDynamicJitoFee(): Promise<number> {
    try {
      // Use the first RPC URL from the list
      const primaryRpcUrl = this.simulationRpcUrls.filter((url) =>
        url.includes('quiknode.pro'),
      )[0];
      if (!primaryRpcUrl) {
        this.logger.log('No valid RPC URL found for Jito fee estimation');
        return this.DEFAULT_JITO_FEE;
      }

      const data = {
        jsonrpc: '2.0',
        id: 1,
        method: 'qn_estimatePriorityFees',
        params: { last_n_blocks: 50, api_version: 2 },
      };

      // Create a timeout promise that resolves after 2 seconds
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          this.logger.log('Priority fee request timed out after 2 seconds');
          resolve(null);
        }, 2000);
      });

      // Create the axios request promise
      const requestPromise = axios.post(primaryRpcUrl, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Race between the timeout and the request
      const response = await Promise.race([requestPromise, timeoutPromise]);

      // If the timeout won the race, response will be null
      if (!response) {
        this.logger.log('Using default JITO fee due to timeout');
        return this.DEFAULT_JITO_FEE;
      }

      // Axios automatically throws on error status codes and parses JSON
      const responseData: PriorityFeeResponse = response.data;

      // Calculate fee using HIGH priority level
      const priorityFee =
        Math.ceil(responseData?.result?.per_compute_unit?.high) * 5;
      this.logger.log('Priority fee fetched:', priorityFee);

      // Ensure a minimum fee (using 5x the default as compute unit estimation)
      const calculatedFee = Math.max(priorityFee, this.DEFAULT_JITO_FEE);
      return calculatedFee;
    } catch (error) {
      this.logger.log('Error fetching priority fee levels:', error);
      this.logger.log('Using default JITO fee due to error');
      // Return default fee if there's an error
      return this.DEFAULT_JITO_FEE;
    }
  }

  /**
   * Bundles transactions for Jito processing
   */
  public async bundle(
    txs: VersionedTransaction[],
    keypair: Keypair,
    connection: Connection,
  ): Promise<string[]> {
    const abortController = new AbortController();

    try {
      const txNum = Math.ceil(txs.length / 3);
      let successNum = 0;
      const results = [];

      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      for (let i = 0; i < txNum; i++) {
        const upperIndex = (i + 1) * 3;
        const downIndex = i * 3;
        const newTxs = [];

        for (let j = downIndex; j < upperIndex; j++) {
          if (txs[j]) {
            const message = txs[j].message;
            message.recentBlockhash = latestBlockhash.blockhash;
            const txn = new VersionedTransaction(message);
            txn.sign([keypair]);
            newTxs.push(txn);
          }
        }

        const success = await this.bulldozer(
          newTxs,
          keypair,
          connection,
          abortController.signal,
        );
        const { success: successValue } = success;
        this.logger.log('successfully finished bulldozer', success);

        if (success && successValue > 0) successNum += 1;
        results.push(success);
      }
      if (successNum == 0) {
        throw new Error('No successful responses received from Jito');
      }
      const successResults = results?.[0]?.signatures?.map((signature) => {
        return signature;
      });
      if (!successResults || successResults.length == 0) {
        throw new Error(
          'Executing Order SOLANA No successful responses received from Jito - transactions failed',
        );
      }
      return successResults;
    } catch (error) {
      this.logger.log(
        'Executing Order SOLANA JITO Error during transaction execution',
        error,
      );
      return [];
    } finally {
      abortController.abort();
    }
  }

  /**
   * Send transactions to Jito block engine
   */
  public async bulldozer(
    txs: VersionedTransaction[],
    payer: Keypair,
    connection: Connection,
    abortSignal: AbortSignal,
  ) {
    try {
      // Get dynamic JITO fee instead of using constant
      const jitoFee = await this.getDynamicJitoFee();

      const jitoFeeWallet = this.getRandomValidatorKey();
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      const jitTipTxFeeMessage = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: payer.publicKey,
            toPubkey: jitoFeeWallet,
            lamports: jitoFee,
          }),
        ],
      }).compileToV0Message();

      const jitoFeeTx = new VersionedTransaction(jitTipTxFeeMessage);
      jitoFeeTx.sign([payer]);

      const serializedJitoFeeTx = bs58.encode(jitoFeeTx.serialize());
      const serializedTransactions = [
        serializedJitoFeeTx,
        ...txs.map((tx: VersionedTransaction) => bs58.encode(tx.serialize())),
      ];

      const requests = this.jitoEndpoints.map(async (url) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'sendBundle',
            params: [serializedTransactions],
          }),
          signal: abortSignal,
        });

        if (!response.ok) {
          this.logger.log('not okay response for url', url);
          return null;
        }

        return response.json();
      });
      const results = await Promise.all(requests.map((p) => p.catch((e) => e)));
      this.logger.log('Executing Order SOLANA jitoresults', { results });

      const successfulResults = results
        .filter((result) => result !== null)
        .filter((result) => !(result instanceof Error));

      if (successfulResults.length > 0) {
        txs.map((tx) =>
          this.logger.log(
            `TX Confirmed: https://solscan.io/tx/${bs58.encode(
              tx.signatures[0],
            )}`,
          ),
        );

        return {
          success: 1,
          signatures: txs.map((tx) => bs58.encode(tx.signatures[0])),
          links: txs.map(
            (tx) => `https://solscan.io/tx/${bs58.encode(tx.signatures[0])}`,
          ),
        };
      } else {
        this.logger.log(`No successful responses received for jito`);
      }

      return {
        success: 0,
        error: 'No successful responses received for jito',
      };
    } catch (error) {
      this.logger.log(
        'Executing Order SOLANA JITO Error during transaction execution',
        error,
      );
      return {
        success: 0,
        error,
      };
    }
  }

  /**
   * Simulate Jito transactions sequentially across RPC endpoints
   */
  public async simulateTransactions(
    transactions: string[],
    connection: Connection,
  ): Promise<TXSimulationResults> {
    try {
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      const encodedTransactions = await Promise.all(
        transactions.map(async (txn) => {
          const vTxn = VersionedTransaction.deserialize(bs58.decode(txn));
          vTxn.message.recentBlockhash = blockhash;
          return Buffer.from(vTxn.serialize()).toString('base64');
        }),
      );

      const data = {
        jsonrpc: '2.0',
        id: 1,
        method: 'simulateBundle',
        params: [
          {
            encodedTransactions,
          },
          {
            preExecutionAccountsConfigs: Array(encodedTransactions.length).fill(
              null,
            ),
            postExecutionAccountsConfigs: Array(
              encodedTransactions.length,
            ).fill(null),
            skipSigVerify: true,
          },
        ],
      };

      for (const url of this.simulationRpcUrls) {
        const jitoSimResp = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (jitoSimResp.status !== 200) {
          this.logger.log('Jito Simulation Error:', jitoSimResp.statusText);
          continue;
        }

        // log('Jito Simulation Response:', jitoSimResp);
        const jitoSim = await jitoSimResp.json();
        // log('Jito Simulation Response:', JSON.stringify(jitoSim));

        const simsFailed = jitoSim?.result?.value?.summary !== 'succeeded';
        if (simsFailed) {
          this.logger.log('Jito Simulation Response:', JSON.stringify(jitoSim));
        }

        return {
          jitoSimulations: jitoSim,
          simsPassed: !simsFailed,
          status: simsFailed ? 'error' : 'success',
        };
      }

      return {
        status: 'error',
        simsPassed: false,
        error: 'No successful response from all simulation RPC endpoints',
      };
    } catch (e: any) {
      this.logger.log('Error during simulation:', e);
      return {
        status: 'error',
        simsPassed: false,
        error: e.message,
      };
    }
  }
}
