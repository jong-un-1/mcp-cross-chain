import { config } from 'dotenv';
import { ChainId } from '../../src/types/chain-id';
import { refundOrchestratorBase } from '../../src/actions/refund-orchestrator/refund-orchestrator-base';
import { ENVIRONMENT } from '../../src/types/environment';
import { ExecutionHandler } from '../../src/services/lit-services/execution-handler/execution-handler';
import { LitHelpersMock } from '../../src/services/lit-services/lit-helpers/lit-helpers-mock';

config();

export const testRefundOrchestrator = async () => {
  // Define the chainId
  const chainId = ChainId.BASE;

  // Define the orchestrator address
  const executor = new ExecutionHandler(process.env.ORCHESTRATOR_PK || '');
  const ownerExecutor = new ExecutionHandler(process.env.OWNER_PK || '');
  const ownerSig = await ownerExecutor.signEvm(
    'REFUND_ORCHESTRATOR_0x1b58dd4DE6B7B3066D614905f5c8Fea9C81a1439',
  );
  const tx = await refundOrchestratorBase(
    executor,
    new LitHelpersMock(),
    chainId,
    '0x1b58dd4DE6B7B3066D614905f5c8Fea9C81a1439',
    ownerSig,
    ENVIRONMENT.DEV,
    {},
  );
  console.log(tx);
};

testRefundOrchestrator();
