// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck

import { createOrchestratorBase } from './create-sol-orchestrator-base';
import { isCallerAuthorizedLit } from '../../utils/caller-auth-lit';
import { EXECUTOR_ADR_EVM } from '../../utils/addresses';
import { EncryptorLit } from '../../services/lit-services/encryptor/encryptor-lit';

/**
 * Lit action to create an orchestrator for a specific lit action
 *
 * @param {string[]} ipfsHashs
 */
const go = async () => {
  console.log('Creating orchestrator...');
  if (!isCallerAuthorizedLit(EXECUTOR_ADR_EVM(env)))
    throw new Error(
      `Caller is not authorized. Expected: ${EXECUTOR_ADR_EVM(env)}`,
    );
  const res = await createOrchestratorBase(new EncryptorLit(), ipfsHashs);
  return Lit.Actions.setResponse({ response: JSON.stringify(res) });
};

go();
