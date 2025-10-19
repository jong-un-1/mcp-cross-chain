import { Contract } from 'ethers';
import { ChainId } from '../../../types/chain-id';
import { EvmArbitraryCall } from '../../../types/evm-arbitrary-call';
import { PERMIT_BATCH_TYPES } from './erc20.globals';
import { ethers } from 'ethers';
import { RPC_URLS } from '../../../utils/rpcs';
import { erc20Abi } from '../abis/erc20.abi';
import { Permit2Abi } from '../abis/permit2.abi';

import { PERMIT2_ADR } from '../../../utils/addresses';
import {
  PermitDetails,
  PermitSignatureParams,
  PermitBatch,
} from '../../../types/permit';

export class Erc20Service {
  public chain: ChainId;
  public address: string;
  public permit2Address: string;

  constructor(
    address: string,
    chain: ChainId,
    protected readonly rpcUrls: { [chain: number]: string[] } = {},
  ) {
    if ([ChainId.SOLANA, ChainId.UNKNOWN].includes(chain))
      throw new Error('Chain not supported');

    this.chain = chain;
    this.address = address;
    this.permit2Address = PERMIT2_ADR(chain);
  }

  protected getProvider(
    chain: ChainId,
    rpcIndex?: number,
  ): ethers.providers.StaticJsonRpcProvider {
    let rpcs = this.rpcUrls;
    if (!this.rpcUrls || !this.rpcUrls[chain]) {
      rpcs = RPC_URLS();
    }
    const randomIndex = Math.floor(Math.random() * rpcs[chain].length);
    return new ethers.providers.StaticJsonRpcProvider(
      rpcs[chain][rpcIndex || randomIndex],
      chain,
    );
  }

  protected getErc20Contract(): Contract {
    return new Contract(this.address, erc20Abi, this.getProvider(this.chain));
  }

  protected getPermit2Contract(): Contract {
    return new Contract(
      this.permit2Address,
      Permit2Abi,
      this.getProvider(this.chain),
    );
  }

  public async allowance(owner: string, spender: string): Promise<bigint> {
    return this.getErc20Contract().allowance(owner, spender);
  }

  public async permit2Nonce(owner: string, spender: string): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, _d, nonce] = await this.getPermit2Contract().allowance(
      owner,
      this.address,
      spender,
    );
    return nonce;
  }

  public async generatePermitDetails(
    owner: string,
    spender: string,
    amount: string,
    deadline: number,
  ): Promise<PermitDetails> {
    return {
      token: this.address,
      amount,
      expiration: deadline,
      nonce: await this.permit2Nonce(owner, spender),
    };
  }

  public async generatePermitData(
    owner: string,
    spender: string,
    amount: string,
    validityTimeSeconds: number,
  ): Promise<PermitSignatureParams> {
    const permitBatch: PermitBatch = {
      details: [
        {
          token: this.address,
          amount: amount.toString(),
          expiration: Math.floor(Date.now() / 1000) + validityTimeSeconds,
          nonce: await this.permit2Nonce(owner, spender),
        },
      ],
      spender,
      sigDeadline: (
        Math.floor(Date.now() / 1000) + validityTimeSeconds
      ).toString(),
    };

    const domain = {
      name: 'Permit2',
      chainId: this.chain,
      verifyingContract: this.permit2Address,
    };

    const permitSignDetails = {
      domain,
      types: PERMIT_BATCH_TYPES,
      message: permitBatch,
    };

    return permitSignDetails;
  }

  public async prepApproveTx(
    spender: string,
    amount: string,
  ): Promise<EvmArbitraryCall> {
    const tx = await this.getErc20Contract().approve.populateTransaction(
      spender,
      amount,
    );

    return {
      to: this.address,
      data: tx.data,
      value: '0',
    };
  }

  public async prepTransferTx(
    to: string,
    amount: string,
  ): Promise<EvmArbitraryCall> {
    const tx = await this.getErc20Contract().transfer.populateTransaction(
      to,
      amount,
    );

    return {
      to: this.address,
      data: tx.data,
      value: '0',
    };
  }

  public async prepTransferFromTx(
    from: string,
    to: string,
    amount: string,
  ): Promise<EvmArbitraryCall> {
    const tx = await this.getErc20Contract().transferFrom.populateTransaction(
      from,
      to,
      amount,
    );

    return {
      to: this.address,
      data: tx.data,
      value: '0',
    };
  }
}
