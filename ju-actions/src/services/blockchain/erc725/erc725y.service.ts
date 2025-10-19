import { Contract } from 'ethers';
import { ethers } from 'ethers';
import { erc725yAbi } from '../abis/erc725y.abi';

export enum ValueType {
  ADDRESS = 'address',
  UINT256 = 'uint256',
  BYTES32 = 'bytes32',
  BYTES = 'bytes',
  STRING = 'string',
  BOOL = 'bool',
}

export class ERC725YService {
  constructor(
    protected readonly address: string,
    protected readonly rpcUrls: string[],
  ) {}

  protected getProvider(
    rpcIndex?: number,
  ): ethers.providers.StaticJsonRpcProvider {
    const randomIndex = Math.floor(Math.random() * this.rpcUrls.length);
    return new ethers.providers.StaticJsonRpcProvider(
      this.rpcUrls[rpcIndex || randomIndex],
    );
  }

  protected getContract(): Contract {
    return new Contract(this.address, erc725yAbi, this.getProvider());
  }

  public async getData(
    dataKey: string,
    valueType?: ValueType,
  ): Promise<string | number | boolean | undefined> {
    const rawData = await this.getContract().getData(dataKey);
    return this.formatValue(rawData, valueType);
  }

  public async getDataBatch(
    chain: number,
    dataKeys: string[],
    valueTypes?: ValueType[],
  ): Promise<(string | number | boolean | undefined)[]> {
    const rawDataValues = await this.getContract().getDataBatch(dataKeys);

    if (!valueTypes) {
      return rawDataValues;
    }

    return rawDataValues.map((value: string, index: number) =>
      this.formatValue(value, valueTypes[index]),
    );
  }

  private formatValue(
    value: string,
    valueType?: ValueType,
  ): string | number | boolean | undefined {
    if (!value || value === '0x') {
      return undefined;
    }

    if (!valueType) {
      return value;
    }

    switch (valueType) {
      case ValueType.ADDRESS:
        return ethers.utils.getAddress(ethers.utils.hexDataSlice(value, 12));
      case ValueType.UINT256:
        return ethers.BigNumber.from(value).toString();
      case ValueType.BYTES32:
        return value;
      case ValueType.BYTES:
        return value;
      case ValueType.STRING:
        try {
          return ethers.utils.toUtf8String(value);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e: any) {
          console.error(
            `Failed to convert ${value} to string: ${e.message}, returning raw value`,
          );
          return value;
        }
      case ValueType.BOOL:
        return value === '0x01';
      default:
        return value;
    }
  }
}
