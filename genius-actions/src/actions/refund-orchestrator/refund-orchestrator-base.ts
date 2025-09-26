import { ethers } from 'ethers';
import { ChainId } from '../../types/chain-id';
import { OWNER_ADR_EVM } from '../../utils/addresses';
import { RPC_URLS } from '../../utils/rpcs';
import { validateEthSignature } from '../../utils/validate-eth-signature';
import { ENVIRONMENT } from '../../types/environment';
import { EnvVars } from '../../types/env-vars';
import { IExecutionHandler } from '../../services/lit-services/execution-handler/execution-handler.interface';
import { ILitHelpers } from '../../services/lit-services/lit-helpers/lit-helpers.interface';

export const refundOrchestratorBase = async (
  executor: IExecutionHandler,
  litHelpers: ILitHelpers,
  chainId: ChainId,
  orchestratorAddress: string,
  ownerSignature: string,
  env: ENVIRONMENT,
  envVars: EnvVars,
  gasLimit?: string,
  gasPrice?: string,
): Promise<string> => {
  const message = `REFUND_ORCHESTRATOR_${orchestratorAddress}`;
  console.log(`Message: ${message}`);
  if (!validateEthSignature(message, ownerSignature, OWNER_ADR_EVM(env))) {
    throw new Error('Invalid signature');
  }

  const rpcs = RPC_URLS(envVars)[chainId];

  let balance: string | undefined = undefined;

  for (const rpc of rpcs) {
    try {
      const provider = new ethers.providers.StaticJsonRpcProvider(rpc, chainId);
      balance = (await provider.getBalance(orchestratorAddress)).toString();
      if (balance && BigInt(balance) > 0) {
        break;
      }
    } catch (e) {
      console.error(`Failed to get balance from ${rpc}: ${e}`);
    }
  }

  if (!balance || BigInt(balance) <= BigInt(0)) {
    throw new Error('No balance found');
  }

  console.log(`Balance: ${balance}`);

  if (!gasPrice) {
    gasPrice = await litHelpers.runOnce(
      {
        waitForResponse: true,
        name: 'getGasPrice',
      },
      async () => {
        let gasPrice: string | undefined = undefined;
        for (const rpc of rpcs) {
          try {
            const provider = new ethers.providers.StaticJsonRpcProvider(
              rpc,
              chainId,
            );
            gasPrice = (await provider.getGasPrice()).toString();
            if (gasPrice) {
              return gasPrice;
            }
          } catch (e) {
            console.error(`Failed to get gas price from ${rpc}: ${e}`);
          }
        }
      },
    );

    if (!gasPrice) throw new Error('No gas price found');
  }

  if (!gasLimit) {
    const dumiTransferTxn = {
      to: OWNER_ADR_EVM(env),
      from: orchestratorAddress,
      value: ethers.utils.parseEther('0.0001'),
    };

    gasLimit = await litHelpers.runOnce(
      {
        waitForResponse: true,
        name: 'estimateGas',
      },
      async () => {
        for (const rpc of rpcs) {
          try {
            const provider = new ethers.providers.StaticJsonRpcProvider(
              rpc,
              chainId,
            );
            return (await provider.estimateGas(dumiTransferTxn)).toString();
          } catch (e) {
            console.error(`Failed to estimate gas from ${rpc}: ${e}`);
          }
        }
      },
    );
  }

  if (!gasLimit) throw new Error('No gas limit found');

  const gasCost = BigInt(gasLimit) * BigInt(gasPrice);
  const buffer = BigInt(1000000000000); // Extra buffer for safety
  const safeTransferAmount = BigInt(balance) - gasCost - buffer;

  if (safeTransferAmount <= 0) {
    throw new Error('Insufficient balance for transfer after gas costs');
  }

  const transferEthTxn = {
    to: OWNER_ADR_EVM(env),
    value: safeTransferAmount.toString(),
    data: '',
    gasLimit,
    gasPrice,
  };

  const tx = await executor.executeEvm(chainId, transferEthTxn);

  return tx;
};
