import { ENVIRONMENT } from '../../../types/environment';
import { GENIUS_ACTIONS } from '../../../utils/addresses';
import { RPC_URLS } from '../../../utils/rpcs';
import { ERC725YService, ValueType } from '../erc725/erc725y.service';
import { getLitActionImplementationIdKey } from './genius-actions.const';
import { ActionTypeEnum } from './genius-actions.types';

export class GeniusActions extends ERC725YService {
  protected readonly address: string;
  protected readonly chain: number;
  protected readonly rpcUrls: string[];

  constructor(env: ENVIRONMENT, rpcUrls: { [chain: number]: string[] } = {}) {
    const contract = GENIUS_ACTIONS(env);

    const rpcs = rpcUrls[contract.chain] || RPC_URLS()[contract.chain];

    super(contract.address, rpcs);

    this.rpcUrls = rpcs;
    this.address = contract.address;
    this.chain = contract.chain;
  }

  public async getActionImplementationId(
    actionType: ActionTypeEnum,
  ): Promise<string> {
    const key = getLitActionImplementationIdKey(actionType);
    const value = await this.getData(key, ValueType.STRING);

    if (typeof value !== 'string') {
      throw new Error(`Invalid action implementation ID: ${value}`);
    }
    return value;
  }
}
