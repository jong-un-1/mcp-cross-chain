import { ethers } from 'ethers';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { IExecutionHandler } from './execution-handler.interface';
import { ChainId } from '../../../types/chain-id';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { EnvVars } from '../../../types/env-vars';
import { JitoService } from '../../../utils/solana/jito';

export class ExecutionHandler implements IExecutionHandler {
  protected readonly defaultGasLimit = 1_000_000; // Fallback gas limit
  protected readonly gasLimitBuffer = 1.1; // Add 10% buffer to estimated gas

  constructor(
    protected readonly privateKeyEvm?: string,
    protected readonly privateKeySolana?: string,
    protected readonly rpcUrls: { [chain: number]: string[] } = {},
  ) {}

  public async executeEvm(
    chain: ChainId,
    executionData: EvmArbitraryCall,
  ): Promise<string> {
    if (chain === ChainId.SOLANA) throw new Error('Chain not supported');

    console.log('executionData=>', executionData);

    const provider = this.getProvider(chain);
    const wallet = new ethers.Wallet(this.privateKeyEvm || '', provider);

    // Prepare transaction data
    const txData = {
      to: executionData.to,
      data: executionData.data,
      value: executionData.value,
      nonce: await provider.getTransactionCount(wallet.address),
      gasPrice: executionData.gasPrice || (await provider.getGasPrice()),
    };

    // Estimate gas if not provided
    let gasLimit: string;
    if (executionData.gasLimit) {
      gasLimit = executionData.gasLimit;
    } else {
      try {
        const estimatedGas = await provider.estimateGas({
          ...txData,
          from: wallet.address,
        });

        // Add buffer to estimated gas
        gasLimit = Math.ceil(
          estimatedGas.toNumber() * this.gasLimitBuffer,
        ).toString();

        console.log('Estimated gas limit:', gasLimit);
      } catch (error) {
        console.warn('Gas estimation failed, using default gas limit:', error);
        gasLimit = this.defaultGasLimit.toString();
      }
    }
    console.log('Sending txn', {
      ...txData,
      gasLimit,
    });
    // Send transaction with final gas limit
    const res = await wallet.sendTransaction({
      ...txData,
      gasLimit,
    });
    console.log(`Txn hash: ${res.hash}`);
    return res.hash;
  }

  public async signEvm(message: ethers.utils.Bytes | string): Promise<string> {
    const wallet = new ethers.Wallet(this.privateKeyEvm || '');
    const signature = await wallet.signMessage(message);
    return signature;
  }

  public getSolanaSigner(chain: ChainId): Keypair {
    if (chain !== ChainId.SOLANA) throw new Error('Chain not supported');

    const secretKey = bs58.decode(this.privateKeySolana || '');
    const keypair = Keypair.fromSecretKey(secretKey);

    return keypair;
  }

  public async signSvm(txn: string): Promise<string> {
    const transaction = VersionedTransaction.deserialize(bs58.decode(txn));
    const signer = this.getSolanaSigner(ChainId.SOLANA);
    transaction.sign([signer]);
    const signedTxn = bs58.encode(transaction.serialize());
    return signedTxn;
  }

  public async executeSolana(
    chain: ChainId,
    transactions: VersionedTransaction[],
    envVars: EnvVars,
  ) {
    const keypair = await this.getSolanaSigner(chain);

    const jitoService = new JitoService(envVars);

    const connection = await this.getSolanaProvider(chain);
    const res = await jitoService.bundle(transactions, keypair, connection);
    return res;
  }

  protected getProvider(
    chain: ChainId,
  ): ethers.providers.StaticJsonRpcProvider {
    const rpcUrl = this.rpcUrls[chain][0];
    return new ethers.providers.StaticJsonRpcProvider(rpcUrl, chain);
  }

  public getSolanaProvider(chain: ChainId): Connection {
    const rpcUrl = this.rpcUrls[chain][0];
    return new Connection(rpcUrl);
  }
}
