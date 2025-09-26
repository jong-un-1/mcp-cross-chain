import { IErrorHandler } from '../../../services/lit-services/error-handler/error-handler.interface';
import { ILitHelpers } from '../../../services/lit-services/lit-helpers/lit-helpers.interface';
import { ENVIRONMENT } from '../../../types/environment';

/**
 * Context and dependencies required by solvers
 */
export interface ISolverContext {
  /**
   * Error handling service
   */
  errorHandler: IErrorHandler;

  /**
   * Lit helpers for Lit Actions integration
   */
  litHelpers: ILitHelpers;

  /**
   * RPC URLs by chain ID
   */
  rpcUrls: { [chain: number]: string[] };

  /**
   * Current environment (dev, staging, production)
   */
  environment: ENVIRONMENT;

  /**
   * Solana orchestrator public key
   */
  solanaOrchestratorPublicKey: string | null;
}
