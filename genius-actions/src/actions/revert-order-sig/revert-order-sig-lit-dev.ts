// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { ENVIRONMENT } from '../../types/environment';

/**
 * Revert Order Signature Lit
 *
 * @param {Order} order
 * @param {EncryptedData} orchestrator
 * @param {AccessControlConditions} orchestratorAccess
 */
const go = async () => {
  revertOrderSigLit(ENVIRONMENT.DEV, order, orchestrator, orchestratorAccess);
};

go();
