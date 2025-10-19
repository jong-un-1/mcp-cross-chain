import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import {
  ASSET_SEED,
  GLOBAL_STATE_SEED,
  ORCHESTRATOR_SEED,
  ORDER_SEED,
  VAULT_SEED,
} from '../constants/genius-svm-constants';

import { stringToUint8Array } from '../../../../utils/string-to-bytes32';

export class AddressUtils {
  /**
   * Derives a PDA for the global state of the program
   * @param programId The program ID to derive the PDA from
   * @returns The global state address
   */
  static getGlobalStateAddress(programId: PublicKey): PublicKey {
    const [globalState] = PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_STATE_SEED)],
      programId,
    );
    return globalState;
  }

  /**
   * Derives a PDA for the vault of the program
   * @param programId The program ID to derive the PDA from
   * @returns The vault address
   */
  static getVaultAddress(programId: PublicKey): PublicKey {
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED)],
      programId,
    );
    return vault;
  }

  /**
   * Derives a PDA for the asset of the program
   * @param programId The program ID to derive the PDA from
   * @returns The asset address
   */
  static getAssetAddress(programId: PublicKey): PublicKey {
    const [asset] = PublicKey.findProgramAddressSync(
      [Buffer.from(ASSET_SEED)],
      programId,
    );
    return asset;
  }

  /**
   * Derives a PDA for the orchestrator state
   * @param orchestrator The orchestrator's public key
   * @param programId The program ID to derive the PDA from
   * @returns The orchestrator state address
   */
  static getOrchestratorStateAddress(
    orchestrator: PublicKey,
    programId: PublicKey,
  ): PublicKey {
    const [orchestratorState] = PublicKey.findProgramAddressSync(
      [orchestrator.toBuffer(), Buffer.from(ORCHESTRATOR_SEED)],
      programId,
    );
    return orchestratorState;
  }

  /**
   * Derives a PDA for a specific order from its hash
   * @param orderHash The hash of the order
   * @param programId The program ID to derive the PDA from
   * @returns The order address
   */
  static getOrderAddress(orderHash: string, programId: PublicKey): PublicKey {
    const orderHashArray = stringToUint8Array(orderHash);
    const [orderAdd] = PublicKey.findProgramAddressSync(
      [orderHashArray, Buffer.from(ORDER_SEED)],
      programId,
    );
    return orderAdd;
  }
}
