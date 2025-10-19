import { ENVIRONMENT } from '../src/types/environment';
import getLitAction from './utils/get-lit-action';
import { getExecutorSessionSigs } from './utils/lit-auth';
import { getLitNodeClient } from './utils/lit-client';

export const testCreateOrchestrator = async (ipfsHashs: string[]) => {
  try {
    const litNodeClient = await getLitNodeClient('datil-test', true);

    const actionFile = getLitAction('CREATE_SOL_ORCHESTRATOR');
    const sessionSigs = await getExecutorSessionSigs('datil-test');

    const startTime = new Date().getTime();
    const output = await litNodeClient.executeJs({
      code: actionFile,
      sessionSigs: sessionSigs.sessionSigs,
      jsParams: {
        ipfsHashs,
        env: ENVIRONMENT.STAGING,
      },
    });

    console.log('time for signing=>', new Date().getTime() - startTime);
    console.log('output=>', output);
  } catch (e) {
    console.log('error in create orchestrator=>', e);
  }
};

testCreateOrchestrator([
  'QmerWcM4m4jWyo62LoQJEwjKrjG7c8q7vQB9wc2iA18ptk', // rebalance
  'QmYejeXiM1fhmZmrP3neWt7vW7HkFt75bHHVGkBJw5BYJF', // Refund orchestrator sol
])
  .then(console.log)
  .catch(console.error);
