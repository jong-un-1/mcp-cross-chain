import { AccessControlConditions } from '@lit-protocol/types';
import { config } from 'dotenv';
import { getLitNodeClient } from '../utils/lit-client';
import { ENVIRONMENT } from '../../src/types/environment';
import { EvmArbitraryCall } from '../../src/types/evm-arbitrary-call';
import getLitAction from '../utils/get-lit-action';
import { getExecutorSessionSigs } from '../utils/lit-auth';
import { encryptString } from '../utils/encrypt-string';
import { publicKeyToHex } from '../../src/utils/string-to-bytes32';
import { Order } from '../../src/services/blockchain/vault/vault.types';

config();

const testFillOrderAction = async (order: Order) => {
  try {
    const litNodeClient = await getLitNodeClient('datil-test', true);
    // const arbitraryCall = null;

    const actionFile = getLitAction('SOLVER_DEV');
    const { sessionSigs, pkps } = await getExecutorSessionSigs('datil-test');

    const orchestratorAccess: AccessControlConditions = [
      {
        contractAddress: '',
        standardContractType: '',
        chain: 'ethereum',
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: '0',
        },
      },
    ];

    console.log('orchestratorAccess=>', orchestratorAccess);
    console.log(
      'process.env.ORCHESTRATOR_PK_SOLANA=>',
      process.env.ORCHESTRATOR_PK_SOLANA,
    );

    const orchestrator = await encryptString(
      process.env.ORCHESTRATOR_PK_SOLANA || '',
      orchestratorAccess,
      litNodeClient,
    );

    console.log(orchestrator);

    const swapCall: EvmArbitraryCall | null = null;

    console.log('swapCall=>', swapCall);

    const startTime = new Date().getTime();

    // const tokenOut = 'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump';
    const tokenOut = 'AxriehR6Xw3adzHopnvMn7GcpRFcD41ddpiTWMg6pump';
    // const tokenOut = '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN';
    // const tokenOut = 'Gwy5Jxf1q33WYkJYq77Ju8gSa3HPekGiZsLHQTnJpump';
    // const tokenOut = 'EfgEGG9PxLhyk1wqtqgGnwgfVC7JYic3vC9BCWLvpump';
    // const tokenOut = 'EkTBTacd2PWFQEgLpxZ6MJvuoJPxcm7gb2bwKzzqpump';
    // const tokenOut = '7jNWgHh8PAwcoVq4X5AGSTdg426q2knvVSXUpMc2pump';
    const tokenOutHex = publicKeyToHex(tokenOut);
    const or = order;
    or.tokenOut = tokenOutHex;

    const output = await litNodeClient.executeJs({
      // ipfsId: 'QmPq6sbUgydKw9mwXXmxkgNSBubSRvW3rdm9GCQSLLT6yC',
      code: actionFile,
      sessionSigs: sessionSigs,
      jsParams: {
        env: ENVIRONMENT.STAGING,
        orders: [or],
        arbitraryCalls: [null],
        swapsCalls: [null],
        evmPkpAddress: pkps[0].ethAddress,
        evmPkpPublicKey: pkps[0].publicKey,
        orchestratorSolana: orchestrator,
        orchestratorAccess,
      },
    });

    console.log('time for signing=>', new Date().getTime() - startTime);
    console.log('output=>', output);
  } catch (e) {
    console.log('error in fill order=>', e);
  }
};

const order: Order = {
  seed: '0xaaecc774d3f8e013420778c677b0d2863fb58bf7d960965258e0b82d9d6d1f7f',
  trader: '0x000000000000000000000000b0e62f5c874b7edea2e977567c283aae140bba7e',
  receiver:
    '0x27b868986b8746d0a1a2127dc49aa6c9abe115483117e45f84361e1b717f4c40',
  tokenIn: '0x000000000000000000000000d9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
  tokenOut:
    '0xc6fa7af3bedbad3a3d65f36aabc97431b1bbe4c2d2f6e0e47ca60203452f5d61',
  amountIn: '300',
  minAmountOut: '1',
  srcChainId: '8453',
  destChainId: '1399811149',
  fee: '10',
};

testFillOrderAction(order);
