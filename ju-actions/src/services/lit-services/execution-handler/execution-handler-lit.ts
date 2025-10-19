// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { BigNumber, ethers } from 'ethers';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { IExecutionHandler } from './execution-handler.interface';
import { ChainId } from '../../../types/chain-id';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { LitHelpers } from '../lit-helpers/lit-helpers';
import { RPC_URLS } from '../../../utils/rpcs';
import { encodeSignature } from '../../../utils/encode-signature';
import { hashMessage } from 'ethers/lib/utils';
import { EnvVars } from '../../../types/env-vars';
import { JitoService } from '../../../utils/solana/jito';

export class ExecutionHandlerLit implements IExecutionHandler {
  protected readonly defaultGasLimit = 10_000_000;
  protected readonly gasLimitBuffer = 1.2;
  protected readonly litHelpers = new LitHelpers();

  constructor(
    protected readonly evmPkpPublicKey?: string,
    protected readonly evmAddress?: string,
    protected readonly privateKeySolana?: string,
    protected readonly rpcUrls?: { [chain: number]: string[] },
  ) {}

  public async executeEvm(
    chain: ChainId,
    executionData: EvmArbitraryCall,
  ): Promise<string> {
    const time = new Date().getTime();
    if (chain === ChainId.SOLANA) throw new Error('Chain not supported');

    console.log(
      `Executing EVM transaction on chain ${chain}`,
      JSON.stringify(executionData),
    );

    const provider = this.getProvider(chain);

    console.log(`Executing using provider: ${provider.connection.url}`);

    const txToMsg = (tx: any) => {
      return ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.arrayify(ethers.utils.serializeTransaction(tx)),
        ),
      );
    };

    try {
      // Properly handle the value conversion
      let formattedValue;
      if (executionData.value) {
        try {
          // First try to convert the value to BigNumber
          const bigNumberValue = ethers.BigNumber.from(executionData.value);
          formattedValue = bigNumberValue.toHexString();
        } catch (error) {
          console.warn('Error converting value to BigNumber:', error);
          // Fallback to zero if conversion fails
          formattedValue = ethers.utils.hexlify(0);
        }
      } else {
        formattedValue = ethers.utils.hexlify(0);
      }

      console.log('Formatted value:', formattedValue);

      let gasPrice = executionData.gasPrice;
      const internalCallId = ethers.utils
        .keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(executionData)))
        .slice(0, 10);

      console.log(
        'time taken before gasPrice fetching:',
        new Date().getTime() - time,
      );
      if (!gasPrice) {
        gasPrice = await this.litHelpers.runOnce(
          {
            waitForResponse: true,
            name: `getGasPrice:${internalCallId}`,
          },
          async () => {
            const gasPrice = await provider.getGasPrice();
            return gasPrice.toHexString();
          },
        );
      }
      console.log(
        `Time taken to after get gasPrice: ${new Date().getTime() - time}`,
      );

      // Prepare transaction data with proper value formatting
      const txData = {
        to: executionData.to,
        data: executionData.data,
        value: formattedValue,
        gasPrice,
        nonce: await provider.getTransactionCount(this.evmAddress!, 'latest'),
      };

      console.log('Transaction data:', JSON.stringify(txData));

      let gasLimit: string;
      if (executionData.gasLimit) {
        gasLimit = executionData.gasLimit;
      } else {
        console.log(
          `Time taken to before estimate gas: ${new Date().getTime() - time}`,
        );
        try {
          const estimatedGas = await this.litHelpers.runOnce(
            {
              waitForResponse: true,
              name: `estimateGas:${internalCallId}`,
            },
            async () => {
              try {
                const gasEstimation = await provider.estimateGas({
                  ...txData,
                  from: this.evmAddress,
                });
                return gasEstimation;
              } catch (error) {
                return error.message;
              }
            },
          );
          console.log(
            `Time taken to after estimate gas: ${new Date().getTime() - time}`,
          );
          console.log(`Estimated gas: ${estimatedGas}`);

          gasLimit =
            estimatedGas && !isNaN(estimatedGas)
              ? Math.ceil(
                  parseInt(estimatedGas) * this.gasLimitBuffer,
                ).toString()
              : this.defaultGasLimit.toString();

          console.log('Estimated gas limit:', gasLimit);
        } catch (error) {
          console.warn(
            'Gas estimation failed, using default gas limit:',
            error,
          );
          gasLimit = this.defaultGasLimit.toString();
        }
      }

      const transaction = {
        ...txData,
        gasLimit: BigNumber.from(gasLimit).toHexString(),
        gasPrice: BigNumber.from(txData.gasPrice).toHexString(),
        chainId: chain,
      };

      console.log('Final transaction:', JSON.stringify(transaction));

      const messageHash = txToMsg(transaction);

      console.log('Message hash:', messageHash);
      console.log('Public key:', this.evmPkpPublicKey);

      console.log(
        `Time taken to before signAndCombineEcdsa: ${new Date().getTime() - time}`,
      );
      console.log(
        `Signing with sign name: pkpSignature${messageHash.toString().slice(0, 10)}`,
      );
      const signature = await Lit.Actions.signAndCombineEcdsa({
        toSign: messageHash,
        publicKey: this.evmPkpPublicKey?.startsWith('0x')
          ? this.evmPkpPublicKey.split('0x')[1]
          : this.evmPkpPublicKey,
        sigName: `pkpSignature:${internalCallId}`,
      });
      console.log(
        `Time taken to after signAndCombineEcdsa: ${new Date().getTime() - time}`,
      );

      console.log('Signature:', signature);

      const signedTx = ethers.utils.serializeTransaction(
        transaction,
        encodeSignature(signature),
      );

      console.log('Signed Txn:', signedTx);

      console.log(`
        Time taken to before transaction execution: ${
          new Date().getTime() - time
        }
      `);
      const resp = await this.litHelpers.runOnce(
        {
          waitForResponse: true,
          name: `executeEvm:${internalCallId}`,
        },
        async () => {
          try {
            const tx = await provider.sendTransaction(signedTx);
            return tx.hash;
          } catch (error: any) {
            return error.message;
          }
        },
      );
      console.log(`
        Time taken to after transaction execution: ${
          new Date().getTime() - time
        }
      `);

      return resp;
    } catch (error) {
      console.error('Transaction execution failed:', error);
      throw error;
    }
  }

  public getSolanaSigner(chain: ChainId): Keypair {
    if (chain !== ChainId.SOLANA) throw new Error('Chain not supported');

    const secretKey = bs58.decode(this.privateKeySolana || '');
    const keypair = Keypair.fromSecretKey(secretKey);

    return keypair;
  }

  public async signEvm(message: ethers.utils.Bytes | string): Promise<string> {
    const internalCallId = ethers.utils
      .keccak256(ethers.utils.toUtf8Bytes(JSON.stringify(message)))
      .slice(0, 10);
    const startTime = new Date().getTime();
    console.log(`Siging with sign name: pkpSignature${internalCallId}`);
    const toSign = ethers.utils.arrayify(hashMessage(message));
    console.log(`Signing message: ${toSign} with address ${this.evmAddress}`);

    const signature = await Lit.Actions.signAndCombineEcdsa({
      toSign,
      publicKey: this.evmPkpPublicKey?.startsWith('0x')
        ? this.evmPkpPublicKey.split('0x')[1]
        : this.evmPkpPublicKey,
      sigName: `pkpSignature:${internalCallId}`,
    });
    console.log(
      `Time taken to after pkpSignature${internalCallId}: ${new Date().getTime() - startTime}`,
    );
    return signature;
  }

  public async signSvm(txn: string): Promise<string> {
    const transaction = VersionedTransaction.deserialize(bs58.decode(txn));
    const signer = await this.getSolanaSigner(ChainId.SOLANA);
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

    const txns = [];
    for (const txn of transactions) {
      txn.sign([keypair]);
      txns.push(bs58.encode(txn.serialize()));
    }

    const resp = await Lit.Actions.runOnce(
      { waitForResponse: true, name: 'execute_solana' },
      async () => {
        const jitoService = new JitoService(envVars);

        const connection = await this.getSolanaProvider(chain);
        const res = await jitoService.bundle(transactions, keypair, connection);
        return res;
      },
    );
    return resp;
  }

  protected getProvider(
    chain: ChainId,
  ): ethers.providers.StaticJsonRpcProvider {
    const rpcUrl = this.rpcUrls ? this.rpcUrls[chain][0] : RPC_URLS()[chain][0];
    return new ethers.providers.StaticJsonRpcProvider(rpcUrl, chain);
  }

  public getSolanaProvider(chain: ChainId): Connection {
    const rpcUrl = this.rpcUrls ? this.rpcUrls[chain][0] : RPC_URLS()[chain][0];
    return new Connection(rpcUrl);
  }
}
