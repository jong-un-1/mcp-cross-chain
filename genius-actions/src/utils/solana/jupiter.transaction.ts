import { SwapInstructionsResponse } from '@jup-ag/api';
import {
  PublicKey,
  VersionedTransaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  TransactionMessage,
  Connection,
} from '@solana/web3.js';
// import { SOLANA_WRAPPED_SOL_ADDRESS } from '@shared/globals';
import bs58 from 'bs58';

import { fetchPriorizationFees } from './solana.prioritization.fee';

// Helper function to create a transaction instruction
function createTransactionInstruction(
  programId: PublicKey,
  keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
  data: Buffer,
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys,
    data,
  });
}

export interface GenerateJupiterTransactionParams {
  sourceMint: string;
  destinationMint: string;
  swapInfo: SwapInstructionsResponse;
  receiver: PublicKey;
  trader: PublicKey;
  connection: Connection;
  feePayer: PublicKey;
}

export async function generateJupiterTransaction({
  swapInfo,
  connection,
  feePayer,
}: GenerateJupiterTransactionParams): Promise<string> {
  try {
    const instructions: TransactionInstruction[] = [];
    const priorityFee = await fetchPriorizationFees({});
    const totalAdditionalFeesLamports = BigInt(Math.floor(priorityFee));
    const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: totalAdditionalFeesLamports,
    });
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 600000, // Increase this number as needed
    });
    instructions.push(modifyComputeUnits);
    instructions.push(priorityFeeInstruction);

    const feePayerPublicKey = feePayer;

    // Add setup instructions
    if (swapInfo?.setupInstructions) {
      swapInfo.setupInstructions.forEach((instruction: any) => {
        const ix = createTransactionInstruction(
          new PublicKey(instruction.programId),
          instruction.accounts.map((acc: any) => ({
            pubkey: new PublicKey(acc.pubkey),
            isSigner: acc.isSigner,
            isWritable: acc.isWritable,
          })),
          Buffer.from(instruction.data, 'base64'),
        );
        instructions.push(ix);
      });
    }

    // Add the swap instruction
    if (swapInfo?.swapInstruction) {
      const swapIx = createTransactionInstruction(
        new PublicKey(swapInfo.swapInstruction.programId),
        swapInfo.swapInstruction.accounts.map((acc: any) => ({
          pubkey: new PublicKey(acc.pubkey),
          isSigner: acc.isSigner,
          isWritable: acc.isWritable,
        })),
        Buffer.from(swapInfo.swapInstruction.data, 'base64'),
      );
      instructions.push(swapIx);
    }

    const additionalInstructions = [];
    if (swapInfo?.cleanupInstruction) {
      const cleanupIx = createTransactionInstruction(
        new PublicKey(swapInfo.cleanupInstruction.programId),
        swapInfo.cleanupInstruction.accounts.map((acc: any) => ({
          pubkey: new PublicKey(acc.pubkey),
          isSigner: acc.isSigner,
          isWritable: acc.isWritable,
        })),
        Buffer.from(swapInfo.cleanupInstruction.data, 'base64'),
      );
      additionalInstructions.push(cleanupIx);
    }

    const { blockhash } = await connection.getLatestBlockhash();
    instructions.push(...additionalInstructions);

    const messageV0 = new TransactionMessage({
      payerKey: feePayerPublicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const byteLength = new VersionedTransaction(messageV0).serialize().length;

    if (byteLength > 1232) {
      console.log(`byte length exceeded ${byteLength}`);
      throw new Error('Transaction byte length exceeds limit');
    }
    const versonedTxn = new VersionedTransaction(messageV0);
    const encodedTxn = bs58.encode(versonedTxn.serialize());

    return encodedTxn;
  } catch (e: any) {
    console.log(`Failed to generate jupiter transaction`, e.message);
    throw new Error(e.message);
  }
}
