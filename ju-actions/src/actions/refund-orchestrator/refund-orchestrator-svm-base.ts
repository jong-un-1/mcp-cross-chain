import { ChainId } from '../../types/chain-id';
import { OWNER_ADR_EVM, SOLANA_OWNER_ADR } from '../../utils/addresses';
import { RPC_URLS } from '../../utils/rpcs';
import { validateEthSignature } from '../../utils/validate-eth-signature';
import { ENVIRONMENT } from '../../types/environment';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { EnvVars } from '../../types/env-vars';
import { IExecutionHandler } from '../../services/lit-services/execution-handler/execution-handler.interface';
import { ILitHelpers } from '../../services/lit-services/lit-helpers/lit-helpers.interface';

export const refundOrchestratorSvmBase = async (
  executor: IExecutionHandler,
  litHelpers: ILitHelpers,
  chainId: ChainId,
  orchestratorAddress: string,
  ownerSignature: string,
  env: ENVIRONMENT,
  envVars: EnvVars,
  priorityFee?: number,
): Promise<string> => {
  const message = `REFUND_ORCHESTRATOR_SOL_${orchestratorAddress}`;
  console.log(`Message: ${message}`);
  if (!validateEthSignature(message, ownerSignature, OWNER_ADR_EVM(env))) {
    throw new Error('Invalid signature');
  }

  const rpcs = RPC_URLS()[chainId];

  let balance: number | undefined = undefined;
  let connection: Connection | undefined = undefined;

  // Try each RPC until we get a balance
  for (const rpc of rpcs) {
    try {
      connection = new Connection(rpc, 'confirmed');
      balance = await connection.getBalance(new PublicKey(orchestratorAddress));
      if (balance && balance > 0) {
        break;
      }
    } catch (e) {
      console.error(`Failed to get balance from ${rpc}: ${e}`);
    }
  }

  if (!connection) {
    throw new Error('Could not connect to any RPC');
  }

  if (!balance || balance <= 0) {
    throw new Error('No balance found');
  }

  console.log(`Balance: ${balance}`);
  // Get latest blockhash and fee information
  const blockHashAndFeeDataStr = await litHelpers.runOnce(
    {
      waitForResponse: true,
      name: 'getLatestBlockhashAndFee',
    },
    async () => {
      try {
        // Get the latest blockhash
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash('confirmed');

        // Create a dummy transaction to calculate the fee
        const dummyTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(orchestratorAddress),
            toPubkey: new PublicKey(SOLANA_OWNER_ADR(env)),
            lamports: 1000, // Dummy amount
          }),
        );
        dummyTx.feePayer = new PublicKey(orchestratorAddress);
        dummyTx.recentBlockhash = blockhash;

        // Get the fee for this transaction
        const fee = await connection.getFeeForMessage(
          dummyTx.compileMessage(),
          'confirmed',
        );

        // Return stringified data
        return JSON.stringify({
          blockhash,
          lastValidBlockHeight,
          fee: fee?.value || 5000, // Default to 5000 lamports if null
        });
      } catch (e) {
        console.error(`Failed to get blockhash and calculate fee: ${e}`);
        // Return a default stringified object in case of error
        return JSON.stringify({
          blockhash: '',
          lastValidBlockHeight: 0,
          fee: 5000,
        });
      }
    },
  );

  if (!blockHashAndFeeDataStr) {
    throw new Error('Failed to fetch blockhash and fee data');
  }

  // Parse the returned string
  const blockHashAndFeeData = JSON.parse(blockHashAndFeeDataStr);
  const { blockhash, fee } = blockHashAndFeeData;

  // Calculate minimum balance for rent exemption (we need to keep this in the account)
  const minRentExemptBalanceStr = await litHelpers.runOnce(
    {
      waitForResponse: true,
      name: 'getMinimumBalanceForRentExemption',
    },
    async () => {
      try {
        const rentExempt =
          await connection.getMinimumBalanceForRentExemption(0);
        return rentExempt.toString();
      } catch (e) {
        console.error(`Failed to get minimum balance for rent exemption: ${e}`);
        return '890880'; // Default minimum balance for a basic account
      }
    },
  );

  if (!minRentExemptBalanceStr) {
    throw new Error('Failed to fetch min rent exempt balance');
  }

  const minRentExemptBalance = parseInt(minRentExemptBalanceStr, 10);

  // Add priority fee if provided
  const totalFee = priorityFee ? fee + priorityFee : fee;

  // Calculate safe transfer amount (balance - fee - rent exemption)
  const safeTransferAmount = balance - totalFee - minRentExemptBalance;

  if (safeTransferAmount <= 0) {
    throw new Error('Insufficient balance for transfer after fees');
  }

  console.log(`Safe transfer amount: ${safeTransferAmount}`);
  console.log(`Fee: ${totalFee}`);
  console.log(`Rent exemption: ${minRentExemptBalance}`);

  // Create a versioned transaction
  // Step 1: Create the instruction
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(orchestratorAddress),
    toPubkey: new PublicKey(SOLANA_OWNER_ADR(env)),
    lamports: safeTransferAmount,
  });

  // Step 2: Create a TransactionMessage with the instruction
  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey(orchestratorAddress),
    recentBlockhash: blockhash,
    instructions: [transferInstruction],
  }).compileToV0Message();

  // Step 3: Create a VersionedTransaction using the message
  const transaction = new VersionedTransaction(messageV0);

  const txid = await executor.executeSolana(chainId, [transaction], envVars);

  return JSON.stringify(txid);
};
