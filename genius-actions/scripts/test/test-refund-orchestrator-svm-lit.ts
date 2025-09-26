import { config } from 'dotenv';
import { ExecutionHandler } from '../../src/services/lit-services/execution-handler/execution-handler';
import { getLitNodeClient } from '../utils/lit-client';
import { getExecutorSessionSigs } from '../utils/lit-auth';
import { ENVIRONMENT } from '../../src/types/environment';
import { AccessControlConditions } from '@lit-protocol/types';

config();

export const testSvmRefundOrchestrator = async () => {
  const litNodeClient = await getLitNodeClient('datil-test', true);
  const { sessionSigs, pkps } = await getExecutorSessionSigs('datil-test');

  console.log('pkps=>', pkps);

  const accessControl: AccessControlConditions = [
    {
      contractAddress: '',
      standardContractType: '',
      chain: 'ethereum',
      method: '',
      parameters: [':currentActionIpfsId'],
      returnValueTest: {
        comparator: '=',
        value: 'QmerWcM4m4jWyo62LoQJEwjKrjG7c8q7vQB9wc2iA18ptk',
      },
    },
    { operator: 'or' },
    {
      contractAddress: '',
      standardContractType: '',
      chain: 'ethereum',
      method: '',
      parameters: [':currentActionIpfsId'],
      returnValueTest: {
        comparator: '=',
        value: 'QmYejeXiM1fhmZmrP3neWt7vW7HkFt75bHHVGkBJw5BYJF',
      },
    },
  ];

  // const orchestratorSolana = await encryptString(
  //   process.env.ORCHESTRATOR_PK_SOLANA as string,
  //   accessControl,
  //   litNodeClient,
  // );

  const orchestratorSolana = {
    publicKey: 'nS7koPSVgz2cs7AXGpgoxUZMoBh8sDmjmnYizgcvisn',
    ciphertext:
      't1l57M+mte6LP4idKw7dxF5zDFl+JF8KWpRqDqom1Ki5ix0pBCQm1y1ARNhu+yl04/1tvO5BZuskv2sXvAna00vNgPjzMGYOk3cml2tkGuxZzgu/IN1qqgFAx7874t/thqRiUZ1q4lWc2gWx1LpZyGvkkwsfWm8OB4bSUcBQx8MsBKbecOWnNRn4Bgc8T2ZXVsqmzQOPlZoXfx5wi3FK6ASA1vAbVa2P9y4C',
    dataToEncryptHash:
      '46d353e50cbbb78be38a51c1c8499546d26517a0cdbc775904fb41b0b2e5851b',
  };

  const envVars = {
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
    QUICKNODE_BASE_KEY: process.env.QUICKNODE_BASE_KEY,
    QUICKNODE_OPTIMISM_KEY: process.env.QUICKNODE_OPTIMISM_KEY,
    QUICKNODE_ARBITRUM_KEY: process.env.QUICKNODE_ARBITRUM_KEY,
    QUICKNODE_BSC_KEY: process.env.QUICKNODE_BSC_KEY,
    QUICKNODE_AVALANCHE_KEY: process.env.QUICKNODE_AVALANCHE_KEY,
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    QUICKNODE_JITO_KEY: process.env.QUICKNODE_JITO_KEY,
    QUICKNODE_JITO_ENDPOINT: process.env.QUICKNODE_JITO_ENDPOINT,
  };

  const orchestratorAddress = orchestratorSolana.publicKey;
  const ownerExecutor = new ExecutionHandler(process.env.OWNER_PK || '');
  const ownerSig = await ownerExecutor.signEvm(
    `REFUND_ORCHESTRATOR_SOL_${orchestratorAddress}`,
  );

  const output = await litNodeClient.executeJs({
    ipfsId: 'QmYejeXiM1fhmZmrP3neWt7vW7HkFt75bHHVGkBJw5BYJF',
    sessionSigs: sessionSigs,
    jsParams: {
      orchestratorSolana: orchestratorSolana,
      envVars: envVars,
      accessControl: accessControl,
      ownerSignature: ownerSig,
      env: ENVIRONMENT.STAGING,
      priorityFee: 3000000,
    },
  });

  console.log(output);
};

testSvmRefundOrchestrator();
